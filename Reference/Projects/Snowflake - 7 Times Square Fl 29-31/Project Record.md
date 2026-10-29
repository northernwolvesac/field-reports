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

## 1. CW pumps and BMS (Siemens) - status 10/26

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

**10/26 Siemens reply (Brendan, 4 weeks after our 9/28 email; follow-ups 10/5, 10/7, 10/26; 10/7 he said the
submittal was being redrawn):** "Without a lead lag panel as per the specs, we would
need to install a siemens panel on each floor ... approx. 50k per floor times 3 floors", offers a formal proposal.
Answered none of the 9/28 itemized points. Our position: contradicts their own proposal 10559656 - p.6 CW pumps "Lead
Lag panel provided by others", Exclusion 5 (furnishing lead/lag panels), Exclusion 6 (no base BMS pump control),
Alternate 3 prices a lead/lag DDC panel at $2,800 each ($8,400 for 3 vs $150k). Lead/lag is done by the Grundfos
built-in multipump function (approved pump submittal), so no panel. Do not ask for the formal proposal; reply asking
for point-by-point answers to 9/28 and ATC submittal R1. Note: base scope p.5 already says Siemens wires the pumps
to and installs a "manufacturer provided Lead / Lag panel" -> the Grundfos built-in controller is that manufacturer
lead/lag. Ruslan sent the reply 10/26 3:30 pm (edited; asked for a call Wed/Thu).

**10/27 Siemens pushback.** Brendan (cc Alan Parrish, Brian Greda, Rachael Werner): disagrees; the scope was based on a
manufacturer lead/lag panel; asks whether the "revised control arrangement" was reviewed and approved by the EOR and
the customer; wants the EOR drawings and approval before any engineering or pricing; repeats ~$50k/floor for a Siemens
panel; says discussing the items since September is not acceptance of added scope; offers a call. Alan Parrish:
"Pump panels should come as part of the mechanical package, the BMS does not run the sequence" (same issue on 7TS
15th floor, 2024).
**Our documents (checked 10/27):** no design change - the integrated controller IS the EOR design.
- M-401 pump schedule: CWP-29/30/31-1,2 Grundfos CRE3, VFD yes, "TWO PUMPS PRIMARY-STANDBY". No panel scheduled.
- M-101 spec 2.07.D (vertical in-line multistage pumps) item 5: "integrated variable frequency drive ... with a
  built-in pump system controller"; 15: remote on/off, fault relay, fieldbus RS485; 17: the PI controller is "a
  standard component of the integrated VFD motor ... supported by the pump manufacturer".
- M-102 seq. 3b: "provide for lead/lag sequencing ... one pump running and the other as stand-by", 150 h cycling.
  Says sequencing, not a panel.
- Pump submittal H-02.00: CMTA (Mike Sisti) 6/15/2026 "Make corrections as noted" (no resubmission); comments only on
  vibration isolation, valves/trim, flow/head, DP at the riser tie-in. Nothing on controls.
