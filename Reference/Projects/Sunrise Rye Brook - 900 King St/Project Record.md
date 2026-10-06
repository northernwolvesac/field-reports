# Sunrise Rye Brook - 900 King St, Rye Brook NY 10573

Senior living, Independent Living (IL) + Assisted Living (AL), 4 floors over cellar parking. Architect HKS, MEP IMEG
(Woodbury), pool designer Counsilman-Hunsaker. Customer: Callahan Construction Managers.
Our bid: Quote 3112 (09/16/2026) $10,522,000, townhouse add $2,600,000, drawings 06/05/2026, BMS by ABM included.
Mechanical GMP set M-sheets dated 07/15/2026 in `source/` (44 sheets; schedules M6000/M6001, hydronic flow M5000).

## Heating design as drawn (GMP 07/15/2026)

- Boiler plant, AL cellar: B-1/2/3 Laars Magnatherm FT2000, 1,999 MBH in / 1,900 MBH out each (5,700 MBH out),
  primary-secondary with HS-1, BP-1/2 381 GPM, PP-1/2 (blank in schedule), ET-1/2, AS-1, fire-rated chimney enclosures
  basement to roof, combustion air areaway.
- 160 F HW loads: 47 VAV hydronic reheat (all on 1st floor: IL 33 boxes 502 MBH, AL 14 boxes 127 MBH, total 629 MBH,
  45 GPM); 12 HW cabinet heaters CH-1..12 (234 MBH) at doorways; HX-1 pool 500 MBH; HX-2 spa 245 MBH.
- HX-3 826 MBH to 30% PG glycol: P-1/P-2 (160 F) to FCU-1..17 and RAD-1/2; P-3/P-4 (120 F) to north and south garage
  ramp in-slab snow melt. M5000 labels FCU-1..17 "garage ceiling fan coil units", but the plans (M2000/M2002) put them
  in basement back-of-house rooms, not the open garage (see "Basement FCUs" below).
- RTU-1..5 Trane, gas heat (common areas, VAV); DOAS-1..7 Trane Horizon heat pump with energy wheel (residences);
  IL units mini-split (HP/AC), AL units PTAC; DH-1 Seresco 6-ton pool dehumidifier; sauna has no hydronic connection.
- Design gaps: garage/cellar piping plan M2001 shows no glycol piping; FCU schedule blank; PP-1/2 blank; RTU-5 heating
  output 864 MBH > 600 MBH input; plant 5,700 MBH vs ~2,430 MBH connected (2.3x, still 1.6x with one boiler standby).

## Basement FCUs (reviewed 10/01/2026, M2000 IL / M2002 AL basement)

- Schedule M6000: FCU-A, qty 20, service "BASEMENT HEATING", horizontal, hydronic heating coil only, no cooling, all
  data zero. M5000 riser shows 17 (FCU-1..17); plans show ~12 hydronic FCUs plus 2 DX-FCUs. Counts disagree (RFI).
- Rooms with hydronic FCU: IL - Pool Equip B110 ("FCU to serve pool equipment room"), Res Storage B107, Trash
  Collection B106 (FCU-A). AL - Electrical B123, Central Laundry B121, Mechanical/boiler B118 area, Team Member Lounge
  B119A, Corridor B100, Res Storage B115, Kitchen Storage B113, 2 rooms at south end (off DOAS-4 branch).
  DX-FCU (not hydronic): AL Trash Hold area and room north of AL elevators.
- How they work: each FCU inlet is ducted from a small DOAS branch (10x10 DOAS-2, 12x8 / 10x6 DOAS-3, 10x8 DOAS-4) plus
  a ceiling return grille ("provide return grille in ceiling, typ all rooms with FCUs"), ducted to room diffusers.
  So the FCU is a booster fan + reheat for the DOAS ventilation air and recirculates the room. DOAS (Trane Horizon,
  3,500 CFM each) serve the residences; the basement only gets small taps, not enough air to heat a room by itself.
