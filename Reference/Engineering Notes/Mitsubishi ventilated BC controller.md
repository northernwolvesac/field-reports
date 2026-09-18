# Mitsubishi CITY MULTI ventilated BC controllers (CMB-M-NU-MA1-SV / MB1-SV, R32)

Sources: Mitsubishi Application Note 2045 "New X-generation Ventilated BC Controller" (May 2026);
Installation Manual WT11269X01 CMB-M-NU-MA(B)1-SV; Data Book MEES25K084.
https://metuspublicassets.s3.us-east-2.amazonaws.com/manuals/Application+Note+2045+-+Ventilated+BC+Controller_REV1.pdf

## What is built in vs field provided

- Built in: R32 refrigerant leak sensor (25-year life, single-use after a trip, replace after any event), two capped 4" round duct ports (one each side, use one only),
  ventilation output TBX1-2 (208/230 VAC wet contact, 10-500 mA, closes on leak), alarm output TBX3-4 (dry, 240 VAC / 30 VDC, 0.5 A). One 4" flange in the box.
- NOT built in: fan. Duct, fan, backdraft damper, bird screen, rain hood, relay, alarm are field provided.
- "-MA1-SV" / "-MB1-SV" suffix = ventilated model. "-MA-SV" / "-MB-SV" = non-ventilated.

## When ventilation is required

UL 60335-2-40 basis (ASHRAE 15-2022 refers to it). Mitsubishi lists the product as ETRS, so the IM criteria govern.
Amin = mc / (0.5 x 0.306 x Hr), mc = system R32 charge (kg), Hr = mounting height (m). At 8'-3" that is about 108 sq ft per 8.4 lb.
If the plenum boundary is unclear, use the floor area of the room below. If area >= Amin: no duct, leave both covers on,
remove the CNSK sensor-kit connector from TB4A. If area < Amin: leak-activated fan and duct per IM 5.7. Run the calc in Diamond System Builder.

## Duct and fan design (12-port MAIN, CMB-M1012NU-MA1-SV)

| Item | Requirement |
|---|---|
| Duct | 4" round, one side, other side stays capped |
| Fan | Draws OUT of enclosure, never blows in; kVA <= 1.0; no brushed motor; no ignition source in airstream |
| Negative pressure in unit | 0.08 in. w.c. (20 Pa) |
| Min / max airflow | 88 / 588 CFM (4, 6, 8-port MAIN: 94 min; SUB 4, 8-port: 68 min) |
| Unit pressure drop at min airflow | 0.12 in. w.c. (0.16 for other sizes) |
| Accessories | Backdraft damper and bird screen required; rain hood outdoors; duct sloped 1:30 down toward outdoors |
| Insulation | First 39" (1 m) of duct |
| Control | Fan runs ONLY on leak signal; continuous ventilation prohibited. TBX1-2 must drive a field relay/contactor with separate fan power, never the fan directly |
| Multiple boxes | Parallel to one fan allowed on the same refrigerant system; series NOT allowed; different systems need N.O. motorized dampers per branch |

Leak sequence: system stops, shut-off valves close, TBX1-2 energizes fan, TBX3-4 closes alarm, error 1524 on controllers.

## Fantech FG 4 vs FG 4XL (FG Series submittal Art. 450459)

| Model | 0.0" | 0.2" | 0.4" | 0.6" | 0.8" | W | A |
|---|---|---|---|---|---|---|---|
| FG 4 | 135 | 110 | 83 | 55 | 25 | 20 | 0.19 |
| FG 4XL | 170 | 150 | 134 | 119 | 103 | 71 | 0.66 |

FG 4 clears 88 CFM only up to about 0.36" total, i.e. 0.12" unit + ~0.24" for duct, damper and hood: roughly 20 equivalent feet of 4" duct.
Longer runs: FG 4XL, same 4" connection. Both 120 V/1 ph, UL listed, galvanized housing.
