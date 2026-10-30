# 18 Vesey St (Seafarers) - Boiler and Radiant Floor Heating: scope, status, plan

Prepared 2026-10-30, read-only review of Drive and Gmail. Nothing was sent, drafted or changed.
Source ids are given in [brackets]: Drive fileIds or Gmail thread / message ids.

---------------------------------------------------------------------------------------------------

## 0. The short version

- **Boiler B1** is a Weil-McLain EG-75-PIDN: gas, hot water, cast iron, natural draft, non-condensing.
  It goes in the existing **roof boiler room** (M105). It replaces the removed boiler and ties into the existing
  HWS/R piping and the **2 existing HW heating pumps (to remain)**. Those feed the existing HWS/HWR risers, which
  M103/M104 tie to the PTACs. The flue goes to the **existing exhaust duct/chimney** ("VIF condition"), and
  combustion air comes from the existing duct and louver.
  - Approved NET 5/8/26. Bought and stored at the NWAC office since 7/10. Not rigged, not piped, no startup.
  - The install sub is not awarded. **KBD's gas inspection is blocked until the boiler is tied in.**
- **"Тёплый пол" is ELECTRIC, not hydronic.**
  - Design: FH-1 "Floor Heat Mat", King FCM-1, 120 V / 1 ph, 12 W/sf, in the bathrooms, floors 3-5
    ("PROVIDE FLOOR MAT HEATING (TYP. FOR ALL) FH-1").
  - Substituted with Watts SunTouch TapeMat, 120 V: 13 kits / 350 sf total, each kit with a programmable SunStat
    thermostat and floor sensor. Submittal 230000-2.0 was returned NET 5/8/26 with ACE comment "120V 1 PHASE".
  - Material was shipped to the NWAC office 7/10.
  - **No evidence any mat is installed.** The mats must go down before the tile, so the bathroom flooring status
    is now the most urgent unknown.
  - It has nothing to do with the boiler or the hot water piping.
- The contract has **no separate SOV line** for either item. Both sit inside lines 3, 4, 6 and 8 of the
  $498,200 SOV.

---------------------------------------------------------------------------------------------------

## 1. Boiler - what the documents show

### Equipment
From submittal 230000-1.0 [1IvMx4k51TtC5wxqJT886jZMLJL-x8u5x], Ferguson QC REV [1dEpHllEQIY8zCgfSR2dxLCpQc1Cd_brd]
and PO NWAC1080-SVS [1tgG-EWQQ340CITnDNG9oygkX_OK5x6jp].

- **Model and ratings:** Weil-McLain EG-75-PIDN with water trim, part W118751501.
  - 282 MBH input, 237 MBH DOE heating capacity, **206 MBH net AHRI (water)**, 84% AFUE.
  - Natural gas, natural draft, intermittent ignition with automatic vent damper.
  - Partial knock-down: factory-assembled section block plus loose jacket.
- **Standard equipment:**
  - Unity-CI control with built-in LWCO
  - Built-in air separator
  - **30 psi ASME relief valve**
  - P/T gauge
  - 50 VA transformer
  - Spill switch and rollout fuse
  - Horizontal-to-vertical draft hood
  - 24 V combination gas valve
- **Optional item bought:** outdoor sensor kit 381-356-586, $29.07, for outdoor reset.
- **Ferguson notes:**
  - "This is a non-condensing boiler; a condensate neutralizing kit is not needed."
  - "Boiler is cast iron, not a 'Water Tube' type."
- **Connections (EG-75 row of the submittal table):**
  - Supply tapping 3" NPT, return 2-1/2" NPT
  - Minimum recommended forced-water supply/return pipe **2"**
  - **Gas connection 3/4"**
  - Chimney size **8" I.D. x 20'**
  - Jacket width 34"
  - **Approximate shipping weight 735 lb**
  - Relief tapping 3/4"; compression-tank / air-vent tapping 3/4"
- **Certification:** "CSA design certified for installation on non-combustible flooring only. Tested for 50 PSI
  working pressure."
- **Warranty:** commercial, 10 years on the heat exchanger and 1 year on parts.
- **Cost:** boiler $5,408.20 + sensor $29.07 = **$5,437.27**. Lead time 1-2 weeks; it was in stock.

### Location and connections on the drawings

**M105.00 (roof plan)** [1C0uGzU6URFQR-uiYy9_Cic-BzUQWc-8M; local dl/M105.pdf]. Crop rendered at
scratchpad/br/M105_boiler.png.
- "BOILER-1" sits inside the existing **BOILER ROOM** on the roof, next to the elevator machine room. The
  leader note reads: "NEW BOILER FILED UNDER RELATED APPLICATION #M01244603-S5. REFER TO 'BE' DRAWING FOR SCHEDULE."
