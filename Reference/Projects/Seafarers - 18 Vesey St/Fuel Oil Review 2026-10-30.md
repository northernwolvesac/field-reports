# 18 Vesey St - Fuel Oil System Review (10/30/2026)

This review covers every fuel oil file in the Drive folder "Seafarers 18 Vesey ST", plus Gmail. Supporting detail with Drive file ids is in `notes/`.
**Not reviewed:** the fuel storage sheets T001, FS101-FS105, FS300 (DOB M01244603-S4) and the boiler sheets BE-001 to BE-600 (-S5). They exist only inside the 51 MB full bid set, which the Drive connector cannot open. They need to be read in a PDF viewer, or the set dropped into `source/`.

## 1. What the system is
- **Serves:** only the roof emergency generator (Kohler 80REOZJF, ~77-80 kW diesel, ~8,250 lb on steel dunnage by others).
  The boiler (Weil-McLain EG-75, 282 MBH) is gas-fired hot water, not oil. Its submittal 230000-1.0 was approved NET 5/8/26.
- **Storage tank FOT-1:** in the sub-cellar fuel oil room. UL 142, 134 gal nominal / 120 gal working, single wall in a 200% open rupture basin,
  54x36x49 in, on a 62x40x6 in pad. MC 1305.14, 25 psi test.
- **Pump set FOP-1:** duplex skid (2 gear pumps, ~89-90 GPH at 100 psi, 1/3 HP, 115 V/1 ph, 30 A feed), on a 32x50 in pad.
  Duplex strainer, vacuum leak monitoring for the piping, control panel with Modbus to BMS.
- **Supply / return:** 1" FOS and 1-1/2" FOR, Brugg Flexwell-HL double-wall 316L SS. Continuous runs, vacuum monitored.
  Routed in a 2-hr sheetrock enclosure from the sub-cellar through the cellar and floors 1-5 to the roof.
  - The 5th-floor run crosses a residential area (Bedroom 5D).
  - Lengths: Rev.03 shows 164' / 142'; Core supplied 219 LF of each size.
- **Generator sub-base tank:** 75 gal UL 142 double wall, acts as the day tank. Pump on at 40%, off at 80%, critical high at 90%.
  Its 2" normal vent and two 4" emergency vents are marked "customer to supply".
- **Fill / vent:** 2" FOF and 4" FOV.
  - Design: terminate on the Vesey St facade at the 1st floor.
  - RFI#26 changed this (see section 3).
- **By others:** generator, dunnage, 2-hr enclosures, pads, line-voltage power and BMS (electrical), gas piping (plumbing).

## 2. Contract position
- **Contract:** KBD subcontract SC-30-26004-010R, $498,200 lump sum, completion 12/4/2026. There is no separate fuel oil line in the schedule of values.
- **Exhibit A includes:**
  - "Furnish and install fuel oil tank and riser for generator as per BE drawings (generator by others)"
  - FOP1 & FOP2
  - "2" fuel oil vent and 4" fuel oil vents"
  - "Fill Fuel Oil upon completion"
  - Hilti firestopping
  - "All filing, permits and fees for your trade"
  - a catch-all: "all mechanical and piping work shown on all drawings ... regardless of drawing section".
- **Permits:**
  - The signed 010R carries a handwritten note: no responsibility for filing or pulling permits, fees by others.
  - The Exhibit A permits line was not struck.
  - M001 note 6 says permits are "secured by the contractor and paid for by the owner".
  - **Conflict.**
