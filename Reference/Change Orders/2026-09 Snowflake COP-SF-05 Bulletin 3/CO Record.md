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
