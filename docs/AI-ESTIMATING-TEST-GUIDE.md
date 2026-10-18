# AI Estimating — what to try on a live bid (built 2026-10-17/18, app v456)

Everything below is live at app.northernwolvesac.com → Estimating → AI Estimator. Open a real bid (not a BENCH session),
upload the drawing set + specs + the quotes you have, press **Read**, then **Measure ducts & pipes**, then **Price it**.
Each feature lists what to look at and what to tell me.

## 1. Runner (Read button)
- Reads run 4 sheets at a time; failed sheets retry on their own (3 attempts); the card shows "2 of 9 sheets · 3 min · about
  4 min left · $0.41". Closing the tab mid-way is fine: reopen the session, the button says **Resume**.
- Feedback: did a run ever stop or get stuck? Did "reading in another tab" show when two people opened the same bid?
  Cost + minutes per bid (header: "last run N sheets in M min, $X").

## 2. Repeat reads (vision-only sheets)
- Sheets without device tags in the PDF text (outlined / scanned text) are read 2–3 times; the row says
  "🔁 read 3× — A3 7/10/8 → 8". Expect ~2–3× the cost on those sheets only.
- Feedback: does the final count match what you see on the sheet? Any sheet read 3× that should not have been?

## 3. Symbol glyphs (untagged sheets)
- The reader gets a census of drawn symbol families ("69 × square 0.05 in with 4 strokes …") and should use the family that
  matches the legend as the device count. Row shows the counts in the Found column.
- Feedback: outlets over/under-counted on sheets with no tags? Which symbol family was it (legend row)?

## 4. Equipment card (3 · Equipment)
- One row per scheduled tag: qty schedule / plans, pricing chip (quoted by X · in package quote · price entered · BUDGET —
  quote needed · not priced + reason). Type a unit price → "Price it" uses it instead of the budget.
- **✉ Request quotes**: e-mail the unquoted tags to the rep (reps found from Vendors → manufacturers; edit To / text before
  sending). **📋 Paste a quote e-mail** (card 1): paste the rep's reply, it becomes a quote like a PDF.
- Feedback: wrong chip on any tag (quoted when it is not, budget when a quote covers it)? Rep lookup right? Did the pasted
  e-mail read vendor / tags / total correctly?

## 5. Pipes
- Pipe runs are measured from the piping plans (dash-dot bars now bridged). **Pipe lines** select (next to Duct construction):
  "one line = supply + return — count twice" when the legend draws both pipes as one line (645 Madison style).
- Feedback: per-size feet vs your takeoff; any sheet where wall / outline lines were priced as pipe?

## 6. Takeoff → AI review tab
- Takeoff page, left panel "AI review": every AI item (equipment, air devices, each measured run) per sheet; click = zoom
  to it (tags get rings on every place they are printed, N cycles); **Enter** accept, **E** correct, **X** delete,
  **A** accept the whole group, J/K next/previous. Decisions are stored; device/equipment corrections change the price on the
  next "Price it"; run corrections change the takeoff quantities directly.
- Feedback: how long does a full review take vs tracing by hand? Which corrections repeat (that is what we feed back
  into the reader)? Anything you could not locate on the plan?

## 7. Ask the specs (5 · Ask the specs)
- Spec / notes sheets are indexed automatically after the read (no AI cost). Ask in plain words (EN or RU); the answer
  cites [n] passages with section §clause, sheet and page; "Open questions from the read" prefills the engine's questions.
- Feedback: answers that were wrong or missed a clause you know is there (tell me the sheet + clause).

## 8. Addenda diff
- Upload an addendum / revised sheet into the same session (kind "Addendum / revision"). After read + measure the row
  shows "Δ vs M-101: duct 516 → 540 ft, 2 device rows changed, +12 / −3 text lines" with a modal of the full comparison;
  review decisions on unchanged rows carry over.
- Feedback: did the pairing pick the right sheet? Changes missed or false (e.g. only a title-block date changed)?

## 9. Benchmark page (AI Estimator → 📊 Benchmark)
- 25 past jobs vs Procore truth, recomputed per app version: duct 7.3 % mean error (17 of 20 within ±15 %), outlets 15 %,
  pipe 10 %, linear diffusers 48 %. "Recompute" after each engine change; truth figures editable; "Procore" pulls truth.
- Feedback: a job you want added (needs the drawing set + the Procore takeoff).

## What to collect per bid
- Minutes: read, measure, review, and your own time to a sendable number.
- Cost line from the header.
- A list of corrections you made (the review tab keeps them — just tell me which sheets).
- Anything the engine flagged ("To check before this goes out") that was wrong or unnecessary.