- No hydronic or glycol piping to these FCUs is drawn on M2001/M2003 (design gap).
- Equipment rooms get no cooling or ventilation: FCUs are heating-only; no exhaust/transfer fan scheduled for
  Electrical B111/B120/B123, MDF B116, Mechanical B112/B118 or Central Laundry (dryer exhaust only). Pool storage
  exhaust GX-4 blank, GX-7 300 CFM; trash exhaust GX-6 blank (400 CFM on plan).
- Ruslan's view (10/01): utility rooms do not need zone control or an FCU each; equipment rooms may need cooling, not
  heat, even in winter.
- VE-3 proposal (replaces the "garage FCU" wording): delete all 20 hydronic FCUs; run DOAS branches straight to
  diffusers (DOAS heat pump LAT 84.6 F at design is tempered air already). Heat only where needed:
  electric unit/wall heaters with integral stat in Trash Collection B106, Trash Hold, rooms at areaways/louvers and
  outside walls (freeze protection); occupied rooms (Team Member Lounge, corridor) get an electric duct heater or a
  ductless heat pump. No heat in Electrical, MDF, Mechanical, Pool Equip, Laundry, storage (internal gains, below
  grade, ventilated with tempered DOAS air). Fan-powered boxes with electric heat would also work but cost more than
  needed for rooms without zoning requirements.
- Cooling/ventilation adds to raise by RFI: thermostatic exhaust/transfer fan or ductless AC for Main Electrical and
  electrical rooms (transformer losses), MDF (ductless AC, 24/7), Central Laundry (dryer heat, make-up air), Pool
  Equip (dedicated exhaust for chemical storage per pool designer, no recirculation through an FCU; corrosion).
  These are adds against VE-3 deduct.

## DOAS distribution and fire/smoke dampers (reviewed 10/01/2026, M2020-M2043, unit plans M2100-M2110)

- DOAS on roof, vertical supply/return risers in chases at stair cores (e.g. M2023 keynotes 2/3: 26x18 DOAS-5 supply,
  24x18 return, up/down w/ FSD). Horizontal distribution in corridor ceilings (only continuous ceiling path to every
  unit): parallel supply + return trunks (28x10 / 30x10 near riser, 24x8 further out).
