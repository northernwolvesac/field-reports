# 18 Vesey St - Boiler and Floor Heating: Scope and Work Plan (10/30/2026)

Detail with Drive / Gmail ids: `notes/2026-10-30 Boiler and radiant review (working notes).md`.
Not reviewed: boiler sheets BE-001..BE-600 and fuel storage sheets FS / T001. They are only in the 51 MB full set, which the Drive connector cannot pull.

## Contract (SC-30-26004-010R, Exhibit A)
- "Furnish and install new gas boiler B1, as detailed on M504. Gas piping by others".
  - Contract also says "Provide all necessary rigging for boiler", controls and wiring, check / test / start-up.
  - M504 is the wrong detail: it shows an oil-fired steam boiler.
- "King Floor Heat Mat FH-1. Install where indicated. Power by Electrician", plus "F&I all thermostats".
- Permits are not ours (handwritten note on 010R).
- Our Quote 2759 includes the boiler, floor heat mat and start-up. It excludes permits, gas piping, fire stop and core drilling.
- SOV (App #05) has no separate boiler or mat lines. They sit under:
  - line 3 equipment, 90% billed
  - line 4 installation, 60%
  - line 6 piping and control wiring, 60%
  - line 8 testing / start-up, 0%

## Boiler B1
- **Unit:** Weil-McLain EG-75-PIDN.
  - Gas, hot water, natural draft, non-condensing. 282 MBH input / 206 net.
  - Tappings 3" / 2-1/2", 3/4" gas inlet, 30 psi relief, 8" flue.
  - About 735 lb, partial knock-down. Non-combustible floor only.
- **Submittal:** 230000-1.0 approved NET 5/8/2026.
- **Procurement:** Ferguson PO NWAC1080 (boiler + mats $11,292.83). At our office since 7/10. Whitney told KBD it would be on site 10/29; not confirmed.
- **Location and design (M105):** existing roof boiler room.
  - Flue into the "existing exhaust duct", condition to be verified in the field.
  - Keep the 2 existing HW pumps. Combustion air from the existing duct and louver.
  - Not shown on M105: expansion tank, makeup water / backflow, relief discharge, pad, piping diagram. This is a replacement
    in an existing boiler room, so these are most likely existing to remain (Ruslan, 10/30). Verify in the field.
    New work is limited to the connections to the new boiler.
- **Serves:** the existing HWS / HWR risers. M103 / M104 say to tie PTAC-A / PTAC-B to the HW risers.
  - KBD RFI#01 answer (8/10) puts the coil piping in our base scope.
  - COP-SVS-01 is disputed.
- **Install sub:** bids invited 10/23 (PH Works, Abilene, A&C, NJPD); no bids found, not awarded. KBD written approval needed (§12.2).
  - The ITB lists a condensate kit, which is not needed for this boiler.
  - "Factory start-up" in the ITB: Ferguson provides none.
  - The ITB leaves out rigging, expansion tank, makeup water, liner and the combustion-air damper interlock.
- **Blocking KBD:** the gas inspection waits for the boiler tie-in. Peter has asked for dates since 10/12.

## Floor heat mats FH-1
- **Design:** electric, not hydronic. King FCM-1, 120 V, 12 W/sf. Bathrooms on floors 3-5 (M103 / M104, "typ. for all").
- **Bought as alternate:** Watts SunTouch TapeMat 120 V.
  - 13 kits / 350 sf (11 x 20 sf, 1 x 70 sf, 1 x 60 sf).
  - Each kit has a SunStat thermostat and floor sensor.
  - Quantities are Ferguson's estimate.
- **Submittal:** 230000-2.0 NET 5/8 (ACE: "120V 1 PHASE").
- **Status:** delivered to our office 7/10. No sign of installation.
- **Biggest risk:** mats go down before tile. If tile is already down in some bathrooms, those rooms need a fix and a cost decision.

## BE sheets (read 10/30, `source/Seafarers IFB 2026-01-08 - Boiler BE sheets.pdf`)
- **BE-401 schedule BOILER-1:** Weil-McLain EG-75, gas, 282 input / 237 MBH output, 130/200 F, 30 psig relief, 735 lb, 120/1/60 under 5 A.
  No flue size or vent category.
- **Existing boiler room on the roof (BE-103).**
- **Existing to remain:**
  - HWS/R piping and the 2 HW pumps
  - combustion-air louver and motorized damper (reconnect, verify)
  - exhaust duct (verify condition)
  - 2" gas riser; new 650 CFH meter by S2
  - emergency switch and CO / smoke detectors (verify, new if none)
- **Not shown anywhere:** flue / liner / vent connector detail, expansion tank, makeup / backflow, air separator, pad.
  Most likely existing to remain. Verify on the site walk.
- **Distribution, floors 2-5 on the existing 1-1/4" HWS/R risers:**
  - 2nd floor: remove radiators and cap the risers.
  - 3rd-5th floors: tie to PTAC-A / B.
  - 5th floor: remove convection heaters and cap.
  - The removals and capping are piping work shown on the drawings, so they are ours. Add them to the plan.
- **Notes that don't fit the EG-75:** condensate neutralization kit, "ventless gas train", "water-tube and cast iron",
  "connect to vent, galvanized steel". Outdoor reset per NYCECC C403.4.1.5. Boiler room 2-hr noncombustible.
- **Special inspections:** BC 1705.17, BC 1705.31 and TR-8 energy. BE-600 2.D says the PE special inspector is hired by this contractor.
- **BE vs M504:** they contradict. M504 is an oil-fired steam boiler filed under S1. BE (S5) governs; confirm by RFI.
- **Floor heat mats:** not on any BE or FS sheet; only M103 / M104 / M401.

## Gaps and risks
1. Tile status in floor 3-5 bathrooms; mat quantity and sizes vs the actual rooms.
2. Electrician has no circuit list (120 V, one circuit or GFCI per bathroom).
3. M504 mismatch; BE sheets unread (boiler schedule, piping, flue).
4. **Existing flue and venting:**
   - Flue sized for the old boiler: check condition and draft.
   - Vent connector and any liner not bought.
   - Vent damper / combustion-air damper interlock not specified.
5. Existing expansion tank, makeup / backflow and relief drain: verify condition and reuse. New: the relief discharge from the new boiler's relief valve, and the vent connector from the boiler outlet to the existing flue.
6. Drain / flush of the existing loop; sequencing with PTAC coil hookups; no load check.
7. Rigging ~735 lb to the roof: no plan. Pad by whom.
8. Who is installer of record for the S5 boiler filing and sign-off (we do not pull permits).

## Work plan
### This week
1. **Site walk floors 3-5 and the roof boiler room** (Whitney):
   - which bathrooms are tiled
   - measure the heated floor area per room
   - is the boiler on site
   - flue / chimney condition
   - existing pumps, expansion tank, fill
   - rigging path
2. **Get the BE and FS sheets read** (Ruslan: extract the pages <10 MB to Drive, or allow the download host).
3. **Re-scope the install sub**, then award and send it to KBD for approval (Ruslan / Alikhan). Sub scope:
   - rigging and set
   - piping to the existing HWS/R and pumps
   - expansion tank, fill / backflow, relief
   - vent connector (+ liner if needed)
   - controls interlock
   - start-up with combustion report
   - S5 sign-off documents
   - Drop the condensate kit.
4. **RFI to ACE** (Alikhan):
   - correct boiler detail (M504)
   - flue / liner requirement
   - expansion tank and fill
   - FH-1 room list
5. **Dates to Peter** (Whitney). Draft:
   - rig / set week of 11/9
   - tie-in 11/16
   - plumber gas connection and KBD gas inspection
   - start-up week of 11/23
   - Confirm with the sub before sending.

### Floor heat mats (per floor, ahead of tile)
1. Agree floor-by-floor dates with KBD and the tile sub.
2. Reorder kits with wrong sizes after the field measure (lead time 4-6 weeks).
3. Give the electrician the circuit list (rooms, kit wattage, 120 V).
4. **Our crew lays the mats.** Megger / ohm test on the mat:
   - out of the box
   - after laying
   - after thinset / tile
   - Record the readings for the warranty.
5. Electrician wires power; we set the thermostats and floor sensors and program them.
6. Test each bathroom; hand over warranty cards and manuals.

### Boiler
1. Rig and set on the pad (confirm who pours the pad).
2. Drain and flush the existing HW loop, then pipe the boiler to the existing HWS/R and pumps:
   - isolation valves
   - relief to drain
   - expansion tank
   - fill with backflow
3. Inspect the flue; install the vent connector, and a liner if the flue check calls for it.
4. Plumber connects 3/4" gas → KBD gas inspection.
5. Electrician provides 120 V to the boiler and pumps.
6. We wire the controls, outdoor sensor, pump and damper interlocks.
7. Hydro test, fill and purge.
8. Start-up with combustion analysis report.
9. Connect PTAC HW coils as units arrive. Remove the 2nd-floor radiators and 5th-floor convection heaters and cap the risers (BE sheets).
10. Hand the S5 documents to the filing rep; closeout (O&M, warranty).
11. Bill SOV lines 4 / 6 / 8 as each step finishes.
