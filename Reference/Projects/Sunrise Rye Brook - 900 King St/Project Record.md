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

See conversation summary of options VE-1..VE-8 below. Status: options sent to Ruslan, awaiting direction before pricing.

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
