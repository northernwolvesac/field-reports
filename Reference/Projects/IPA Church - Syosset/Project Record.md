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

## Closeout (requested 10/16/2026 by Lizbeth Astorga, CCC Project Administrator, liz@cccliny.com; due 10/30)

GC: Core Concepts Contracting (CCC), 687 Old Willets Path, Hauppauge NY 11788. Jay Peck (Sr PM, jay@cccliny.com), Dennis Lamm
(super, dennis@cccliny.com), Nicole LaMontagne (warranty addressee). CCC job C24-001. Substantial completion 10/26/2026.
Final payment and retainage are held until the closeout package is accepted. Hard copies (original signature) and
electronic copies are required, each showing the project name and full address (310 South Oyster Bay Road, Syosset, NY 11791).

Required: (1) subcontractor material & installation warranty, (2) manufacturer warranties, (3) O&M manuals,
(4) as-built drawings, (5) TAB report.

What was done (checked Ruslan's Gmail and Drive 11/25/2026; Fatima has left NWAC):
- 10/17 Leonid wrote our standard one-year labor warranty letter. Fatima sent it to Dennis 10/24 ("use only the warranty
  letter", 10/27). Nothing else was submitted. Fatima's Drive holds only that letter and CCC's sample.
- 11/24 Liz rejected the warranty ("not acceptable, use our project warranty template") and re-listed items 2-5.
- 11/24 W-001 (app / Drive IOM & WARRANTY) is still our standard wording, not CCC's. Superseded by W-002.
- 11/25 W-002 built on CCC's template wording: `Closeout/W-002 Warranty Letter (CCC template) - India Pentecostal
  Assembly.pdf` (`Closeout/build_warranty_letter.py`). Needs Ruslan's original signature. Note the template makes us
  liable for damage to others' work, structures and furnishings and for owner-incurred correction costs.
- Drive project folder (NW Projects / India Pentecostal Assembly Church): As Builts and TAB Report folders are empty.

Still open:
- [ ] W-002 signed (wet ink) and sent to Liz, hard copy to CCC.
- [ ] Manufacturer warranties and O&Ms: Greenheck RVE ERU-1..3 (warranty statement is in submittal 230000-13 p.28),
  LG VRF (HP-01..06 + indoor units), split system, Greenheck SP-B80 EF-01, ESD-403 louvers, Markel EWH-01/02, Price
  air outlets, air curtain. Manufacturer sites (greenheck.com, lghvac.com, price, markel) are blocked from the cloud
  container; get IOMs from the reps (ADE for Greenheck) or allow the hosts. DGX / KMAU-1 is "[FUTURE]" on M7.1: confirm
  whether it was furnished before including it.
- [ ] TAB report: balancing was scheduled 10/8-10/9 (Ruslan to Ryan, 10/6). Balancing firm not named in email; no report
  received.
- [ ] As-built drawings: no drafter or status found in email.
- [ ] ERU final start-up (ADE, booked 10/29): no confirmation or final report in email; gas inspection was 10/28.
  Only the 9/9 partial start-up reports exist (Ryan 9/10 and 9/24, 4 x .doc + photos).
- [ ] VRF start-up report: Christino asked Ferguson (Michael Liranzo) 10/5; Ferguson says it did not supply the equipment.
  The VRF supplier on the POs is Klima (PO NWAC0547, NWAC1063). VRF central controller set-up also unresolved.
- [ ] GC recap 10/27 items: firestopping all floors, duct collar and return grille room 111, resend completed scope list.
- [ ] ADE 11/24 asks for the PO number for an "India Church" lien waiver.

## Files in `source/`

- `Greenheck ERU submittal 230000-13 (reviewed DMG 2025-04-22).pdf`: P281653R03, wiring diagrams G31 (p.15), Y07 (p.18), sequence p.25.
- `DMG mechanical drawings M0.1-M8.2 (IFC 2025-03-05).pdf`: plans M2.1-M2.4, schedules M6.1, M7.1 (ERU notes).
- `ADE 2026-09-30/`: Greenheck controller schematic G31, expansion board schematic Y07 (dashed = field wiring), DOAS FAQs 5 (web UI),
  6 (supply discharge temp sensor install), 12 (change fan control mode).