- The flue connects into the "VIF CONDITION OF EXISTING EXHAUST DUCT". The engineer is reusing the existing
  flue/chimney; there is no new flue route, material or size.
- "EXISTING HOT WATER HEATING PUMP TO REMAIN (TYP. FOR 2)."
- "EXISTING DUCT AND LOUVER TO REMAIN" (combustion air) and "EXISTING LOUVER TO REMAIN" at the boiler room wall.
- No expansion tank, makeup water / backflow preventer, chemical feeder, piping diagram or pad is drawn on M105.

**M103.00 / M104.00 (floors 3-5)** [M103 1j5ugYEScyFg3WL8FP8nz9mMid9oypIat; M104 1bR5nPibU2uqTY3PC5fOeRJC6zHS_-jWc]
- "TIE 'PTAC-A' AND 'PTAC-B' UNITS TO EXISTING HWS AND HWR RISERS (TYP. FOR ALL)". So the boiler's water goes
  through the existing risers to PTAC hot water coils (if furnished; see COP-SVS-01).
- No other hydronic terminal is shown on these sheets.

**M504.00 "Typical Boiler Elevation"** [18XacUS8eguxAZC3h3Chhu8NUCs73Wt37]. Image at scratchpad/br/M504_full.png.
- It shows an **oil-fired steam boiler**:
  - forced-draft burner, oil burner pan, burner control panel on a 4" pad
  - 8" steam runout
  - two 3" safety valves set at 15 psi
  - sequence draft damper with electric actuator, smoke detector, tube pull
  - 20"x46" breeching into a 28"x40" duct, 4" concrete pad
- None of this applies to the EG-75. The only usable points are the 4" concrete pad and the test-hole notes.
- The contract line "as detailed on M504" therefore points to the wrong detail (see risks).

**M401.00 / M402.00 (schedules)** [1wfTE4uX6twLKXqhsfym_bq5RtBIUbL25 / 1ZjB9iukj75Zx8pbiVQwaRsU8y8pJOiPP]
- **No boiler, pump or expansion tank schedule.** M105 says the schedule is on the BE sheets.
- M401 has the FH-1 Floor Heat Mat schedule (section 2).

**BE-001 to BE-600 (S5 boiler set)**
- These are only in the 51 MB full bid set [1OLNHVsKADZ2ybXYDoRI6Yz6VUqBOnTl8]. It is too large for the Drive
  connector (10 MB limit), so it was not opened.
- An earlier text extraction (scratchpad/txt/bidset.txt) shows that pages 49-58 (BE-001, BE-101, -102, -103,
  -401, -500, -501, -600) yield only room names and title blocks ("BOILER ROOM" appears on BE-102). The
  schedules, details and riser are vector graphics and could not be read.
- **The boiler schedule, piping diagram, flue and expansion tank are NOT verified.** Someone must open the set in
  a PDF viewer.

**M601 (specs)**
- No boiler section was found. Earlier notes cite hydrostatic test note 8.B.
- The Specs folder in Drive is empty.

### What the boiler serves
- It serves the existing building hot water heating loop: the existing 2 pumps on the roof and the existing
  HWS/HWR risers down through the building.
- Per M103/M104 and RFI#01, that loop also serves the new PTAC-A/PTAC-B hot water coils.
  - KBD's answer to RFI#01 (8/10): "Northern Wolves is responsible for the piping connections to the hot water
    coils ... This is part of base scope" [Gmail 19fddfb726b7ae5e, msg 19fec4adbd3177a8].
  - COP-SVS-01 (coil upcharge) is disputed. Peter's 9/x reply cites the M-104 note [Gmail 1a021a4a1cd6d446].
- **Radiant floor is NOT on the boiler**; it is electric.
- No load check was found. 206 MBH net is for the whole building loop, and the existing radiation is unknown.

### Rigging, weight, path
- Weight is about **735 lb shipping** (EG-75, from the submittal table). It is partial knock-down, so the jacket
  ships separately and the section block is one heavy piece.
- The path is not documented anywhere.
  - The boiler room is on the roof next to the elevator machine room, so the elevator probably does not reach the
    roof level. Options are: elevator to the 5th floor and then the stair to the bulkhead, or a hoist/crane to the roof.
  - KBD rules: "No free rigging material off the forks of lifts" [contract 1LnzMYc1WyGXUKuTjLVKFe7gf7NQP3eh7 p. safety].
