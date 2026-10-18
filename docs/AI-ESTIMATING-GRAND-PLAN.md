# AI Estimating — Grand Plan (internal tool → product)

Written 2026-10-17 after Rebar AI (withrebar.ai) reached out. This file is the brief for the dedicated
"AI Estimating" session: read it first, then the memory notes it points to.

## 1. Where we stand today (honest)

What exists in the app (live at app.northernwolvesac.com, repo northernwolvesac/field-reports):

| Piece | State | Notes |
|---|---|---|
| Sheet reader (Edge Function `ai-estimator`, Claude Sonnet) | works | one call per sheet, typed schema: equipment, air devices, duct/pipe runs, schedules, quotes, specs; ~45–80 s, $0.10–0.19 per sheet |
| Duct geometry (`geo-takeoff.js`, worker) | good on vector sets | 20-job bench vs Procore truth: mean error ≈ 7–13 %, 16/20 within ±15 %; scale self-calibration, scope zones, match lines, risers, single-line fallback, slot diffusers (v416/v431) |
| Vision OCR for outlined-text sets | works, slow | second pass for empty cells (v409); still the main source of instability |
| Air devices | tagged sheets good, untagged weak | text-layer census (TYP multipliers, letter-suffix codes v433), colour census for bare-cfm sheets (v428), slot glyphs (v431); vision-only sheets drift run to run |
| Pipes | partial | L'Catteron −9 %, 645 Madison −51 % (supply+return on one line), most jobs have no pipe sheet in the bench |
| Pricing engine (`est-engine.js`) | works | Procore unit rates (843 norms), Kastriot's standards, duct families from specs, services/crane rules, flags + questions |
| Estimate / Takeoff pages | mature for internal use | Procore-parity takeoff (layers, catalog 3,223 items), estimate versions, proposal PDF, quotes |
| Bid Board | works | 1,857 Procore bid projects imported (315 with layers/lines/plans), Procore sync, PM assignments |
| Benchmark corpus | unique asset | 28 BENCH sessions, 43,688 Procore takeoff lines = ground truth no startup has |
| Infra | hobby-grade | GitHub Pages PWA, Supabase Pro, Edge Function 150 s limit, no multi-tenant, no SOC 2, one developer |

Code: ai-estimator.html 944 lines, est-engine.js 758, geo-takeoff.js 1,985, takeoff.html 2,241, estimating.html 3,640, Edge Function 383.

## 2. What Rebar is (from their site, press and the e-mail)

- Founded Oct 2024 (Evan Brown, ex-HVAC estimator; Andrew Schwartz). $14 M Series A March 2026 (Prudence lead). ~50 people, NYC. ~40 customers reported in March 2026; site says "140+ suppliers and contractors, 100,000+ projects".
- Core market so far: **manufacturer reps and distributors** (equipment quoting from schedules). Mechanical contractors are the newer segment, which is why they are cold-e-mailing us.
- Product surface: bid inbox triage (reads/tags/prioritises RFQs, dedupes), Bid Board, takeoff (schedules → equipment counts with "live manufacturer pricing"; AI ductwork runs with length/weight/material/accessories traced on the plan), review queue ("every number reviewed", each item links to its spot on the plan), spec Q&A with citations, addenda kept with the job, CRM, market analytics. SMACNA Premier Partner, AHR 2026 innovation award, SOC 2 Type I.
- Claims: "60 % faster". **No accuracy figures anywhere.** No public pricing (demo only). Onsite onboarding.
- Their screenshot (hotel, meyers+associates): coloured traced ducts and equipment per page, equipment tabs (ACCUs, BFPs, CUs, DOAS, EFs, FCUs…), a Breakout/Summary table with Symbol / Tag / Quantity / Type / Manufacturer / Model. That is the Takeoff page we already have, with better polish and a per-item review flow.

Read: they are well funded and sales-led; their technical moat is unclear (same foundation models we use). Their real moat is distribution (SMACNA, reps) and the review UX.

## 3. Strategic take

1. **Do not try to out-SaaS a $14 M company this year.** We cannot match sales, support, SOC 2 and onboarding with one developer and an owner who runs an HVAC company.
2. **Our unfair advantages** — lean on them:
   - 1,857 real bids with 43 k priced lines from a working NYC mechanical contractor = benchmark + training data + unit rates that are real, not vendor estimates.
   - A full contractor loop: bid → estimate → takeoff → award → CO/RFI → billing → WIP → labor cost. Rebar stops at the quote.
   - Owner-operator knowledge (Kastriot's standards, Russ's scope rules) baked into the engine.
   - **Published accuracy.** Rebar shows none. A tool that prints "duct within ±10 % on 20 awarded jobs, here is the table" is a credible pitch to any estimator.
3. **Product path = design partners, not a launch.** Make the estimator product-grade for NWAC first, then give it to 3–5 friendly NY/NJ mechanical contractors and reps for free in exchange for plans + their takeoffs (more truth data). Charge only once the benchmark and the review UX hold up on other people's drawings.
4. **Separate the product from the field app** early at the data layer (its own Supabase project, multi-tenant from day one), later at the repo level. Keep one code base for the engine (`geo-takeoff.js`, `est-engine.js`, Edge Function) so NWAC keeps benefiting.

