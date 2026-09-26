// ═══════════════════════════════════════════════════════════════════════
//  ai-estimator — Supabase Edge Function (NWAC AI Estimator)
//  The Anthropic key lives only here (secret ANTHROPIC_API_KEY); the browser never sees it.
//  Only office roles may call it (checked against public.profiles with the caller's own login).
//
//  POST { action: "sheet", page_id, pdf_base64, tiles?: [base64 jpeg], text_hint?, tag_counts? }
//       → reads one drawing sheet in the background, writes ai_est_pages.result; returns at once.
//  POST { action: "quote", page_id, pdf_base64 }       → reads a vendor quote (same background flow)
//  POST { action: "review", session_id, context }      → scope review / open items / RFIs / exclusions,
//       written to ai_est_sessions.result.review
//  The page polls the rows for status = done | error.
// ═══════════════════════════════════════════════════════════════════════
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const SB_URL = Deno.env.get("SUPABASE_URL")!;
// legacy anon key, or the first publishable key (new API keys)
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY") || (() => {
  try { return String(Object.values(JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}"))[0] || ""); } catch (_e) { return ""; }
})();
const OFFICE = ["admin", "manager", "lead_pm", "project_manager", "apm"];
const MODELS: Record<string, { in: number; out: number }> = {   // $ per million tokens
  "claude-sonnet-5": { in: 3, out: 15 },
  "claude-opus-5-5": { in: 5, out: 25 },
};
const DEFAULT_MODEL = "claude-sonnet-5";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ─── prompts ──────────────────────────────────────────────────────────
const SHEET_PROMPT = `You are the senior HVAC estimator at Northern Wolves AC (NY/NJ mechanical contractor).
You are reading ONE sheet of a bid drawing set. Extract everything an estimator needs to price the HVAC scope.
The attached PDF (with its text layer): page 1 is the WHOLE sheet; any further pages are zoomed crops of the same sheet
(about 10% overlap between neighbours) so small tags, sizes and notes are legible. Read details on the crops, but count every
item ONCE — anything inside an overlap strip shows on two crops. TAG COUNTS below were counted exactly from the PDF text layer — trust them for quantities of
tagged items on this sheet, and use the drawing to decide what each tag is.

Rules:
- Schedules: capture EVERY row (tag, type, manufacturer/model, capacity, weight, electrical, notes). Weight in lb if shown.
- Plans: count air devices by type and size (diffusers/grilles/registers, linear diffusers with feet, VAV boxes, fan-powered
  boxes, fire/smoke & motorized dampers, cable-operated dampers, louvers). Equipment shown on the plan with its tag.
- Ductwork: estimate linear feet per duct size using the sheet scale (read it from the title block / view label).
  Group by shape+size (e.g. "24x12", "12 round"). Note lining/insulation if stated. Existing-to-remain ducts are NOT new scope.
- Piping: linear feet per service and size (CWS/CWR, HWS/HWR, CHWS/CHWR, refrigerant, condensate, gas…), material if stated.
- Demolition/removal sheets: items to disconnect/remove with counts.
- Notes: read ALL general/keyed notes. List scope that lands on the mechanical contractor, especially items vendor quotes
  usually exclude (in-duct smoke detectors, wet taps, fire-stopping, access doors, pre-balancing, existing insulation repair,
  cutting/patching, structural supports, dunnage, controls wiring).
- Wet taps: count explicit wet-tap connections. Rigging: any unit ≥ 400 lb on a roof or ≥ 800 lb indoors (tag, weight, where).
- Anything unclear → put it in "questions" as a draft RFI. Never invent quantities: if you cannot read it, say so.

Keep the answer compact: leave out empty arrays, empty strings and unknown fields; notes at most 15 words; combine identical
air devices / duct sizes into one row per type+size (sum qty / lf).
Return ONLY a JSON object (no markdown fences) with this shape:
{
 "sheet_no": "M-201", "sheet_title": "...", "discipline": "mechanical|plumbing|electrical|fire|architectural|other",
 "sheet_type": "legend|specs|demo|duct_plan|pipe_plan|enlarged|details|schedule|riser|controls|other",
 "floor": "1|2|roof|cellar|multiple|null", "scale": "1/8\\" = 1'-0\\"",
 "equipment": [{"tag":"AC-1-1","type":"water-cooled packaged unit","manufacturer":"","model":"","capacity":"","weight_lb":0,
                "qty":1,"location":"","electrical":"","furnished_by":"contractor|owner|null","notes":""}],
 "air_devices": [{"type":"diffuser|grille|register|linear|vav|fpb|fsd|motorized_damper|cod|louver|other","tag":"","size":"",
                  "qty":0,"linear_ft":0,"notes":""}],
 "duct_runs": [{"shape":"rect|round|oval","size":"24x12","lf":0,"lined":false,"insulated":false,"notes":""}],
 "pipe_runs": [{"service":"CWS/CWR","size":"2\\"","lf":0,"material":"","insulated":true,"notes":""}],
 "demo": [{"item":"","qty":0,"notes":""}],
 "wet_taps": 0,
 "rigging": [{"tag":"","weight_lb":0,"where":"roof|indoor","floor":""}],
 "scope_notes": [{"source":"GN-4","text":"","mech_scope":true,"often_missed":false}],
 "questions": ["draft RFI text"],
 "confidence": "high|medium|low",
 "notes": "what you could not read or are unsure about"
}`;

