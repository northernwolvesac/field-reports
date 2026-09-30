# Snowflake Fitout - 7 Times Square, Floors 29-31

Project 11010174. GC: Structure Tone. MEP engineer drawings M-001 to M-903 (MKDA architect, 902 Broadway).
Floors 29/30/31 each have a CRAC (CRAC-29-1 / 30-1 / 31-1) with a water-cooled condensing unit on building
condenser water, served by a duty/standby pump pair CWP-xx-1,2 (Grundfos CRE 3-2, integrated VFD, 10 GPM @ 35 ft).

## People

| Who | Company | Role |
|---|---|---|
| Samuel Parelhoff | Structure Tone | Estimator (COs) |
| Brendan Jackson (brendan.jackson@siemens.com) | Siemens | BMS / ATC contractor |
| Barry Brar (barry@dolphinequipment.com) | Dolphin Equipment | Grundfos rep, pump supplier, start-up |
| Alecia | Bunker HVAC | Sheet metal sub (PO NWAC1276-SF-BHVAC) |
| Leonid Leonidov, Alikhan Ilyas | Northern Wolves | CO author / estimator |
| Christino, Andrei, Fatima | Northern Wolves | cc on Siemens / Dolphin emails |

## Files in `source/`

- `Mech drawings M-001 to M-903.pdf`: sequence of operation and ATC spec on M-102 (seq. 3 CW pumps,
  seq. 4 AC units, 2.09 ATC); pumps schedule M-401; pump plan M-629; detail HD-053 on M-903.
- `Siemens proposal 10559656.pdf`: 06/02, $634,000. CW pumps on p.5. Alternate 3 = lead/lag panel $2,800 each.
  Exclusion 5 panel furnish, 6 base BMS monitoring, 15 FA shutdown, 16 CRAC thermostat, 18 installing pipe-mounted devices (ours).
- `Siemens ATC submittal R0 ...pdf`: extract of submittal #22 R0 (07/22/2026, 145 pages). Extract pages 1-6 =
  submittal pages 17-22 (valve schedule), 7-9 = pages 29-31 (Siemens dwgs 100/100A/100B, CRAC), 10-13 = pages
  32-35 (dwgs 300/300A/300B/300C, CW pumps). Drawing pages are scans (no text layer).
- `Pump submittal H-02.00 Grundfos CRE.pdf`: approved pump submittal; page 10 = Fig. 8 terminal diagram,
  "Pressure sensor: N" (no DP sensor with pumps).
- `Grundfos IOM 98358864.pdf`: section 7.49 multipump, 7.20 low-flow stop, 5.5.1 terminals.
- `Grundfos CRE duty-standby guide (from Dolphin).pdf`, `Grundfos CRE terminal diagram (from Dolphin).pdf`: Barry's replies.
- `PO NWAC1276-SF-BHVAC (Bunker).pdf`, `Bunker HVAC CO 1.00.pdf`: sheet metal sub.

## 1. CW pumps and BMS (Siemens) - status 09/28

**Decision:** decline Siemens Alternate 3 (lead/lag panels, $8,400). Each pump pair runs duty/standby with the
Grundfos built-in multipump function ("Alternating operation, energy", Grundfos recommends; "time" not
recommended - note as deviation from spec 150 h alternation). Confirmed in writing by the Dolphin duty/standby guide:
"enables the control of two pumps connected in parallel without the use of external controllers".

**Pump terminals (CRE MGE motor):** DI1 = 2 / GND 6 (Ext stop, factory jumper 2-6); DI2 1/9; DI3/OC1 10/6;
DI4/OC2 11/18; AI1 = 4 (292 ohm); +24 V = 8 or 15 (60 mA); relay 1 C1 (Alarm); relay 2 C2; GENIbus A/Y/B.

**Siemens scope per pump pair (email to Brendan, final draft 09/28):**
- Start/stop: CRAC run status contact (RE-1-1 / RE-6-1 / RE-11-1) across DI1 (2) and GND (6), both pumps
  paralleled 2-2 / 6-6, one contact is enough per the Grundfos guide. Remove factory jumper.
- GENIbus A-A, Y-Y, B-B between pumps, 16 AWG twisted shielded, shield to frame.
- DP transmitters: Grundfos requires one per pump -> two per floor (Siemens proposal has one per floor, Setra
  2301025PD5V11B, 0-25 psid, 5-valve manifold). Each 2-wire 4-20 mA from +24 V (8) to AI1 (4). Both at 3/4 of
  longest run. Mechanical contractor (us) installs transmitters and taps.
  **Do not raise the added cost of the 3 extra transmitters - wait for Siemens to bring it up (Ruslan 09/28).**
- Pump alarm: relay 1 to tenant autodialer. Delete lead/lag panel and VFD run/speed wiring on 300/300A/300B.
- Pump setup / multipump programming by Dolphin at start-up.

**Other comments in the Siemens email:** flow switches FS-1/2 shown FBO but proposal says furnish and wire;
pump valves V-1/V-2 missing from valve schedule; both pump valves on one relay RE-1 (leak under either pump
shuts the set; seq. 3d wants only the affected pump stopped); seq. 3c/3d/3f local audio/visual alarm and
1-hour-in-4 exercise timer not shown; 300B typos (CWP-29 labels on fl.31, LD-8 twice, DPTE-1); CRAC valves
(100A) open all the time vs seq. 4h open with unit / 4 h daily flush; seq. 4i/4j 5-minute delay missing,
condensate overflow not a separate alarm; sheet 100 relay table all WCCU-29-1.
Attachments to send: Grundfos duty-standby guide + pump submittal page 10 (Fig. 8).

**Still open with Barry (Dolphin):** does standby start when duty pump stops on External fault (DI2/DI3 from
flow switch / leak detector) and how to wire so the idle pump's own flow switch does not lock it out; CRE 3-2
minimum flow and Low-flow stop setting with all CRAC valves closed, is a minimum-flow bypass needed; auto restart
after power loss; DP sensor range (0-15 vs 0-25 psi).

**Waiting on:** Barry's answers; Siemens R1 of the ATC submittal (Ruslan sends the Siemens email).

## 2. Pump bypass valve, detail HD-053 (M-903)

Not in spec or sequence. Symbol (small square) = electric actuator per M-001 legend -> motorized two-position,
not manual, not modulating. ATC spec 2.09.A.1 / A.7 / K.1 put automatic valves with actuators in ATC scope, but no
sequence exists. M-629 shows a third branch at CWP-29-1,2 with two ball valves only, not matching HD-053.
A manual always-open valve would short-circuit base building CWS to CWR when pumps are off.
Siemens is sending an RFI to the engineer (size, fail position, sequence, balancing valve, M-629 mismatch).

## 3. COP-SF-05 Bulletin 3 revision - $66,780

Folder `Reference/Change Orders/2026-09 Snowflake COP-SF-05 Bulletin 3/` (record, build script, PDF, xlsx).
Detailed before/after breakdown by floor and area, rev 2 09/30 after two rounds of Ruslan's markups:
29th $29,600, 30th $18,100, 31st $19,080. Area 29-2 (56x16 -> 42x12, $11,025) is the run Structure Tone says was
not taken down - still in the breakdown; Bunker asked (09/29) for a revised CO for work not performed.
Ruslan / Alikhan promised Samuel the breakdown by afternoon 09/30.
Rev 3 09/30: PDF condensed to 6 pages (per floor: before/after crops page + scope and cost page), amounts unchanged.
