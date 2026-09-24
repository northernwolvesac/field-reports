# IPA Church (Syosset) - ERU-1,2,3 Greenheck RVE: replacing the lost wall-sensor kit with duct sensors

Diagram: `ERU-ducted-sensor-wiring.pdf` (page 1 wiring, page 2 section detail), built by `build_eru_sensor_diagram.py`.
Sources: Greenheck submittal 230000-13 (P281653R03, ADE, reviewed by DMG 4/22/2025), drawings M2.1-M2.4, M6.1, M7.1 (DMG, IFC 2025.03.05).
Units: 3 x Greenheck RVE-85-52D-20I-J-A2, 20 ton inverter DX, 300 MBH modulating IG furnace, 100% OA, no recirculation.
ERU-1 and ERU-2 serve the basement (multi-purpose space 012 and support rooms). ERU-3 serves first and second floors. All three sit on the roof; OA
and EA ducts (36x16 and 42x16) drop through shafts to the floors served. Supply discharge and exhaust intake are through the bottom of the unit (curb).

## What the factory package contained (submittal p.4 "Field installed features" and p.7 accessories)

| Item | How it connects to the unit controller (wiring diagram G31, p.15) | Status |
|---|---|---|
| Room thermostat, space temp + RH (Greenheck part 387004, BAPI BA/BS4MBX-H2-FN-Z, Modbus) | Modbus RTU on the FieldBus: J26 T+ / T-, powered from J24 +Vterm / GND ("THERMOSTAT(S) FIELD WIRED TO") | lost |
| 3 additional space temp sensors, averaging (10k thermistors into the BS4 aux input) | into the Modbus room sensor, not the controller | lost |
| CO2 sensor, Honeywell C7232 wall model (supply fan VFD control by CO2) | 4 wires: R -> G+, C -> GO, OUT1 -> U9, M -> GND. Diagram already shows both C7232 and C7233 wiring | lost |
| Space static pressure transducer PS8 (exhaust fan VFD control) | expansion board c.pCOe: R -> "+", C -> "-", output -> U1, GND -> "-". Tubing to space and to outdoor reference | lost |
| Remote display with 150 ft cord (Carel pGD, required by schedule note 1 on M7.1) | telephone-style cable to the controller display port | check if lost |
| Duct smoke detectors, both airstreams, shipped loose (System Sensor D4120 with sampling tubes for 1-2 ft ducts) | contacts to R-G (or R-70 fire input S6). M7.1 note 3 says furnished and wired by E.C. | check if lost |
| OA temp (OAT), OA humidity (RH1), supply temp (SAT), coil temp (CCT), wheel pressure switch, rotation sensor, condensate switch | factory mounted and wired | in the unit |

Everything in the "lost" rows is field-mounted in the space. The wall sensors are the only reason for wiring into finished rooms.

## Why duct sensing works here

- The units are 100% outdoor air DOAS with the VRF (HP-01..06) carrying the space load. The ERU discharge only needs to be neutral (68-72 F). Room reset of
  the supply setpoint is a comfort trim, not the primary temperature control.
- Exhaust air is pulled from the same rooms the unit supplies (E-2 / E-1 grilles in the basement, first and second floor). The EA duct at the unit is a mixed,
  representative sample of the served zones. A temp/RH and a CO2 sensor in the EA riser read the space average, which is exactly what the wall sensor plus
  three averaging sensors were meant to give.
- CO2 demand control on return/exhaust air is normal practice for single-zone and DOAS applications. It needs the engineer's approval because M7.1 note 1
  says "space" sensors. Send the RFI below before ordering.
- Greenheck's own ducted quote (screenshot from ADE) is the same idea: Mamac duct temp/RH, Honeywell duct CO2, Mamac pressure transducer with an outdoor
  reference probe. So the controller program supports hardwired duct sensors instead of the Modbus room sensor.

## Replacement sensor pack (per unit, x3)

Order the same models Greenheck quoted. They match the controller's input configuration, so ADE/Greenheck only has to change the software setting.

