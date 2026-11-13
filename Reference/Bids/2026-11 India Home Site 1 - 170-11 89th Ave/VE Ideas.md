# India Home - Site 1, 170-11 89th Avenue, Jamaica (Queens) - HVAC VE ideas

Drawings: `source/M-100 to M-109 Mechanical Plans - Pricing Set 2026-07-31.pdf` (rev 3 Pricing Set, 7/31/2026).
Owner India Home (senior housing) / Fulcrum Properties; architect RKTB; MEP engineer Altera Engineering.
DOB Q01372263-S4. The set has plans only (cellar, 1st-9th floors, two roof plans). It has no schedules, details,
risers or spec, so equipment sizes and materials are unknown.

## What the drawings show

- Apartments, floors 2-9: about 54 units (54 KG-1 kitchen grilles) and 69 through-wall PTHPs (PTHP-1 / PTHP-2),
  each PTHP with its own 1-1/4" condensate drain. Electric heat tracing on exposed drains at the 2nd floor.
- Apartment ventilation: central ERV-1 and ERV-2 on the roof feed 5 shaft stacks, each with 3 risers
  (OA supply, KX kitchen exhaust, TX toilet exhaust), so 15 risers in total. In each unit:
  - SG-1 supply at 60/135 cfm through ZRT-2, a two-position regulator;
  - KG-1 kitchen exhaust at 35/110 cfm through ZRT-1, also two-position (boost);
  - CVEG toilet exhaust at 25 cfm, constant volume.
  That is about 108 two-position regulators.
- Corridors: CVSG / CVEG at 40 cfm per floor from the ERV-1 / RX-1 risers.
- Cellar: ERV-C; ducted AC-C.1 and AC-C.2 (8 CDS diffusers at 180 cfm); AC-EMR, AC-COMP and AC-TEL; UH-1, UH-2 and
  FFH. Four 3-hour FD/AD at slab penetrations. The gas meter room vent is an 8" duct with fire wrap.
- 1st floor: VRF heat recovery (ACCU-1.1 / 1.2 + HRU-1) with ducted AC-1.1 through AC-1.5 and AC-1P.1 / 1P.2, ERV-CF,
  ACCU-C1 / C2, and linear slot diffusers.
- 2nd floor community space: AC-2.1, AC-2.2 and AC-2P (ACCU-2), plus an ERV-2 with wall louvers. This ERV-2 tag is
  also used for a roof unit.
- Laundry: four 4" dryer exhausts run separately to the roof.
- Roof: ERV-1, ERV-2, SF-1, mechanical room louvers, a 20x20 smoke vent / post-fire purge. Mech roof: ERV-3 and stair
  pressurization fans PSPF-1 / PSPF-2.

## VE options (most savings first)

| # | Option | What it saves | Who must accept |
|---|---|---|---|
| 1 | Combine KX and TX into one exhaust riser per stack (15 risers down to 10) | 5 full-height risers, roof connections, shaft space, dampers/subducts | MEP engineer (ERV exhaust taking kitchen air needs grease-filter grilles) |
| 2 | Supply side without boost: replace about 54 ZRT-2 two-position regulators with passive constant-airflow regulators at 60 cfm; keep the ZRT-1 kitchen boost | 54 motorized dampers plus wiring and boost interlock | Engineer / Passive House consultant (unit runs about 75 cfm negative during boost) |
| 3 | 1st floor VRF heat recovery changed to heat-pump VRF (2-pipe, no HRU) or to ducted split systems | Branch selector, third pipe, controls | Engineer |
| 4 | Linear slot diffusers (about 16 LDS + 5 LDR on floors 1-2) changed to standard square diffusers | Diffuser cost and ceiling coordination | Architect |
| 5 | PTHP condensate: PVC/CPVC instead of copper if the spec calls for copper; run the 2nd-floor drains inside heated space to delete the heat tracing | Material, heat tracing, electrical | Engineer / spec |
| 6 | Exhaust shaft branches: steel subducts 22" up (NYC MC 607.5.5 exception, continuous exhaust) instead of FD/AD at each branch | Fire dampers and access doors | Engineer / DOB (typical floors show no dampers at shafts: clarify) |
| 7 | Laundry: ventless heat-pump dryers (owner option), deleting the four 4" dryer vents | Ducts, roof penetrations, make-up air | Owner |
| 8 | AC-COMP: if it serves the compactor room, exhaust only with no AC. AC-EMR: thermostat-controlled ventilation if the load allows | 1-2 split systems | Engineer |
| 9 | ERV-C (cellar) and ERV-CF (1st floor) sit back to back through the slab; combine them into one unit | 1 ERV, louvers and dampers | Engineer (fire separation) |
| 10 | Gas meter room vent in a GC-rated shaft instead of fire wrap | Fire wrap | Architect / GC |

## Scope clarifications (no design change)

- PTHP wall sleeves and exterior grilles: furnished by NWAC, installed by GC / mason.
- Wall louvers (36x18, 24x12, mechanical room louvers) by GC / facade.
- Duct smoke detectors furnished and wired by others; electric heat tracing by the electrician.
- Wiring of the ZRT boost switches and controls by the electrician.

## RFIs before pricing

1. Provide schedules, details, riser diagrams and the specification (only plans were issued).
2. The ERV-2 tag is used on both M-102 (2nd floor) and M-108 (roof).
3. What is AC-COMP?
4. Is the project Passive House / PHIUS (or NYSERDA)? That decides which ventilation VE is acceptable.
5. Fire dampers or subducts at the apartment branches in the OA / KX / TX shafts?