const QUOTE_PROMPT = `You are the senior HVAC estimator at Northern Wolves AC. This is a vendor or subcontractor quote for a bid.
Return ONLY JSON (no markdown):
{"vendor":"","quote_no":"","date":"YYYY-MM-DD or null","valid_until":null,"total":0,"freight_included":null,
 "tax_included":null,"kind":"equipment|air_devices|controls|tab|rigging|insulation|sheetmetal|other",
 "lines":[{"tags":["AC-1-1"],"description":"","qty":0,"amount":null}],
 "included":["short phrases"],"excluded":["short phrases, e.g. 'smoke detectors', 'startup', 'rigging'"],
 "notes":"lead times, alternates, anything that affects pricing"}`;

const REVIEW_PROMPT = `You are the senior HVAC estimator at Northern Wolves AC reviewing an AI-read bid before pricing.
Below: what was read from every sheet and quote, plus NWAC's own estimating process rules.
Do what Kastriot's process demands: compare drawing counts to schedules, compare quotes to the drawings (what the vendor
did NOT cover), find mechanical scope hidden in notes, basis-of-design brand mismatches, missing quotes, and risks.
Return ONLY JSON:
{"missing_quotes":[{"item":"","tags":[],"suggested_vendor":"","why":""}],
 "quote_gaps":[{"vendor":"","gap":"","impact":""}],
 "hidden_scope":[{"source":"","item":"","how_to_price":""}],
 "count_mismatches":[{"tag":"","schedule":0,"drawings":0,"note":""}],
 "rfis":[{"question":"","sheet":""}],
 "exclusions":["proposal exclusion lines"],
 "risks":[{"risk":"","severity":"high|medium|low"}],
 "summary":"3-5 sentences for the estimator"}`;

// ─── Claude call ──────────────────────────────────────────────────────
async function claude(model: string, content: any[], maxTokens: number) {
  // extraction work: no extended thinking, so the whole output budget goes to the JSON answer
  const send = (extra: any) => fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content }], ...extra }),
  });
  let r = await send({ thinking: { type: "disabled" } });
  let t = await r.text();
  if (!r.ok && r.status === 400 && /thinking/i.test(t)) { r = await send({}); t = await r.text(); }
  if (!r.ok) throw new Error("Claude API " + r.status + ": " + t.slice(0, 400));
  const j = JSON.parse(t);
  const text = (j.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
  if (!text && j.stop_reason === "max_tokens")
    throw new Error("the model used the whole output budget before answering (" + (j.content || []).map((c: any) => c.type).join(",") + ")");
  const u = j.usage || {};
  const price = MODELS[model] || MODELS[DEFAULT_MODEL];
  const cost = ((u.input_tokens || 0) * price.in + (u.output_tokens || 0) * price.out) / 1e6;
  return { text, tokens_in: u.input_tokens || 0, tokens_out: u.output_tokens || 0, cost, stop: j.stop_reason };
}

