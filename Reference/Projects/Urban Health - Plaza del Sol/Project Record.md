# Urban Health Plan - Plaza del Sol Primary Care Site

37-12 108th Street, 2nd floor, Corona, NY 11368. Status: **closeout** (as of 11/24/2026).
Job refs: NWAC proposal #2091 (12/2023); POs use suffix "-UH"; Procore project 2663782; OLA project NDGK0020.07.

## Parties

| Role | Company | People |
|---|---|---|
| Owner | Urban Health Plan, Inc. | Richard Perez (Richard.Perez@urbanhealthplan.org, 917-244-5931), Lewis Spann, Fernando Martinez |
| GC | Sentinel Builders, LLC, 245 5th Ave, Suite 5109, New York, NY 10016 (moved from 79 Madison Ave) | Ryan Jennings, President (rjennings@, O 646-974-8234, M 914-424-4725); Vladimir Timbur (vtimbur@, site PM); Kiernan Hanrahan, Project Executive (khanrahan@); Lauren Rivera, PM (lrivera@); Pedro Sinchi (psinchi@) - @sentinel-builders.com |
| Architect / submittal reviewer | Delgado Gilbride & Keenan Architects (dgk), 57 Main St, Westport CT | Gerry Gilbride, dgkarchitects@aol.com, 203-858-4401 |
| MEP engineer | OLA Consulting Engineers, 8 West 38th St Ste 900, NY | Peter Burkhardt (field), Joseph Fierro (jfierro@olace.com), John Tesser (jtesser@olace.com) |
| NWAC | | Andrei Kastanyan (PM), Fatima Moutchou (closeout), Leonid / Karen (billing) |

Vendors (see `source/POs/`):
- Lennox Commercial Northeast: 6 RTUs, quote 336370, order 830518044, ticket 1010758. Contacts: Matthew Recenello, Northeast.Commercial@lennoxind.com, 973-939-3923; Taylor Pugh (Taylor.Pugh@lennox.com). Replacement motor 2026: parts order 41670191.
- Homans Associates: Mitsubishi mini split, submittal 1-001. Contacts: Rajiv Dyal, rajiv.dyal@homans.com, 646-276-3300; Matthew Quinn.
- Engineered Air Solutions: Randy Sapoff, rsapoff@engineeredairsolutions.com, 973-536-2220.
  - PO NWAC0373-UH: 6 Rupp fans and 5 Berko wall heaters.
  - PO NWAC 0372-UH: 12 sound traps.
  - Fan status panel (EAS job 24-100).
- SRS Enterprises: PO NWAC0409-UH, 73 diffusers and 91 grilles. Contact: Mark Richter, mrichter@srs-enterprises.com.
- Ferguson HVAC: PO NWAC0575-UH (R-410A). General Insulation Co.: insulation.
- CBreeze Air: PO NWAC0337-UH (duct install labor). Contact: Oleg Lyman, c.breezeair@yahoo.com.
- Drafter: Dmitriy (Dima) Leybovich, DLsketching@yahoo.com. Did the shop drawings H-1 to H-4 and the as-builts.

## Equipment

| Tags | Equipment |
|---|---|
| RTU-1 to RTU-6 | Lennox LGT048H4E-Y, on steel dunnage, CDI curbs and Mason SLF isolators, ComfortSense 8500 thermostats (standalone, no BMS) |
| AC-A / ACC-A | Mitsubishi PKA-A12LA / PUY-A12NKA7 (IT room) |
| TX-1 to TX-6 | Rupp DR10HRA / DR12HRA. The fan schedule was revised for TX-4 and TX-5 on 6/1/24; final models still to be confirmed. |
| Electric wall heaters | Berko SSARWH (5) |
| Sound traps (12) | Submittal was Pottorff RFN, but the PO says Dynasonic; confirm. |
| Air outlets | Titus OMNI diffusers and 3FL grilles per approved submittal 230000-17; actual brand supplied by SRS not confirmed. |

The Lennox submittal shows the wrong address ("57-12 108th St") and customer "Zone Comm New York". Use 37-12 in the closeout.

## Closeout (requested 11/18/2026 by Ryan Jennings for Sentinel's final payment)

OLA Field Observation Report 11/12/2026 (`source/`):
- Mechanical punch items:
  - M-1: diffuser in 243 North Reception not set in the ceiling.
  - M-2: diffusers in 250 Exam Room 9 and 248 Immunization obstructed by divider curtains.
  - Sentinel said it will do the physical work.
- Administrative items required:
  1. O&M with catalog data
  2. As-builts
  3. Guaranties and maintenance instructions
  4. Proof that permits are closed

Binder: `Closeout/build_closeout.py` builds "Urban Health - HVAC Closeout Package.pdf" (205 pages, ~20 MB) plus
e-mail parts "... - Part N of 4.pdf" (each under 9.3 MB; Gmail connector limit is 10 MB per file). Outputs are git-ignored; re-run the script.
Per Ruslan 11/25/2026: GC needs O&M manuals and manufacturer warranties only (no submittals, no NWAC guarantee letter).
Contents: directory, equipment schedule, maintenance instructions, O&M (Lennox, Mitsubishi, Rupp), warranties, as-builts, TAB.

Sources of the manufacturer documents (downloaded 11/24-25/2026, `Closeout/docs/om` and `docs/warranty`):
- Lennox LGT/LCT036-072 R-410A Installation/Operation/Maintenance 508286-01 (7/2022) - lennox.com; Lennox Equipment
  Limited Warranty W900008-03 - lennox.com (1 yr components, 5 yr compressor, 10 yr aluminized heat exchanger, 3 yr coils).
- Mitsubishi PKA-A-LA installation + operation manuals, PUY-A NKA7 installation manual (English pages) - Mitsubishi
  S3 library s3.amazonaws.com/enter.mehvac.com; P-Series limited warranty Rev 10.24.2025 (products bought 5/2019-10/2025).
- Rupp Air Power Roof Ventilators IOM - ruppair.com/manuals/ExhaustFans/Exhaust-oim.pdf; Rupp warranty policy
  (24 months from shipment) reproduced from ruppair.com/warranty-info.
TAB: A.L.E Testing & Balancing job 6722, final report 6/11/2026, revised 9/21/2026 (`docs/tab`).
As-builts: Dmitriy's 6/25/2025 set is final (Ruslan 11/25/2026).

Status 11/25/2026:
- [x] O&M manuals and warranties for Lennox, Mitsubishi, Rupp.
- [x] TAB report and as-builts in the binder.
- [ ] Send the package to Ryan Jennings. Labor warranty response: start-up was more than 1 year ago, so no labor warranty.
  The files are too large for the Gmail connector (3.1 MB per call), so Ruslan sends them from his own mail.
- [ ] DOH: EDC #29 air balance P.E. cover letter (open since June 2026).
- [ ] Permit sign-off documentation: by GC / expeditor.
