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
