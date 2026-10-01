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
- HX-3 826 MBH to 30% PG glycol: P-1/P-2 (160 F) to 17 garage ceiling FCUs (FCU-1..17; schedule "FCU-A qty 20" with
  no data) and RAD-1/2; P-3/P-4 (120 F) to north and south garage ramp in-slab snow melt.
- RTU-1..5 Trane, gas heat (common areas, VAV); DOAS-1..7 Trane Horizon heat pump with energy wheel (residences);
  IL units mini-split (HP/AC), AL units PTAC; DH-1 Seresco 6-ton pool dehumidifier; sauna has no hydronic connection.
- Design gaps: garage/cellar piping plan M2001 shows no glycol piping; FCU schedule blank; PP-1/2 blank; RTU-5 heating
  output 864 MBH > 600 MBH input; plant 5,700 MBH vs ~2,430 MBH connected (2.3x, still 1.6x with one boiler standby).

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
- VE-3: garage 17 FCUs + RAD-1/2 + 160 F glycol loop + P-1/P-2: delete (unheated underground garage, FP to confirm
  dry-pipe or antifreeze sprinklers) or electric unit heaters only at ramp entries / intake louvers (30-120 kW).
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
| VE-3 | Garage FCUs: delete heat (FP to confirm dry/antifreeze sprinkler) or electric unit heaters at ramp/entries | 0 to ~120 kW |
| VE-4 | Ramp snow melt: delete, electric cable by EC, or standalone gas snow-melt boiler | 0 / ~240 kW / 0 |
| VE-5 | Pool + spa: dedicated gas pool and spa heaters (or by pool contractor) + Seresco pool-water heat recovery | ~0 |
| VE-6 | Delete boiler plant, HW/glycol piping, HX-1/2/3, pumps, flues/chimney, combustion air, water treatment | - |
| VE-7 | Controls: Trane packaged controls (Tracer Concierge / SC+) for RTU+VAV+DOAS, standalone heaters; cut ABM BMS | - |
| VE-8 | Full VRF heat recovery for common areas - not recommended (cost, large spaces, A2L limits, redesign) | n/a |
