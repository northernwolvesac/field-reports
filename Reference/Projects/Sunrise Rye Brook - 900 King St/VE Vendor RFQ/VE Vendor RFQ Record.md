# Sunrise Rye Brook - VE vendor request for pricing

- `VE Vendor RFQ - Sunrise Rye Brook.pdf` (3 pages of item lists + the 5 marked-up sheets) and `.xlsx` (vendor fills
  unit price / lead time), built by `build_rfq.py`. Data comes from `../VE Mark-ups/build_markups.py`; the sheets are
  built with `build_sheets(vendor=True)`, which shows Electrical B123 / Laundry B121 as plain "DELETE FCU" (no RFI).
- Rev 0 10/06/2026 per Ruslan: for vendors only, no RFI information, keep all drawing mark-ups.
- Content: 1A 26 VAV with electric reheat (100 kW: the 25 from the mark-ups + VAV-10 locker rooms 3 kW, which needs
  electric heat once the boilers are deleted); 1B 4 cooling-only VAV; 1C 18 VAV cancelled (credit); 2A 10 electric
  cabinet heaters (58.1 kW); 2B 9 electric unit heaters (35 kW); 3 credits for deleted hydronic equipment;
  4 alternates (283 FSD at apartment branches, 283 TX-A fans).
- Standalone controls, no BMS.

## Rev 1 - 10/06/2026
- Per Ruslan: one voltage for all electric heat. 208 V / 3 ph (building has 208Y/120 for PTACs / mini-splits;
  no 230/240 V system here). Heaters rated at 208 V, not 240 V units derated (25% loss at 208 V). 208 V / 1 ph
  offered where no 3 ph model exists. ~193 kW total at 208 V / 3 ph is ~535 A on the 208 V system - EE to confirm
  the 208 V transformer / panel capacity.
- Then per Ruslan "make small VAVs 1 ph": VAV electric coils up to 5 kW at 208 V / 1 ph (23 boxes), above 5 kW at
  208 V / 3 ph (VAV-1 8 kW, VAV-2 13 kW, VAV-3 11 kW). Cabinet and unit heaters stay 208 V / 3 ph. Voltage column
  added per box in the PDF and xlsx ("Notes / volts").

## Responses
### Klima NY proposal 028132 rev 00, bid date 10/12/2026 (received 10/16) - $1,699,000 lump sum
File: `responses/Klima NY 028132-00 2026-10-12.pdf`. Based on plan date 06/05/2026. Breakout only for townhouse
residential splits (40 x 5-ton HP + gas furnace + A-coil) $315,000.
- VE items included: 30 VAV (electric reheat + SCR + standalone controller, VAV-8/14/31/32 cooling only) = matches 1A+1B;
  10 electric cabinet heaters 208/3, 5 kW (CH-9 10 kW) vs 5.3 kW scheduled; 9 electric unit heaters 208/1 (we asked
  208/3), 3 kW x5 / 5 kW x4 = 35 kW, but tag list is wrong (UH-6 in both groups, UH-8 missing; should be 3 kW:
  1,4,5,6,9 and 5 kW: 2,3,7,8). No per-box kW / voltage confirmation for the VAVs. No credit section (no hydronic
  equipment in their scope at all) and no ALT-1 (FSD) / ALT-2 (TX-A) pricing.
- IL apartment splits (GMP: Daikin ducted AC-1..AC-5 with single-zone HP-1..HP-5, 126 systems in quote 3112): Klima
  carries LG Multi-V S R-32 instead, but only 5 systems - one per size (outdoor 2x2 ton, 2x3 ton, 1x4 ton; indoor
  18/24/28/36/42 MBH ducted = AC-1..AC-5) - not the ~126 required, and in the base, not as an alternate. No Daikin
  price. Needs requote with full quantities by tag, Daikin base + LG alternate (or the reverse) priced separately.
- DOAS-1..7: both GMP basis and Klima are air-source heat pumps with energy recovery (not a brand issue). Clarify:
  (a) Klima lists electric supplemental heat with no kW - GMP schedule is heat pump only (wheel 53 F -> HP 84.6 F),
  MCA 49.6 A / DOAS-5 88.7 A at 460 V; need kW and revised MCA/MOCP for the EE; (b) DOAS-5 quoted 25 nominal tons vs
  scheduled 329 MBH (~27.4 tons) - confirm performance; (c) confirm enthalpy wheel (not plate core), weights / curbs
  vs scheduled 4,143 lb (DOAS-5 5,538 lb).
- Other: RTUs JCI
  gas heat with hot gas reheat; PTAC qty 158 (3112: 157). Not in this proposal: exhaust fans, air curtains,
  DX-FCUs, AC-1 elevator lobby split, MDF/IDF splits, DH-1 (pool by others).