| # | Greenheck part | Device | Function | Signal | Typical online price (Sept 2026) |
|---|---|---|---|---|---|
| 1 | 482596 | Mamac HU-226-3-VDC-8 duct temp + RH, 3% RH | replaces wall temp/RH + 3 averaging temps | 24 VAC power, 0-10 VDC RH, temp per "-8" option code | $250-350 (Kele, Galco) |
| 2 | 472066 | Honeywell C7232B1022 duct CO2 with LCD | supply fan VFD control | 24 VAC power, 0-10 VDC (selectable 4-20 mA), 1 relay | $280-570 (parts-hvac sale $282, SupplyHouse, Midwest $527) |
| 3 | 477246 | Mamac PR-274-R2A-VDC differential pressure transducer (screenshot says "GR-274", same part number) | exhaust fan VFD control on building pressure | 24 VAC/VDC power, 0-10 VDC, field selectable +/-0.1 to 1.0 in wg | $140-200 (Midwest Supply $141.57 for PR-274-R2-VDC) |
| 4 | 381659 | Dwyer A-306 outdoor static pressure sensor (probe, bracket, 50 ft tubing) | outdoor reference for #3 | tubing only | $90-125 |

Hardware per unit about $800-1,250, three units $2,400-3,700 plus about $300 of cable, tubing, duct access doors and a NEMA box.
Greenheck's package price of $10,000 is $3,300 per unit. Ask ADE what is in it besides the five parts: if it includes a Greenheck tech visit or the
controller reconfiguration, buy the parts ourselves and pay only for the configuration (Greenheck DOAS tech support does this over the phone with the unit
serial number; ADE startup can also do it).

Cheaper equivalents if lead time matters (same signals, confirm with ADE that the controller accepts them):
temp/RH Dwyer RHP-3D1A or BAPI BA/H310-D; CO2 Senva CO2D-A or Dwyer CDTR-D; pressure Dwyer MS2-W102 or Setra 264. Keep the Honeywell CO2 if possible,
the controller diagram is drawn for it.

Not in the pack:
- Duct smoke detectors: already installed and wired by the E.C. (2025-09-24). The sampling tube in Greenheck's list is not needed.
- Remote display with 150 ft cord. The unit has a web UI over Ethernet, but the schedule calls for the display. Options: mount the displays in the basement
  utility room 008 / a second floor closet next to the shaft, or ask DMG to accept the web UI in lieu.
- High static cutoff on the supply duct: the sequence (p.25) says "mechanical high static protection cutoffs must be installed by others". One manual reset
  pressure switch per unit (Cleveland AFS-460 or Dwyer 1910-1) wired in series with the start circuit (S1 / R-G) so the supply fan cannot over-pressurize
  the duct when the CO2 loop ramps the VFD.

## Where to mount

