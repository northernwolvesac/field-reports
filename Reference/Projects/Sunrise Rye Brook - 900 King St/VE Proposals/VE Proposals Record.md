# Sunrise Rye Brook - Mechanical VE Proposals (no pricing)

- `VE Proposals - Sunrise Rye Brook.pdf` built by `build_ve_proposals.py`; drawing screenshots made by `crops.py`
  (page-fraction crops of the GMP set into `img/`). Run `python3 crops.py && python3 build_ve_proposals.py`.
- Rev 0 10/01/2026, per Ruslan: no prices, proposed solutions only, screenshots for every VE area; pool, spa and
  sauna by others, excluded.
- Customer-facing numbering VE-01..VE-09 (maps to the internal VE list in the Project Record):
  VE-01 plant (int. VE-6), VE-02 electric reheat (VE-1), VE-03 single-zone RTUs (VE-12), VE-04 cabinet heaters
  (VE-2), VE-05 basement FCUs (VE-3/VE-13), VE-06 snow melt (VE-4), VE-07 apartment FSDs (VE-9), VE-08 bath exhaust
  to DOAS (VE-14/VE-10), VE-09 standalone controls (VE-11). Internal VE-5 (pool/spa) dropped: by others.
- Ends with coordination items for an RFI (basement piping not drawn, FCU counts, PP-1/2 blank, RTU-5 heat,
  equipment room cooling, RG-2 return grilles in some AL unit types vs floor plans).
- Priced budget version stays in `VE Log/` (internal).

## Rev 1 - 10/06/2026
- VE-02 now electric reheat only in the 25 boxes kept in enclosed rooms (~90 kW), 4 boxes cooling-only (no reheat,
  RTU gas heat). VE-03 changed: same RTUs, cancel 18 VAVs in open areas / circulation, no ductless units.
- VE-04 / VE-05 electric heaters per mark-ups; equipment room cooling / ventilation moved to RFI-01 (own page).
- Screenshots of the marked-up sheets (`mk_*` crops from `../VE Mark-ups/`) added; crops.py renders both sources
  (build the mark-ups first).