- The contract puts rigging on NWAC ("Provide all necessary rigging for boiler and other mechanical equipment").
- The 10/23 ITB **does not** expressly give boiler rigging to the install sub. It lists rigging only for the
  fuel oil tank and pump set [Gmail 1a168a32d15c5f46]. This is a gap.

### Who does what (ITB, 10/23) [Gmail 1a168a32d15c5f46]

**Part A, boiler, roof boiler room**
- *NWAC furnishes:* boiler "with manufacturer's control panel, gas train and condensate neutralization kit".
  The kit does not exist / is not needed.
- *Bidder furnishes and installs:* all other materials (pipe, fittings, valves, specialties, **vent connector**,
  supports) and labor:
  1. HWS/R from the boiler to the existing HWS/R and existing pumps, including isolation and check valves, unions,
     strainers, air vents, drains, gauges and thermometers.
  2. Relief valve discharge to drain.
  3. Reconnect the existing motorized combustion-air damper/louver to the boiler.
  4. Condensate drain through the neutralizer (not applicable; delete).
  5. Control wiring: boiler, outdoor reset and existing pumps.
  6. Hangers, sleeves, firestopping.
  7. Fill, flush, purge; "factory start-up, combustion test and adjustment (after gas is connected by the plumber)".
  8. Inspections and DOB sign-off for S5, boiler registration.
- *By others:*
  - existing boiler removal (done)
  - all gas piping incl. the boiler connection, meter and riser (plumbing, S2)
  - insulation
  - steel dunnage, concrete pads
  - line-voltage power and BMS (electrical)

**Ruslan 10/22:** "They only need to provide materials for the boiler installation" (the sub supplies boiler
install materials; NWAC supplies the oil system materials) [Gmail 1a0cab5f8cabdf56, msg 1a1654a9705f398d].

