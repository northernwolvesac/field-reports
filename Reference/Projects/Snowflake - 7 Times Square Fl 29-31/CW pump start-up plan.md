# CW pumps CWP-29/30/31-1,2 - start-up plan for CRAC start-up

Goal: get each floor's pump pair running reliably for the CRAC unit start-up (units on site mid-November), without
waiting for the Siemens pump-control dispute. Final controls (multipump, Siemens interlocks, alarms) follow.

Pumps: Grundfos CRE 3-2, 0.5 hp, 208/1, 2.4 A, integral VFD, FM 300; design 10 gpm at 35 ft (81 % speed / 2845 rpm).
Sources: M-102 seq. 3 and 4, M-401, M-903 pump trim detail, H-02.00, IOM 98358864, Dolphin duty/standby guide,
Siemens ATC R0 sheets 100-100B / 300-300C. Settings: `Reference/Engineering Notes/Grundfos CRE duty-standby without a panel.md`.

## Four things that can stop the start-up (sort out first)

1. **Normally closed spring-return valves.** Seq. 4g: CRAC CWS/CWR isolation valves are NC motorized. Siemens 300 shows
   pump valves V-1/V-2 as "2 POS NC-SR". Unpowered = closed = no flow, pump dead-heads. Siemens must power and command
   them open for the start-up, or the actuators are manually opened (manual override) for the test and the valves are
   left under Siemens control after.
2. **CRAC / pump start loop.** Seq. 4k: the CRAC flow switch only lets the unit run once flow is proven. Seq. 3a: the
   pumps start when the unit is activated. If the "unit running" contact (RE-x-1) is a compressor contact, nothing
   starts. It must be the unit **enable / fan run** contact (the unit fan runs continuously per 4e), so: unit enabled
   -> pumps start -> flow switch makes -> compressor allowed. Confirm with the CRAC start-up tech and Siemens.
3. **Bypass valve HD-053 (M-903).** Motorized two-position, no sequence, Siemens RFI open. If it is open while the pumps
   run, water short-circuits CWS to CWR and the CRAC gets less flow; if open while pumps are off, base building CWS
   flows to CWR. For the start-up: confirm the position and keep it **closed** unless the engineer says otherwise.
4. **DP sensor.** The pump controls on the DP transmitter (one per pump). If the transmitters are not installed and wired
   to AI1 by start-up, run the pump in **constant curve** mode set to the design point instead of constant DP.

## Pre-start checklist (per floor)

Piping / water (NW)
- [ ] Piping pressure tested, flushed, strainers cleaned after flush.
- [ ] Building engineer sign-off to open the base building CWS/CWR tie-in valves (water treatment, timing).
- [ ] System filled and vented: high points, CRAC coil, pump vent plugs. **Never run the pumps dry** (shaft seal).
- [ ] Check valve on each pump discharge, correct direction (needed for multipump, IOM 7.44).
- [ ] Pump isolation / balancing valves and CRAC manual valves open; Griswold flow control valve installed per M-903.
- [ ] Drip pans and leak detectors in place; nothing standing in the pans.
- [ ] Pressure gauges / test ports across the pumps (M-903) for the flow check.

Electrical (EC, via STO)
- [ ] Each pump fed 208/1 from its own circuit with local disconnect, landed and labeled. Check voltage at the motor.
- [ ] 24 V / 120 V for the Siemens valve actuators and relays live (or valves manually opened, see item 1).
- [ ] CRAC unit power on; CRAC start-up tech scheduled.

Controls - minimum for start-up (Siemens / NW)
- [ ] Valves V-1/V-2 and CRAC isolation valves open (powered or manual).
- [ ] CRAC flow switch wired to the unit (flow proof).
- [ ] Pump start: either the final CRAC enable contact on DI1 (both pumps, jumper 2-6 removed), or for the first run the
      factory jumper 2-6 left in and the pump started from its own control panel (local).

## Start-up sequence (Dolphin tech with NW, CRAC tech on site or the same day)

1. Walk-down with the checklist above. Bump nothing until the loop is full and vented.
2. Pump 1: set pump number 1, units, check display. Prime / vent per IOM.
3. Control mode:
   - DP transmitter installed: Assisted pump setup -> constant differential pressure, sensor on AI1 4-20 mA, range per
     the installed transmitter, setpoint to give design flow (start around the design head at the sensor point, then
     trim).
   - No transmitter yet: constant curve at the speed for 10 gpm / 35 ft (about 81 %), trim with the gauges.
4. Start pump 1 locally. Check: no alarms, amps (rated 2.4 A), discharge/suction gauges vs the pump curve (35 ft at
   10 gpm), no noise or cavitation, no leaks at the trim.
5. Enable the CRAC unit (fan). Confirm the CRAC flow switch makes, then the CRAC tech starts the compressor. Watch head
   pressure; the unit's water regulating valve modulates (seq. 4f), so the pump must hold pressure at low flow.
6. Stop pump 1, repeat 2-5 with pump 2 alone. Both pumps must carry the unit on their own.
7. Low-flow stop function: **Not active** (closed loop, no diaphragm tank). Do not set any DI to "Flow switch".
8. Leave the floor running on one pump (local start or CRAC contact) until the final setup below.

## Final setup (when Siemens wiring is in; can be the same visit if ready)

1. GENIbus A-Y-B between the two pumps (16 ga twisted shielded, screen to frame). Remove jumper 2-6 on both pumps; CRAC
   enable contact across DI1/GND, both pumps paralleled 2-2 / 6-6.
2. Each pump on its own DP transmitter (AI1). Set the same mode and setpoint on both.
3. Assist -> Setup of multi-pump system, wired GENIbus, Alternating operation (energy recommended; time = daily at a set
   hour). Press start on pump 1, then pump 2: pump 1 runs, pump 2 standby.
4. DI2 External fault = flow switch no-flow contact in series with own relay 2 (Pump running); DI3 External fault =
   own drip pan leak detector. Relay 1 Alarm -> local horn/strobe and autodialer; relay 2 Pump running.
5. Tests: open DI1 -> both stop; close -> duty starts. Trip the duty pump (stop it / simulate external fault) -> standby
   starts within seconds and alarm relay closes. Wet the duty pump leak detector -> that pump stops, standby starts,
   Siemens closes only that pump's valve (seq. 3d). Cut power to both pumps and restore -> they restart by themselves.
6. Record settings on each pump (photo of the settings screens) for the O&M.

## Who does what

| Item | Who |
|---|---|
| Fill, flush, vent, gauges, valves open, leak test | NW |
| Pump power and disconnects | EC (through STO) |
| Valve actuators, relays, CRAC enable contact, flow switches, leak detectors to DXR | Siemens |
| Pump programming, multipump, sensor setup | Dolphin start-up (scope being confirmed with Barry) |
| CRAC start-up and flow switch check | CRAC manufacturer start-up |
| Base building tie-in valves | Building engineer |

## Open items before scheduling
- Siemens: valve power and the CRAC enable contact type (fan/enable, not compressor); DP transmitters installed.
- HD-053 bypass position (RFI).
- Dolphin: start-up scope and notice (draft email 10/27).
- CRAC delivery date and start-up date per floor.
