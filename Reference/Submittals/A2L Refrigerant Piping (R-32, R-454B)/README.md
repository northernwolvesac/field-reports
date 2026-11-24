# NWAC standard submittal - Refrigerant piping for A2L refrigerants (R-32 / R-454B)

Refrigerant piping only: no condensate, water or hydronic items. Built 11/24/2026 to replace the package that came from
Sound Refrigeration A/C. That package was used on 419-421 West Broadway PH as SUB-005 Rev 0 and was returned "revise
from 410A to R32". No page of it is reused here.

## How to use (company template)

1. **In the app:** the submittal generator attaches `submittals-library/refrigerant-piping-a2l-package.pdf` to any
   "refrigerant piping" submittal (the app adds the cover). The R-410A package is used only when the title says 410A.
2. **As a stand-alone submittal with our cover:**
   - copy `projects/_TEMPLATE.json` to `projects/<Job name>.json` and fill it in. Fields:
     - submittal no., rev, date
     - project, address, GC, architect / engineer, spec section
     - `refrig`: "R-32 (A2L)" or "R-454B (A2L)"
     - `response`: reviewer comments and our answers for resubmittals; leave empty for Rev 0
   - run `python3 build_a2l_package.py "projects/<Job name>.json"`. The PDF is written to this folder.
3. **To change content:**
   - Schedules, notes, the accessory list or sections: edit the lists at the top of `build_a2l_package.py`.
   - A data sheet: replace the file in `source/` with the newer manufacturer version.
   - Then run `python3 build_a2l_package.py` (no argument) to refresh the app library file, and commit.

## Files

- `build_a2l_package.py`: the builder. The identification template imports it and reuses the cover, dividers and
  project-JSON system through the hooks at the top of the file (`DIVIDER_HEADER`, `COVER_TITLE`, `LIB_FILE`, ...).
- `projects/`: one JSON per job. `419-421 West Broadway PH.json` produced SUB-005 Rev 1.
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

## Identification

Pipe markers and valve tags are not part of this package. When the contract documents or the engineer require
them, use the separate template in `../Mechanical Identification - Pipe Markers & Valve Tags/`. The engineer did not
ask for them on 419-421 West Broadway PH, so they are not in SUB-005 Rev 1.

## Open points

- The insulation thicknesses in the schedule are the values from the reviewed Rev 0 schedule. Check them against
  each project's spec / energy code.
- Harris, Eaton (B-Line) and Parker (Sporlan) block automated downloads, so they are not used as basis of design.
