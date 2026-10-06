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