function parseJson(text: string) {
  let s = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

// ─── handlers ─────────────────────────────────────────────────────────
async function runPage(db: any, body: any, kind: "sheet" | "quote") {
  const { data: pg, error } = await db.from("ai_est_pages").select("id, session_id, page_no").eq("id", body.page_id).single();
  if (error || !pg) throw new Error("page not found");
  const { data: ses } = await db.from("ai_est_sessions").select("model").eq("id", pg.session_id).single();
  const model = MODELS[body.model] ? body.model : (ses && MODELS[ses.model] ? ses.model : DEFAULT_MODEL);
  await db.from("ai_est_pages").update({ status: "running", error: null, model, started_at: new Date().toISOString() }).eq("id", pg.id);

  const work = (async () => {
    try {
      const content: any[] = [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: body.pdf_base64 } }];
      (body.tiles || []).slice(0, 12).forEach((t: string) =>
        content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: t } }));
      let prompt = kind === "quote" ? QUOTE_PROMPT : SHEET_PROMPT;
      if (kind === "sheet") {
        if (body.tag_counts && Object.keys(body.tag_counts).length)
          prompt += "\n\nTAG COUNTS (exact, from the text layer of this sheet): " + JSON.stringify(body.tag_counts);
        if (body.text_hint) prompt += "\n\nDuct/pipe size labels found in the text layer (label ×count): " + String(body.text_hint).slice(0, 4000);
      }
      content.push({ type: "text", text: prompt });
      const r = await claude(model, content, kind === "quote" ? 4000 : 8000);
      let result: any;
      try { result = parseJson(r.text); } catch (_e) { result = { parse_error: true, raw: r.text.slice(0, 20000) }; }
      if (r.stop === "max_tokens") result.truncated = true;
      await db.from("ai_est_pages").update({
        status: "done", result, tokens_in: r.tokens_in, tokens_out: r.tokens_out, cost: r.cost,
        sheet_no: result.sheet_no || result.quote_no || null, sheet_title: result.sheet_title || result.vendor || null,
        sheet_type: kind === "quote" ? "quote" : (result.sheet_type || null), finished_at: new Date().toISOString(),
      }).eq("id", pg.id);
    } catch (e) {
      await db.from("ai_est_pages").update({ status: "error", error: String((e as any)?.message || e).slice(0, 1000), finished_at: new Date().toISOString() }).eq("id", pg.id);
    }
  })();
  // keep working after the response is sent
  (globalThis as any).EdgeRuntime?.waitUntil ? (globalThis as any).EdgeRuntime.waitUntil(work) : await work;
  return { ok: true, page_id: pg.id, model, queued: true };
}

async function runReview(db: any, body: any) {
  const { data: ses, error } = await db.from("ai_est_sessions").select("id, model, result").eq("id", body.session_id).single();
  if (error || !ses) throw new Error("session not found");
  const model = MODELS[body.model] ? body.model : (MODELS[ses.model] ? ses.model : DEFAULT_MODEL);
  const res0 = ses.result || {};
  await db.from("ai_est_sessions").update({ result: { ...res0, review_status: "running", review_error: null } }).eq("id", ses.id);
  const work = (async () => {
    try {
      const r = await claude(model, [{ type: "text", text: REVIEW_PROMPT + "\n\n" + String(body.context || "").slice(0, 600000) }], 8000);
      let review: any;
      try { review = parseJson(r.text); } catch (_e) { review = { parse_error: true, raw: r.text.slice(0, 20000) }; }
      const { data: cur } = await db.from("ai_est_sessions").select("result").eq("id", ses.id).single();
      await db.from("ai_est_sessions").update({
        result: { ...(cur?.result || {}), review, review_status: "done", review_cost: r.cost, review_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      }).eq("id", ses.id);
    } catch (e) {
      const { data: cur } = await db.from("ai_est_sessions").select("result").eq("id", ses.id).single();
      await db.from("ai_est_sessions").update({ result: { ...(cur?.result || {}), review_status: "error", review_error: String((e as any)?.message || e).slice(0, 1000) } }).eq("id", ses.id);
    }
  })();
  (globalThis as any).EdgeRuntime?.waitUntil ? (globalThis as any).EdgeRuntime.waitUntil(work) : await work;
  return { ok: true, queued: true, model };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  if (!ANTHROPIC_KEY) return json({ ok: false, error: "ANTHROPIC_API_KEY secret is not set" }, 500);
  try {
    const auth = req.headers.get("Authorization") || "";
    // act as the signed-in user: RLS decides what the function may read and write
    const db = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: u } = await db.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (!u || !u.user) return json({ ok: false, error: "Please sign in" }, 401);
    const { data: prof } = await db.from("profiles").select("role").eq("id", u.user.id).single();
    if (!prof || OFFICE.indexOf(prof.role) < 0) return json({ ok: false, error: "Office roles only" }, 403);

    const body = await req.json();
    if (body.action === "sheet") return json(await runPage(db, body, "sheet"));
    if (body.action === "quote") return json(await runPage(db, body, "quote"));
    if (body.action === "review") return json(await runReview(db, body));
    if (body.action === "ping") return json({ ok: true, user: u.user.email, role: prof.role });
    return json({ ok: false, error: "unknown action" }, 400);
  } catch (e) {
    return json({ ok: false, error: String((e as any)?.message || e) }, 500);
  }
});