## 4. Phases and gates

**Phase 0 — product-grade internally (now → end of 2026).** Gate: Kastriot/Bani use it on every bid without a spreadsheet beside it.
- Accuracy: duct ≤ 10 % mean on the 20-job bench; outlets ≤ 10 % on tagged sheets; stable repeat reads (same sheet twice → same counts).
- Review queue: every AI item (device, run, equipment) clickable to its location on the plan, accept / correct / delete, corrections feed the estimate and are stored (this is the training data for later).
- Spec Q&A with citations (we already read specs; add retrieval + "which clause says so").
- Addenda: diff a new sheet against the one it replaces, carry corrections forward.
- Long-job runner: move the per-sheet work from the 150-second Edge Function to a worker (Supabase background job or a small Node service) with parallel sheets and progress.
- Cost per bid printed on the session ($3–8 today).

**Phase 1 — design partners (Q1–Q2 2027).** Gate: 3 outside companies run ≥ 5 bids each and their estimators say the review takes less time than tracing.
- Multi-tenant: new Supabase project `nw-estimator`, company → users → roles, per-company storage buckets, RLS everywhere, invite flow, no NWAC data visible.
- Product brand + domain, simple landing page with the accuracy table, demo video.
- Import paths: PDF upload (have), Procore bid link (have for NWAC), e-mail-in of RFQs (new).
- Supplier/rep pricing: start with quotes PDF reading (have) + NWAC catalog; manufacturer "live pricing" only through partnerships later.
- Support: one shared channel, weekly call, bug SLA.

**Phase 2 — paid product (H2 2027).** Gate: 10 paying companies.
- Billing (Stripe), SOC 2 Type I (3–4 months, ~$20–40 k with a vendor), DPA/NDA templates, status page, backups/restore drill.
- Labor engine as a feature (Procore-rate style norms per company), bid triage inbox, analytics (win rate, $/sf by type — we already have the data for NWAC).
- Hire: one more engineer, one estimator-support person. Sales through SMACNA/MCAA chapter contacts and reps.

Kill/adjust rule: if Phase 1 partners do not come back for a third bid, stop at an internal tool and keep improving it for NWAC only.

## 5. Technical roadmap (ordered, each item is a session-sized task)

1. **Review queue UI** on the Takeoff page: AI items as a list with status (new / accepted / corrected), click → zoom to mark, keyboard accept, correction log table `est_ai_corrections`.
2. **Repeatability**: run the sheet reader twice on vision-heavy sheets and reconcile (majority / census), freeze device counts that come from the text layer.
3. **Symbol templates from the legend** (started 2026-10-16, tm7.py): crop legend symbols, match on vector + raster, count per symbol type → outlets on untagged sheets (Esquire, CENTRALE pink bars, BOSS returns).
4. **Pipe takeoff** parity with duct: pairs/single lines per service, risers, supply+return rule, fittings allowance; bench with the 4 jobs that have pipe truth.
5. **Spec Q&A with citations**: chunk the spec PDFs per section, embed, answer with clause references (Supabase pgvector).
6. **Addenda diff**: sheet-to-sheet compare (text + geometry), list of changed runs/devices.
7. **Worker runner**: move reads/geometry to a queue with parallelism and retries; cost and time per bid.
8. **Multi-tenant schema** + auth + storage layout, migration script from the current tables.
9. **Benchmark page** in-product: per-job accuracy table (duct ft, outlets, pipe, equipment) vs truth, recomputed on every engine version.
10. **Equipment from schedules → pricing**: tag counts × schedule rows × quotes/catalog, live rep quote requests (e-mail) with reply parsing.

## 6. How the sessions are split

- **This session (field-reports)**: the field app — projects, billing, submittals, field orders, labor, PMs. Stays as is.
- **New session "AI Estimating"**: everything above. Start it in the same repo (`C:\Users\User\OneDrive\Documents\field-reports`), first message: "Read docs/AI-ESTIMATING-GRAND-PLAN.md and the memory notes it names, then continue Phase 0 item 1". Memory notes to read: `project_ai_estimator.md`, `project_ai_takeoff_program.md`, `project_ai_takeoff_bench7.md`, `project_procore_parity.md`, `project_takeoff_v2.md`, `project_estimating_knowledge.md`.
- Shared files both sessions touch: `sw.js` version, `index.html` home. Rule: the estimating session bumps the SW like any other deploy; the two sessions should not edit the same page in the same hour.

## 7. Numbers to track (print them, do not guess them)

- Duct ft error per job (mean, signed, share within ±15 %), outlets error, pipe error, equipment count error.
- Reader cost and time per sheet and per bid.
- Estimator time per bid (ask Kastriot to log it for 10 bids before and after the review queue).
- Repeat-read agreement (same sheet twice).

## 8. Sources

- withrebar.ai (home, /hvac-takeoff), e-mail from Marissa Pisano 2026-10-14.
- Crunchbase News / BusinessWire / Pulse2 on the $14 M Series A (March 2026).
- Market listicles on STACK, Bluebeam Max, PlanSwift, Togal, Kreo, Beam AI, Trimble MEP (prices $175–590/user/month or $3–8 k/yr; none publish accuracy).
