# Northern Wolves AC - field-reports

This repository is the Northern Wolves Air Conditioning operations app (static HTML/JS + Supabase) and also
holds the company's engineering and estimating reference material under `Reference/`.

Read these before doing estimating, proposal, RFI or engineering work:

- `Reference/Estimating Standards/Proposal Standards.md` - house proposal format, standard notes, exclusions, terms, pricing method.
- `Reference/Estimating Standards/Labor Rates.md` - T&M billed rates (service and change orders only, not bids).
- `Reference/Bids/` - one folder per bid or RFI with the record, the issued PDF and the build script.
- `Reference/Engineering Notes/` - technical facts established on jobs (equipment, wiring, code items).

Working rules learned from the team:

- Bids are priced at $60/hr flat labor plus 20% overhead (30% OFCI), 2% misc and 8.875% NY tax on material. Billed T&M rates are not bid rates.
- Proposals: short scope lines, drawing tags only, no brand or model names, broken down by the drawing packages as issued. See the Rye Brook example PDF for the look.
- Estimator name on GC bids: Alikhan Ilyas. Deposit of 30% required goes in Notes.
- We scope standalone controls only; BMS devices are furnished by the BMS company, we install, they wire and program. Duct smoke detectors are furnished and wired by others.
- Demolition proposals are usually make-safe only (disconnect, cut and cap, refrigerant recovery, drain-down); removal and disposal by the demolition contractor.
- Manhattan office buildings in these bids are on condenser water (CWS/R), not chilled water. Check the drawings.
- Deliverables are built with reportlab / pymupdf scripts kept next to the PDF so they can be regenerated. LibreOffice is not reliable in the remote container.
- Web fetches: most vendor sites are blocked by the egress proxy; Amazon S3 hosted PDFs (Mitsubishi metuspublicassets, some distributor copies) work.
