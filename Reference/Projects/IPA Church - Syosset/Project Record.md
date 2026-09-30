# IPA Church - Syosset

MEP engineer: DMG (Design Management Group, Pittston PA), Rob DuBoice; drawings M0.1-M8.2 IFC 2025-03-05. Copy CCC on RFIs.
Equipment rep: ADE (Ryan Adams radams@adehvac.com, Julio Enriquez), Greenheck ERU supplier and start-up.
Our PO with ADE still owes one start-up visit, which includes programming (not part of any add cost).

## Current issue: ERU-1,2,3 lost field-sensor kit (status 09/25)

3 x Greenheck RVE-85-52D-20I-J-A2 (100% OA DOAS with VRF, Carel c.pCO controller). The loose wall-sensor kit
(room temp/RH + 3 averaging sensors, wall CO2, space static transducer, possibly remote displays) was lost.
Plan: replace with duct sensors in each unit's EA riser, bought by us (not ADE's $10,500 package).

Full engineering detail, parts list with purchase links, wiring, mounting locations and status log:
`Reference/Engineering Notes/IPA Church ERU-1,2,3 ducted sensor package.md`.
Wiring / placement diagram sent to ADE: `Reference/Engineering Notes/ERU-ducted-sensor-wiring.pdf`
(built by `build_eru_sensor_diagram.py`, stamped issued for ADE / Greenheck review 09/25/2026).

- Sensors per unit: Mamac HU-226-3-VDC-8 duct temp/RH, Honeywell C7232B1022 duct CO2, Mamac PR-274-R2A-VDC with
  Dwyer A-306 outdoor probe (building pressure via A-489 pickup in a central corridor, or exhaust tracking at 90% of supply
  as the preferred alternative), manual-reset high static cutoff. 18/4 stranded shielded CMP cable.
- Smoke detectors: already installed and wired by the E.C.; not in our scope.
- Discharge air temp sensors are in the units; they need relocating into the supply riser.
- Remote displays: asked ADE whether the client can get web UI / remote access to all 3 ERUs instead.

**History:** 09/09 first ADE start-up visit (no gas, sensors not wired, day 2 cancelled). 09/14 ADE full replacement
quote $17,650 + tax. 09/24 reduced package $10,500 + tax, remote panels ~$1,400 each. 09/25 Ruslan emailed Ryan the
7 technical questions with the diagram.

**Waiting on ADE:** SAT location, HU-226 input assignment (U2/U6), C7232B on U9, exhaust tracking availability,
PR-274 R2 vs R2A, web UI / remote access instead of remote panels, high static switch setpoint, I/O map.

**Next:** on ADE's answer, send the RFI to DMG (Rob DuBoice, copy CCC) with the duct-sensor option and the exhaust
tracking alternative -> order the sensors -> schedule the final start-up with ADE.

## Files in `source/`

- `Greenheck ERU submittal 230000-13 (reviewed DMG 2025-04-22).pdf`: P281653R03, wiring diagrams G31 (p.15), Y07 (p.18), sequence p.25.
- `DMG mechanical drawings M0.1-M8.2 (IFC 2025-03-05).pdf`: plans M2.1-M2.4, schedules M6.1, M7.1 (ERU notes).