- **Changes and assignment:** change work is at 10% OH + 5% profit. §12.2 says no part of the work may be subcontracted without KBD's prior written approval.
- **Core (PO NWAC1073):**
  - $100,000 lump sum, supply only, FOB origin. The first quote was $128,884.92.
  - Assumes tax-exempt; about +$8,875 if taxable.
  - Terms 30% deposit / 40% before shipment / 30% net 30.
  - Brugg invoiced in June (inv #5495).
  - Spill containment is **not included**, and no PO was found for the fill box.
- **Drafting:** All-City Sketchers, fuel oil shop drawings $2,000.

## 3. Submittals and RFIs
| No. | Item | Returned | Action |
|---|---|---|---|
| 15.2 | Core package SBM5622 R002 (tank, pumps, Brugg, accessories) | 6/11/26 | No Exceptions Taken |
| 15.0 / 15.1 | Earlier fuel oil product data | - | Files too large to read |
| 19.0 | FO-SC sub-cellar layout (Rev.00) | 7/22/26 | **Rejected**: "wait for owner's direction and decision" |
| 19.1 | Rev.01 | - | Not on Drive |
| 19.2 | FO-1 layout (Rev.02) | 10/20/26 | **Make Corrections Noted, supply/return to generator only. Fill and vent to be resubmitted at new location** |
| SUB-032 R3 | Rev.03 (10/13), shorter route | - | Never reviewed. Still shows the old fill/vent |
| #30 | Fill containment box RFB-5RMSS4-2 (sent 8/27) | - | No return found |
| 24.0 / SUB-055 | Unistrut pipe support | 10/30/26 | Make Corrections Noted (galv 12 ga channel, 10 ga 4x4 base plate, coordinate curb with structural). Unclear if this is for the fuel oil roof run |

**ACE comments on 19.2 that are still open:**
- Resubmit fill and vent at the new location.
- Supply and return need **another layer of 2-hr enclosure**.
- "Avoid penetrating the shaft".
- Provide an oil leak detection probe cable.
- Roof flashing by contractor.
- Shift the supply for 3 ft W x 7 ft H clearance.
- New FDNY pathing and clearance sketch by the architect.
- Structural engineer to confirm the generator weight.

**RFIs:**
- **RFI#26 (our RFI#02):** ACE confirmed 8/25 Option 2, a fill box on the interior garage wall. The vent must stick out of the building, at least 2 ft from openings (2 ft above the garage door, and 2 ft vertical / 2 ft horizontal).
- **RFI#03:** asks whether the 2" fill port needs a containment box (8/27). No answer.

## 4. Status (emails)
- **CO #001 (-$39,300) and CO #002 (+$60,475), both 10/12:** they delete the Brugg pipe and replace it with Sch 40 carbon steel in a 6" containment. Both are dead.
  - KBD 10/13: "the choice to switch to Steel piping was Northern Wolves decision ... stick to the original".
  - NWAC told Core 10/15 that Brugg stays and we install it.
- **Core:** tank and Brugg ready to ship 10/29 pending our payment; pump set early to mid November.
  - Core said 10/15 the tank in its basin and the pump set will not pass a 32"W x 4'H door. Whitney replied "both will fit".
  - Delivery is through the 10 Barclay garage, with one week's notice.
- **Install sub:** NWAC invited bids for boiler and fuel oil install, filing and sign-off under a licensed NYC Oil Burner Installer, due 10/28.
  - Bidders: PH Works, Abilene, A&C (wants a site visit and an extension), NJPD. The Falcon email bounced.
  - Not awarded, and not yet approved by KBD (§12.2).
- **Commitments to KBD (Whitney, 10/26):**
  - fill/vent drawing 10/28: not seen sent
  - Brugg start 11/2
  - tank the week of 11/2
  - boiler delivered 10/29
  - Boiler rig-in, tie-in and startup dates are still owed; KBD's gas filing depends on them.

## 5. Issues and risks
1. **Fill/vent is the critical path.** No drawing shows the RFI#26 garage location.
   - Core's box is a recess/flush interior box, while ACE wants the vent outside the building at least 2 ft from openings.
   - Confirm truck and hose access through the garage, and whether the fill relocation needs a DOB/FDNY amendment.
   - Fill and vent pipe material and joints are not defined anywhere.
2. **New second 2-hr enclosure and no shaft penetration.**
   - Who builds it? Enclosures are by GC/arch per the drawings, but this is a new requirement.
   - It may force reroutes through residential floors.
   - Headroom is already tight (B.4'-11" to 5'-6"), and there is the 3 ft x 7 ft clearance.
   - Possible CO or extra-cost item.
3. **Permits, filing, licensing:** contract documents conflict on who files and pays.
   - NWAC appears not to hold the Oil Burner Installer license, so we need a licensed sub to file and sign off S4.
   - FDNY requirements were not found in the documents read; they are probably on T001 / FS sheets.
4. **Vents:** Core supplies only a 2" vent, but the drawings show 4" FOV.
   - The generator tank's 2" normal and two 4" emergency vents ("customer to supply") are not priced.
   - The M105 6" vent 10 ft above bulkhead has no owner.
5. **Items in our contract that nobody carries yet:**
   - initial fuel fill (~210 gal diesel)
   - fill containment box (no PO; RFI#03 and submittal #30 unanswered)
   - leak detection probe cable
   - tightness test (150 psi / 1 hr per the ITB vs 1.5x / 2 hr per M601) and the special inspection agency
   - low-voltage control and alarm wiring from the sub-cellar panel to the roof
   - roof penetration and flashing
   - core drilling ($5,000 alternate only)
6. **Rigging:** verify the tank and pump set path in the field before Core ships.
7. **Two level-control schemes:** the generator tank switches and Core's float package overlap. Confirm which one runs the pumps.
8. **Commercial:**
   - Withdraw CO #001/#002 formally.
   - Decide whether the second enclosure, containment box, vents and fill relocation become a new CO; the RFI#26 relocation is an owner/engineer change.
   - App #5 bills equipment procurement at 90% while the Core equipment is undelivered and unpaid.
9. **Schedule:** completion is 12/4. The pump set ships mid November, no install sub is on board, and KBD reports no manpower on site.
10. **Documentation:** M504 (oil-fired steam boiler detail) is referenced in the contract for the gas hot-water boiler, so it is the wrong detail. The 15.0/15.1 returns and the 19.1 return are missing from Drive.
