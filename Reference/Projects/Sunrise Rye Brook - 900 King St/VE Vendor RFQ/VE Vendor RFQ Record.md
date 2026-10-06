# Sunrise Rye Brook - VE vendor request for pricing

- `VE Vendor RFQ - Sunrise Rye Brook.pdf` (3 pages of item lists + the 5 marked-up sheets) and `.xlsx` (vendor fills
  unit price / lead time), built by `build_rfq.py`. Data comes from `../VE Mark-ups/build_markups.py`; the sheets are
  built with `build_sheets(vendor=True)`, which shows Electrical B123 / Laundry B121 as plain "DELETE FCU" (no RFI).
- Rev 0 10/06/2026 per Ruslan: for vendors only, no RFI information, keep all drawing mark-ups.
- Content: 1A 26 VAV with electric reheat (100 kW: the 25 from the mark-ups + VAV-10 locker rooms 3 kW, which needs
  electric heat once the boilers are deleted); 1B 4 cooling-only VAV; 1C 18 VAV cancelled (credit); 2A 10 electric
  cabinet heaters (58.1 kW); 2B 9 electric unit heaters (35 kW); 3 credits for deleted hydronic equipment;
  4 alternates (283 FSD at apartment branches, 283 TX-A fans).
- Voltage note: 277 V/1 ph up to 5 kW, 480 V/3 ph above, to be confirmed by EE. Standalone controls, no BMS.
