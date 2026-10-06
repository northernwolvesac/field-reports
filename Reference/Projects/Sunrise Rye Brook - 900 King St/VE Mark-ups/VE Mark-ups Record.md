# Sunrise Rye Brook - VE drawing mark-ups

- `VE Mark-ups - Sunrise Rye Brook.pdf` built by `build_markups.py` (pymupdf marks on copies of the GMP sheets +
  reportlab cover / tables / RFI page). Decisions per tag are in the `VAV`, `CH`, `FCU` lists in the script.
- Rev 0 10/06/2026, per Ruslan: keep the same RTUs, no ductless units; cancel as many VAVs as possible in open areas;
  keep VAVs in rooms with electric reheat + simple standalone thermostats; VAVs not needing reheat (RTU gas heat)
  noted; cabinet heaters and basement FCUs to electric heaters; rooms needing cooling / exhaust in RFI-01, not priced.
- Pages: 1-3 cover, legend, VAV / CH / FCU tables; 4-8 marked sheets M2010, M2011, M2013, M2000, M2002 (full size,
  legend box top-left); 9 RFI-01.

VAV decisions (47 boxes; VAV-18 tag appears twice on M2010, the second one serves Treatment Rm 1041C):
- Cancel (18): VAV-5, 6 (corridors), 12, 13 (lounge), 18 (reception), 19 (coffee shop), 24 (bistro), 23, 28
  (restrooms / mailroom), 25 (casual dining), 27 (formal dining), 29 (main kitchen), 33 (AL dining), 34, 35 (AL
  bistro), 36 (parlor), 37 (AL reception), 40 (corridor 100C).
- Keep, electric reheat + standalone T-stat (25 incl. Treatment Rm): VAV-1, 2, 3, 4, 7, 9, 11, 15, 16, 17, 20, 21,
  22, 26, 30, 38, 39, 41, 42, 43, 44, 45, 46, 47 + Treatment Rm. About 90 kW (scheduled HW MBH / 3.412).
- Keep, no reheat (4): VAV-8 (IT / AV), 14 (security / package), 31 (storage / trash / receiving), 32 (chef office).
- No change (1): VAV-10 locker rooms / sauna (pool area by others, not marked).

Cabinet heaters: CH-1, 3, 4, 5, 6, 7, 9, 10, 11, 12 marked electric (about 5.3 kW each, CH-9 10.4 kW). CH-8 is in the
schedule but not on the plans; CH-2 not used.

Basement FCUs: electric unit heater in Res. Storage B107, Trash Collection B106 (M2000); Kitchen Storage B113,
Corridor B100, Res. Storage B115, Team Member Lounge B119A, Mechanical B118, AL south trash room and storage room
(M2002). Electrical B123 and Central Laundry B121 -> RFI-01. Pool equipment B110 FCU not marked (by others).
DX-FCUs unchanged.

RFI-01 (not priced): electrical rooms B111 / B120 / B122 / B123, MDF B116 and IDFs, central laundry B121,
mechanical B112 / B118 ventilation after boiler deletion.
