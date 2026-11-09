# SRDS punch list response - what to confirm or collect before it goes to Gabe

Gabe's request: 11/9/2026 email "FW: SRDS - HVAC Punchlist (from MEP Engineer)" - formal letter on letterhead with the
status of each of the 17 J&U items plus backup. Payment is being held on close-out (Gabe 10/20: "we have been asking
since June for closeout materials"). AFP #14 ($22,961.25, approved 9/21) and retainage / final invoice #15 are open.

The draft letter and binder are built by `build_response.py`. Yellow text in the letter = not yet backed by an email
or a document. Fix the wording in ITEMS / OTHER, drop files into `backup/` with the exhibit names, set DRAFT = False.

## Documents to get (exhibits)

| Exhibit | What | From | Notes |
|---|---|---|---|
| 1-D | HVAC ductwork + piping as-builts | Alex Santos, MEC4 (contact@mec4.com) | 9/8 Alex: "just a matter of updating the stamp to as-built... can be done tomorrow". Never received / sent. Lorrany 9/2 also wants 23 05 93 TAB schematics. |
| 1-E | AME BMS as-builts / O&M, submittal 25-05617 | Already in Ruslan's Gmail: James Winship 9/8 "close-out docs" | File too large to pull here - save it as `backup/1-E AME BMS As-Builts 25-05617.pdf`. Never forwarded to March. |
| 2-B | Boiler start-up / combustion report (5/20-5/21) | ADE / Lochinvar start-up tech | Not found anywhere in email. Alberto's 5/20 "report" was only an internal narrative. |
| 2-C | RTU start-up reports (Greenheck, ADE) | Ryan Adams, ADE | Not found in email. |
| 3 | AME point-to-point checkout / start-up checklist | James Winship / Arth Patel, AME | Not found in email. Also ask AME for occupied/unoccupied schedule screenshot (item 4) and thermostat lock-out confirmation (item 6). |
| 8 | Training certification signed by school staff | Scott Kirsch (school) / Gabe | Unsigned letter sent 10/6; Lorrany 10/7 "We just need Gabe to review." |
| P | Dated field photos | Andrei / Anwar on site | Items 9, 10, 11, 12, 13, 14, 15, 17 and the access doors. |

## Field facts to confirm (Andrei / Anwar)

- Item 9: condensate drains actually replaced with type L copper at every RTU (only Alberto's 8/10 "Completed").
- Item 10: RTU-1 sound blankets - ordered from Greenheck ~8/19 (6-week lead). Delivered? Installed? No PO found in email.
- Item 11: curb boot insulation redone (was planned 8/12 with Anwar). Anwar's invoices 232-264 (8/26) may cover it.
- Item 12: 3 L-brackets at the expansion tanks (planned 8/12).
- Item 13: fin tube corner pieces (Gabe 8/14: CO #2 fin tube held at 75% waiting on corner pieces).
- Item 14: rooftop fireplace exhaust fan control panel cover - no email at all. Related: Gabe 9/10 EF-2/EF-3 not
  running; AME 9/14 "120-volt power is not HOT to our EF control panel" (electrician item).
- Item 17: ABEU firestopping was tied to the CUH-3 day (8/12) that did not happen.
- Access doors: 2 doors (WB BP-350 24x24, order WB26-44923) delivered 8/18 - installed?
- CUH-3: 120 V Stelpro 2 kW substitute proposed by Alberto 8/19, no March approval found. Decide and close.
- RTU status this heating season: Gabe 9/8 RTU-2 not cooling / VFD resets, RTU-3 VFD resets, RTU-6 disabled in BMS;
  AME 9/14 wants the RTU factory sequence changed so classrooms are not sub-cooled when the HW plant is off. ADE call
  9/21 - outcome unknown.

## Other close-out items

- Attic stock: 3 fusible links (165 F) delivered to our office 10/6 - ask Lorrany where to deliver.
- B&G RO-5 DP read-out kit (spec 23 21 16): obsolete per Ferguson 10/9, no replacement. Gabe 10/8: no waiver without
  a credit. Ruslan told Gabe 10/20 the kit was "ordered... two weeks" - no order found. Pick an equivalent
  differential pressure meter (e.g. a digital hydronic manometer kit) or offer a credit, and fix the statement.
- Two unused Yaskawa V1000 VFDs (cancelled fans) - ADE: special order, 40% restocking if returnable at all.
- ADE last open invoice ADE-243102 $497.45 and final waiver (Ruslan 11/2).

## Request emails (ready to send)

**To AME (James Winship, Arth Patel)** - Subject: SRDS - close-out backup needed for MEP punch list response
> James, Arth - March has asked for a formal response with backup on the J&U punch list. From AME we need:
> (1) the controls start-up / point-to-point checkout showing all points provided and tested (item 3);
> (2) a screenshot or trend showing the occupied / unoccupied schedules working (item 4);
> (3) written confirmation that the space thermostats are locked out / limited per the owner (item 6);
> (4) confirmation the EF-2 / EF-3 control panel issue from 9/14 is resolved.
> We already have your 25-05617 as-built submittal and will include it. Please send by ___. Thanks.

**To ADE (Ryan Adams)** - Subject: Saddle River Day School - start-up reports for close-out
> Ryan - for the school's close-out we need the start-up reports for the five Greenheck RTUs and the boiler
> start-up / combustion test from May 2026 (we have your 6/3 VFD report). Please send PDFs by ___.
> Also: status of the RTU-1 compressor sound blankets ordered in August. Thanks.

**To MEC4 (Alex Santos)** - Subject: Saddle River - as-built ductwork and piping drawings
> Alex - please send the final as-built ductwork and piping drawings for Saddle River (PDF, as-built stamp) as
> discussed 9/8. Also the TAB schematics if you have the balancer's marked-up set. Thanks.