- Temp/RH (#1) and CO2 (#2): in the EA riser as close to the unit as it is reachable from inside the building, on a straight vertical run, probe across the
  duct, with a 12x12 access door next to them.
  - ERU-3: 42x16 EA riser at the second floor ceiling near meeting room 219 (grid 8.7-9.2, "42x16 EA DOWN TO BELOW").
  - ERU-1: 36x16 OA/EA riser near treasurer room 105 / conference room 222 (grid A-D); use the top of the riser under the roof deck.
  - ERU-2: 36x16 OA/EA riser near fellowship hall 113 (grid 8 / F); same, top of the riser.
  Do not put them in the EA duct on the roof or inside the curb: outdoor temperature swings and no access.
- Pressure transducer (#3): inside the unit control center or in a NEMA 3R box on the curb next to the control entry. Two 1/4 in tubing runs:
  low/reference port to the A-306 probe on the roof (bracket at least 3 ft above the roof, away from the unit exhaust and the hood, tubing sloped so water
  cannot trap); high port down the shaft to the space. Space pickup: a static pressure port in the ceiling plenum next to the riser is good enough if the
  ceiling is lay-in; with a hard ceiling use one 1/4 in static pickup plate (Dwyer A-489 / Mamac A-303) near an exhaust grille, a single 1/2 in hole.
- Wiring route from the unit to the riser: through the unit base control-wiring knockout into the curb and down the shaft alongside the ducts. No roof
  penetration and no finished walls. Same route as the pressure tubing.

## Wiring type (all low voltage by mechanical contractor, plenum rated per M0.1 ATC notes)

| Circuit | Cable | Notes |
|---|---|---|
| Duct temp/RH #1 | 18/4 or 22/4 stranded shielded, CMP (plenum), one cable | R -> power +, C -> power -, RH out -> spare universal input, temp out -> spare universal input (Greenheck assigns U2/U6 or expansion board inputs when they reconfigure). Shield drain to controller GND at the unit end only |
| Duct CO2 #2 | 18/4 shielded CMP | R -> G+, C -> GO, OUT1 -> U9, M -> GND (per diagram G31, "CO2 MODEL C7232"). Set the jumper to 0-10 V |
| Pressure transducer #3 | 18/3 shielded CMP if not inside the unit | R -> +, C -> -, OUT -> expansion board U1 (PS8 per diagram Y07, p.18) |
| Pressure tubing | 1/4 in OD FR polyethylene, plenum rated, two runs | reference to A-306, sensing to space. No kinks, no low points |
| Smoke detectors | already installed and wired by E.C. | if their contacts are to stop the unit, E.C. lands them on R-70 (S6) or R-G |
| High static cutoff | 18/2 CMP | N.C. contact in series with the remote start jumper S1 (remove factory jumper) |
| Remote display | Greenheck 6-conductor RJ12 cable, 150 ft as shipped | do not splice; extend only with shielded 6-conductor telephone cable |
| BACnet MS/TP (only if a BMS is added) | 22 AWG twisted shielded pair, Belden 3106A or 9841 | J25 BMS2 Tx/Rx +/-, daisy chain, 120 ohm at the ends |
| 24 V power for sensors | from the unit R/C (TR2) | total added load about 5 VA per unit, within the control transformer. Never share a conduit with 208 V |

Greenheck's diagram note "field control wiring resistance not to exceed 0.75 ohm" is for the 24 V digital circuits. Keep every field run under 100 ft; the
duct sensor locations above give 20-60 ft.

## Controller configuration after install (ADE / Greenheck DOAS tech support)

- Space temp / RH source: from "Modbus room sensor" to "hardwired duct sensor" on the assigned universal inputs, input type 0-10 V, scaling per Mamac
  ranges (RH 0-100%, temp per the "-8" option).
- CO2: input U9 already configured, verify 0-10 V = 0-2000 ppm, setpoint 800-1000 ppm, supply fan min 50%.
- Building pressure: expansion U1, 0-10 V over the selected PR-274 range (use +/-0.25 in wg), setpoint +0.02 to +0.05 in wg.
- Discharge setpoint: fixed neutral 70 F cooling / 68 F heating with room reset limits narrow (+/-3 F), since the VRF does the space load.
- Confirm the unoccupied recirc / morning warmup functions that rely on room sensors are disabled or use the duct sensors.

## Paper trail

RFI to DMG (Rob DuBoice), copy CCC: "M7.1 note 1 lists space temperature, space humidity and CO2 sensors for ERU-1,2,3. The units are 100% OA DOAS
supporting VRF; walls and ceilings are finished. We propose to install the temperature/RH and CO2 sensors in each unit's exhaust air riser (mixed
representative sample of the served zones), with the building static pressure transducer at the unit, outdoor reference probe on the roof and the space
pickup in the ceiling plenum. Sensors: Mamac HU-226-3-VDC-8, Honeywell C7232B1022, Mamac PR-274-R2A-VDC with Dwyer A-306, as offered by the unit
manufacturer. Please confirm acceptable. No change to sequences or setpoints." Attach the ADE screenshot as backup.

Email to ADE (Julio Enriquez / Ryan Adams): ask for the itemized $10,000 (parts vs. controller configuration / tech time), the input assignments for the
duct temp/RH on this controller program, confirmation that the remote displays and D4120 detectors were in the lost crate, and a price for those alone.

## Where to buy (links checked 2025-09-24, prices move)

Per unit x3 unless noted. Greenheck part-store links are the exact factory part numbers from ADE's list; the others are the same device from stock distributors.

| Item | Exact factory part | Stock distributors |
|---|---|---|
| Mamac HU-226-3-VDC-8 duct temp/RH | [Greenheck 482596](https://www.greenheck.com/shop/parts/controls-sensors-and-igniters/temperature/482596) | [Galco](https://www.galco.com/hu-226-3-vdc-8-mama.html) |
| Honeywell C7232B1022 duct CO2 | Greenheck 472066 | [SupplyHouse](https://www.supplyhouse.com/Honeywell-C7232B1022-Non-dispersive-Infrared-NDIR-Carbon-Dioxide-Sensor-w-LCD-Display-Duct-Mount), [Kele](https://www.kele.com/product/gas-and-specialty-sensors/carbon-dioxide/honeywell/c7232b1022-%7C-u), [parts-hvac](https://parts-hvac.com/c7232b1022.html), [Amazon](https://www.amazon.com/Honeywell-Product-C7232B1022/dp/B00D5YMMPY) |
| Mamac PR-274-R2A-VDC pressure transducer | [Greenheck 477246](https://www.greenheck.com/shop/parts/controls-sensors-and-igniters/pressure/477246) | PR-274-R2-VDC (enclosed): [Midwest Supply](https://midwestsupplyus.com/products/nco-pr-274-r2-vdc-mamac-systems), [Kele](https://www.kele.com/product/pressure/dry-differential-pressure-transmitter-multi-range/mamac-systems/pr-274-r2-vdc), [Galco](https://www.galco.com/pr-274-r2-vdc-mama.html) |
| Dwyer A-306 outdoor static probe | [Greenheck 381659](https://www.greenheck.com/shop/parts/controls-sensors-and-igniters/pressure/381659) | [Midwest Supply](https://midwestsupplyus.com/products/nco-a-306-dwyer-instruments), [Amazon A-306-A](https://www.amazon.com/Dwyer-Outdoor-Static-Pressure-Sensors/dp/B00E6G82T0) |
| High static cutoff, manual reset | n/a | [Cleveland AFS-305 at SupplyHouse](https://www.supplyhouse.com/Cleveland-Controls-AFS-305-SPDT-Air-Pressure-Sensing-Switch-with-Manual-Reset) (0.4-12 in wg, set 2.0), [Cleveland AFS-460 manual reset](https://www.clevelandcontrols.com/products/pressure-sensing/afs-series/afs-460-manual-reset-model/), [Dwyer 1831 series](https://www.hvacquick.com/products/commercial/Sensors-Transmitters/Pressure-Switches/Dwyer-Series-1831-DPDT-Low-Differential-Manual-Reset-Pressure-Switches) |
| 18/4 stranded shielded plenum cable, one 500 ft spool for all three units | n/a | [CablingPlus 500 ft](https://cablingplus.com/products/500ft-18-4-shielded-plenum-cable), [CableWholesale 500 ft](https://www.cablewholesale.com/products/fire-security-cables/security-cable/product-11k5-54912sf.php), [EWCS 1000 ft Amazon](https://www.amazon.com/EWCS-Plenum-Rated-Shielded-Security/dp/B00KYCWC32) |
| 1/4 in OD FR polyethylene tubing, one 500 ft spool (about 75 ft per unit) | n/a | [Kele T-141-R](https://www.kele.com/product/pneumatics-and-fittings/tubing/freelin-wade/t-141-r) |
| Dwyer A-489 static pickup plate, only for hard ceilings | n/a | search "Dwyer A-489" at Kele / SupplyHouse |
| 12x12 duct access doors, 1 per unit | n/a | our shop / Ventlok |

The PR-274 "R2A" vs "R2" suffix: same transducer and ranges; the enclosed R2-VDC from a distributor does the job inside the control center. If ADE
insists on the exact code, buy the Greenheck part.

Do not order until DMG answers the RFI; the RFI turnaround is a week, the parts are stock at Kele / Midwest / SupplyHouse.
