// ═════════════════════════════════════════════════════════════════
//  est-kb-chat — Supabase Edge Function (NWAC estimating rules assistant)
//  Answers estimators' questions from the knowledge library (est_kb_docs / est_kb_chunks: MCAA, SMACNA, ACCA,
//  NYC code, NWAC company rules) with document + page citations. Full-text search (est_kb_search) picks the
//  passages, Claude writes the answer. The Anthropic key lives only here (secret ANTHROPIC_API_KEY).
//  POST { question, history?: [{ q, a }] }  → { ok, answer, sources: [{ title, org, page, snippet }], model }
// ═════════════════════════════════════════════════════════════════
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY") || (() => {
  try { return String(Object.values(JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}"))[0] || ""); } catch (_e) { return ""; }
})();
const OFFICE = ["admin", "manager", "lead_pm", "project_manager", "apm", "estimator"];
const MODEL = "claude-sonnet-5";
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (o: any, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SYSTEM = `You are the estimating rules assistant of Northern Wolves AC (NWAC), a mechanical / HVAC contractor in New York and New Jersey.
Estimators ask you about company rules, labor units, duct and pipe construction standards, codes and pricing conventions.
Answer from the LIBRARY PASSAGES first. Cite every fact you take from them as [Title, p. N]. Be short and practical: numbers, units,
the rule, then one line of context. If the passages do not cover the question, say "Not in the library" and then give general
industry guidance clearly marked as general (MCAA / SMACNA / ACCA practice as you know it), never invented page numbers.
Company rules (org NWAC) override industry manuals when they conflict. Reply in the language the question is written in.`;

async function claudeText(system: string, messages: any[], maxTokens: number) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error("Claude API " + r.status + ": " + t.slice(0, 300));
  const j = JSON.parse(t);
  return { text: (j.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n"), usage: j.usage || {} };
}

// keywords for a second, looser search when the literal question finds nothing (drops stop words, keeps numbers and sizes)
function keywords(q: string): string {
  const stop = new Set(["the", "a", "an", "of", "for", "in", "on", "to", "is", "are", "what", "how", "many", "much", "do", "does", "we", "our", "i", "it", "and", "or", "with", "per", "should", "can", "be", "at", "by", "from", "this", "that", "which", "when", "there", "any"]);
  return q.toLowerCase().replace(/[^\w\s"'/.-]/g, " ").split(/\s+/).filter((w) => w && !stop.has(w) && w.length > 1).slice(0, 8).join(" OR ");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  if (!ANTHROPIC_KEY) return json({ ok: false, error: "ANTHROPIC_API_KEY secret is not set" }, 500);
  try {
    const auth = req.headers.get("Authorization") || "";
    const db = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: u } = await db.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (!u || !u.user) return json({ ok: false, error: "Please sign in" }, 401);
    const { data: prof } = await db.from("profiles").select("role").eq("id", u.user.id).single();
    if (!prof || OFFICE.indexOf(prof.role) < 0) return json({ ok: false, error: "Office roles only" }, 403);

    const body = await req.json();
    const question = String(body.question || "").trim().slice(0, 2000);
    if (!question) return json({ ok: false, error: "Ask a question" }, 400);

    let hits: any[] = [];
    const s1 = await db.rpc("est_kb_search", { q: question, lim: 14 });
    if (!s1.error) hits = s1.data || [];
    if (hits.length < 4) {
      const s2 = await db.rpc("est_kb_search", { q: keywords(question), lim: 14 });
      if (!s2.error) { const seen = new Set(hits.map((h: any) => h.chunk_id)); (s2.data || []).forEach((h: any) => { if (!seen.has(h.chunk_id)) hits.push(h); }); }
    }
    hits = hits.slice(0, 16);
    const passages = hits.length
      ? hits.map((h: any, i: number) => `[${i + 1}] ${h.title}${h.org ? " (" + h.org + ")" : ""}, p. ${h.page ?? "-"}${h.section ? " — " + h.section : ""}\n${String(h.content).slice(0, 1800)}`).join("\n\n")
      : "(no passages matched — the library may not cover this yet)";

    const history = Array.isArray(body.history) ? body.history.slice(-4) : [];
    const messages: any[] = [];
    history.forEach((h: any) => { if (h && h.q && h.a) { messages.push({ role: "user", content: String(h.q).slice(0, 1000) }); messages.push({ role: "assistant", content: String(h.a).slice(0, 2000) }); } });
    messages.push({ role: "user", content: `LIBRARY PASSAGES:\n${passages}\n\nQUESTION: ${question}` });

    const a = await claudeText(SYSTEM, messages, 1200);
    const sources = hits.map((h: any) => ({ title: h.title, org: h.org, page: h.page, doc_id: h.doc_id, snippet: String(h.content).slice(0, 220) }));
    await db.from("est_kb_chat_log").insert({ question, answer: a.text, sources, model: MODEL, tokens_in: a.usage.input_tokens || null, tokens_out: a.usage.output_tokens || null });
    return json({ ok: true, answer: a.text, sources, model: MODEL, hits: hits.length });
  } catch (e) {
    return json({ ok: false, error: String((e as any)?.message || e).slice(0, 500) }, 500);
  }
});
