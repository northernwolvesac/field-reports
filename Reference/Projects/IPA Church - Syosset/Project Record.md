# IPA Church - Syosset

MEP engineer: DMG (Design Management Group, Pittston PA), Rob DuBoice; drawings M0.1-M8.2 IFC 2025-03-05. Copy CCC on RFIs.
Equipment rep: ADE (Ryan Adams radams@adehvac.com, Julio Enriquez), Greenheck ERU supplier and start-up.
Christino and Andrei are on the ADE threads (Christino set the 10/29 start-up date).
Our PO with ADE still owes one start-up visit, which includes programming (not part of any add cost).

## Current issue: ERU-1,2,3 lost field-sensor kit (status 09/30)

3 x Greenheck RVE-85-52D-20I-J-A2 (100% OA DOAS with VRF, Carel c.pCO controller). The loose wall-sensor kit
(room temp/RH + 3 averaging sensors, wall CO2, space static transducer, possibly remote displays) was lost.
Plan: replace with duct sensors in each unit's EA riser, bought by us (not ADE's $10,500 package).

Full engineering detail, parts list with purchase links, wiring, mounting locations and status log:
`Reference/Engineering Notes/IPA Church ERU-1,2,3 ducted sensor package.md`.
Current diagram: `Reference/Engineering Notes/ERU-ducted-sensor-wiring-R1.pdf` (rev 1 for installation 09/30/2026: wiring, placement,
purchase list), built by `build_eru_sensor_diagram.py`. Rev 0 `ERU-ducted-sensor-wiring.pdf` (sent to ADE 09/25) is superseded.

**ADE start-up return visit: Thu 10/29/2026, 7:00-7:30 am arrival.** All field sensors installed and wired before then.

Base case after ADE's 09/30 answers, **approved by the client 09/30**, per unit:
- CO2: Honeywell C7232B1022 duct sensor in the EA riser on U9 (read as space CO2). Needed in every option.
- SAT: relocate the factory sensor (J3 U4) into the supply riser, 3-5 duct widths below the unit, straight run, access door.
- Space temp/RH: delete (no duct RH input on this program; unit runs on SAT, VRF does the space). Fallback HU-226 in EA riser, ADE configures.
- Exhaust fan: change from space pressure (lost PS8 on expansion U1) to supply tracking at 90%. Fallback PR-274 + A-306 on expansion U1.
- Remote displays: replace with web UI over Ethernet (no license, full control), Cat6 to a switch, static IPs.
- High static: manual reset switch set 2.0 in wg (supply ESP 1.50) in series with S1 R-G.
- Smoke detectors: E.C. (installed). Material about $2,000-3,400 (purchase list on p.3 of the rev 1 PDF) vs ADE $10,500 + tax + $4,200 panels.

**History:** 09/09 first ADE start-up visit (no gas, sensors not wired, day 2 cancelled). 09/14 ADE full replacement
quote $17,650 + tax. 09/24 reduced package $10,500 + tax, remote panels ~$1,400 each. 09/25 Ruslan emailed Ryan the
7 technical questions with the diagram. 09/30 Ryan answered all 7, sent G31/Y07 schematics and
Greenheck FAQs 5 (web UI), 6 (SAT install), 12 (fan control mode), and booked the return start-up for 10/29 7-7:30 am.

**Open with ADE:** confirm supply-tracking is in the exhaust fan control Type list; 10/29 programming checklist is in the engineering note.

**Next:** (1) order the rev 1 purchase list now; (2) relocate SAT, install CO2 and high static switches, pull Cat6 to the switch, all by 10/23;
(3) ADE start-up 10/29 (programming checklist in the engineering note); (4) optional: send DMG an RFI / FYI recording the client-approved
change (draft in the engineering note "Paper trail").

## Files in `source/`

- `Greenheck ERU submittal 230000-13 (reviewed DMG 2025-04-22).pdf`: P281653R03, wiring diagrams G31 (p.15), Y07 (p.18), sequence p.25.
- `DMG mechanical drawings M0.1-M8.2 (IFC 2025-03-05).pdf`: plans M2.1-M2.4, schedules M6.1, M7.1 (ERU notes).
- `ADE 2026-09-30/`: Greenheck controller schematic G31, expansion board schematic Y07 (dashed = field wiring), DOAS FAQs 5 (web UI),
  6 (supply discharge temp sensor install), 12 (change fan control mode).
