# 18 Vesey St (Seafarers International House): fuel oil system review, covering design basis, contract and commercial

Prepared 2026-10-30 for Ruslan. Read-only review of Drive (and, for context, Gmail). Submittals, shop drawings and RFIs are left to the sibling agent and are only flagged here.

## Bottom line (read this first)

1. **The fuel oil system serves only the roof emergency generator.** The boiler is a gas-fired Weil-McLain EG-75 hot-water unit. It is not an oil burner.
   - Tank FOT: 134 gal, in the sub-cellar fuel oil room.
   - Pump set: duplex FOP-1.
   - Riser: 1" FOS / 1-1/2" FOR Brugg double-wall, running up to a Kohler 80 kW diesel generator on the roof. The generator has a 75 gal UL142 sub-base tank.
   - Fill and vent: 2" fill and 4" vent, at the Vesey St facade.
2. **The real fuel oil design sheets (T001, FS101-FS105, FS300, DOB M01244603-S4) and the boiler sheets (BE-001 to BE-600, -S5) are only in the 51 MB full bid set.** I could not open it: the Drive connector caps downloads at 10 MB, and text extraction returns only title blocks. What I have comes from M101, M102, M105, M401, M402, M001, M504 and M601 (all read visually), plus the vendor and generator documents. **Someone needs to open FS101-FS300 in a PDF viewer.**
3. **CO #001 (−$39,300) and CO #002 (+$60,475), both dated 10/12, are stale.**
   - They delete the Brugg pipe and replace it with Sch 40 carbon steel inside 6" Sch 10 containment.
   - On 10/15 Alikhan told Core: *"The client has decided to keep the BRUGG piping in the scope after all, and we will be handling the installation."*
   - KBD (10/22), the ITB (10/23) and Core (10/29) all treat Brugg as the live design. Core already invoiced the Brugg pipe in June (invoice #5495).
   - **Withdraw or void both COs.** Neither appears on Pay App #5 ("Net change by change orders 0.00").
4. **NWAC is subbing out the boiler and fuel oil installation.**
   - On 10/23 an ITB was sent from hello@northernwolvesac.com to several bidders, with bids due 10/28. NWAC furnishes the equipment and the bidder installs, files and signs off under a licensed NYC Oil Burner Installer.
   - Known recipients and responses: PH Works, Abilene, A&C Heating and Falcon Mechanical. NJPD Plumbing was also to be asked.
   - **Subcontract §12.2 requires KBD's prior written approval to assign any part of the work.** No sub is awarded yet, while KBD expects Brugg work to start **11/2** and Whitney has "confirmed" that date.
5. **Design-to-contract mismatches to resolve:**
   - M504 "Typical Boiler Elevation" shows an **oil-fired steam boiler** (forced-draft burner, oil burner pan, 8" steam runout, 15 psi safety valves). The contract says "gas boiler B1, as detailed on M504", and what was bought is a gas hot-water boiler.
   - Vent sizes do not line up across the documents (Core 2" vs drawings 4"; generator tank needs 2" + 4" + 4" vents supplied by the customer).
   - The fill containment box RFB-5RMSS4-2 has no PO that I found.
   - The initial fuel fill is in NWAC's contract but not carried by anyone.
   - Permits and filing responsibility conflicts between documents.

---

## 1. The fuel oil system as designed

Sources: M101, M102, M105, M401, M402, M001, M601 (Rev 0, Bid Set 01/08/26, All City Engineering), plus the Core quote, Kohler/MTS submittal, Weldco tank drawing and the ITB scope text.

**Purpose and filings**
- Emergency generator fuel only. M001 scope: "Remove and install HVAC equipment, ductwork and piping. Install emergency generator on roof. Work in conjunction with ALT-CO M01244603-I1."
- Related DOB NOW filings (M001):

| Filing | Number |
|---|---|
| Alt-CO GC | M01244603-I1 |
| Plumbing | -S2 |
| Sprinkler | -S3 |
| **Fuel storage** | **-S4** |
| **Boiler** | **-S5** |
| HVAC (M sheets) | -S1 |

- M101 and M102 carry the note "FUEL OIL STORAGE FILED UNDER DOBNOW#M01244603-S4".

**Main tank**
- M101 (sub-cellar fuel oil room): "134 GALLON FUEL OIL TANK WITH 200% OUTER CONTAINMENT" on a 6" concrete pad.
- Core supplies NY-SWR-0134-2O-MB-NP: single-wall rectangular 134 gal tank in a 200% open rupture basin, built to MC 1305.14 alternate design, 25 psi.
- Core tank dimensions (from Core's 10/15 email): 36"W x 49"H in the basin, or 24"L x 32"W x 47"H without it.

**Pumps**
- FOP-1: Core SafeSite duplex pump set, up to 90 GPH at 100 psi. Includes duplex strainer with DP gauge, flow switch and a containment-pan leak sensor.
- The pump set sits on a 6" pad with 2 ft and 3 ft clearances shown. It is 42"L x 24"W x 74"H.
- Contract wording is "FOP1 & FOP2". This is the same duplex set.

**Day tank / generator tank**
- No separate day tank. The generator's 75 gal UL142 double-wall sub-base tank acts as the day tank.
- MTS/Kohler submittal: 44"W x 131"L x 15"H, 200% basin, 25 psi inner tank. It includes:
  - 2" lockable fill with 5 gal spill containment
  - level gauge
  - critical low, low, high and critical high switches
  - normal vent, inner emergency vent and outer-basin emergency vent
  - firematic valve and ball valve
  - four spare 2" ports
- Weldco tank drawing (Rev B 8/12/26):
  - Pump ON at 40%, pump OFF at 80%, critical high at 90%.
  - V1 2" normal vent, V2 4" primary emergency vent and V3 4" secondary emergency vent are **"tank flange only, customer to supply"** the vents.
  - Kohler BOM: *"Piping to/from main tank by others. Piping to/from generator by others."*

**Piping and routing**
- Supply and return: 1" FOS / 1-1/2" FOR, Brugg Flexwell-HL double-wall 316L stainless.
- Route: from the tank and pump set in the sub-cellar fuel oil room, through a "2 HR rated sheetrock enclosure" and shaft, up through 1st floor to 5th floor. On the roof it goes "1" FOS/1½" FOR DN" into the generator on dunnage (M101, M102, M105).
- Core quote quantities: 219 LF of 1" and 219 LF of 1-1/2" Flexwell, plus end fittings.
- SUB-032 R3 pipe-length schedule (seen in search snippet only): FOS 1" 164'-6", FOR 1-1/2" 142'-4", FOF 2" 93'-7", FOV 4" 95'-1".

**Fill, vent and gauge**
- M102 (1st floor, Vesey St frontage by the stair): "4" OIL VENT / 2" OIL FILL DN TO FUEL OIL TANK ROOM". Fill terminal is "INSTALL ABOVE SPRINKLER CONNECTION".
- M101 shows "4" OIL VENT UP" and "2" OIL FILL UP" in the 2 HR sheetrock enclosure.
- Core supplies:
  - 2" direct fill adaptor (*"Spill containment NOT included"*)
  - **2" updraft vent**
  - remote fill box high-level alarm in a NEMA 4 enclosure
  - 1-1/2" anti-siphon valve
  - 1" ball valve and 1" external emergency fire valve
  - 2" mechanical level gauge
  - NYC labels
- Fill containment box RFB-5RMSS4-2 is in the bid package (submittal 04). The sibling agent covers RFI #26 on the fill location.

**Containment**
- Main tank: 200% open rupture basin.
- Generator tank: 200% basin.
- Piping: Brugg double wall, inside a 2-hr sheetrock enclosure. A-421 detail 5 "Fuel Oil Enclosure" is architectural.
- M101 also shows a "5 GAL SPILL KIT".

**Leak detection and controls**
- Core FOC-FOS-3P fuel oil control and power distribution panel.
- Level transmitter and leak sensor for the main tank.
- Leak sensor for the pump containment pan.
- FOC-LMS-VAC-4 line-leak vacuum monitor for up to 4 lines (the "BRUGG VACUUM SYSTEM" on M101).
- Four-float level sensor with basin leak sensor for the generator sub-base tank.
- Horizontal leak sensor for vent overflow.
- 1" check valve, FRLV and ball valve at the generator.
- Start-up and training are included.
- Kohler controller APM402 has a "Fuel tank leak" and "Low fuel level" alarm. Note there are two sets of level switches (Weldco tank switches and the Core four-float package). Confirm which one runs the pumps.

**Fuel oil room support (HVAC scope)**
- GF-1 (Greenheck SP-B200, 150 cfm, "Fuel Oil Storage Rm, Sub-cellar").
- GX-2 6x6 duct to a 0.5 sq ft louver 3 ft above the door at the 1st floor.
- ECUH-1 electric cabinet heater, 1 kW, "Fuel Oil, Sub-cellar".
- Fire dampers.

**Generator**
- Kohler 80REOZJF: 77 kW standby, 120/208 V, 3-phase, diesel.
- About 8,250 lb on steel dunnage "by others", raised 3 ft (M105).
- M105 also has "6" vent, install 10 ft above bulkhead" with an FGC 503.5.4 calculation. This is probably the generator exhaust or vent. **Owner of this 6" vent is not stated anywhere.**

**Code notes on the drawings**
- MC 1305.14 (tank construction, per the Core quote). MC 1305 vent caps (per the ITB).
- M001 TR-1 special inspections:
  - BC 1705.17 fire-resistant penetrations
  - 1705.21 mechanical
  - 1705.31 heating
  - 1705.32 chimneys and vents
  - 1705.36 emergency and standby power (generator)
  - 1705.39
- The ITB cites BC 1705.22 for the fuel oil pressure test (150 psi, 1 hr). Verify this against the FS sheets.
- M601 8.B: piping hydrostatic test at 1.5x working pressure, minimum 100 psig, for 2 hr.
- No FDNY or Local Law items appear on the M sheets. They are presumably on T001/FS. **Not verified.**

**Who furnishes what (per M drawings, ITB and the generator submittal)**

| Item | By |
|---|---|
| Tank, pump set, controls, Brugg pipe, fill/vent specialties | Mechanical (NWAC, via Core) |
| Generator | Others (electrical/GC) |
| Generator exhaust | Unclear |
| Steel dunnage | Others (M105) |
| 2-hr enclosures and shaft | GC/architectural (A-421; ITB "by others") |
| Concrete pads | Others (ITB) |
| Line-voltage power and BMS | Electrical (ITB) |
| Gas piping to boiler | Plumbing, -S2 |
| Generator sub-base tank piping to/from the main tank | Mechanical (Kohler "by others") |

- I could not verify the P-, E- and A-sheet content.

## 2. NWAC contract: fuel oil and boiler inclusions and exclusions

**Subcontract SC-30-26004-010** (KBD/Kajima to Northern Wolves Inc, dated 27 April 2026)
- Exhibit A §A.5 breakdown: "Subcontract Amount: $498,200.00 Deposit of $149,00.00" (sic). Bid "per plans & specifications dated 1/8/26, addendum #1 1/22/26", non-union. Fuel oil lines verbatim:
  - "All filing, permits and fees for your trade"
  - "**Fill Fuel Oil upon completion**"
  - "Provide all required shop drawings for Fuel Oil & HVAC systems"
  - "Furnish and install new gas boiler B1, as detailed on M504. Gas piping by others"
  - "Provide all necessary rigging for boiler and other mechanical equipment"
  - "**Furnish and install fuel oil tank and riser for generator as per BE drawings (generator by others)**"
  - "Furnish and install fuel oil pumps FOP1 & FOP2"
  - "**Furnish and install 2" fuel oil vent and 4" fuel oil vents as indicated**"
  - "**Fuel oil riser FOS to be 1" with a 1 1/2" Brugg outer wall as noted on M-101**". This is misworded: M101 shows a 1" FOS and a 1-1/2" FOR, both Brugg double wall.
  - "Furnish and install fuel oil pumps sufficiently sized to allow adequate pressure and head to reach the roof"
  - "All specified (Hilti) firestopping to be F&I for any penetrations for this trades work"
  - "All necessary check, testing & startup of the new equipment"
  - "**Mechanical contractor is responsible for all mechanical and piping work shown on all drawings and specifications noted above regardless of drawing section.**" This pulls FS- and BE-series work into NWAC scope.
  - "Above listed quantities are for reference ONLY... You are responsible for all of your trade work indicated in the complete bid documents."
- Other terms:
  - A.6 Exclusions: blank.
  - A.7.1: markup on changes limited to 10%.
  - A.7.2: "Sales tax and freight included". A.5 also says "Taxes are based on a Capital Improvement Project is Taxable".
  - A.4.4: sleeves and block-outs, otherwise NWAC does the cutting and patching.
  - §12.2: "Subcontractor shall neither assign the whole nor any part of the Subcontract Work without prior written approval of Constructor."
  - §5.3.2: claims notice within 7 days, documentation within 14 days.
  - §5.5: liquidated damages flow-down.
  - Retainage: per Exhibit R. Exhibit R is not in the extracted text. Pay App #5 shows 5%.
  - Schedule: start 4/29/26, **completion 12/4/26**.
  - TPM fee: 0.22% (max $5,000) plus $100 per sub-sub.

**Subcontract 010R** (the signed version: Leonid Leonidov, GM, 05/08/2026; Craig Bagnoli, KBD Group Leader, 5/8/2026, with markups initialed "CB")
- Handwritten: "**NWAC DOSEN'T TAKE THE RESPONSIBILITIES FOR FILING, PULING ANY KIND OF PERMITS. PERMIT FEES AND INSPECTION FEES TO BE PAID BY OTHERS.**" The Exhibit A line "All filing, permits and fees for your trade" was **not** struck. This is a conflict.
- At A.4.4: "CUTTING & PATCHING BUILDING STRUCTURAL MEMBERS AND CORE DRILLING WERE EXCLUDED FROM OUR BID PROPOSAL (SEE ALTERNATES)". A.9: "**ADD ALTERNATE – Core drilling for your trade $5,000.00**".
- Warranty: "1 Year warranty is included for labor & material (warranty by manufacturer as per OEM)".
- A.7.1 appended: "10 % Overhead and 5% profit as per Exhibit R".
- Hilti firestopping and "Fill Fuel Oil" are **not** struck, so they remain NWAC scope.

**NWAC proposal to KBD** (Quote 2759, 4/22/2026, Alikhan Ilyas; M dwgs 1/06/2026)
- "Furnish and install Boiler (1)" and "**Furnish and install Fuel Oil system (1)**". Lump sum **$498,200.00**, with no fuel oil breakdown.
- Exclusions: BACnet/BMS/EMS; overtime; scaffolding with permits; **Fire Stop**; cutting and patching of roof, structural walls and floors; roof dunnage and steel; structural work; **Permits and fees**; bond; **Gas piping, gas meter**; warranty on existing equipment; **Core drilling**.
- Firestopping was excluded here but is included in the signed subcontract.

## 3. Pricing: original, vendor and sub quotes, change orders

**What the contract carries for fuel oil**
- No separate value. The proposal and contract are lump sum $498,200.
- The SOV (Pay App #5) has no fuel oil or boiler line. It sits inside:
  - Line 3 Equipment Procurement: $279,200, 90% billed ($251,280)
  - Line 4 Equipment Installation: $85,000, 60%
  - Line 6 Piping & Control Wiring: $31,000, 60%
  - Line 8 Testing/Start-up/Balancing: $10,000, 0%
- App #5 totals (period to 09/30/26):

| Item | Amount |
|---|---|
| Completed to date | $396,080 (79.5%) |
| Retainage 5% | $19,804 |
| Current payment due | $115,020.30 |
| Change orders | $0 |

**Vendor and sub quotes and POs**

| Doc | Vendor | Covers | Fuel oil? / price |
|---|---|---|---|
| CORQ38731 (01/19/26) | Core Engineered Solutions (CES Northeast) | Complete FO package: tank 134 gal + accessories $11,636.73; pumps, controls and specialties $54,084.24; Brugg pipe + vacuum leak monitoring $52,657.83 | **Yes.** Subtotal $118,378.80 + tax $10,506.12 = **$128,884.92**. Note: "if fuel oil piping purchased alone add $10,685.72". |
| CORQ38731-03 (04/27/26) | Core | Same scope, lump sum | **Yes. $100,000.00**, "Project assumed tax exempt, if taxable, add". Terms 30% deposit / 40% before ship / 30% net 30. FOB origin, offloading and installation not included. |
| **PO NWAC1073** (4/27/26) | Core | "Complete Fuel Oil System" per CORQ38731-03 | **Yes. $100,000.00**, subject to engineer approval, delivered to jobsite. Supply only, no installation. |
| PO NWAC1122 / ACS proposal (5/18/26) | All-City Sketchers | SM $4,500, MP $2,500, **FO dwgs $2,000** (total $9,000) | FO shop drawings only. |
| BSTD...4022 QC REV (4/23/26) and PO NWAC1080 | Ferguson | Weil-McLain EG-75-PIDN gas, 282 MBH input / 206 net, water trim + outdoor sensor $5,437.27; Watts radiant $5,855.56 | No FO. Boiler is **gas, cast iron, non-condensing** ("condensate neutralizing kit is not needed"). PO total $11,292.83. |
| Q-95289-1 | Homans | Mitsubishi splits + Qmark heater, $51,862 | No |
| 04-29-2026 BUYProp / PO NWAC1084 | Trane | Mitsubishi VRF, $43,390 | No |
| BSTD...2796 | Ferguson | Mitsubishi, $45,050.81 | No |
| P296592R01 + DL scope letter | ADE | Grilles, heaters, Greenheck fans, dampers, $12,375 | No (GF-1 fuel oil room fan included) |
| 25-02667 / PO NWAC1086 | Mechanical Technologies | Air distribution, heaters, fans, dampers, $11,000 | No (GF-1 fuel oil room fan) |
| SO21759 / PO NWAC1273 | Bush | Cable dampers, $1,089 | No |
| 18 Vesey Proposal REV1 / PO NWAC1070 | Highmark | ERV-1, $12,250 quoted / $11,000 PO | No |
| KBD "Quote – ALL BIDDERS" V1/V5/V6/Reno V3 | Brothers Supply (not KBD forms) | Ice-Air PTACs: $33,350 (V1, = PO NWAC1076), $36,580 (V5), $29,620 (V6), $30,321.69 (Reno V3) | No. V5/V6 add hot-water coils. |
| Kohler submittal | MTS Power Systems | 80 kW generator + 75 gal sub-base tank | Generator is by others. No NWAC price. |
| ITB bids (due 10/28) | PH Works, Abilene, A&C Heating, (Falcon, NJPD) | Install boiler (A) and fuel oil (B), separate lump sums | **No bid amounts found.** Falcon "proposal" was received 10/22 (email only, not opened). |

**Change orders** (NWAC forms, both "Proposed", "Critical", approved-by field "Alikhan", customer KBD/Peter Sawiris, dated 10/12/2026)

- **CO #001, credit: −$39,300.00.** "Scope Reduction". "Provide credits based on revised shop drawings. Delete BRUGG Flexwell-HL piping system":
  - (219 LF) PS-HL-1.0 + (2) end fittings
  - (219 LF) PS-HL-1.5 + (2) end fittings
  - Material −$19,300; labor −160 hr x $125 = −$20,000.
- **CO #002, add: +$60,475.00.** "Scope Addition". "Additional work as per Revision 2 of shop drawings dated 9/17/2026 (Submittal #21.2)":
  - F&I 1" Sch 40 CS FO supply, 1-1/2" Sch 40 CS FO return, 2" Sch 40 CS fill, and **6" Sch 10 CS containment**, with fittings, supports and hangers.
  - Material $8,875 (note this equals exactly 8.875% of $100k; check that it is not a placeholder).
  - Labor: mechanic 288 hr x $125 = $36,000; welder 104 hr x $150 = $15,600.
- Net of the two COs: **+$21,175**. Both use T&M labor rates and show no separate markup line (the contract allows 10% markup, or 10% OH + 5% profit per the R version).
- **Status: superseded.** The 10/15 email says the client is keeping Brugg. Core invoiced the Brugg pipe in June (invoice #5495) and the coil is in Core's warehouse (68"L x 74"H x 42"D). Core had quoted a Brugg restocking fee on 9/24. App #5 shows no COs.

**NWAC committed fuel oil cost so far:** Core $100,000 (+ $8,875 if taxable) and ACS $2,000. The installation sub is still to be awarded. Rigging and fuel are not yet carried.

## 4. Discrepancies, gaps and risks

1. **Stale COs (#001/#002).** Void them or confirm they were never sent. If KBD received them, send a written retraction. KBD (10/22) is now asking for "Brugg fuel oil piping: confirm start Monday 11/2".
2. **Subbing out without KBD approval.**
   - §12.2 needs prior written approval.
   - Flow-downs needed: insurance (Exhibit F; the bid package contains a different "Exhibit C to Master Subcontract Agreement"), TPM fee ($100 per sub-sub), safety program, Procore daily reports.
   - Bids were due 10/28 and none are on file. A&C asked for an extension and a site visit.
   - The 11/2 start date "confirmed" to KBD has no installer behind it.
   - Project completion is 12/4/26, with liquidated damages flowing down (§5.5).
3. **Permit and filing responsibility conflicts.**
   - Signed 010R handwritten note: NWAC takes no filing or permit responsibility; fees by others.
   - Exhibit A still says "All filing, permits and fees for your trade". The proposal excluded permits and fees.
   - M001 note 6: "secured by the contractor and paid for by the owner". M601 2.B: contractor files and pays.
   - The ITB pushes "inspections and DOB sign-off for the fuel storage application (M01244603-S4)" and the boiler (-S5) onto the sub under a licensed Oil Burner Installer.
   - **Confirm:** who is applicant of record on S4 and S5 (All City Engineering), who pulls the work permits, who pays the fees, and who books the TR-1 special inspection agency.
   - FDNY permit or inspection for the tank and generator fuel is not addressed in any document I read. Check T001/FS.
4. **Licensing.** The ITB requires a NYC Oil Burner Installer license, which implies NWAC does not hold one. If no qualified sub is awarded, NWAC cannot sign off S4.
5. **M504 detail mismatch.**
   - The contract line "gas boiler B1, as detailed on M504" points to a detail of an **oil-fired steam boiler** (forced-draft burner, oil burner pan, 8" steam runout, 3" safety valves at 15 psi, sequence draft damper).
   - The actual boiler is a gas, hot-water, 30 psi relief unit connecting to existing HWS/R and pumps (M105).
   - The ITB asks for a "condensate neutralization kit" and drain, but Ferguson says the EG-75 is non-condensing and needs no kit.
   - The boiler schedule is on the BE sheets (not reviewed).
6. **Vent scope gaps.**
   - Contract: "2" fuel oil vent and 4" fuel oil vents".
   - Drawings: a 4" oil vent from the main tank to the Vesey facade. Core supplies only a **2" updraft vent**.
   - Generator sub-base tank: 2" normal vent and two 4" emergency vents, "customer to supply" (Weldco), "shipped plugged" (Kohler).
   - Nobody's PO or quote covers the 4" vent caps or the roof emergency-vent piping. NWAC carries them by contract.
   - Also the M105 "6" vent 10 ft above bulkhead" (generator exhaust?) has no owner.
7. **Fill containment box RFB-5RMSS4-2.** The ITB says "furnished by Northern Wolves", but Core's quote says "*Spill Containment NOT Included*" and I found no PO for it. Fill location and box are tied to RFI #26 (sibling agent). KBD is waiting on "revised drawing that follows the engineer's sketch", promised for 10/28.
8. **"Fill Fuel Oil upon completion"** is in the contract. Nobody carries the fuel (about 134 + 75 = ~210 gal diesel, plus test burn). The ITB only covers "initial fill coordination".
9. **Equipment access and rigging.**
   - Core (10/15): the tank (36"W x 49"H in basin) and pump set (74"H) will **not** pass a 32"W x 4'H door. Options were a single-wall tank without basin (non-compliant with the 200% design) or cutting the pump-set supports.
   - Whitney replied 10/22 "both will fit, no need to make any adjustments". **Verify the actual path in the field.**
   - Delivery is through the 10 Barclay garage, which needs one week's notice.
   - Rigging is NWAC scope ("all necessary rigging for boiler and other mechanical equipment"). Offloading is not in Core's scope.
10. **Low-voltage control and alarm wiring** is not clearly owned. It runs from the FOC panel in the sub-cellar to the generator tank floats, leak sensors and remote annunciator (6 levels), plus generator to FOC interlock and Kohler "Run/Fail output for fire alarm". The ITB has the sub install sensors and excludes "line-voltage and BMS". The contract has NWAC doing "local automatic temperature controls & wiring". **Assign it explicitly.**
11. **Testing.**
    - ITB: 150 psi for 1 hr with DOB and special inspector.
    - M601 8.B: 1.5x working pressure, minimum 100 psig, 2 hr.
    - Core: Brugg interstitial vacuum monitoring, factory start-up and training ("Full payment ... required prior to rendering field services").
    - The tank tightness test and the special inspection agency cost are not carried anywhere.
12. **Cutting, coring and firestopping.**
    - Contract includes Hilti firestopping and sleeves (A.4.4). The proposal excluded firestopping.
    - Core drilling is only an add alternate ($5,000 for the whole trade).
    - KBD expects NWAC to give "the date the roof penetration and curb will be ready" for the Brugg riser. The roof curb and penetration are not in Core's or the sub's scope as written.
    - 2-hr sheetrock enclosures and concrete pads are by others (ITB). Confirm KBD agrees.
13. **Sales tax.** Core priced the job tax-exempt ("if taxable, add"). The contract says sales tax is included and calls the project a taxable capital improvement. Exposure is about **$8,875** on Core alone.
14. **Contract wording on the riser.** "FOS to be 1" with a 1 1/2" Brugg outer wall" could be read as a single supply line. The design and the purchase are a separate 1" FOS and 1-1/2" FOR, both double wall. No cost issue, since both were bought, but clarify if KBD challenges.
15. **Duplicate level controls.** The Weldco sub-base tank has its own HL/CL/CH switches, and Core supplies a four-float package for the "generator sub-base belly tank". Make sure the submittals agree on which device starts and stops FOP-1 and which trips critical high.
16. **Billing.** App #5 bills Equipment Procurement at 90% ($251,280) with $0 stored materials. Meanwhile the Core tank and pump set are undelivered (pump set ETA early-to-mid November) and Core payment was only being released on 10/29. **Avoid overbilling exposure.** The Core deposit and pre-ship payments are due before delivery, and Core terms are not pay-when-paid.
17. **Schedule.** KBD superintendent emails of 10/22 and 10/26 report no manpower on site and ask for a recovery plan. The fuel oil path is critical: tank delivery week of 11/2, Brugg start 11/2, pump set mid-November, fill/vent drawing pending, installer not awarded. Completion is 12/4/26.
18. **Design documents not reviewed:** T001, FS101-FS105, FS300 (fuel storage) and BE-001 to BE-600 (boiler). Tank spec, FDNY and Local Law notes, the riser diagram, valve schedule and alarm sequence are on those sheets. The Specs folder is empty, and M601 has no fuel oil section. Spec governs over drawings (§13.1.2), but there appears to be no fuel oil spec at all.

## 5. Files read

**Design**
- M001.00 `1v0RyriOwggb7Sikt0t5DtJRFQ3sWxkqT`: visual read. Scope, TR-1 inspections, related filings S2-S5, permits note 6.
- M051.00 `1h_J2qni82Z8CfdCN3iyH2khczjUSPn5H`: downloaded, not examined in detail (existing 2nd/3rd floor).
- M052.00 `112gqmastDuS0K11jWA2Jlwka4TzRjt1G`: downloaded, not examined in detail (existing 4th/5th floor).
- M053.00 `1Tdtc0hSTvW6rKrVowBu1UCqvRTlORBO3`: existing roof. Existing boiler to be removed. No fuel oil items.
- M101.00 `18qTuQpBVWl6dwXlCBNSdlngGgumVRck2`: **key sheet.** Fuel oil room, 134 gal tank, FOP-1, Brugg riser, fill/vent, S4 note.
- M102.00 `13nplyeSSlxU8s7ISSyf7EEg1ldIJBgz9`: 1st floor. 4" vent / 2" fill at Vesey facade above sprinkler connection; GX-2 louver.
- M104.00 `1bR5nPibU2uqTY3PC5fOeRJC6zHS_-jWc` (not in the list; found in Drive): downloaded, not examined.
- M105.00 `1C0uGzU6URFQR-uiYy9_Cic-BzUQWc-8M` (not in the list): roof. 80 kW generator on dunnage by others, riser down, 6" vent, boiler room (S5).
- M301.00 `1BoIIWNkBijYWBjjYf-6Ay5RaU_RK7rIc`: air/refrigerant riser. Thumbnail rendered, not examined.
- M401.00 `1wfTE4uX6twLKXqhsfym_bq5RtBIUbL25`: schedules. GF-1 fuel oil storage room fan 150 cfm. No fuel oil equipment schedule.
- M402.00 `1ZjB9iukj75Zx8pbiVQwaRsU8y8pJOiPP`: ECUH-1 serves the fuel oil room.
- M501.00 `1nIpQK7WjPhJabKoGRQy0qhzyJF8rbUYp`: duct details only.
- M502, M503, M505 (`1s5V3mft1PvLX6vbuJCj8PPWVJZx2Pef2`, `1oTI9lYmwUQ3E0ZbzujStypJnLPfNlEly`, `1F-Ioc1YPIheSDACcrGv3gmKFJYUmgSFl`): downloaded, not examined (OCR timed out).
- M504.00 `18XacUS8eguxAZC3h3Chhu8NUCs73Wt37`: typical **oil-fired steam** boiler elevation; caulked sleeve detail.
- M601.00 `1TCQluI_KSjt5oGzGAosarm7v0Gqn7GBZ`: mechanical specs. No fuel oil section; hydro test 8.B; contractor permits 2.B.
- Full bid set `1OLNHVsKADZ2ybXYDoRI6Yz6VUqBOnTl8`: **could not open.** It is over 10 MB, and text gives only title blocks (sheet list: T001, FS101-105, FS300, BE-001 to BE-600, P-, E-, A-421/431 "Fuel Oil Enclosure").

**Generator and tank**
- Kohler submittal `1kJwU-6rAsji8n4aTh7rNWZ8WVcYS3WGj`: MTS Power. 80REOZJF diesel, 75 gal NYC sub-base tank, AAN 7/27/26, 8,250 lb on dunnage.
- Tank Drawing `1THWMso4ZNEFvtDQtjHbp50N7d39sEh5q`: Weldco UL142 75 gal, Rev B 8/12/26. Fittings, float setpoints, vents "customer to supply".

**Contract and commercial**
- SC-30-26004-010 `1C-M6AeNivXJyQv-HzhlyLkj7666ASpxW`: Exhibit A scope, terms.
- SC-30-26004-010R `1LnzMYc1WyGXUKuTjLVKFe7gf7NQP3eh7`: signed 5/8/26. Markups: permits excluded, coring alternate $5k, 10% OH + 5% profit.
- Insurance Exhibit C `1WyLmL2OQb9HGQoAHrlrBr-wAuBwa2nRr`: skimmed (metadata snippet). CGL $1M/$2M, 10-yr completed ops, etc.
- "Proposal 18 Vesey Street" `1wCZmQkPGn2pt892ppiYLhmY9apYdI2AW`: All-City Sketchers. FO shop drawings $2,000 of $9,000.
- "18 Vesey Street Proposal REV1" `1yTwTgrjrkvs8igI9zkjC-eWg0u7BYOzg`: Highmark ERV-1, $12,250. No fuel oil.
- "Seafarers International .pdf" `1UqfDH6MHfvNRW-y4gTwHQolLnOwpm7b2`: NWAC Quote 2759 to KBD, $498,200. Fuel oil included; permits, firestop and coring excluded.
- Quote ALL BIDDERS V1 `1ikTDOvOEyRyUPW1KLFiX3rMQQ2AOZ7OB`, V5 `1LLStcvkW1HjOb_qoFQzmROpSoU7XvJ5l`, V6 `1B-F1HkkwvJ55cgHksjPBjvG76L_-xCP8`, Reno V3 `18syA6A1KFUqTAmldREBRBnbpCqeUkTVm`: Brothers Supply PTAC quotes, not KBD bid forms. No fuel oil.
- CORQ38731 `10NYBmFBLpIJ9OdiS021xXieiBXftTVF6`: Core itemized, $128,884.92.
- CORQ38731-03 `1hq9RVp2EneZ4b4J6v4bDQY1UsY7Wzpqa`: Core lump sum, $100,000.
- Q-95289-1 `19mcZq0wJzkFA9RpsW33_69RmzRfMWmhT`: Homans, Mitsubishi. No fuel oil.
- P296592R01 `1yPr5plUz4aWkqVvcLYdxc7lCE6PQbrzY` and DL Scope Letter `1uInxU-IMLJaUUoiUspD3yUuw4TLsG0R-`: ADE. No fuel oil.
- 04-29-2026 BUYProp `1XUfsC23EU3dUr__UUfEi6jT-kQ7UqxPZ`: Trane VRF, $43,390. No fuel oil.
- 25-02667 `1QfwRa6cKVuGoz8X_-eq4aSjvPcMyZplD`: Mechanical Technologies, $11,000. No fuel oil.
- SO21759 `1KfDZWdQrevVNKU4LwPM8pv_fU1IuUxMQ`: Bush cable dampers, $1,089.
- BSTD...2796 `1zL3_1YVDXXkwsAY39XyBBUxMVjhzdS6O`: Ferguson Mitsubishi, $45,050.81.
- QC REV BSTD...4022 `1dEpHllEQIY8zCgfSR2dxLCpQc1Cd_brd`: Ferguson gas boiler EG-75 + Watts, $11,292.83.
- PO NWAC1073 `1EUPxPfu-Ngw5EhO3vM7P7_7o9IQfkl6B`: Core, complete fuel oil system, $100,000 (read fully).
- POs: NWAC1070 Highmark `1iWiffP5X9FmMvcvLDF8PwBjB6lsawA_c`; NWAC1076 Brothers `1cLCHKD7wvRDytPLNTGUy1xGvFBtIUjR2`; NWAC1084 Trane `1qtm3Z9SXxUtdUGwMYJGio6_yZPD5N3lu`; NWAC1122 ACS `1ucr-xyP2RN7OzRXJzJdO752aP11NJ_bb` (FO dwgs $2k); NWAC1080 Ferguson `1tgG-EWQQ340CITnDNG9oygkX_OK5x6jp` (boiler); NWAC1086 MT `1G7DDj9wB3Vndwbeqxdu8BYY5Ptmj0OjX`; NWAC1273 Bush `10-wERp-RiAWpNuytcANkf4LZM77gNnQo`. Only 1073 is fuel oil.
- CO #001 `1XRICtz0orPGt3HAKY6nlTf7V4a-9hxKY`: −$39,300 Brugg deletion.
- CO #002 `1bjODj54NB5MkFXu-Fe98Lm_T-eHjpUyl`: +$60,475 carbon steel and containment.
- App #05 `1aGmTnJ2I0I040X9lloKj3_Rm_Cr3LxfM`: SOV, 5% retainage, no COs.
- Tracking log `1mIgA_MnFcO8BHZ2wpwyTVF40cUQlOhJr`:
  - "Fuel Oil System & Piping, Core": R&R 5/20, R&R 5/27, **Approved 6/11/26**. Equipment log: approved, no PO, release or delivery dates.
  - Fuel oil drawing FO-SC Rev 1: submitted 6/19, returned 7/23, engineer R&R, **architect REJECTED**.
- Bid package folder `1JrwIiOEW7UwnBC7W-N2P4tbckOYF809x`: listed. 02 boiler submittal `1CqMpFdWNH4jlM-RqDo7x9-JoXZMowAek`, 03 FO submittal SBM5622 `1W4gsAbFv9_ccQH_B82Wrw4NC9t2m2-TL` (25 MB) and 04 containment box `1KB8LHBLCr9TVT97Vz27nbgvCy3nHB4I2` were not opened (submittals are the sibling's scope).

**Context from Gmail** (read-only, for status)
- ITB thread "Invitation to Bid – Boiler & Fuel Oil System… Due Wed 10/28": full scope split and responses (Abilene, PH Works, A&C).
- KBD "Firm dates for PTACs, boiler, fuel tank + recovery plan": 10/22-10/29.
- Core "PO#NWAC1073 / Core 5622": Brugg kept (10/15), door size issue, invoice #5495, payment release, site walk request.
- Falcon Mechanical: proposal received; reply bounced.
- Ruslan to Alikhan: ask NJPD Plumbing to quote.

**Could not read or not opened:** full bid set (T001, FS-, BE-, P-, E-, A-sheets); SBM5622 FO submittal (25 MB); M502, M503, M505, M051, M052, M104 (not examined in detail); Exhibit R of the subcontract (not in the extracted text).
