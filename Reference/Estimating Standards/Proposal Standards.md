# Northern Wolves AC - Proposal Standards

Source of truth for how Northern Wolves proposals are written. Established 2026-09-18 from the
Rye Brook / Sunrise proposal (Quote 3112) and the 225-233 Park Ave South bid for Clune Construction.
The estimating app (`estimating.html`, `exportProposalPDF`) uses an older teal layout; the format
below is the current house style and should be used for hand-built proposals.

## Layout (match `Proposal Example - Rye Brook Rev1.pdf`)

- Letter, margins 45 pt. Font Arial (Liberation Sans is metric-identical). Body 10.5 pt, header block 9 pt.
- Logo `logo-full.png` top left, 113 pt wide. Top right, 9 pt: `Quote: NNNN / Date: M/D/YYYY`.
- Left block, 9 pt: `Northern Wolves AC / 55 9th St, 55-A2 / Brooklyn, NY / 11215, US / (347) 463-9248`,
  blank line, `Prepared By:` name, phone, email.
- Right block: `Customer` in 8 pt grey `#aeaeae`, customer name below in 9 pt black.
- Project block, 10.5 pt: `Project: ` + bold name, `Address: ` + bold address, bold `Mechanical drawings dated: MM.DD.YYYY`.
- Section heads in bold 10.5 pt blue `#236fa1`: `Scope of Work`, `Exclusions / Notes`, `Terms`,
  and for multi-package bids `Price Breakdown`.
- Bullets: 3 pt black squares at x = 61, text at x = 72. Scope bullets plain; Exclusions / Notes bullets bold.
- Terms paragraph (verbatim):
  > Northern Wolves Inc provides one year warranty for the system it will install. In case of technical fault after one year all the repairing cost will be additional. The firm will not be responsible for the warranty claim if the system is externally damaged by any means. Firm only caters the internal design faults.
- Price: black 1.5 pt box, total in 18 pt Arial, optional bold 11-12 pt line under it (alternate or "TOTAL FOR ALL N PACKAGES").
  Right of the box: `Accepted By` and `Date` in 9 pt `#6a767c` with dotted lines.
- File name: `bid.(Project Name).pdf`.

## Writing rules

- One line per scope item. Use drawing tags only (AC-10-1, OAF-11-1, EDH-11-1, EF-12-2). No manufacturer or model names.
- Start scope lines with the verb: `Furnish and install ...`, `Install ... (furnished by others)`, `Cut and cap ...`, `Provide ...`.
- Reference the drawing sheet and date in the package sub-heading, e.g. `10th Floor MER - new mechanical work (M-110, M-601, M-701, IFC dated 08.31.2026)`.
- When a bid set is issued in packages (folders), break the proposal down the same way and price each package.
- Quote numbers: 4 digits, sequential-looking (3112 was Rye Brook 9/16/2026, 3127 used for 225 PAS 9/18/2026).
- Estimator on GC bids: Alikhan Ilyas, (347) 463-9248, alikhan@northernwolvesac.com. Ruslan Zhdamarov for others unless told.
- Always end the scope with `Provide 1 year Labor Warranty`.

## Standard Notes (first bullets under Exclusions / Notes)

- Deposit of 30% required.
- Demolition scope is make-safe only: removal, rigging out and disposal of existing equipment, ductwork and piping by demolition contractor. (Use when we only disconnect, cut, cap, recover refrigerant and drain.)
- Equipment furnished by others: installation only. If units must be received and stored outside the project, additional cost will be provided separately.
- Controls: standalone controls and standalone leak detectors only, no interlocks to BMS. BMS controls, control valves, sensors, actuators and BMS leak detectors furnished by BMS company; installed by Northern Wolves; wiring and programming by BMS company.
- Duct smoke detectors furnished and wired by others. Northern Wolves assists with mounting to ductwork; our technician will be present during wiring termination to the unit and testing.
- Condenser water shutdown and cut and cap work is priced for one after-hours shutdown per floor. (Use when drawings require piping work on overtime/weekends.)

## Standard Exclusions

- BMS controls removal or disconnects; standalone controls only
- BMS controls, valves, sensors, actuators, wiring and programming
- Duct smoke detectors and fire alarm work
- Electrical power wiring, starters and disconnect installation
- Overtime (except as noted)
- Scaffolding with permits; crane and street hoisting
- Fire Stop (other than our own penetrations)
- Cutting and patching roof, structural walls, floors; patching and painting of wall openings
- Roof dunnage/steel/iron beams for outdoor equipment.
- Structural work
- Permits and fees; DOB filing; special inspections
- Bond
- Gas Piping, Gas Meter.
- Plumbing and floor drains
- Asbestos or hazardous material abatement
- Warranty for existing equipment
- Core Drilling

## Scope conventions

- We furnish disconnect switches for equipment when the drawings put them on the mechanical contractor; installation by EC.
- We cut our own wall openings for ducts and pipes; patching and painting by GC.
- We include shop drawings, submittals, close-out, pressure testing, start-up, 3rd party air and water balancing with reports.
- Rigging inside the building by freight elevator is included; crane and street hoisting excluded.
- Refrigerant recovery (EPA 608) with documentation is included in demolition make-safe scopes.
- Terminology: water-cooled units in Manhattan buildings are on condenser water (CWS/R), not chilled water. Check the drawings before writing.

## Pricing method (per `estimating.html` computeAllTotals and Kastriot's Cost Breakdown Template)

- Labor at flat **$60/hr** per man for bids (NOT the T&M billed rates; those are for service and change orders).
- Categories: Disconnects, Equipment, Ductwork, Pipework, Equipment Install, Air Outlets Install, Services.
- Base Subtotal = Equipment/Material + Labor + Wet-tap + Services (shop drawings, TAB, rigging, crane, scaffolding).
- Overhead = Base Subtotal x 20% (x 30% when equipment is owner-furnished, OFCI).
- Miscellaneous = Base Subtotal x 2% (not compounded).
- Sales tax = Equipment/Material x 8.875% (NY).
- Bid price = Base Subtotal + Overhead + Misc + Tax.
- Air outlet presets: diffusers/grilles 1.6 hr each, linear diffusers 0.8 hr/lf, VAV boxes 2.67 hr each.
- T&M / change-order billed rates are in `NW Labor Rates 2026-07-29.pdf` and summarized in `Labor Rates.md`.
