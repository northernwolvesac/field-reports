# LA Fitness Bronx, NY

GC: Donnelly (Diogo Ferreira, DFerreira@donnellyind.com). Engineer punch list received 10/2026 (`source/`).

## Punch list (mechanical)
1. Final balancing report - after RTU-12 fix.
2. RTU-12 missing condensate piping.
3. RTU-12: return duct re-routed exposed on the roof into the unit's horizontal return; the factory downflow
   economizer return damper is bypassed. Engineer: add return motorized damper + barometric relief.

## RTU-12 fix (decided 10/16-10/17)
- Unit: Trane Precedent YHK240 (20 t), Symbio 700, 6,000 CFM, factory downflow low-leak econ (ref. enthalpy) with baro relief.
  Horizontal return opening 20" x 46-1/2".
- RD-1: United Enertech CD-100 22-3/4 x 49-3/4 (23x50 duct) with Belimo AFB24-SR US, spring OPEN / power close
  (corrected on submittal), via Engineered Air Solutions (Randy Sapoff) quote Q74332 - released, expedited.
- Relief: Dayton 1C745 23x23 gravity shutter + 1WBV9 hood (26-1/2" - check fit) from Grainger, order 1601631511.
  24x24 is max that fits; undersized for full econ (~4,000-5,000 CFM) -> verify building pressure at balancing,
  limit econ / RD-1 end stop if > +0.05 in. wg.
- Trane horizontal econ conversion (ZK-27763-13060-1, $3,136, MicroMetl RH-GPR2XCA relief offered) not used because
  RD-1 was already released and expedited.
- Wiring: `RTU-12 Return Damper Wiring.pdf` (build_rtu12_damper_wiring.py) - RD-1 slaved to econ 2-10 V signal,
  same 24 VAC transformer and common.

## Field checklist for the RTU-12 install (open)
Material from vendors: RD-1 damper + AFB24-SR (Randy); relief shutter 1C745 + hood 1WBV9 (Grainger pickup, 815 Third Ave Brooklyn).
Field-supplied: 18 AWG x 3/4 outdoor/sunlight-rated cable, weatherproof junction box, liquidtight + fittings,
12x12 (min.) duct access door, angle/screws/duct sealant for damper frame, sheet metal cap for old bottom return,
framing/flashing/sealant for relief opening in the insulated duct, foam gasket for shutter blades (optional).

1. Damper RD-1 in the 23x50 return duct at the unit; screw frame all sides, seal perimeter; access door next to actuator.
2. Old bottom (downflow) return capped and sealed in the curb.
3. Relief shutter on the return duct, building side of RD-1, as far from the unit as practical (less suction = less
   leakage), blades horizontal, pivots at top, opening outward; hood over it. Hood is 26-1/2" square - confirm it
   fits (24x24 max space); if not, get Dayton hood for 20" fan or shop-made hood with bird screen.
4. Wiring per `RTU-12 Return Damper Wiring.pdf`: meter existing econ actuator first (24 VAC on 1-2, 2-10 VDC on 1-3
   moving with Symbio service test); tap at actuator plug; same transformer and common; wire 5 taped.
   If existing actuator is communicating (no plain 2-10 V), use its wire 5 (U feedback) as the signal.
   Need a photo of the Trane unit wiring diagram (control box door) to add real terminal numbers.
5. Start-up: power off -> RD-1 open; econ minimum -> RD-1 open; 100% econ -> RD-1 closed, relief open.
6. Balancing (punch item 1): building pressure at full econ <= +0.05 in. wg; if higher set AFB24-SR end stop or
   limit econ max; note exhaust running; record "relief limited to 24x24 by roof space, verified +__ in. wg" in TAB.
7. Punch item 2: RTU-12 condensate piping still open.

## Contacts
- Trane: Trey Clemmer, Key Account Manager, Trey.Clemmer@Trane.com, (425) 213-9111.
- Engineered Air Solutions: Randy T Sapoff, rsapoff@engineeredairsolutions.com.
