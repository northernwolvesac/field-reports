# Snowflake - Perimeter Linear Diffusers (new CO, number TBD) - 7 Times Square Fl 29-31

- Project 11010174, GC Structure Tone. Source: our shop drawings M-529 / M-530 / M-531 SD R2 (two sheets per floor,
  A = north half, B = south half), revision clouds = perimeter linear diffusers. M-529 / M-530 dated 10/02/2026,
  M-531 title block still 08/17/2026.
- Typical bubbled item: linear supply diffuser in plenum box O.D. 48x4x26 with 1/2" lining at the window wall, short
  12x10 branch (one 10x8 at 29-6) with VD/CO off the flat oval perimeter main. Sketching note: coordinate soffit
  openings with GC, field-adjust branch offsets to clear framing and align with linear diffuser locations.
- Bulletin 3 engineer design served the perimeter with ceiling linear diffusers (G tags) set in from the window line.

## Quantities (rev 0, 10/05/2026, no pricing)
| Floor | Areas | Linear diffusers / plenum boxes | CFM | Branches | VD/CO tagged |
|---|---|---|---|---|---|
| 29th | 6 (29-1..29-6) | 23 | 6,400 | 22 x 12x10 + 1 x 10x8 | 18 |
| 30th | 3 (30-1..30-3) | 12 | 3,300 | 12 x 12x10 | 12 |
| 31st | 6 (31-1..31-6) | 14 | 3,800 | 14 x 12x10 | 3 |
| Total | 15 | 49 | 13,500 | 49 | 33 |

Per area (location, CFM, branch lengths, main in the cloud) is in the `AREAS` list in `build_breakdown.py`;
counts are checked against the PLENUM / CFM text inside each cloud. Clouds are found from the red arc paths.

## Open questions before pricing
1. What is deleted / credited: Bulletin 3 has 36 G ceiling linear diffusers (13,400 CFM) in the clouds
   (29th 17, 30th 8, 31st 11 - per area in `build_comparison.py` output). Delete with branches? Any installed?
2. Perimeter mains inside the clouds: existing to remain (new taps only) or new / rerouted (29-1 corner shows a
   26.1/10 offset down and reroute along Broadway)?
   -> 1 and 2: Bulletin 3 vs SD R2 screenshots sent to Ruslan 10/05 (`Perimeter Linear Diffusers - Bulletin 3 vs
   SD R2.pdf`, built by `build_comparison.py`), waiting on his confirmation.
3. ANSWERED 10/05: we furnish and install the linear diffusers and plenum boxes - price them.
4. ANSWERED 10/05: VD/CO on every connection (49).
5. ANSWERED 10/05: no CO number yet. Soffit openings / access by GC.

## Files
- `Perimeter Linear Diffusers - Breakdown by Floor.pdf` (7 pages: summary, then per floor screenshots + quantities)
  and `.xlsx` (quantities by area with empty Material $ / Labor MH / Total $ columns for pricing).
- `Perimeter Linear Diffusers - Bulletin 3 vs SD R2.pdf` (6 pages) by `build_comparison.py`: per area the Bulletin 3
  crop (cloud outline dashed) next to the SD R2 crop, G count vs LD count, main in cloud. SD R2 maps onto Bulletin 3
  as B3 = 0.5 x SD + t per sheet, fitted on room numbers (exact).
- `source/` - the three SD R2 PDFs.
