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
const OFFICE = ["admin", "manager", "lead_pm", "project_manager", "apm", "estimator"];
const MODELS: Record<string, { in: number; out: number }> = {   // $ per million tokens
  "claude-sonnet-5": { in: 3, out: 15 },
  "claude-opus-5-5": { in: 5, out: 25 },
  "claude-haiku-4-5": { in: 1, out: 5 },
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
- Plans — AIR DEVICES, count them like an estimator pricing them: one row per device code (the WHOLE code as printed, e.g. "C",
  "CD-1", "SA", "RG", "LDS-A", "SD-A", "RD-B" — codes that share a suffix letter are different rows, never merge them into one "family A") with the TOTAL qty on this sheet. Slot / linear codes (LDS, LSD, LD, LDR, LDX, SLOT, LINEAR …) are type linear; their size is the slot width and the length printed on the plan (or "see plans"). Count every drawn symbol once; a tag written "TYP. 5" / "TYPICAL OF 5"
  stands for 5 devices; a device tag placed once next to a group of identical symbols covers the whole group. Use the DEVICE TAGS
  count (exact, from the text layer, TYP multipliers applied) as the quantity of each tagged family — only add symbols that carry
  no tag at all. Give each row: type (diffuser/grille/register/linear/vav/fpb/fsd/motorized_damper/cod/louver), tag family, size
  (neck or face), cfm when printed, qty, and for LINEAR / slot diffusers also the linear_ft read at the sheet scale (sum of the
  slot lengths; the qty is the number of sections). Existing, relocated or "(E)" devices and the legend's sample symbols are not
  counted (put them in notes). Sprinkler heads (SP), thermostats (T), smoke detectors (SD), fire extinguishers (FE/FEC), gypsum/GB, exit signs and other non-HVAC tags are NOT air devices — never list them. SHEETS WITH BARE CFM BUBBLES: when outlets carry only a cfm value in brackets ("(150)") and no device
  code, EVERY bubble marks one air device drawn right beside it — classify each bubble by that symbol: a square with an X (often
  coloured) = ceiling supply diffuser; a filled rectangle / bar at the end of a duct drop = register or grille; a circle = round diffuser;
  a slot line = linear. If the symbols are colour-coded (blue / yellow / pink fills), keep each colour as its own row and put the colour in
  the tag ("blue square-X diffuser", "yellow bar register") — colours usually separate supply from return / exhaust. Return one row per symbol
  type and colour (tag = the symbol name) with qty =
  the number of such bubbles; the rows should add up to the DEVICE TAGS "(cfm only)" total minus bubbles that sit on a duct run or on
  equipment with no symbol. Never type "other" for an air outlet and never return a row tagged "(cfm only)". "TD" transfer ducts /
  transfer grilles are NOT air outlets (type other). A tag on a
  dashed slot run ("D (200) TYP. 5") is a LINEAR slot diffuser: type linear, qty = sections, linear_ft = total slot length.
  Also VAV / fan-powered boxes, fire/smoke & motorized dampers, cable-operated dampers, louvers. Equipment shown on the plan with its tag.
- Ductwork: estimate linear feet per duct size using the sheet scale (read it from the title block / view label).
  Group by shape+size+system (e.g. "24x12" SA, "12 round" EA): system = SA supply, RA return, EA exhaust, OA outside air, TA transfer —
  from the label suffix (24x12 S/A, 12x8 EA, T.D.), the legend's line type, or the devices the run serves; "unknown" when nothing says.
  Note lining/insulation if stated. Existing-to-remain ducts are NOT new scope.
- Piping: linear feet per service and size (CWS/CWR, HWS/HWR, CHWS/CHWR, refrigerant, condensate, gas…), material if stated.
- Demolition/removal sheets: items to disconnect/remove with counts.
- Notes: read ALL general/keyed notes. List scope that lands on the mechanical contractor, especially items vendor quotes
  usually exclude (in-duct smoke detectors, wet taps, fire-stopping, access doors, pre-balancing, existing insulation repair,
  cutting/patching, structural supports, dunnage, controls wiring).
- Wet taps: count explicit wet-tap connections. Rigging: any unit ≥ 400 lb on a roof or ≥ 800 lb indoors (tag, weight, where).
- Anything unclear → put it in "questions" as a draft RFI. Never invent quantities: if you cannot read it, say so.

Write inches as "in" inside text (6 in CWS, 24x12 in) — never a bare " character.
Keep the answer compact: leave out empty arrays, empty strings and unknown fields; notes at most 15 words; combine identical
air devices / duct sizes into one row per type+size (sum qty / lf).
Answer with the record_findings tool, one object in this shape:
{
 "sheet_no": "M-201", "sheet_title": "...", "discipline": "mechanical|plumbing|electrical|fire|architectural|other",
 "sheet_type": "legend|specs|demo|duct_plan|pipe_plan|enlarged|details|schedule|riser|controls|other",
 "floor": "1|2|roof|cellar|multiple|null", "scale": "1/8\\" = 1'-0\\"",
 "equipment": [{"tag":"AC-1-1","type":"water-cooled packaged unit","manufacturer":"","model":"","capacity":"","weight_lb":0,
                "qty":1,"location":"","electrical":"","furnished_by":"contractor|owner|null","notes":""}],
 "air_devices": [{"type":"diffuser|grille|register|linear|vav|fpb|fsd|motorized_damper|cod|louver|other","tag":"C","size":"24x24 in",
                  "cfm":150,"qty":0,"linear_ft":0,"basis":"tags|symbols|schedule","notes":""}],
 "duct_runs": [{"shape":"rect|round|oval","size":"24x12","system":"SA|RA|EA|OA|TA|unknown","lf":0,"lined":false,"insulated":false,"notes":""}],
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
Answer with the record_findings tool, one object in this shape:
{"vendor":"","quote_no":"","date":"YYYY-MM-DD or null","valid_until":null,"total":0,"freight_included":null,
 "tax_included":null,"kind":"equipment|air_devices|controls|tab|rigging|insulation|sheetmetal|other",
 "lines":[{"tags":["AC-1-1"],"description":"","qty":0,"amount":null}],
 "included":["short phrases"],"excluded":["short phrases, e.g. 'smoke detectors', 'startup', 'rigging'"],
 "notes":"lead times, alternates, anything that affects pricing"}`;

const REVIEW_INTRO = `You are the senior HVAC estimator at Northern Wolves AC reviewing an AI-read bid before pricing.
Below: what was read from every sheet and quote, plus NWAC's own estimating process rules.
Write inches as "in" inside text (6 in pipe) — never a bare " character. Every text under 30 words.
Group related items: ONE entry per equipment type / vendor / issue, with all its tags in "tags" — never one entry per tag.
Fill the fields of the record_findings tool directly.`;
// duct construction from the specification / general notes (drives which NWAC rate family prices the ductwork)
const DUCTSPEC_PROMPT = `You are the senior HVAC estimator at Northern Wolves AC. Below are the passages about ductwork taken from the
specification sheets and general notes of one bid. Decide how the NEW supply/return ductwork must be built, for pricing:
- shape: "rectangular" or "round/flat oval" (exposed spiral round or flat oval counts as round/flat oval). If both are used,
  pick the one that covers most of the new ductwork and explain in notes.
- insulation: thickness in inches and whether it is internal acoustic LINING or EXTERNAL WRAP/board (R-6 wrap ≈ 1.5 in; R-8 ≈ 2 in).
- lining_in: the internal duct LINER thickness only when the text states it in inches (e.g. 1, 1.5, 2); 0 when no liner thickness is stated.
  Never derive it from an R-value.
- exposed: is most new ductwork exposed (no ceiling)?
- other cost drivers: flex duct not allowed, aluminum or stainless sections, double-wall, painting, pressure class, sealing class.
Quote the exact words you relied on. If the passages do not say, answer "unknown" and confidence "low".
Fill the fields of the record_findings tool.`;
const DUCTSPEC_SCHEMA = { type: "object", additionalProperties: false, required: ["shape", "confidence"], properties: {
  shape: { type: "string" }, insulation_in: { type: "number" }, lining_in: { type: "number" }, insulation_type: { type: "string" }, exposed: { type: "boolean" },
  other: { type: "array", items: { type: "string" } }, evidence: { type: "array", items: { type: "string" } },
  confidence: { type: "string" }, notes: { type: "string" } } };

// part A — quotes against the drawings
const REVIEW_A = REVIEW_INTRO + `
Task: compare the quotes with the drawings. Which equipment types have no quote at all (most expensive first, max 12)?
What does each quote leave out that the drawings need (max 10)? Where do schedule counts and drawing counts disagree (max 10)?
Also write a 3-5 sentence summary for the estimator.`;
// part B — scope, questions, exclusions, risks
const REVIEW_B = REVIEW_INTRO + `
Task: find mechanical scope hidden in the general/keyed notes that vendor quotes usually exclude (max 15, with how to price it),
draft the RFIs to send before bidding (max 12), the exclusion lines for our proposal (max 20) and the main risks (max 8).`;


// ─── answer shapes (the model fills these fields through the record_findings tool) ───
const OBJS = { type: "array", items: { type: "object" } };
const STRS = { type: "array", items: { type: "string" } };
const SHEET_SCHEMA = { type: "object", additionalProperties: false, required: ["sheet_type"], properties: {
  sheet_no: { type: "string" }, sheet_title: { type: "string" }, discipline: { type: "string" }, sheet_type: { type: "string" },
  floor: { type: "string" }, scale: { type: "string" }, equipment: OBJS, air_devices: OBJS, duct_runs: OBJS, pipe_runs: OBJS,
  demo: OBJS, wet_taps: { type: "number" }, rigging: OBJS, scope_notes: OBJS, questions: STRS, confidence: { type: "string" }, notes: { type: "string" } } };
const QUOTE_SCHEMA = { type: "object", additionalProperties: false, required: ["vendor", "total"], properties: {
  vendor: { type: "string" }, quote_no: { type: "string" }, date: { type: "string" }, valid_until: { type: "string" }, total: { type: "number" },
  freight_included: { type: "boolean" }, tax_included: { type: "boolean" }, kind: { type: "string" }, lines: OBJS,
  included: STRS, excluded: STRS, notes: { type: "string" } } };
const obj = (props: Record<string, any>) => ({ type: "object", properties: props });
const REVIEW_A_SCHEMA = { type: "object", additionalProperties: false, required: ["summary", "missing_quotes"], properties: {
  summary: { type: "string" },
  missing_quotes: { type: "array", maxItems: 12, items: obj({ item: { type: "string" }, tags: STRS, suggested_vendor: { type: "string" }, why: { type: "string" } }) },
  quote_gaps: { type: "array", maxItems: 10, items: obj({ vendor: { type: "string" }, gap: { type: "string" }, impact: { type: "string" } }) },
  count_mismatches: { type: "array", maxItems: 10, items: obj({ tag: { type: "string" }, schedule: { type: "number" }, drawings: { type: "number" }, note: { type: "string" } }) } } };
const REVIEW_B_SCHEMA = { type: "object", additionalProperties: false, required: ["hidden_scope", "rfis", "exclusions"], properties: {
  hidden_scope: { type: "array", maxItems: 15, items: obj({ source: { type: "string" }, item: { type: "string" }, how_to_price: { type: "string" } }) },
  rfis: { type: "array", maxItems: 12, items: obj({ question: { type: "string" }, sheet: { type: "string" } }) },
  exclusions: { type: "array", maxItems: 20, items: { type: "string" } },
  risks: { type: "array", maxItems: 8, items: obj({ risk: { type: "string" }, severity: { type: "string" } }) } } };

// ─── vision OCR of outlined drawing text (small crops composed on one numbered sheet) ───
const OCR_SCHEMA = { type: "object", additionalProperties: false, required: ["reads"], properties: {
  reads: { type: "array", items: { type: "object", additionalProperties: false, required: ["n", "text"], properties: { n: { type: "integer" }, text: { type: "string" } } } } } };
const OCR_PROMPT = `The image holds numbered crops of text cut out of HVAC / mechanical construction drawings (duct sizes, pipe sizes, service names, scale notes, tags, short notes). The crop number is written in red at the left of each crop.
Transcribe each crop exactly as drawn. Duct sizes look like 24X12 or 24x12 (always write them with a lowercase x: 24x12); round or oval ducts like 10"Ø or 22"ø; pipe sizes like 1-1/4" or 3/4" CHWS or 2" CD; scale notes like 1/4" = 1'-0".
If a crop is upside down or turned, read it as if it were upright. Keep inch marks (") and the Ø symbol. Return an empty string for crops that are not text (linework, hatch, symbols, tiny fragments) and never guess characters you cannot see.
Return one entry for every number shown.`;

// ─── sheet triage: what is this sheet? (small renders, Haiku) — decides which sheets get the expensive read ───
const TRIAGE_SCHEMA = { type: "object", additionalProperties: false, required: ["discipline", "kind"], properties: {
  sheet_no: { type: "string" }, sheet_title: { type: "string" }, discipline: { type: "string" }, kind: { type: "string" },
  work: { type: "string" }, scale: { type: "string" }, level: { type: "string" }, confidence: { type: "string" } } };
const TRIAGE_PROMPT = `You are triaging ONE sheet of a construction bid drawing set for an HVAC (mechanical) contractor.
The images show the same sheet: 1 = the whole sheet, 2 = the title-block strip along the right edge, 3 = the lower-right corner. Read the title block and the big view titles.
Answer with the record_findings tool:
- sheet_no (e.g. M-201, M101.00), sheet_title (as printed)
- discipline: mechanical (HVAC, ventilation, refrigerant, controls) | plumbing | electrical | fire_protection | architectural | structural | civil | cover_index | other
- kind: duct_plan (HVAC floor plan with ductwork and air devices) | pipe_plan (HVAC piping: refrigerant, chilled/hot water, condensate, gas) | demo (demolition plan) | enlarged (enlarged plan / mechanical room) | riser (riser or flow diagram) | schedule (equipment schedules) | notes_legend (general notes, symbols, abbreviations, index) | details | specs | other
- work: new (proposed / new work) | existing (existing conditions only) | demo | mixed | not_applicable
- scale as printed for the main plan view (1/4" = 1'-0"), empty if none or not to scale; level: the floor or area the plan covers
- confidence: high | medium | low. Never guess: when you cannot tell, say low.`;

// ─── Claude call ──────────────────────────────────────────────────────
async function claude(model: string, content: any[], maxTokens: number, schema: any = { type: "object" }) {
  // extraction work: no extended thinking, so the whole output budget goes to the JSON answer
  // the answer comes back through a forced tool call, so the API hands us parsed, valid JSON
  const tool = { name: "record_findings", description: "Record the findings. Fill each field directly with real JSON values (arrays of objects, numbers) — never put JSON text inside a string.",
    input_schema: schema };
  const send = (extra: any) => fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content }],
      tools: [tool], tool_choice: { type: "tool", name: "record_findings" }, ...extra }),
  });
  let r = await send({ thinking: { type: "disabled" } });
  let t = await r.text();
  if (!r.ok && r.status === 400 && /thinking/i.test(t)) { r = await send({}); t = await r.text(); }
  // models that refuse a forced tool call: offer the tool, the prompt asks for it
  if (!r.ok && r.status === 400 && /tool_choice/i.test(t)) { r = await send({ thinking: { type: "disabled" }, tool_choice: { type: "auto" } }); t = await r.text(); }
  if (!r.ok && r.status === 400 && /thinking/i.test(t)) { r = await send({ tool_choice: { type: "auto" } }); t = await r.text(); }
  if (!r.ok) throw new Error("Claude API " + r.status + ": " + t.slice(0, 400));
  const j = JSON.parse(t);
  const text = (j.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
  const use = (j.content || []).find((c: any) => c.type === "tool_use");
  let data = use && use.input && typeof use.input === "object" && Object.keys(use.input).length ? use.input : null;
  // a model that packs the whole answer into one string field: unpack it
  if (data && Object.keys(data).length === 1 && typeof Object.values(data)[0] === "string") {
    try { data = parseJson(String(Object.values(data)[0])); } catch (_e) { /* keep as is */ }
  }
  if (!text && !data && j.stop_reason === "max_tokens")
    throw new Error("the model used the whole output budget before answering (" + (j.content || []).map((c: any) => c.type).join(",") + ")");
  const u = j.usage || {};
  const price = MODELS[model] || MODELS[DEFAULT_MODEL];
  const cost = ((u.input_tokens || 0) * price.in + (u.output_tokens || 0) * price.out) / 1e6;
  return { text, data, tokens_in: u.input_tokens || 0, tokens_out: u.output_tokens || 0, cost, stop: j.stop_reason };
}

function parseJson(text: string) {
  let s = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const a = s.indexOf("{");
  if (a > 0) s = s.slice(a);
  try { return JSON.parse(s.slice(0, s.lastIndexOf("}") + 1)); } catch (_e) { /* next */ }
  s = fixInches(s);
  try { return JSON.parse(s.slice(0, s.lastIndexOf("}") + 1)); } catch (_e) { return repairJson(s); }
}
// inches written inside text without escaping: 6" CWS -> 6\\" CWS
function fixInches(s: string) { return s.replace(/(\d)"(?=[ 	]*[^,}\]:\s"])/g, '$1\\"'); }
// an answer cut off at the output limit: keep every complete entry and close the brackets
function repairJson(s: string): any {
  for (let cut = s.length; cut > 0; cut = s.lastIndexOf(",", cut - 1)) {
    const part = s.slice(0, cut);
    const stack: string[] = []; let inStr = false, esc = false;
    for (const ch of part) {
      if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
      if (ch === '"') inStr = true; else if (ch === "{" || ch === "[") stack.push(ch); else if (ch === "}" || ch === "]") stack.pop();
    }
    if (inStr) continue;
    const closed = part.replace(/[,:\s]+$/, "") + stack.reverse().map((c) => (c === "{" ? "}" : "]")).join("");
    try { const o = JSON.parse(closed); o.truncated = true; return o; } catch (_e) { /* try an earlier cut */ }
  }
  throw new Error("unreadable JSON");
}

const GLYPH_NOTE = "SYMBOL GLYPHS counted from the vector layer of this sheet (one family per line: count x shape, paper size in inches, diagonal strokes inside, how many have a cfm number or a short tag beside them). Find the legend's air-device symbols among these families by shape and size: a family that matches a legend symbol gives the EXACT quantity of that device on this sheet - use that count instead of counting by eye, and say in the row's basis which family (#n) you used. Families that are tag bubbles, light fixtures, sprinkler heads, thermostats, furniture, column markers or dimension marks are not devices. A family is a device count ONLY when its number also fits what the sheet shows: most of its members carry the device's tag or a cfm, and the count is in the range of the devices you can see labelled - a family of 100+ glyphs on a floor with a dozen labelled devices is ceiling tiles, lights or sprinkler heads, not a device. A quantity taken from a glyph family has basis 'symbols (family #n)', never 'tags'.\n";

// ─── spec Q&A: the bid's specification passages (ai_est_spec_chunks, full-text search) answer the estimator's question with citations ───
const SPECQA_PROMPT = `You answer an HVAC estimator's question about THIS project's specifications and general notes.
Use only the SPEC PASSAGES below. Answer in 1 to 6 short sentences, practical for pricing (what is required, who furnishes it, sizes,
materials, thicknesses, standards). After every fact put the passage number in square brackets, e.g. [2]; quote the exact requirement
wording in quotes when it is short. When the passages do not answer the question, say so plainly (found = false) and do not guess —
you may add one line of what to confirm with the engineer. Reply in the language the question is written in.`;
const SPECQA_SCHEMA = { type: "object", additionalProperties: false, required: ["answer", "used", "found"], properties: {
  answer: { type: "string" }, used: { type: "array", items: { type: "integer" } }, found: { type: "boolean" } } };
// keywords for a second, looser search when the literal question finds nothing (drops stop words, keeps numbers and sizes)
function kbKeywords(q: string): string {
  const stop = new Set(["the", "a", "an", "of", "for", "in", "on", "to", "is", "are", "what", "how", "many", "much", "do", "does", "we", "our", "i", "it", "and", "or", "with", "per", "should", "can", "be", "at", "by", "from", "this", "that", "which", "when", "there", "any", "who", "where", "required", "shall"]);
  return q.toLowerCase().replace(/[^\w\s"'/.-]/g, " ").split(/\s+/).filter((w) => w && !stop.has(w) && w.length > 1).slice(0, 8).join(" OR ");
}

// the exact counts and vector-layer hints that go with a sheet read — identical for every pass, so repeat passes see what pass 1 saw
function sheetExtras(body: any): string {
  let extra = "";
  if (body.tag_counts && Object.keys(body.tag_counts).length)
    extra += "\n\nTAG COUNTS (exact, from the text layer of this sheet): " + JSON.stringify(body.tag_counts);
  if (body.device_tags && Object.keys(body.device_tags).length)
    extra += "\n\nDEVICE TAGS (exact, from the text layer of this sheet; device code → number of devices, TYP. multipliers already applied): " + JSON.stringify(body.device_tags);
  if (body.symbol_census && body.symbol_census.by_colour)
    extra += "\n\nCOLOURED SYMBOLS beside the bare cfm bubbles (exact, counted from the vector layer; each symbol once): " + JSON.stringify(body.symbol_census.by_colour) +
      " — bubbles with no symbol: " + body.symbol_census.no_symbol + ". USE THESE NUMBERS as the quantities of the bare-cfm device rows: one row per colour (put the colour in the tag), qty = that colour's count; your job is to say what each colour is (supply diffuser / return grille / exhaust register / round diffuser / linear) from the legend and the symbol shape. Do not count the bubbles yourself.";
  if (body.glyph_text) extra += "\n\n" + GLYPH_NOTE + String(body.glyph_text).slice(0, 3000);
  if (body.text_hint) extra += "\n\nDuct/pipe size labels found in the text layer (label ×count): " + String(body.text_hint).slice(0, 4000);
  return extra;
}

// ─── handlers ─────────────────────────────────────────────────────────
async function runPage(db: any, body: any, kind: "sheet" | "quote") {
  const { data: pg, error } = await db.from("ai_est_pages").select("id, session_id, page_no, result").eq("id", body.page_id).single();
  if (error || !pg) throw new Error("page not found");
  const { data: ses } = await db.from("ai_est_sessions").select("model").eq("id", pg.session_id).single();
  const model = MODELS[body.model] ? body.model : (ses && MODELS[ses.model] ? ses.model : DEFAULT_MODEL);
  // pass 2 / 3 = a repeat read of a plan sheet (devices the reader counted by eye, or any duct / pipe plan with duct / pipe runs —
  // the page decides, see ai-estimator.html repeatWhy): same PDF, tiles and prompt extras as pass 1; the answer goes to result.reads[]
  // with its own cost and the page reconciles the passes (devices by majority + median, duct runs per size + system, pipe runs per
  // service + size); status / result stay as they are
  const pass = Math.max(1, Math.min(5, Number(body.pass) || 1));
  if (pass === 1) await db.from("ai_est_pages").update({ status: "running", error: null, model, started_at: new Date().toISOString() }).eq("id", pg.id);

  const work = (async () => {
    if (pass > 1) {
      let entry: any = { pass, at: new Date().toISOString() };
      try {
        const content: any[] = [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: body.pdf_base64 } }];
        (body.tiles || []).slice(0, 12).forEach((t: string) => content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: t } }));
        content.push({ type: "text", text: SHEET_PROMPT + sheetExtras(body) });
        const r = await claude(model, content, 8000, SHEET_SCHEMA);
        let result: any;
        if (r.data) result = r.data; else try { result = parseJson(r.text); } catch (_e) { result = { parse_error: true }; }
        entry = { ...entry, cost: r.cost, tokens_in: r.tokens_in, tokens_out: r.tokens_out, sheet_type: result.sheet_type || null, parse_error: !!result.parse_error, truncated: r.stop === "max_tokens",
          air_devices: result.air_devices || [], equipment: result.equipment || [], duct_runs: result.duct_runs || [], pipe_runs: result.pipe_runs || [] };
      } catch (e) { entry.error = String((e as any)?.message || e).slice(0, 500); }
      const { data: cur } = await db.from("ai_est_pages").select("result, cost").eq("id", pg.id).single();
      const res0: any = (cur as any)?.result || {};
      const reads = (Array.isArray(res0.reads) ? res0.reads : []).filter((x: any) => x && x.pass !== pass);
      reads.push(entry);
      await db.from("ai_est_pages").update({ result: { ...res0, reads }, cost: (Number((cur as any)?.cost) || 0) + (entry.cost || 0) }).eq("id", pg.id);
      return;
    }
    try {
      const content: any[] = [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: body.pdf_base64 } }];
      (body.tiles || []).slice(0, 12).forEach((t: string) =>
        content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: t } }));
      content.push({ type: "text", text: kind === "quote" ? QUOTE_PROMPT : SHEET_PROMPT + sheetExtras(body) });
      const r = await claude(model, content, kind === "quote" ? 4000 : 8000, kind === "quote" ? QUOTE_SCHEMA : SHEET_SCHEMA);
      let result: any;
      if (r.data) result = r.data;
      else try { result = parseJson(r.text); } catch (_e) { result = { parse_error: true, raw: r.text.slice(0, 20000) }; }
      if (r.stop === "max_tokens") result.truncated = true;
      // what an earlier step stored on this sheet stays: the triage and the OCR'd labels (same PDF page)
      const prev: any = (pg as any).result || {};
      if (prev.triage) result.triage = prev.triage;
      if (prev.ocr_labels) result.ocr_labels = prev.ocr_labels;
      // the OCR word list (printed device tags on an outlined-text sheet — the engine's symbol-row rule needs it) and the measured
      // geometry are the page's work on the same PDF page: a re-read must not throw them away (414 M-300 lost "CD" / "CG" and priced
      // 30 "A" diffusers after a re-read)
      if (prev.ocr_words) result.ocr_words = prev.ocr_words;
      if (prev.geo) result.geo = prev.geo;
      if (prev.geo_pipe) result.geo_pipe = prev.geo_pipe;
      if (Array.isArray(body.glyph_families) && body.glyph_families.length) result.glyphs = body.glyph_families.slice(0, 16);
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
  return { ok: true, page_id: pg.id, model, queued: true, pass };
}

async function runReview(db: any, body: any) {
  const { data: ses, error } = await db.from("ai_est_sessions").select("id, model, result").eq("id", body.session_id).single();
  if (error || !ses) throw new Error("session not found");
  const model = MODELS[body.model] ? body.model : (MODELS[ses.model] ? ses.model : DEFAULT_MODEL);
  const res0 = ses.result || {};
  await db.from("ai_est_sessions").update({ result: { ...res0, review_status: "running", review_error: null } }).eq("id", ses.id);
  const work = (async () => {
    try {
      const ctx = String(body.context || "").slice(0, 600000);
      // two focused calls in parallel: each stays short and finishes well inside the time limit
      const [ra, rb] = await Promise.all([
        claude(model, [{ type: "text", text: REVIEW_A + "\n\n" + ctx }], 6000, REVIEW_A_SCHEMA),
        claude(model, [{ type: "text", text: REVIEW_B + "\n\n" + ctx }], 6000, REVIEW_B_SCHEMA),
      ]);
      const part = (r: any) => { if (r.data) return r.data; try { return parseJson(r.text); } catch (_e) { return { parse_error: true, raw: r.text.slice(0, 20000) }; } };
      const review: any = { ...part(ra), ...part(rb) };
      const r = { cost: ra.cost + rb.cost };
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

// ═══════════════════════════════════════════════════════════════════════
// E-mail intake (2026-10-21): a Google Apps Script on a mailbox calls these actions with an intake token (est_intake_tokens, one per
// organisation, created on est-organisations). No user is signed in, so they run before the sign-in gate with the service role:
//   intake_ping   { token }                                          → { ok, org }
//   intake_begin  { token, message_id, from, subject, text, links[], files:[{name,size}], received_at } → { ok, session_id, uploads:[{file_id,url}] }
//   intake_finish { token, session_id, uploaded:[file_id], skipped:[{name,why}] } → { ok }
// A bid invitation becomes an ai_est_sessions row of the token's organisation (result.intake keeps sender, subject, links, snippet); the
// files are uploaded straight to Storage through the signed URLs, and the page splits / reads them when an estimator opens the session.
// ═══════════════════════════════════════════════════════════════════════
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
async function sha256hex(s: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}
function intakeKind(name: string): string {
  const n = name.toLowerCase();
  if (/addend|\badd[-_ ]?\d|bulletin|revision|rev[-_ ]?\d/.test(n)) return "addendum";
  if (/spec|division|project[-_ ]?manual|\b\d{2}[-_ ]?\d{2}[-_ ]?\d{2}\b/.test(n)) return "specs";
  if (/\brfi\b/.test(n)) return "rfi";
  if (/quote|proposal|estimate|bid[-_ ]?form/.test(n)) return "quote";
  return "drawings";
}
function intakeName(subject: string): string {
  let s = String(subject || "").replace(/^\s*((re|fw|fwd)\s*:\s*)+/ig, "").trim();
  s = s.replace(/\b(invitation to bid|invitation for bid|bid invitation|request for proposals?|request for quotes?|rfp|rfq|itb|bid request|bid package)\b\s*[:\-–—]?\s*/ig, "").replace(/^[\s:\-–—]+|[\s:\-–—]+$/g, "");
  return (s || String(subject || "Bid by e-mail")).slice(0, 120);
}
function intakeLocation(text: string): string | null {
  const m = /\b\d{1,5}\s+(?:[NSEW]\.?\s+)?[A-Z0-9][\w.'’ ]{1,32}?\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Place|Pl|Broadway|Drive|Dr|Lane|Ln|Parkway|Pkwy|Plaza|Way)\b\.?(?:,?\s+(?:[A-Za-z .]{2,24}),?\s+(?:NY|NJ|CT|PA)\.?(?:\s+\d{5})?)?/.exec(text || "");
  return m ? m[0].replace(/\s+/g, " ").trim().slice(0, 140) : null;
}
async function intake(body: any): Promise<any> {
  if (!SB_SERVICE) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not available to the function" };
  const sb = createClient(SB_URL, SB_SERVICE, { auth: { persistSession: false } });
  const tok = String(body.token || "");
  if (!/^nwi_[0-9a-f]{40,}$/.test(tok)) return { ok: false, error: "bad intake token" };
  const { data: t } = await sb.from("est_intake_tokens").select("id, org_id, created_by, revoked_at").eq("token_hash", await sha256hex(tok)).maybeSingle();
  if (!t || (t as any).revoked_at) return { ok: false, error: "intake token not valid (revoked?)" };
  const org = (t as any).org_id as string;
  await sb.from("est_intake_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", (t as any).id);
  if (body.action === "intake_ping") {
    const { data: o } = await sb.from("est_orgs").select("name").eq("id", org).maybeSingle();
    return { ok: true, org: (o as any)?.name || "" };
  }
  if (body.action === "intake_begin") {
    const mid = String(body.message_id || "").slice(0, 300); if (!mid) return { ok: false, error: "message_id missing" };
    const { data: dup } = await sb.from("est_intake_log").select("session_id").eq("org_id", org).eq("message_id", mid).maybeSingle();
    if (dup) return { ok: true, duplicate: true, session_id: (dup as any).session_id, uploads: [] };
    const subject = String(body.subject || "").slice(0, 300), text = String(body.text || "").slice(0, 20000);
    const links = (Array.isArray(body.links) ? body.links : []).map((x: any) => String(x).slice(0, 400)).slice(0, 25);
    const files = (Array.isArray(body.files) ? body.files : []).slice(0, 40);
    const due = (/(?:bids?\s+(?:are\s+)?due|due\s+(?:date|by|on)?|submission\s+deadline|deadline)[^\n]{0,80}/i.exec(text) || [""])[0].trim() || null;
    const intakeInfo = { from: String(body.from || "").slice(0, 200), subject, message_id: mid, received_at: body.received_at || new Date().toISOString(), snippet: text.replace(/\s+/g, " ").slice(0, 1200), links, due, files: files.length };
    const ses = await sb.from("ai_est_sessions").insert({ name: intakeName(subject), location: intakeLocation(subject + "\n" + text), status: "new", org_id: org, created_by: (t as any).created_by || null,
      notes: "Received by e-mail from " + intakeInfo.from + (due ? " — " + due : ""), result: { intake: intakeInfo } }).select("id").single();
    if (ses.error || !ses.data) return { ok: false, error: "session: " + (ses.error?.message || "not created") };
    const sid = (ses.data as any).id as string;
    const uploads: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const nm = String(files[i].name || ("file" + i + ".pdf")).slice(0, 160), safe = nm.replace(/[^\w.\- ]+/g, "_");
      const path = sid + "/" + Date.now() + "_" + i + "_" + safe;
      const su = await sb.storage.from("ai-estimator").createSignedUploadUrl(path);
      if (su.error || !su.data) return { ok: false, error: "signed url: " + (su.error?.message || "none"), session_id: sid };
      const fr = await sb.from("ai_est_files").insert({ session_id: sid, kind: intakeKind(nm), file_name: nm, storage_path: path, size: Number(files[i].size) || null }).select("id").single();
      if (fr.error || !fr.data) return { ok: false, error: "file row: " + (fr.error?.message || "none"), session_id: sid };
      uploads.push({ file_id: (fr.data as any).id, name: nm, path, url: su.data.signedUrl, token: (su.data as any).token });
    }
    await sb.from("est_intake_log").insert({ org_id: org, token_id: (t as any).id, message_id: mid, from_email: intakeInfo.from, subject, session_id: sid, files: files.length, links, status: "received" });
    return { ok: true, session_id: sid, name: intakeName(subject), uploads };
  }
  if (body.action === "intake_finish") {
    const sid = String(body.session_id || ""); if (!sid) return { ok: false, error: "session_id missing" };
    const { data: ses } = await sb.from("ai_est_sessions").select("id, org_id").eq("id", sid).maybeSingle();
    if (!ses || (ses as any).org_id !== org) return { ok: false, error: "session not found for this token" };
    const up: string[] = (Array.isArray(body.uploaded) ? body.uploaded : []).map(String);
    const { data: rows } = await sb.from("ai_est_files").select("id").eq("session_id", sid);
    const lost = ((rows as any[]) || []).filter((r) => up.indexOf(r.id) < 0).map((r) => r.id);
    if (lost.length) await sb.from("ai_est_files").delete().in("id", lost);
    const skipped = (Array.isArray(body.skipped) ? body.skipped : []).slice(0, 40);
    await sb.from("est_intake_log").update({ files: up.length, skipped, status: up.length ? "ready" : "failed", note: lost.length ? lost.length + " upload(s) did not arrive" : null }).eq("org_id", org).eq("session_id", sid);
    return { ok: true, files: up.length, dropped: lost.length };
  }
  return { ok: false, error: "unknown intake action" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  { const peek = await req.clone().json().catch(() => null); if (peek && typeof peek.action === "string" && peek.action.indexOf("intake_") === 0) { try { return json(await intake(peek)); } catch (e) { return json({ ok: false, error: String((e as any)?.message || e).slice(0, 300) }, 500); } } }
  if (!ANTHROPIC_KEY) return json({ ok: false, error: "ANTHROPIC_API_KEY secret is not set" }, 500);
  try {
    const auth = req.headers.get("Authorization") || "";
    // act as the signed-in user: RLS decides what the function may read and write
    const db = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: u } = await db.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (!u || !u.user) return json({ ok: false, error: "Please sign in" }, 401);
    const { data: prof } = await db.from("profiles").select("role").eq("id", u.user.id).single();
    // multi-tenant (roadmap item 8): a member of any organisation may call it — RLS scopes every read and write to that org's rows;
    // NWAC office roles are members of the NWAC org, other orgs' users carry whatever profile role they signed up with
    let member = false;
    try { const { count } = await db.from("est_org_members").select("org_id", { count: "exact", head: true }).eq("user_id", u.user.id); member = (count || 0) > 0; } catch (_) { member = false; }
    if (!member && (!prof || OFFICE.indexOf(prof.role) < 0)) return json({ ok: false, error: "Not a member of an estimating organisation" }, 403);

    const body = await req.json();
    if (body.action === "sheet") return json(await runPage(db, body, "sheet"));
    if (body.action === "quote") return json(await runPage(db, body, "quote"));
    if (body.action === "review") return json(await runReview(db, body));
    if (body.action === "ductspec") {
      const { data: ses } = await db.from("ai_est_sessions").select("id, model, result").eq("id", body.session_id).single();
      if (!ses) return json({ ok: false, error: "session not found" }, 404);
      const model = MODELS[ses.model] ? ses.model : DEFAULT_MODEL;
      const r = await claude(model, [{ type: "text", text: DUCTSPEC_PROMPT + "\n\n" + String(body.text || "").slice(0, 60000) }], 1500, DUCTSPEC_SCHEMA);
      let spec: any = r.data;
      if (!spec) { try { spec = parseJson(r.text); } catch (_e) { spec = { confidence: "low", notes: "unreadable answer" }; } }
      spec.at = new Date().toISOString(); spec.cost = r.cost;
      const { data: cur } = await db.from("ai_est_sessions").select("result").eq("id", ses.id).single();
      const prevChoice = cur?.result?.duct_spec?.choice;
      if (prevChoice) spec.choice = prevChoice;
      await db.from("ai_est_sessions").update({ result: { ...(cur?.result || {}), duct_spec: spec } }).eq("id", ses.id);
      return json({ ok: true, spec });
    }
    if (body.action === "specqa") {
      const { data: ses } = await db.from("ai_est_sessions").select("id, name, model").eq("id", body.session_id).single();
      if (!ses) return json({ ok: false, error: "session not found" }, 404);
      const question = String(body.question || "").trim().slice(0, 1500);
      if (!question) return json({ ok: false, error: "Ask a question" }, 400);
      let hits: any[] = [];
      const s1 = await db.rpc("ai_est_spec_search", { sid: ses.id, q: question, lim: 14 });
      if (s1.error && /ai_est_spec_search|does not exist/i.test(s1.error.message)) return json({ ok: false, error: "run ai-est-spec-schema.sql in Supabase first" }, 500);
      if (!s1.error) hits = s1.data || [];
      if (hits.length < 4) {
        const s2 = await db.rpc("ai_est_spec_search", { sid: ses.id, q: kbKeywords(question), lim: 14 });
        if (!s2.error) { const seen = new Set(hits.map((h: any) => h.chunk_id)); (s2.data || []).forEach((h: any) => { if (!seen.has(h.chunk_id)) hits.push(h); }); }
      }
      hits = hits.slice(0, 16);
      const passages = hits.length
        ? hits.map((h: any, i: number) => `[${i + 1}] ${h.sheet_no || "sheet"} p.${h.page_no ?? "-"}${h.section ? " — " + h.section : ""}${h.clause ? " §" + h.clause : ""}\n${String(h.content).slice(0, 1800)}`).join("\n\n")
        : "(no passages matched the question — the specs may not cover it, or they are not indexed yet)";
      const history = (Array.isArray(body.history) ? body.history.slice(-3) : []).map((h: any) => "Q: " + String(h.q || "").slice(0, 400) + "\nA: " + String(h.a || "").slice(0, 800)).join("\n\n");
      const model = MODELS[ses.model] ? ses.model : DEFAULT_MODEL;
      const r = await claude(model, [{ type: "text", text: SPECQA_PROMPT + "\n\nPROJECT: " + ses.name + "\n\nSPEC PASSAGES:\n" + passages + (history ? "\n\nEARLIER IN THIS CONVERSATION:\n" + history : "") + "\n\nQUESTION: " + question }], 1500, SPECQA_SCHEMA);
      let a: any = r.data;
      if (!a || typeof a.answer !== "string") { try { a = parseJson(r.text); } catch (_e) { a = { answer: r.text || "(no answer)", used: [], found: false }; } }
      const used: number[] = Array.isArray(a.used) ? a.used.map((n: any) => Number(n)).filter((n: number) => n >= 1 && n <= hits.length) : [];
      const sources = hits.map((h: any, i: number) => ({ n: i + 1, sheet: h.sheet_no, page: h.page_no, section: h.section, clause: h.clause, page_id: h.page_id, snippet: String(h.content).slice(0, 240) }));
      const row = { session_id: ses.id, question, answer: String(a.answer || ""), sources: sources.filter((s: any) => !used.length || used.indexOf(s.n) >= 0), used, found: a.found !== false && hits.length > 0, model, cost: r.cost, user_name: String(body.user_name || "").slice(0, 80) || null };
      const ins = await db.from("ai_est_spec_qa").insert(row).select("id, created_at").single();
      return json({ ok: true, id: ins.data?.id, created_at: ins.data?.created_at, answer: row.answer, found: row.found, used, sources: row.sources, hits: hits.length, cost: r.cost, model });
    }
    if (body.action === "quote_text") {
      // a rep's quote pasted from an e-mail: read like a quote PDF, stored as its own quote "file" + page (no storage object)
      const { data: ses } = await db.from("ai_est_sessions").select("id, model").eq("id", body.session_id).single();
      if (!ses) return json({ ok: false, error: "session not found" }, 404);
      const text = String(body.text || "").trim().slice(0, 60000);
      if (text.length < 40) return json({ ok: false, error: "paste the quote text first" }, 400);
      const model = MODELS[ses.model] ? ses.model : DEFAULT_MODEL;
      const r = await claude(model, [{ type: "text", text: QUOTE_PROMPT + (body.vendor_hint ? "\n\nThe quote came from: " + String(body.vendor_hint).slice(0, 120) : "") + "\n\nQUOTE (text of the e-mail):\n" + text }], 4000, QUOTE_SCHEMA);
      let result: any = r.data;
      if (!result) { try { result = parseJson(r.text); } catch (_e) { return json({ ok: false, error: "the quote could not be read — is it a quote?" }, 422); } }
      result.source = "email_text"; result.email_excerpt = text.slice(0, 3000);
      const name = "E-mail quote — " + (result.vendor || body.vendor_hint || "vendor") + (result.quote_no ? " " + result.quote_no : "");
      const f = await db.from("ai_est_files").insert({ session_id: ses.id, kind: "quote", file_name: name.slice(0, 160), storage_path: null, pages: 1, size: text.length }).select("id").single();
      if (f.error) return json({ ok: false, error: f.error.message }, 500);
      const now = new Date().toISOString();
      const pg = await db.from("ai_est_pages").insert({ session_id: ses.id, file_id: f.data.id, page_no: 1, sheet_type: "quote", sheet_no: result.quote_no || null, sheet_title: result.vendor || null, status: "done", result, model,
        tokens_in: r.tokens_in, tokens_out: r.tokens_out, cost: r.cost, started_at: now, finished_at: now }).select("id").single();
      if (pg.error) return json({ ok: false, error: pg.error.message }, 500);
      return json({ ok: true, page_id: pg.data.id, file_id: f.data.id, quote: { vendor: result.vendor, quote_no: result.quote_no, total: result.total, lines: (result.lines || []).length, kind: result.kind }, cost: r.cost });
    }
    if (body.action === "ocr") {
      const model = MODELS[body.model] ? body.model : "claude-haiku-4-5";
      const img = String(body.image || "").replace(/^data:image\/\w+;base64,/, "");
      if (!img || img.length > 9_000_000) return json({ ok: false, error: "image missing or too large" }, 400);
      const r = await claude(model, [{ type: "image", source: { type: "base64", media_type: "image/png", data: img } },
        { type: "text", text: OCR_PROMPT + "\nNumbers shown: 1 to " + (Number(body.n) || 30) }], 3000, OCR_SCHEMA);
      let reads: any = r.data && (r.data as any).reads;
      if (!Array.isArray(reads)) { try { reads = (parseJson(r.text) || {}).reads; } catch (_e) { reads = []; } }
      return json({ ok: true, reads: reads || [], cost: r.cost, model });
    }
    if (body.action === "triage") {
      const model = MODELS[body.model] ? body.model : "claude-haiku-4-5";
      const imgs = (Array.isArray(body.images) ? body.images : []).slice(0, 4).map((x: any) => String(x).replace(/^data:image\/\w+;base64,/, "")).filter((x: string) => x && x.length < 6_000_000);
      if (!imgs.length) return json({ ok: false, error: "images missing" }, 400);
      const content: any[] = imgs.map((data: string) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } }));
      content.push({ type: "text", text: TRIAGE_PROMPT + (body.text_hint ? "\n\nText from the PDF text layer of this sheet (may be empty or partial): " + String(body.text_hint).slice(0, 1500) : "") });
      const r = await claude(model, content, 700, TRIAGE_SCHEMA);
      let tri: any = r.data;
      if (!tri) { try { tri = parseJson(r.text); } catch (_e) { tri = null; } }
      if (!tri) return json({ ok: false, error: "unreadable triage answer" }, 502);
      return json({ ok: true, triage: tri, cost: r.cost, model });
    }
    if (body.action === "ping") return json({ ok: true, user: u.user.email, role: prof.role });
    return json({ ok: false, error: "unknown action" }, 400);
  } catch (e) {
    return json({ ok: false, error: String((e as any)?.message || e) }, 500);
  }
});
