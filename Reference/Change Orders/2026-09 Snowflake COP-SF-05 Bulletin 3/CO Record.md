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
- Cover page and the separate floor overlay pages were dropped. The xlsx is unchanged.
- Overlays put back per Ruslan: each area shows before / after / color overlay (gray unchanged, red Addendum 1
  only, blue Bulletin 3 only); the key plan on the scope page is the full-floor color overlay with legend.
  Build takes about 2 minutes (the tiled floor overlay).

## Rev 4 - 10/01/2026 (Ruslan markups of rev 3, pages 2, 4, 6)
- Markup file came back from Acrobat Fill & Sign partly damaged: page contents lost on pp. 2 and 4, only the red
  strike lines and the page 6 typed notes survived.
- 31st floor applied, total $17,030 (was $19,080): transfers changed to wall openings with transfer grilles.
  31-1 $1,280 (no removal, material $530, (4) transfer grilles); 31-2 $800 (no removal, install 4 MH, (2) grilles);
  31-3 $3,700 (install 16 MH, volume damper note deleted); 31-4 $5,750 (material $1,750, install 26 MH);
  31-5 $1,900 (removal 2 MH, install 8 MH, 12x8 offset shifted, (2) 32x16 grilles); 31-6 $2,600 (removal 4 MH,
  material $600, (2) 48x24 transfer grilles instead of TD 48x24).
- 30th floor text deletions applied (30-1 work "linear diffuser with plenum, relocate G(400) diffusers";
  30-3 "FPB-HW-B (300) with supply connections", "44x20 transfer duct relocated").
- Second markup (v2) for 29th / 30th:
  29-1 $13,875 (material $4,875, "reconnect terminal units" deleted); 29-2 $13,225 (removal 16 MH $2,000,
  material $4,975, "reconnect branch takeoffs" deleted); 29-3 $1,500 (material $500, install 6 MH). 29th stays $29,600.
  30-1 $10,300 (removal 8 MH, material $4,300, install 40 MH, F/I (2) 40x20 wall transfer grilles);
  30-2 $4,900 (material $2,400, install 20 MH, 1" AL, (2) 48x24 transfer return grilles);
  30-3 $3,950 (removal 12 MH, material $200, install 18 MH, FSD with angles). 30th $20,150 (back to the
  original per-floor split).
- Totals: 29th $29,600, 30th $20,150, 31st $17,030 = $66,780, equal to COP-SF-05 as submitted.
- Overlay legend in the screenshot page headers now drawn with colored line samples (Ruslan boxed it on p.1).