**Not addressed anywhere:**
- expansion tank (replace or reuse)
- makeup water / RPZ backflow / PRV
- system chemical treatment
- chimney inspection or liner
- vent connector material and size (Category I: 8" per the table)
- pad
- boiler rigging
- low-voltage interlock with the combustion-air damper (only "reconnect")

---------------------------------------------------------------------------------------------------

## 2. Radiant floor (тёплый пол) - what the documents show

**Design**
- **M401 "FLOOR HEAT MAT SCHEDULE":** FH-1, location "SEE PLANS", 120/1/60, **12.00 W/SF, 0.10 AMP/SF**,
  manufacturer KING, model **FCM-1**. Crop at scratchpad/br/M401_fh.png.
- **Plans:**
  - M104, 4th floor: "PROVIDE FLOOR MAT HEATING (TYP. FOR ALL) FH-1", pointing at bath 4-105.
  - M104, 5th floor: the same note at the bath near 5C.
  - M103, 3rd floor: the same note at **ADA BATH 3-103 / bedroom 3A**.
  - "TYP. FOR ALL" means the bathrooms on floors 3, 4 and 5.
  - The exact room list and areas were not counted from the drawings. The tags are small and some baths are
    shower rooms. The A-sheets / BE-sheets were not read.

**What was bought: Watts SunTouch TapeMat 120 V, "quoted alternate to schedule"** [1dEpHllEQIY8zCgfSR2dxLCpQc1Cd_brd]
- (11) kits for 20 sf, (1) kit for 70 sf, (1) kit for 60 sf: **13 areas, 350 sf, about 4.2 kW**.
- Load is about 35 A at 120 V: about 2 A per 20 sf kit, 7 A for the 70 sf kit, 6 A for the 60 sf kit.
- Each kit includes a programmable thermostat with floor sensor (SunStat), a LoudMouth installation monitor,
  double-sided tape and the manual.
- $5,855.56, lead 4-6 weeks. Ferguson notes: "Freight Not Included", "**No maintenance, spare parts, or start up
  service provided**", "Verify all options and quantities prior to ordering".

**Submittal 230000-2.0 "Watts SunTouch Radiant Tapemat cuts"** [returned 1vIAbNw4s8PAZMBIOknjJSMmJNPivRNJC; also Fatima's copy 1a-h4Lwj0yv1rf6LOpnaokQSNCQDH5rJq]
- Chris Santos (Arcari + Iovino) returned it **NO EXCEPTIONS TAKEN**, dated 5/8/26.
- The ACE stamp reads "Reviewed / ACE: SEE COMMENTS". The only comment is **"ACE: 120V 1 PHASE"**.
- KBD distributed it 5/11 as "Approved as Noted ... for your review and coordination". The submittal is closed.
- Tracking log shows WATTS RADIANT submitted 4/30, returned 5/8, APPROVED [1mIgA_MnFcO8BHZ2wpwyTVF40cUQlOhJr].
- NWAC's submittal sheet [1xy5pssMZ4VD0MqD5oHzY9sDvxSfDPGg2] shows "Lead Time: 4-6 Weeks".

**Product requirements (from the cut sheet)**
- Install over plywood, backer board or slab, embedded in **3/8" minimum self-leveling or polymer-modified thinset**.
- Measure and record cable resistance (ohms) before, during and after installation.
- Install the floor sensor; never cut the cable.
- Max 15 A per SunStat; 20 A circuit.
- Allowable floor coverings: tile/stone, carpet, hardwood.

**Responsibility**
- Exhibit A: "**King Floor Heat Mat FH-1. Install where indicated. Power by Electrician**."
- NWAC also owes "F&I all thermostats as required and specified on the drawings" and "F&I all local automatic
  temperature controls & wiring as required".
- So: NWAC lays the mats, sensor and thermostats; the electrician brings 120 V circuits and makes line-voltage
  terminations. The SunStat is a line-voltage thermostat, so final wiring at the thermostat should be the
  electrician's. Confirm in writing with KBD.

**Status**
- Ferguson's 6/16 note: "the material for this project is in and ready to ship". On 6/2 he described the order as
  "Weil-Mclain and WATTS material".
- Shipped to the NWAC office on 7/10 ("Please send it to our office") [Gmail 19e89f1e2efe030c, msgs 19ed204840d4b918, 19f4cd7052321216].
- Alikhan's 7/21 inventory to Ruslan, with photos, lists "Boiler (1), Floor Heat Mat (1), Electric Heater (2),
  Dampers, Air outlets" [Gmail 19f85c728cab76dd].
- **No email or record shows mats delivered to site or installed.** There is also no coordination with the tile /
  flooring trade or the electrician.

---------------------------------------------------------------------------------------------------

## 3. Contract - exactly what NWAC owes

**Subcontract SC-30-26004-010R, Exhibit A.5** [1LnzMYc1WyGXUKuTjLVKFe7gf7NQP3eh7; text in scratchpad/txt/SC010R.txt lines 760-930], verbatim:
- "All needed hoisting, scaffolding, and/or rigging needed for your trade"
- "All filing, permits and fees for your trade". **Overridden** by the handwritten 010R note: "NWAC DOSEN'T TAKE
  THE RESPONSIBILITIES FOR FILING, PULING ANY KIND OF PERMITS. PERMIT FEES AND INSPECTION FEES TO BE PAID BY
  OTHERS." Ruslan confirmed NWAC is not pulling permits.
- "Furnish and install new gas boiler B1, as detailed on M504. Gas piping by others"
- "Provide all necessary rigging for boiler and other mechanical equipment"
- "Furnish and install all new equipment as per equipment schedule M401.00 ... King Floor Heat Mat FH-1. Install
  where indicated. Power by Electrician"
- "F&I all local automatic temperature controls & wiring as required."
- "F&I all thermostats as required and specified on the drawings"
- "All necessary check, testing & startup of the new equipment"
- "All specified (Hilti) firestopping to be F&I for any penetrations for this trades work"
- "Provide all welding and brazing as needed"
- "Provide control drawings and as-built documents"
- "Mechanical contractor is responsible for all mechanical and piping work shown on all drawings and
  specifications noted above regardless of drawing section." This pulls the BE-sheet piping into NWAC scope.
- "1 Year warranty is included for labor & material (warranty by manufacturer as per OEM)."
- 7.4: (4) sets of O&M manuals.
- §3.25: direct check-out and startup.
- A.6 Exclusions: blank.

**NWAC Quote 2759 to KBD, 4/22/26, $498,200** [1UqfDH6MHfvNRW-y4gTwHQolLnOwpm7b2]
- "Furnish and install Boiler (1)", "Furnish and install Floor Heat Mat (1)", "Furnish and isntall All Pipework with
  accessories and insulation", "Furnish and install standalone control", "Provide Start Up", "Provide 1 year Labor
  Warranty".
- Exclusions: BACnet/BMS/EMS; overtime; scaffolding with permits; Fire Stop; cutting and patching roof, structural
  walls, floors; roof dunnage/steel; structural work; **Permits and fees**; bond; **Gas Piping, Gas Meter**;
  warranty for existing equipment; Core Drilling.
- Note: Exhibit A (signed) puts firestopping back in.
- The file the task named "18 Vesey Street Proposal REV1" [1yTwTgrjrkvs8igI9zkjC-eWg0u7BYOzg] is a **Highmark ERV-1
  quote ($12,250)**, not NWAC's proposal.

**KBD buy-out scope 4/21** [Gmail 19db15f12b00fdd5]
- Same boiler and FH-1 lines.
- The standalone control scope lists no boiler or floor-heat item. Boiler and radiant controls fall under the
  general "F&I all local automatic temperature controls & wiring" line.

**SOV, App #05 (period to 9/30/26)** [1aGmTnJ2I0I040X9lloKj3_Rm_Cr3LxfM]
- **No boiler or radiant line.** Both sit inside:

| Line | Description | Scheduled value | Billed to date |
|---|---|---|---|
| 3 | Equipment Procurement | $279,200 | $251,280 (90%) |
| 4 | Equipment Installation | $85,000 | $51,000 (60%) |
| 6 | Associated Piping & Control Wiring | $31,000 | $18,600 (60%) |
| 8 | Testing, Start-up & Balancing | $10,000 | $0 (0%) |
| 9 | Close Out | $2,000 | $0 (0%) |
| **Total** | | **$498,200** | **$396,080 (79.5%)**, retainage 5% |

- Boiler and radiant material (about $11.3k) is effectively billed under line 3.

---------------------------------------------------------------------------------------------------

## 4. Status as of 10/30/26

| Item | Status | Source |
|---|---|---|
| Boiler submittal 230000-1.0 | Approved NET 5/8/26 ("ACE: THIS MODEL"); closed | 1IvMx4k51TtC5wxqJT886jZMLJL-x8u5x |
| Watts radiant submittal 230000-2.0 | NET 5/8/26, ACE comment "120V 1 PHASE"; closed | 1vIAbNw4s8PAZMBIOknjJSMmJNPivRNJC |
| Purchase | PO NWAC1080-SVS 5/1/26, $11,292.83 (tax exempt). Ferguson job account opened 6/4 | 1tgG-EWQQ340CITnDNG9oygkX_OK5x6jp; Gmail 19e89f1e2efe030c |
| Delivery | Both shipped to the NWAC Brooklyn office 7/10 | Gmail 19e89f1e2efe030c |
| Boiler to site | Whitney to Peter 10/26: "Will delivery to the site 10/29". **No confirmation found** that it arrived | Gmail 1a1653342869255d, msg 1a1796033e234529 |
| Rig-in / tie-in / startup dates | **Not given.** Peter asked 10/12, 10/22, 10/26. Whitney 10/15: "I still owe him dates for delivery of boiler and PTAC's" | Gmail 1a130adf9178c71d; 1a1653342869255d |
| Gas inspection | Peter 10/12: "I would like to schedule my inspection for the gas work but cannot until the Boiler is tied in." | Gmail 1a130adf9178c71d |
| Install sub | ITB 10/23, due 10/28: P.H. Works (confirmed receipt 10/26), Abilene (asked union? "private non-union"), A&C (wants a site visit and extension), NJPD (Ruslan 10/22 asked to invite), Falcon (email bounces). **No bids found, no award.** KBD written approval of a sub-sub is needed (§12.2) | Gmail 1a168a32d15c5f46, 1a16592b52778f2c, 1a0cab5f8cabdf56 |
| Boiler piping shop drawings | MP-2..MP-5 and **MP-R** submitted 7/2, status **PENDING** in the tracking log. Whether MP-R shows the boiler room was not verified | 1mIgA_MnFcO8BHZ2wpwyTVF40cUQlOhJr; Gmail 19f2325a1f295cdb |
| Radiant mats installed | **No record.** Tile status in the baths is unknown | none |
| Open review comments | Boiler: none beyond "THIS MODEL". Radiant: "120V 1 PHASE" (matches what was bought) | as above |
| PTAC HW coils (affect the loop) | RFI#01: piping to the coils is NWAC base scope; COP-SVS-01 disputed; PTAC delivery date still unknown | Gmail 19fddfb726b7ae5e, 1a021a4a1cd6d446 |

---------------------------------------------------------------------------------------------------

## 5. Gaps and risks

1. **Radiant sequence (highest urgency).**
   - Mats must be laid, ohm-tested and embedded in thinset or self-leveler before tile.
   - If the tile setter has already tiled any of the baths on floors 3-5, NWAC either pulls tile (cost) or proposes
     a credit or alternative.
   - Action: walk floors 3-5 immediately. List every bath, measure net heated area and photo the subfloor.
   - Then coordinate dates with KBD and the tile sub.
2. **Radiant quantities.**
   - 13 kits / 350 sf was Ferguson's guess ("Verify all options and quantities prior to ordering").
   - Field areas must match the kits: never cut the cable, and heat only the clear floor, not under the toilet,
     vanity or tub.
   - Shower floors are not allowed unless the product is rated for them; check the manual.
   - Reorder the missing sizes now. The lead time is 4-6 weeks.
3. **Radiant power and controls.**
   - "Power by Electrician" is in the contract, but no circuit list exists.
   - Each bath needs a 120 V circuit (GFCI protection per the product / NEC 424) to a 2-gang box for the SunStat.
   - The electrician needs NWAC's list of rooms, amps and thermostat locations.
4. **M504 mismatch.**
   - The contract says "as detailed on M504"; M504 is an oil-fired steam boiler.
   - Issue an RFI asking ACE to confirm that the EG-75 piping and venting follows the BE drawings and the
     manufacturer's manual, and that M504 is not applicable except the 4" pad.
5. **BE-sheets not read.**
   - The boiler schedule, piping diagram, expansion tank and flue details may be on BE-401/500/501/600.
   - They may carry items not yet bought: expansion tank, PRV/backflow, chemical pot feeder, low-loss header,
     isolation valves, flue liner.
   - "All mechanical and piping work shown on all drawings ... regardless of drawing section" makes them NWAC scope.
6. **Flue / venting.**
   - EG-75 is a Category I natural-draft appliance: draft hood plus vent damper, 8" I.D. x 20' chimney.
   - M105 reuses the "existing exhaust duct", condition VIF. The existing flue served a larger old boiler, probably
     oil or steam, so an oversized or unlined masonry chimney may not draft properly or may condense.
   - **Not purchased:** vent connector (8" single-wall or B-vent per code), and possibly a chimney liner, cleanout,
     barometric/test port.
   - The ITB puts the "vent connector" on the bidder but nothing covers a liner.
   - Get a chimney inspection before startup.
7. **Condensate neutralization kit.** The ITB lists it as NWAC-furnished and asks the bidder to pipe it. Ferguson
   says it is not needed on a non-condensing boiler. Delete it from the sub's scope.
8. **Startup.**
   - The ITB asks the sub for "factory start-up".
   - Weil-McLain residential/light-commercial boilers are normally started by the installer with a combustion
     analyzer; Ferguson offers no startup service.
   - Make the install sub responsible for startup, combustion test (CO / CO2 / draft / stack temp), the Unity-CI
     setup and the startup report. Optionally pay Ferguson/Weil-McLain rep support.
9. **Expansion tank, makeup water and backflow.** These are not shown on M105, not in the ITB and not purchased.
   - If the old tank and fill valve were removed with the old boiler, they must be added.
   - An RPZ on the makeup water requires a licensed plumber/tester and a DEP filing (plumber's scope).
   - Verify in the field.
10. **Existing pumps and controls.**
    - The pumps "to remain" need a run test and condition check.
    - The pump relay / interlock from the Unity-CI is not specified.
    - Combustion-air damper end switch must be proven before burner firing (ITB item 3 says only "reconnect").
11. **Gas inspection dependency.**
    - The plumber's gas connection (3/4" boiler inlet, S2) and the gas inspection need the boiler set and piped.
    - Every week without a sub delays KBD's gas sign-off and heat for the building. Peter: "going into the colder
      months".
12. **Hydronic connection to the existing system and the PTAC coils.**
    - Existing risers will be drained, so coordinate with the owner/GC (building occupied?).
    - Flush and clean the old system before connecting a new cast-iron boiler; consider strainers and a dirt
      separator.
    - The PTAC coil piping is NWAC base scope per RFI#01, and the PTACs are not delivered. The boiler can be
      started before them, but the loop must be filled/balanced again after coil hookups.
    - No load check was done: 206 MBH net against the existing radiation plus 14 PTAC coils.
13. **Rigging.** About 735 lb to a roof boiler room. There is no plan, no path and no crane/hoist/permit. It is not
    in the ITB. NWAC's obligation per Exhibit A.
14. **Pad / floor.** The EG is for non-combustible floors only. M504 shows a 4" pad, while the ITB says "concrete
    pads by others". Confirm with KBD who pours it, or verify the existing pad.
15. **Filing / sign-off.**
    - NWAC is not pulling permits, but ITB item 8 asks the sub for "DOB sign-off for S5, boiler registration".
    - Confirm with KBD who is the applicant of record for S5 and what inspection or sign-off documents they need
      from the installer (licensed installer info, startup / combustion report, possibly DOB boiler registration).
16. **Sub approval.** §12.2 requires KBD's written approval before the install sub mobilizes.
17. **SOV.** There is no line to bill boiler/radiant install separately. Progress will be billed under lines 4, 6
    and 8; line 8 is at 0%.

---------------------------------------------------------------------------------------------------

## 6. Work plan to finish (in order)

### A. This week (by 11/6)

1. **Field walk, floors 3-5 and the roof boiler room** (Whitney + NWAC foreman).
   - Bathrooms: list each bath, measure heated area, note whether the subfloor or tile is done, mark thermostat
     locations. Photos.
   - Boiler room: existing HWS/R stubs and sizes; the 2 pumps; expansion tank and fill valve (present or not);
     relief drain point; flue/chimney opening and size; combustion-air louver/damper; floor/pad; electrical
     junction availability.
   - Measure the rigging path.
2. **Get a hard copy or viewer access to the BE-001..BE-600 sheets** (Fatima / Alikhan; 51 MB set
   1OLNHVsKADZ2ybXYDoRI6Yz6VUqBOnTl8). Read the boiler schedule, piping diagram, flue, expansion tank and controls.
   Update this list of materials.
3. **Confirm the boiler's whereabouts.** Did it go to site 10/29 or is it still at the office? (Whitney.)
   - Also check the Watts kits: count all 13 boxes, plus thermostats/sensors.
4. **Award the boiler install sub** (Ruslan / Alikhan).
   - Collect and level bids from P.H. Works, Abilene, A&C (give the site visit), NJPD.
   - Revise Part A scope:
     - delete the condensate kit
     - add rigging/setting of the boiler
     - add the vent connector to the existing flue incl. chimney inspection; liner priced as an alternate
     - add expansion tank / air separator check and makeup water connection by the plumber
     - add combustion-air damper interlock wiring
     - add startup and combustion report by the installer
     - add flushing of the existing loop
   - Get a crew size and duration.
   - **Send the sub's name to KBD for §12.2 approval**, with COI.
5. **Issue RFI to ACE via KBD** (Fatima):
   - (a) M504 does not match the gas hot-water EG-75; confirm BE drawings + IOM govern.
   - (b) confirm reuse of the existing flue/chimney and whether a liner is required.
   - (c) confirm expansion tank / makeup water requirements.
   - (d) radiant: confirm the room list for FH-1 and that shower floors are excluded.
6. **Send Peter the dates** (Whitney).
   - Proposed sequence: boiler rig/set week of 11/9 → piping tie-in and electrical rough week of 11/16 → gas
     connection by the plumber and gas inspection → fill, purge and startup week of 11/23.
   - Adjust to the sub's availability. Give the radiant install dates per floor after the walk.

### B. Radiant floor (electric) - target before tile on each floor

7. **Coordinate with KBD and the tile sub** (Whitney). Floor-by-floor dates: subfloor/backer ready → NWAC mats →
   inspection photos → tile.
8. **Order any missing or resized kits from Ferguson** (Alikhan). Lead time 4-6 weeks; that drives the schedule if
   sizes are wrong.
9. **Send the electrician a circuit list via KBD** (Fatima / Whitney): each bath, amps, 120 V/1 ph,
   thermostat box location, GFCI.
10. **NWAC crew install per bath:**
    - ohm test out of the box and record it
    - lay out the TapeMat, keeping clearances from fixtures
    - set the floor sensor between cable runs
    - run the cold lead to the thermostat box
    - ohm test again and run the LoudMouth monitor while the tile setter embeds the mat in 3/8"+ thinset or
      self-leveler
    - test again after tile
    - record readings on the warranty card
11. **Electrician wires** the SunStat and circuit. NWAC sets and programs the thermostat (Exhibit A "F&I all
    thermostats").
12. **Functional test per bath** (floor temperature rise). Give the warranty cards / manual to closeout.

### C. Boiler

13. **Rig and set** the boiler on the pad (install sub or NWAC rigger, with KBD logistics: elevator / hoist slot).
    - Pad by KBD if missing.
    - Assemble the jacket. Install the draft hood and vent damper.
14. **Hydronic piping** (install sub).
    - Isolate, drain and flush the existing loop.
    - Pipe 2" minimum supply/return to the existing HWS/R and the 2 existing pumps. Include isolation valves,
      unions, strainers, air vents, drain, gauges, thermometers.
    - Relief valve discharge to a drain; expansion tank (new if needed); fill / PRV.
    - Backflow by the plumber if required.
15. **Flue**: vent connector to the existing chimney after inspection; liner if required by the RFI answer or the
    chimney inspection.
16. **Gas** (plumber, S2): 3/4" connection with drip leg, shutoff, test. KBD schedules the gas inspection once
    piping and boiler are connected.
17. **Electrical** (electrician): 120 V circuit and service switch to the boiler junction box; power to the
    existing pumps.
18. **Controls** (install sub / NWAC):
    - Unity-CI to pump relays
    - outdoor sensor on the north wall
    - combustion-air damper end switch interlock
    - wiring per the IOM
19. **Fill, purge and pressure test.** Hydro test per M601 8.B and the IOM; boiler sections are rated 50 psi, so the
    relief valve sets the limit at 30 psi.
20. **Startup** (install sub, with Weil-McLain/Ferguson rep if wanted):
    - combustion analysis, draft, spill switch, LWCO test, vent damper proving
    - set outdoor reset curve
    - written startup report
21. **PTAC coil hookups** to the risers as the PTACs arrive (NWAC, base scope per RFI#01). Re-purge and balance the
    loop.
22. **DOB / S5 closeout support:** give KBD's filing rep the installer license, startup and combustion report and
    photos. NWAC does not pull or pay for permits.
23. **Closeout:** as-builts (MP-R updated), IOMs, warranty registrations (Weil-McLain, Watts), (4) O&M sets,
    owner training.
24. **Bill progress** under SOV lines 4, 6 and 8 as each step completes. Line 8 is at 0% today.

### What to order or submit now

| Item | Who | Notes |
|---|---|---|
| RFI (M504, flue, expansion tank, FH-1 room list) | Fatima | Submit to KBD / Procore |
| Sub approval request + COI | Alikhan | §12.2 |
| Confirm / resubmit MP-R boiler room piping shop drawing | Fatima / All-City Sketchers | Pending since 7/2 |
| Vent connector (8"), possible liner, expansion tank, valves and specialties | Install sub (per Ruslan 10/22) | Or Ferguson if NWAC buys |
| Extra or replacement TapeMat kits | Alikhan / Ferguson | After the field measure |
| Circuit list for floor heat + boiler | Whitney | To electrician via KBD |
| Dates to Peter (rig-in, tie-in, startup, radiant per floor) | Whitney | Owed since 10/12 |

---------------------------------------------------------------------------------------------------

## 7. Could not read / not verified

- **BE-001..BE-600** (boiler set, S5) in the 51 MB bid set 1OLNHVsKADZ2ybXYDoRI6Yz6VUqBOnTl8. Over the 10 MB
  connector limit. The text layer gives only room names and title blocks. So the boiler schedule, piping diagram,
  flue, expansion tank and controls are not verified.
- A-sheets and E-sheets: bath finishes and FH-1 circuits not checked.
- The exact FH-1 room list and areas on M103/M104 were not counted. Only the "TYP. FOR ALL" notes on floors 3, 4
  and 5 were confirmed.
- The MP-R mechanical piping shop drawing (roof) was not found or opened. The Drive hits for "ROOF SM& MP 9-12-26"
  (10sCAE8femzdHO0wyWNMm3EiE7beFNiP3 / 1EVxiL99MzR0zOU6Ncwn21azje5vIrO6i) are in folders not confirmed to be Vesey.
- No bids from the ITB recipients were found in Gmail (none in the thread). Falcon's "proposal" attachments were
  fuel oil only.
- Boiler arrival on site 10/29: no confirmation email found.
- Bid package boiler file 1CqMpFdWNH4jlM-RqDo7x9-JoXZMowAek ("02 - Submittal - Boiler (EG Series 7).pdf",
  443,787 bytes) was not opened. It is the same size as the EG flyer 1w4Ip2Ees-6DMssi9w94Pux60MEQV_Wx1, so it is
  likely the same document.
- The "WATT RADIANT" folder 1cLj1uVwAatMkaB1jAjsoQ1ed0X96jRAb contains only the RETURNED subfolder with the file
  read above. The "BOILER" folder holds only the RETURNED copy read above. "1 Boiler" holds the EG flyer.
- Uponor / "Radiant floor heat" / radiant ceiling panel folders in Drive belong to other jobs (Saddle River, etc.)
  and were ignored.