- Supply: one small branch to every unit (6x4 to 8x6 typ). IL units: DOAS air ducted into the return plenum of the
  ducted mini-split indoor unit (M2102 keynote 6, 30" RA plenum). AL units: DOAS air direct to the room (PTACs).
- Return: only a few branches, from corridor and common/back-of-house rooms (housekeeping, offices, med storage, etc.).
  Unit air does NOT return to the DOAS: each unit bathroom has its own exhaust fan TX-A (75 CFM) ducted out the
  exterior wall. So the corridor-long return trunk only collects a handful of grilles, and the DOAS energy wheel
  only recovers heat from corridor/common air.
- FSD count: about 360 FSD tags across the plan sheets (AL and IL), 0 plain FDs. AL note M2023: "provide fire/smoke
  damper at all DOAS supply/return penetrations through demising walls (typ all AL units)"; IL plans show the same at
  unit branches ("DOAS connections to units typ").
- Code view (to confirm with IMEG/HKS code analysis; permit filed 12/23/25 under the NYS Uniform Code, IBC-based,
  confirm edition): corridor walls and unit separations are fire partitions. IBC 717.5.4 exception allows NO damper
  where the duct is <=100 sq in, min 26 ga steel, no openings into the corridor, above the ceiling, not ending at a
  register in the rated wall, with a 12" long 0.060" steel sleeve. 6x4 / 8x4 / 8x6 unit branches qualify on size.
  Smoke dampers are required at smoke barriers (AL is Group I-1, smoke compartments) and at shafts unless an
  exception applies, not at every unit wall in an R-2 (IL) building. FSDs also need 120 V power, fire alarm
  interface, access doors in finished ceilings and periodic testing.
- VE-9 (proposed): FSDs only where code needs them (shafts, smoke barriers, rated assemblies with no exception);
  unit branches by small-duct exception (no damper) or FD only. IL first (R-2), AL subject to occupancy / DOH /
  NFPA 101 check. Big count (~360) -> large deduct; EC/FA deduct for damper power and FA modules too.
- VE-10 (proposed, discuss): shorten DOAS return; corridor return grilles near riser only; housekeeping/janitor/
  toilet rooms exhaust with corridor makeup (IBC 1020 exception), other rooms ducted only where needed. Corridors
  cannot be used as a return plenum and transfer openings in rated corridor walls are not allowed, so rooms that must
  return need their own duct. Alternate (energy, not cost): tie unit TX-A bath exhaust into DOAS exhaust so the
  wheel recovers it; deletes ~280 wall caps/fans but adds risers and dampers.

## VE log

- Rev 0 10/01/2026 built in `VE Log/` from GMP drawing quantities (no 3112 breakdown): recommended package
  VE-1,2,3,4,5,6,9,14 = -$1,471,500 budget; VE-11 (BMS) and VE-12 (VAV zoning) TBD. Details in
  `VE Log/VE Log Record.md`. Internal; not sent.
- 10/01/2026 Ruslan: customer report without prices, with drawing screenshots, pool / spa / sauna excluded (by
  others) -> `VE Proposals/VE Proposals - Sunrise Rye Brook.pdf` (VE-01..VE-09). Not sent yet.
- Found in review: AL unit plans (M2107-M2110) show DOAS return grille RG-2 in some unit types, while floor plans
  connect the return trunk to only a few rooms (clarify with IMEG).
- 10/06/2026: VE-03 (int. VE-12) clarified - ductless units for small rooms still need a ventilation air branch per
  room (tempered DOAS air or small ERV per cluster); savings are the VAV box, reheat and controls, not the duct.

## Reference job: Sunrise of Northport (Huntington NY) - for VE comparison only (reviewed 10/01/2026)

Source: `source/reference - Sunrise Northport HVAC 100% CD 2026-04-10.pdf` (27 sheets, CJL Engineers / Kimmel Bogrette,
GC EW Howell, our estimator Kastriot; ~$2.1M material + ~$1.5M labor before PW). 2 floors, no cellar/garage/pool.

| Item | Northport (as designed) | Rye Brook (IMEG GMP) |
|---|---|---|
| Apartments heat/cool | Daikin VRF heat recovery, R32, ~98 ducted/cassette indoor units, 14 CUs + BS boxes | IL 126 mini-splits, AL 157 PTACs (already cheaper per unit, not a VE target) |
| Outdoor air | 2 Addison ERUs (5,500 / 4,700 CFM, gas heat, DX, reheat to neutral 72 F) | 7 Trane DOAS heat pump + wheel |
| Unit exhaust | Bath (35 CFM) and kitchen (80 CFM) exhaust ducted back to the ERU exhaust trunk in the corridor (heat recovered) | Each bath own fan TX-A ducted out the wall; DOAS return only from corridor/common rooms |
| Corridor ducts | ERU supply + exhaust trunks in corridor, small branches into each unit, corridor diffusers 65 CFM | Same idea, but return trunk serves only a few rooms |
| Dampers at unit walls | Unit supply/exhaust branches cross the corridor wall with no damper symbol (M-2.02A, M-5.02); FSD/FD/smoke damper details exist for shafts/smoke barriers only | ~360 FSDs, every unit branch |
| Common areas | 5 small constant-volume gas/DX RTUs (1,610-3,370 CFM), single zone, + VRF cassettes in offices/small rooms | 5 large VAV RTUs (7,000-11,000 CFM) + 47 VAV with hot water reheat |
| Kitchen | MAU-1 (2,700 CFM) with hood control panel, KEF-1/2 | RTU-4 kitchen |
| Stairs / vestibules | Electric cabinet heaters CUH-1..4 (10 kW), electric radiant panels, electric unit heater | 12 hot water cabinet heaters |
| MDF / IDF | Ductless split AC each (SSAC-1/2) | Nothing scheduled |
| Heating plant | None (gas in ERU/RTU/MAU, heat pumps) | 3 boilers, HW + glycol, 3 HX, snow melt |
| Controls | Standalone: Daikin remotes, unit controls, BACnet cards | ABM BMS |

Use: same owner (Sunrise) accepted this on Northport; cite it to Callahan as precedent.

## Aggressive VE package (Northport-style), proposed 10/01/2026

- VE-11 Controls: no BMS. Equipment controls only (VRF central controller / remotes, DOAS and RTU unit controls with
  BACnet card for future monitoring, standalone stats on heaters). Supersedes VE-7. ABM scope deleted.
- VE-12 Common areas (Northport model): delete the 47 VAV boxes and their reheat (makes VE-1 unnecessary). Large
  open spaces on single-zone constant-volume gas/DX RTUs (split the 5 big VAV RTUs into smaller units per space if
  needed); offices and small rooms on VRF cassettes / ductless heat pumps. Kitchen on a dedicated MAU with hood
  controls. Revisits VE-8: VRF for the small rooms only, not for the big spaces;
  A2L charge limits still to be checked for AL occupied rooms (Northport precedent).
- VE-14 Unit exhaust to DOAS (Northport model): duct apartment bath/kitchen exhaust back to the DOAS exhaust trunk
  in the corridor instead of 283 individual TX-A fans and wall caps; the corridor return trunk then has a purpose
  and the energy wheel recovers the unit exhaust. Roughly cost-neutral on ductwork, deletes fans/wall penetrations/
  EC circuits, better energy code compliance.
- VE-13 Basement/BOH: VRF or ductless heat pumps (heat + cool) where a room really needs conditioning (electrical,
  MDF, lounge, laundry), electric heaters for freeze protection only; deletes the 20 FCUs and the DOAS booster taps
  (overlaps VE-3).
- With VE-3/4/5/6 (no boilers, no glycol), VE-9 (dampers) and VE-10 (return): building runs on electric heat pumps
  + gas RTUs + dedicated pool/spa heaters, like Northport.
- Needs: IMEG redesign fee and schedule, energy code (heat pumps help), EE service size (VRF adds kW but less than
  electric reheat), owner (Sunrise) buy-in, likely re-file with the building department.

## VE review 10/01/2026 (client asked for all VE options, all-electric/gas, no hydronic)

Client (via Callahan) wants all possible VE options; Ruslan's view: boilers + hydronic VAV reheat + hydronic FCUs/
cabinet heaters + RTUs is overkill and drives the BMS price; building may run on gas and electric, no hydronic water.
Status: options sent to Ruslan 10/01, awaiting his pick before pricing deducts/adds against quote 3112 and drafting
a VE log for Callahan.

Recommended package: VE-1 + VE-2 + VE-3 (delete) + VE-5 + VE-6 + VE-7, snow melt (VE-4) as owner choice.

Details:
- VE-1: 47 VAV hydronic coils -> electric SCR reheat (629 MBH = ~185 kW). Deletes 1st floor HW piping, 47 control
  valves, balancing, insulation, flushing. Interior zones possibly cooling-only (RTUs already deliver gas-heated air) -
  only IMEG can identify. Check VAV minimums / energy code.
- VE-2: 12 HW cabinet heaters -> electric ceiling cabinet heaters with integral stats (~70 kW), no BMS points.
- VE-3: basement FCUs (FCU-A x20 / FCU-1..17) + RAD-1/2 + 160 F glycol loop + P-1/P-2: delete; DOAS branches straight
  to diffusers; electric unit/wall heaters only in trash rooms, rooms at areaways/louvers and occupied BOH rooms; add
  ventilation/cooling for electrical, MDF, laundry, pool equipment (see "Basement FCUs"). Garage itself unheated (FP
  to confirm dry-pipe or antifreeze sprinklers at ramp entries).
- VE-4: ramp snow melt: delete (trench drains, salting - owner call), electric cable by EC (~240 kW, storm-only,
  load-shed), or small standalone gas snow-melt boiler (removes long glycol mains).
- VE-5: pool/spa: dedicated condensing gas pool (~600 MBH in) and spa (~300 MBH in) heaters, sidewall/areaway vent;
  add Seresco DH-1 pool-water heat recovery coil. Pool heaters often in pool contractor scope (Counsilman-Hunsaker)
  -> possible straight deduct for us.
- VE-6: delete boiler plant: B-1/2/3, BP/PP pumps, HS-1, ET-1/2, AS-1, chemical treatment, glycol fill, HX-1/2/3,
  P-1..P-4, boiler room piping, flues, combustion air areaway/louver, gas train. GC saves fire-rated chimney shafts.
- VE-7: controls: ~120-150 BMS points gone (boiler/pump sequences, HX, glycol, snow melt, garage FCUs, CHs). RTUs and
  DOAS are all Trane -> Trane packaged controls (Tracer Concierge or SC+ with Trane VAV controllers) instead of a full
  third-party BMS; heaters, mini-splits, PTACs, Seresco standalone. ABM scope shrinks or goes away.
- VE-0 (if owner keeps hydronics): at least delete/electrify garage heat and snow melt -> 2 smaller boilers.
- VE-8 full VRF heat recovery for common areas: not recommended. RTUs serve large high-OA 1st floor spaces
  (7,000-11,000 CFM each); would still need DOAS; max ducted VRF IDU ~8 ton; A2L refrigerant (R-454B/R-32) with
  institutional (AL) occupancy halves the allowed charge per room -> leak detection / shutoff valves; full re-design
  and re-permit; VRF costs more than gas RTU + VAV.

Approvals / risks: IMEG re-design and energy code; EE + Con Edison service capacity (no E drawings yet; add 255 to
~615 kW, 300-740 A at 480 V); NY All-Electric Buildings Act - building permit filed 12/23/25, new gas appliances
(pool/spa heaters, snow-melt boiler) may need a code check, electric choices avoid it; FP designer for garage
sprinklers; pool designer for heater scope.

| # | Option | Electric add (connected) |
|---|---|---|
| VE-1 | VAV reheat hydronic -> electric SCR coils (or delete on interior zones) | ~185 kW |
| VE-2 | Cabinet heaters -> electric | ~70 kW |
| VE-3 | Basement FCUs: delete; DOAS direct to diffusers; electric heaters only in trash/freeze-risk/occupied rooms; add exhaust/AC to electrical, MDF, laundry, pool equip | ~30-60 kW |
| VE-4 | Ramp snow melt: delete, electric cable by EC, or standalone gas snow-melt boiler | 0 / ~240 kW / 0 |
| VE-5 | Pool + spa: dedicated gas pool and spa heaters (or by pool contractor) + Seresco pool-water heat recovery | ~0 |
| VE-6 | Delete boiler plant, HW/glycol piping, HX-1/2/3, pumps, flues/chimney, combustion air, water treatment | - |
| VE-7 | Controls: Trane packaged controls (Tracer Concierge / SC+) for RTU+VAV+DOAS, standalone heaters; cut ABM BMS | - |
| VE-8 | Full VRF heat recovery for common areas - not recommended (cost, large spaces, A2L limits, redesign) | n/a |
| VE-9 | FSDs only where code requires; unit branches by IBC 717.5.4 small-duct exception or FD (about 360 FSDs drawn) | - |
| VE-10 | Shorten DOAS corridor return (corridor grilles at riser, exhaust small rooms with corridor makeup) | - |
| VE-11 | No BMS: equipment/standalone controls only (Northport precedent); supersedes VE-7 | - |
| VE-12 | Delete 47 VAV + reheat; RTUs single-zone for big common spaces, VRF/ductless for small rooms | VRF kW TBD (less than reheat) |
| VE-13 | Basement/BOH on VRF/ductless heat pumps where needed, electric freeze heaters only; delete FCUs | ~20-40 kW |
| VE-14 | Apartment bath/kitchen exhaust ducted to DOAS exhaust (Northport model), delete ~283 TX-A fans and wall caps | negative (fans deleted) |
