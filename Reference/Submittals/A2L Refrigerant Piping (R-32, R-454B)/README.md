# NWAC standard submittal - Refrigerant piping for A2L refrigerants (R-32 / R-454B)

Refrigerant piping only: no condensate, water or hydronic items. Built 11/24/2026 to replace the package that came from
Sound Refrigeration A/C. That package was used on 419-421 West Broadway PH as SUB-005 Rev 0 and was returned "revise
from 410A to R32". No page of it is reused here.

## Files

- `build_a2l_package.py` builds both outputs:
  - `submittals-library/refrigerant-piping-a2l-package.pdf`: the app library template, no cover. The submittal
    generator attaches it to "refrigerant piping" submittals; the R-410A package is used only when the title says
    410A.
  - `SUB-005 Rev 1 - 419-421 West Broadway PH - Refrigerant Piping R-32.pdf`: the project resubmittal, with our cover
    and the response to the engineer's note.
- To make it for another job, add a `PROJECT` dict and call `build(out, P)`.
- `source/`: current manufacturer data sheets, downloaded 11/24/2026 from the manufacturers' own sites.

## Contents

| Section | Basis of design | Source |
|---|---|---|
| Schedules + A2L notes | NWAC (own pages) | `build_a2l_package.py` |
| Copper tube | Mueller Streamline ACR, ASTM B280, UL 700 psig | muellerstreamline.com submittal #520, standards #496, UL statement #499 |
| Fittings | Mueller Streamline wrot, ASME B16.22, UL 700 psig | muellerstreamline.com submittal #514 |
| Ball valves | Mueller Refrigeration Cyclemaster with access port, MWP 775 psig, UL 207 | muellerrefrigeration.com data sheet, spec sheet, UL certificate SA1392 (2025), INST-003 |
| Brazing | Lucas-Milhaupt Sil-Fos 15 (BCuP-5) | lucasmilhaupt.com flyer |
| Insulation | Armacell AP ArmaFlex, 520 adhesive, tape, WB finish | app library `pipe-insulation-armaflex.pdf` |
| Supports | ITP 7200/7201 strut, 8500 cushion clamp, Fig. 167 shield, Fig. 54/56/52, Fig. 61/229/21 | itpny.net Volume 5 catalog (selected pages) |
| Anchors | DeWalt Hangermate+ | app library `anchors.pdf` |
| Identification | Brimar System #1 / EZ markers (ASME A13.1-2023), stamped brass valve tags | pipemarker.com 2025 bulletins |

## Open points

- The insulation thicknesses in the schedule are the values from the reviewed Rev 0 schedule. Check them against
  each project's spec / energy code.
- Harris, Eaton (B-Line) and Parker (Sporlan) block automated downloads, so they are not used as basis of design.