**Weak spot:** functions outside the pump controller still need a home - seq 3c local audio/visual alarm on flow loss,
3d leak -> stop that pump and start standby, 3f 1 h every 4 h exercise timer, flow proving before AC start. These are
in the ATC sequence on M-102 (controls scope), and Siemens already has a DXR per floor for leaks/valves. Alt 3 prices a
stand-alone lead/lag DDC panel "with software" at $2,800 - that is Siemens' own price for a panel running this logic.
**Next:** take the call with the documents above; ask Barry (Dolphin) to confirm what the built-in multipump covers
(3a/3b/3c/3d, auto restart) and whether Grundfos offers a duty/standby control box and its price; if needed, an RFI
to CMTA via STO confirming the integrated duty/standby meets seq 3b.
10/27 drafts in Gmail (not sent): reply to Brendan/Alan - original EOR contract drawings (pricing set 04/03, M-401
Add. 1 04/22, before the 06/02 proposal), no revisions; Ruslan OK to accept Alt 3 at $2,800/panel ($8,400) if Siemens
needs a panel for the seq 3 functions; call Wed 10/28 or Thu 10/29. Attach `Siemens pump controls/Snowflake CW pumps -
EOR contract documents.pdf` (M-101, M-102, M-401 highlighted + H-02.00 stamp; `build_eor_extract.py`) by hand.
**June record (strongest point):** 06/26 Kastriot sent Siemens the pump cuts (Brendan's cut sheet request); 06/29 Ruslan
emailed Brendan + Brian the approved H-02.00 and the Grundfos IOM and proposed the built-in multipump (IOM 7.49, GENIbus)
instead of a lead/lag panel (`source/2026-06-29 NW to Siemens - multipump instead of lead-lag panel.pdf`); 07/09 Ruslan
forwarded it again asking to confirm; no Siemens objection in the "Snowflake- job review" thread; ATC R0 came 07/22
still drawn with a panel and separate VFDs. Added to the Siemens reply draft (replaced 10/27).
Manuals checked 10/27 (see `Reference/Engineering Notes/Grundfos CRE duty-standby without a panel.md`): pumps have
FM 300; standby takes over on an alarm incl. External fault; auto restart on power return; time alternation is daily at
a set time, not 150 h (minor deviation from seq 3b); no 1-in-4 h exercise timer in the pump (met if CRACs run 24/7);
DI "Flow switch" function is low-flow stop, not changeover - use External fault; Low-flow stop Not active. Only open
item for Grundfos: relay 2 -> DI reliability (interposing relay if needed). Barry draft replaced 10/27: only start-up
scope (multipump, DP sensors, I/O settings, price, notice) and a Grundfos duty/standby panel option/price; told him no
factory questions. Barry 9/28: standard start-up/programming, contractor runs interconnecting wiring, one pressure
sensor per motor; earlier same day "advanced programming or pump setup will be by others" - clarify.
Barry draft replaced again 10/27: panel question now explains why (Siemens says a panel is needed for the parts of seq 3
the pump controller does not cover; comparison only, pumps unchanged) and lists functions a-f (start from AC contact +
auto restart, duty/standby 150 h, loss-of-flow changeover + local A/V alarm, leak stop + changeover + alarm, 1 h in 4 h
exercise, dry contacts to BMS/autodialer), plus model, price per panel x3, lead time, power and enclosure.
**10/28 Alan Parrish:** agrees to a call; "there is no panel, but something in the VFDs provides the rotation ... So there
is still no BMS interaction for the rotation, correct?" Reply drafted 10/28 (not sent): correct - built-in multipump over
GENIbus does rotation and standby; BMS scope stays as in their proposal (CRAC run contact to both pump starts, pump
status/alarm to DXR + autodialer, flow switches and leak detectors to DXR plus a contact to that pump's fault input,
V-1/V-2 and CRAC valves per 3d / 4g-4j, one DP transmitter per pump to AI1, local A/V alarm); call Thu 10/29 or Fri 10/30.
Tekmar option not mentioned to Siemens yet.
**10/29 call with Alan, then Alan email 11:07:** no alarm point in documents/proposal; "sequence ... shows this is 100%
standalone with no connection to the BMS at all"; asks if the VFD vendor confirmed the drives act as the lead/lag panel.
Reply drafted (not sent): alarms are in their p.5 scope (flow switches, leak detectors "to alarm at BB BMS and Tenant
AutoDialer", start/stop and status, AC interlock; Exclusion 6 "except Leak Detection"), seq 3c/3d local A/V + leak to
landlord BMS (on their 300C), their 300A already wires flow and leak alarms to DXRs; vendor: Dolphin 9/28 guide +
"standard startup/programming can be used". To do: forward Barry's 9/28 email (msg with duty/standby guide) to Alan;
send the Barry start-up scope draft so Dolphin confirms in writing that start-up sets up the multipump.
**Siemens ATC R0 (7/22) sheets 300-300C, checked 10/27:** one "CWP-xx-1&2 LEAD LAG PANEL" box per floor, by others,
not in the 300C BOM, no model, no power source shown. Siemens lands only: system enable (RE-x-1 from CRAC unit status),
VFD-1/2 run and speed from separate "VFD panels" (note 2 "VFD mounted in ceiling near pump set" - do not exist, VFD is
integral), DPTE-1, CS-1/CS-2 status. Terminal numbers on the panel box (2/6, 4/6, 12/18, 10/20) are the Grundfos CRE
motor terminals. Flow switches (RE-2..5, flow alarms to DXR), leak detectors (to DXR / AD) and pump valves (RE-1) are
already on the Siemens DXR side, not in the panel. So in their own submittal the panel does only lead/lag + DP speed
control = what the multipump function does. Local A/V alarm (3c/3d) and 1-in-4 h timer (3f) are copied into the 300C
sequence but not shown anywhere. 300B labels fl. 31 panels as CWP-29.
**Start-up plan (10/27):** `CW pump start-up plan.md` - run each floor for the CRAC start-up independent of the Siemens
dispute. Blockers: NC spring-return valves (V-1/V-2, CRAC isolation) need power or manual open; CRAC enable contact must
be fan/enable not compressor (flow switch 4k vs pumps start on unit 3a); HD-053 bypass position; no DP sensor -> constant
curve. Ruslan sent the Siemens reply 10/27; waiting for their answer.
**Off-the-shelf panel option (web research 10/27, from search listings; full data sheets not read - watts.com and
lit.stromquist.com blocked here):**
- Tekmar 132 Pump Sequencer (standby / 2-stage), 120 V: demand input, flow proof input, pump 1 / pump 2 contacts, alert
  contact; standby mode: no flow proof within 10-30 s (DIP) -> lead off, standby on, alert; equal run-time rotation
  (settings list shows 48/96/144/168 h) and exercising. About $780-1,100 each. Best fit.
- Heat-Timer PLL / PLL Elite (Stromquist), 120 V, 12 W: lead rotation, proof-of-flow per pump (1-call/2-flow mode),
  failed pump locked out until reset, alarm. Base PLL about $730 (list $1,088).
- iO-LL (iO HVAC Controls), 24 VAC, about $125: run-time alternation only; failover not confirmed. Too basic.
Wiring idea with Tekmar 132: pumps stand-alone (no GENIbus multipump), each on its own DP sensor; pump contact -> that
pump's DI1/GND; leak detector NC contact in series with that pump's contact (leak -> pump stops -> no flow -> standby +
alert); two flow switches paralleled into flow proof; alert -> horn/strobe + autodialer. CRAC enable -> demand. Needs
120 V circuit, enclosure, horn/strobe. Strategy: if NW furnishes this, it is the "lead/lag panel provided by others"
Siemens base scope p.5 already installs, powers and wires.
**Tekmar 132 checked against D 132 / C 132 (10/27, in `source/`):** 120 V 6 VA; NEMA 1 PVC base 6-5/8 x 7-9/16 x 2-13/16 in,
indoor, mounts on its own (no extra enclosure). Pump Demand (1-2) and Flow Proof (5-6) are POWERED inputs (20-260 VAC
applied), not dry contacts. Pump 1/2 (7-8, 9-10) and Alert A/B (13-14, 15-16) are isolated contacts rated 24-240 VAC.
Stand-by mode: no flow proof within 10/30 s -> lead off, standby on, alert; standby also off if no flow -> both failed,
Alert B, stays until Clear Alert pressed. One common flow proof input. Flow proof present 4 min with both pumps off ->
error and the control STOPS. Rotation dial 12-168 h (150 h settable). Exercising = 10 s if a pump idle 3 days (not seq 3f).
Alert Levels mode: A = one pump failed / non-critical, B = both pumps / flow proof device failed.
Already in Siemens R0 (300/300C): RIBU1C relays RE-1..RE-5 per floor (15 total; shown under "LEAD LAG PUMP
CONTROLLER" on 300 = mounted at the by-others panel): RE-1 pump valves, RE-2/3 and RE-4/5 driven by FS-1/FS-2; 24 VAC
taken from the nearest FPB DXR for leak detectors and relays; 4 LT410 leak detectors, 1 DPTE, 2 CS per floor. NOT in R0:
pump start relays, horn/strobe (seq 3c/3d), panel/enclosure, 120 V circuit, flow switches (shown FBO though proposal
says furnish and wire). Wiring adjustments needed: (1) interposing relays (low-level contact) between Tekmar pump contacts and Grundfos DI1
(DC signal input); (2) 24 VAC transformer to power Demand and Flow Proof through the CRAC enable contact and flow
switches; (3) flow proof per pump = flow switch in series with that pump's relay 2 "Pump running" (PELV, 24 VAC OK),
both branches paralleled -> prevents false flow proof when building CW pressure pushes water through with pumps off
(valves open 4 h/day per seq 4h) which would trip the 4-minute flow proof error; (4) leak detector NC in series with
that pump's interposing relay coil; (5) Alert A+B -> horn/strobe (24 VAC) and Siemens autodialer input. Grundfos
multipump not used; each pump stand-alone on its own DP sensor. Materials per floor ~ $1,100-1,400.
**Panel power:** any added panel needs 120 V control power. M-102 ATC spec: "All control power, wiring and transformers
for dampers, actuators, VAV boxes, control panels, etc. to be provided by the controls contractor from a source
designated by the electrical contractor. Circuits for control devices have been designated in the electrical panel
schedules." Siemens base scope p.5: "Install and power manufacturer provided Lead / Lag panel" (power is theirs);
general note 8 excludes power to 3rd party equipment unless noted. Need from STO/EC: a spare 120 V circuit near each
pump pair (check E panel schedules; same power source as the pumps if they are on emergency/UPS).


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
Rev 3 09/30: PDF condensed to 6 pages (per floor: before/after/color overlay page + scope and cost page with
overlay key plan), amounts unchanged.
Rev 4 10/01 per Ruslan markups: 29th $29,600, 30th $20,150, 31st $17,030 = $66,780.
Rev 5 10/01: area 29-2 excluded - per Bulletin 3 the 56x16 main stays as installed (matches Structure Tone's field
report). Revised total $53,555 (29th $16,375, 30th $20,150, 31st $17,030). Ready to send to Samuel.

## 4. New CO - perimeter linear diffusers (SD R2 revision) - status 10/05

Folder `Reference/Change Orders/2026-10 Snowflake Perimeter Linear Diffusers/`. Shop drawings M-529/530/531 SD R2
bubble 49 perimeter linear diffusers in plenum boxes 48x4x26 lined, 12x10 branches with VD/CO off the perimeter mains:
29th 23 (6,400 CFM), 30th 12 (3,300 CFM), 31st 14 (3,800 CFM). Quantity breakdown per floor issued to Ruslan
(no pricing). 10/05 Ruslan: we F&I the LDs and plenum boxes (price them), VD/CO on every branch, no CO number yet.
Bulletin 3 vs SD R2 screenshots sent; Ruslan confirmed: the 36 G ceiling diffusers are deleted with NO credit (all
delivered, factory will not take them back); all mains stay, price only the add starting at the new taps.
10/06 priced per Ruslan ($90/LF LD, 5.5 MH/LD, foreman 30/15/15 hr, TAB, shop dwgs): 29th $37,917.50, 30th $19,545,
31st $22,090, total $79,552.50 (`build_co.py`). No note on the G credit. CO number to be assigned.

## 5. Spec notes
- Pipe trim insulation (M-101, spec 2.04, checked 10/09): D - where piping is insulated, insulate all connections,
  vents, drains, flanges, fittings, valves, tanks, pump casings etc.; E - anything needing service or inspection
  (strainers, valves, devices) gets removable / reusable insulation; H.4 - fittings, flanges and valves with
  pre-molded / pre-cut fitting covers. Insulate only after leak and pressure tests (F). CW piping 1-1/2" glass fiber
  with factory vapor barrier jacket (H.2); condensate and make-up 1"; HW 1-1/2" / 2". M-401 table per 2020 NYCECC.

## 6. New CO - restroom air outlets (clouded sheets 10/14/2026) - status 10/19

Folder `Reference/Change Orders/2026-10 Snowflake Bathroom Air Outlets/`. All six restrooms: 2 continuous linear
supply diffusers C (Titus FL-15-HT) approx. 17 LF each, 4 LF active, approx. 45 LF new 12x8, 2 connections to existing,
2 cable operated VD; 30th also a 24x8 FSD at Food Prep 30.12B. Quantity breakdown issued to Ruslan, no pricing.
10/19: price per drawing (~17 LF each), same pricing basis as the perimeter CO. Siemens covers pneumatic tubing
for 5 FSDs only - the new 30th floor FSD needs a Siemens add; access doors excluded by Siemens. Field check sent to
Christino 10/19 (installed work, ceilings, entry 12x8 stub, vanity wet wall connection - likely toilet exhaust riser).
- Air purification BAS-30-1,2 (Bioclimatic MC 880, Food Prep / Serving 30th; checked 10/23): NOT in Siemens scope -
  proposal 10559656 exclusion 9 "Air Purification System", not in the p.4 equipment count. Spec M-102 (F, ceiling
  odor control unit) asks for "0-10 VDC BMS fan speed control" and dirty filter DP switches, but schedule note 12 says
  unit installation and all wiring by others, note 13 media field installed by others, note 14 isolators / hardware by
  others. Our ATC submittal extract (13 of 145 pages) has nothing on it; the full R0 was not checked.

## 7. BC0006 - STO back charge for labor / supervision overtime (Clearstory, created 10/23, due 10/29)

48 hrs labor OT + 40 hrs supervision, no backup. Folder `BC0006 Backcharge/`: position memo, draft response (not
sent), subcontract text, and email logs for every STO / NW Snowflake thread from project start to 10/23 (4 periods,
verbatim quotes). Key: Mark Vetterlein 8/11 written "formal notice" that STO tracks its laborers' premium time;
STO's own 7/28 request for Sat 8/1 premium crews (3 trades) was for "noise complaints"; subcontract 1.7 / 1.16 cover
NW's own overtime and STO labor completing NW Work - not STO supervision. Schedule 5.24.26 not yet pulled.
Subcontract #11010174015: $2,350,000, STO 6/11 / NW 6/15; LOI 5/29; no schedule exhibit; scope includes "overtime
brazing".
10/23 Ruslan: reject BC0006 in full. COP-SF-04 / CR00023 ($9,816, STO-requested Sat 8/1 premium) was voided by STO
with no reason. STO schedule 5/24/26 saved to `source/` (shop approval by 6/29, duct 6/30-7/20, test 7/21-23; back end
unchanged: start-ups 10/19, balancing 11/9, substantial completion 12/18). Corrections from Ruslan: lead fitter was not
banned (engineer confirmed), Andrei on site weekly / biweekly, duct test passed first time under the engineer's revised
requirement, Oct insulation items are punch list, BC002/BC003 accepted and closed; Sept pipe riser reroute (EOR wrong
risers) CO still unapproved.
10/26: BC0006 in Clearstory shows $0.00, no backup. Ruslan: wait for STO to issue the updated BC, then respond with the
draft. Suggested a one-line Clearstory comment before 10/29 (not accepted, will respond to the substantiated BC);
do not click No Cost Impact or Create COR.

**10/28: BC0006 DELETED in Clearstory by Mark Vetterlein** (notice 10/28 7:34 am, no message). Closed unless re-issued;
the response draft stays in the folder.

## 8. Change order approvals and billing (status 10/29, Clearstory screenshot from Ruslan)

| COR | Title | Ref | Submitted | Amount | Clearstory | Note |
|---|---|---|---|---|---|---|
| 3.1 | Bulletin #3 | PC0032 | 08/17 | $53,555.00 | In Review | Done Sep/Oct, unbilled. Sam: held up by other sub pricing, "will be approved" |
| 4 | Relocate existing HW pipes | PC0036 | 08/31 | $4,512.00 | Approved | |
| 5 | Existing HW riser modifications | PC0040 | 09/08 | $8,368.00 | In Review / **Revise and Resubmit** | Done, unbilled. Sam: waiting on client. Find out what STO wants revised |
| 7 | Mechanical riser piping re-route | PC0046 | 09/14 | $51,219.00 | In Review | Done, unbilled. Sam: waiting on client |
| 8 | COP-SF-10 BC damaged riser 31st | BC0003 | 09/28 | $2,984.00 | In Review | Approved docs received (Ruslan 10/29); Sam's "COR#9 backcharge to other subs" was this one |
| 9 | Linear diffusers in lieu of air outlets | CR0054 | 10/08 | $79,027.00 | In Review | Our breakdown total $79,552.50 - $525.50 difference, check |
| 10 | Modify air outlets, core bathrooms, 3 floors | PC0062 | 10/21 | $46,605.50 | In Review | Mark email approval 10/28 |
| 12 | Additional FSD room 3014, SKE-2 | PC0063 | 10/22 | $11,890.00 | In Review | Mark email approval 10/28 ("make sure FSDs are ordered") |

Written approvals for 3.1 / 5 / 7 (PDFs in `source/`, 10/29 from Ruslan):
- 3.1 Bulletin 3: Mark 8/27 "Bulletin 3 is approved. You're not proceeding?"; 8/28 "Christino you are approved - what more
  do you need than this email?"; Mark 8/28 to Ruslan: "we released you all. There is a revision on the painting and
  drywall end we are waiting on for formal signature"; Ruslan 8/28 "We will accept your email as approval and proceed."
- 5 / 7 HW piping: Jimmy McMullin 9/3 "Please proceed with the change order work for both the corrective piping work on
  29 and 31 ... The chief engineer approved your shop drawings today and BXP agreed to price and proceed"; Mark 9/9 "All
  of the hot water piping relocates scope across the 3 change orders is approved. We just need accurate pricing with
  back up attached to all of them to submit for signature" (3 COs = COR 4 approved, 5, 7).
- COR 5 "Revise and Resubmit": backup already given, no revision needed (Ruslan 10/29). COR 9 $79,027 vs our $79,552.50:
  will be revised (Ruslan 10/29).
Completed and unbilled (3.1 + 5 + 7): $113,142.00. Email-approved, proceeding (10 + 12): $58,495.50.
10/29: **Leonid takes the lead** (Ruslan). Sent Leonid the formal "Claim" email to send to Mark + Sam (cc Jimmy
McMullin, Marc DeLuca, Christino, Andrei, Fatima, Ruslan): cites the 8/27-28, 9/3, 9/9 and 10/28 approvals, $113,142
completed and unbilled, second billing cycle without payment, asks to expedite signed STO COs, expects all approved COs
in the November requisition. Forwarded him the 5 approval emails as attachments. Ruslan's own claim draft deleted.
Weekly follow-up by Leonid until signed COs are issued.
Mark 10/28: PC0043 (return air slot at service point) and PC0048 (relocate devices per RFI #47) will be voided unless
explained - Christino: nothing for NW.

**Contract rules (Subcontract 11010174015):**
- 1.17: Changes adjust the price only "by written order prepared by Structure Tone"; pending final determination NW
  must proceed "when so directed by Structure Tone". -> Mark's email = direction to proceed (keep it), not a CO.
- Billing instructions: "Approved Change Orders" = only work "issued a signed Structure Tone, LLC Change Order". Work in
  place not on the approved SOV: do not put it on the requisition; send a separate email with "Claim" in the subject +
  job number, all backup and the authorization to proceed; follow up with PM / estimator.
- 1.10 / 1.11: payment subject to receipt of payment from Owner (pay-when-paid, condition precedent). "Waiting on
  client" means STO will not issue the SCO until the owner approves.
- COR#9: the back charge to other subs is STO's recovery; it is not a condition of NW's change order.

