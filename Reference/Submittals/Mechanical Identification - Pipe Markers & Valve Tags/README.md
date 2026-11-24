# NWAC standard submittal - Mechanical identification: pipe markers and valve tags

This is a separate submittal, used only when the contract documents or the engineer require identification (spec
section 23 05 53, "Identification for HVAC Piping and Equipment"). The piping packages do not include it.

## How to use

1. **In the app:** the submittal generator attaches `submittals-library/mechanical-identification-package.pdf` to
   submittals titled valve tags, pipe markers, pipe labels, piping / mechanical identification or 23 05 53.
2. **As a stand-alone submittal with our cover:**
   - copy `projects/_TEMPLATE.json` to `projects/<Job name>.json` and fill it in. The fields are the same as in the
     A2L piping template; the spec section defaults to 23 05 53.
   - run `python3 build_identification_package.py "projects/<Job name>.json"`.
3. **To change content:**
   - Legends, tags or notes: edit `MARKER_ROWS`, `TAG_ROWS` and `NOTES` in the builder.
   - A data sheet: replace the file in `source/`.
   - Then run the builder with no argument to refresh the app library file.

The builder reuses the cover, dividers and project system of
`../A2L Refrigerant Piping (R-32, R-454B)/build_a2l_package.py`.

## Contents (10 pages)

| Section | Basis of design | Source |
|---|---|---|
| Identification schedule + notes | NWAC (own page): legends per service, marker type, locations, valve tags, valve chart | builder |
| Pipe markers | ANSI/ASME A13.1-2023 scheme, colors and sizes; Brimar System #1 strap-on and EZ self-adhesive markers | pipemarker.com 2025 bulletins |
| Valve tags | Brimar stamped brass valve tags, 1-1/2" round, .032" brass; brass S-hooks / beaded chain | pipemarker.com 2025 binder |

The refrigerant legend shows the job refrigerant (R-32 or R-454B) and "A2L"; it follows the `refrig` field of the
project file.
