# 225-233 Park Ave South - Multiple Floors TI & Demolition (HVAC)

- Customer: Clune Construction (GC). Bid set came from Cushman & Wakefield.
- Owner: Rexmark. Architect: Fogarty Finger. Engineer: P&A Consulting Engineers (Patti & Anthes), PLLC.
- Address: 225-233 Park Ave South, New York, NY 10003. Block 874, Lot 1 (225) and Lot 4 (233).
- Quote 3127, dated 9/18/2026. Prepared by Alikhan Ilyas.
- Proposal PDF: `bid.(225-233 Park Ave South - Multi-Floor TI & Demolition).pdf`. Regenerate with `build_proposal.py`
  (needs reportlab, pymupdf; edit the SCOPE / NOTES / EXCLUSIONS / PRICES lists at the top).

## Drawing packages (zip folders) and what they contain

| Folder | Sheets | Content |
|---|---|---|
| 10th Floor | M-001, M-910 (filing 07/26/26) | Removal plan, 225 PAS: AC-10-1, AC-10-2 (35-ton Trane water-cooled), AC-10-3, AC-10-4 (3.5-ton), 8 VAVs (10-02, 10-14, 10-17, 10-18, 10-19, 10-22, 10-25, 10-27), EF-10-2, OA duct cut at louver (louver covered R-21), toilet exhaust cut/cap at riser, CWS/R cut/cap at riser valves in MER |
| 10th Flr MER | M-001 to M-004, M-110, M-601, M-701 (IFC 08/31/26) | New AC-10-1, AC-10-2 (Trane MSC-035S, 386.5 MBH, 208/3/60, knocked down for elevator), 3" CWS/R from 4" riser valves with trim per M-701, 1-1/2" condensate to floor drain, welded 16 ga lined plenums, 58x22 (4), 62x20 supply with FD capped at MER wall, OAF-10-1 (Greenheck SQ-160-VG 2300 CFM) + EDH-10-1 (48 kW Neptronic) + 30x12 OA duct w/ MD + 51x14 louver, GXF-10-1 (CSP-A3300-VG 1800 CFM) + 22x12 + 51x12 louver, new 62x20 and 30x12 MER wall openings, leak detectors to BMS, commissioning per NYCECC C408 |
| 11th Floor | M-001, M-911 (07/27/26) | Same as 10th for AC-11-1, AC-11-2 plus supplemental AC-11-3; OA louver and MD remain, louver covered |
| 11th Flr MER | M-111, M-601, M-701 (IFC 08/31/26) | Identical to 10th MER with 11th tags (OAF-11-1, EDH-11-1, GXF-11-1) |
| 11th Floor - Lot Line | Fogarty Finger DM-111 IFF 08/14/26, GMS S-001/S-111, FA sets for 225 and 233 | New 6 ft x 11 ft opening in the lot line masonry wall between 225 and 233 with Cornell ERD10 fire shutters. No HVAC work; treated as an exclusion |
| 12th Floor | M-001, M-912 (07/27/26), 233 PAS | Supplemental AC-1, AC-2 (1-ton), FCU-X-1 (2-ton) removed; base building 35-ton United CoolAir AC-12-1 remains, supply duct cut/cap at MER demising wall; EF-12-1, EF-12-2 (toilet and kitchen exhaust) removed, louvers covered |

Drawing requirements worth remembering: all piping shutdowns and drain-downs on overtime/weekends with 48-hour notice to building management; refrigerant reclaimed per EPA before removal; EC disconnects power; MC furnishes disconnects, EC installs; units knocked down for elevator rigging; leak detectors tied to base building BMS (we scoped standalone only); Trane units ship knocked down.

## Our scope position (per Ruslan, 2026-09-18)

- Demolition floors (10, 11, 12): make-safe only. Disconnects, cut and caps, refrigerant recovery, condenser water shutoff/drain/cut and cap. Removal and disposal by the demolition contractor.
- MER floors: install only; Trane units furnished by others. Receiving/storage off site extra.
- Controls: standalone only, no BMS interlocks. BMS devices furnished by BMS company, we install, they wire/program.
- Duct smoke detectors: not furnished or wired by us; mounting assistance and tech present for termination and testing.
- Lot line package: no HVAC work, listed as exclusion.

## Pricing

| Package | Price |
|---|---|
| 10th Floor make-safe | $18,000 |
| 10th Floor MER install | $84,000 |
| 11th Floor make-safe | $18,000 |
| 11th Floor MER install | $84,000 |
| 12th Floor make-safe | $14,000 |
| Total | $218,000 |

### Price check (2026-09-18)

Make-safe packages: at $60/hr bid labor the base subtotal is roughly $6,500 per floor (70 hr labor, $2,000 materials and reclaim fees), about $8,100 with 20% overhead, 2% misc and tax. At T&M billed rates about $13,600. The $18,000 / $18,000 / $14,000 prices are sound.

MER packages, per floor, at the bid method:

| Component | Amount |
|---|---|
| Labor, ~560 hr x $60 (rig and reassemble 2 knocked-down units 160 hr, piping and trim 136 hr, sheet metal incl. welded plenums 160 hr, insulation 32, openings 16, start-up/test 24, PM 24) | $33,600 |
| Material (taxable): pipe and trim $9,000, plenums/duct/FD $9,000, OA/EA duct and MDs $2,500, OAF $2,200, GXF $2,000, EDH $5,500, louvers and plenum boxes $3,400, isolators and disconnects $1,600, insulation $2,500, misc $1,200 | $38,900 |
| Services: shop drawings $3,000, TAB $4,500, Trane start-up $2,500, premium time for riser tie-in $1,500 | $11,500 |
| Base subtotal | $84,000 |
| Overhead 30% (OFCI) / 20% | $25,200 / $16,800 |
| Misc 2% | $1,680 |
| Sales tax 8.875% on material | $3,450 |
| Bid price | ~$114,300 (OFCI 30%) / ~$105,900 (20%) |

Observation: $84,000 equals the base subtotal before overhead, misc and tax. Recommended MER price $105,000 to $115,000 each. At T&M billed rates the same scope is ~$137,000. Decision pending with Ruslan; proposal was issued at $84,000 per MER as instructed.
