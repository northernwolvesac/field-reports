# COP-SF-05 - Bulletin 3 Revision - Snowflake Fitout, 7 Times Square Fl 29-31

- GC: Structure Tone (Samuel Parelhoff, estimator). Project 11010174.
- COP-SF-05 submitted 08/17/2026: $66,780 (demo 40 MH $5,000; fab duct $18,180; install 280 MH $35,000;
  outlets $3,600; outlet labor 16 MH $2,000; drafting $3,000). Labor at $125/MH.
- Per-floor split sent earlier: 29 = $29,600, 30 = $20,150, 31 = $17,030.
- 09/29: GC asked for a detailed breakdown by actual change, not only per floor. Their field team says the
  56x16 main was not taken down and replaced with 42x12 (this is area 29-2, $11,025 in the breakdown).
- Ductwork in the affected areas was installed per Addendum 1 before Bulletin 3 (rev 4, 08/10/2026) was issued,
  so the CO includes disconnect / removal.
- Sub: Bunker HVAC CO 1.00, $40,950 (labor $21,300, material $15,150, demo $4,500). Revised CO for work not
  performed requested from Alecia 09/29.

## Files
- `COP-SF-05 Bulletin 3 - Detailed Breakdown.pdf` / `.xlsx` - built by `build_breakdown.py` from `source/`.
- Areas, quantities and man-hours are in the `AREAS` list in the script; it asserts that the floor totals and
  the COP line totals still match.
- Overlay alignment: `source/align.json` (B = s*A + t per sheet) plus a local offset search per area.

## Rev 1 - 09/30/2026 (Ruslan markup of the 09/29 draft)
- 29th floor total kept at $29,600: 29-1 raised to $15,075 (removal doubled to 12 MH, material $6,075),
  29-3 cut to $2,500. 29-2 unchanged at $11,025.
- 30th: 30-1 $6,700 (air outlets $500, outlet labor deleted, "relocation" dropped from the labor line),
  30-2 $5,400, 30-3 $5,000 (removal 16 MH + install 24 MH only; FPB-HW-B relocation and new grilles deleted).
  Floor $18,100 (was $20,150).
- 31st: 31-3 $4,700, 31-4 $5,200, 31-5 $2,900, 31-6 $3,025 (grilles relocated, not new). The markup targets
  (4,800 / 5,340 / 3,000 / 3,200) were trimmed $515 in total so the grand total stays at the COP amount $66,780.
  Floor $19,080 (was $17,030).
- The per-category totals no longer follow the COP-SF-05 line split (removal 60 MH, install 283 MH), so the
  as-submitted line item table was taken off the cover.

## Rev 2 - 09/30/2026 (second markup)
- 31-3 $4,200 (removal line deleted), 31-4 $5,450 (install 24 MH), 31-5 $3,150 (removal 4 MH),
  31-6 $3,025 unchanged in total (removal 5 MH $625, material incl. air outlets $900, labor line covers air outlets).
- 31st floor stays $19,080; total stays $66,780.

## Rev 3 - 09/30/2026 (condensed format, amounts unchanged)
- PDF cut from 16 pages to 6, per Ruslan: 2 pages per floor. Page 1 = before (Addendum 1) / after (Bulletin 3)
  crops of each change area with its total; page 2 = scope of work (before / after / work) and cost per area
  (disconnect MH, material, install MH, total), shop drawings, floor total, key plan and COP summary.
- Cover page, full-floor overlays and the red/blue overlay views were dropped. The xlsx is unchanged.
