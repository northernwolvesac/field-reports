# Grundfos CRE duty/standby pair without an external panel

Established on Snowflake, 7 Times Square fl. 29-31 (CWP-29/30/31-1,2, CRE 3-2, 0.5 hp, 208/1, 10 gpm at 35 ft), 10/2026.
Sources: Grundfos IOM 98358864 (09/2025), Dolphin CRE duty/standby quick setup guide, Fig. 8 terminal diagram, pump
submittal H-02.00. All in `Reference/Projects/Snowflake - 7 Times Square Fl 29-31/source/`.

## What the pump does by itself (IOM 7.44, Dolphin guide)

- Multipump "Alternating operation": two identical pumps in parallel, linked by wired GENIbus (A-A, Y-Y, B-B, 16 ga
  twisted shielded, screen to frame). "Enables the control of two pumps connected in parallel without the use of
  external controllers." Standby starts if the duty pump stops on an alarm. Each pump needs a check valve.
- Alternation: "energy" (Grundfos recommends; changeover after about one day of energy difference) or "time"
  (you set the time of day for changeover, i.e. daily, not a run-hour interval like 150 h). The older IOM page in the
  Dolphin guide says "time" needs FM 300; the current IOM 98358864 (09/2025) p.63 says FM310 or FM311 - so on FM 300
  plan on "energy". "Backup
  operation" runs the backup pump briefly each day.
- Either pump can be master only if each has its own pressure / DP sensor -> one sensor per pump (Barry 9/28).
- Restart: the motor restarts by itself when voltage returns (IOM 5.1, over/undervoltage protection).

## Module

The submittal lists AI3, an analog output, DI4/OC2, two Pt100 inputs and LiqTec. Per IOM 7.8 / 7.11 / 7.13, AI3, AO and
DI/O 4 exist only on FM 300 (advanced) -> the pumps have FM 300.

## Terminals and settings used

| Terminal | Setting | Connected to |
|---|---|---|
| DI1 2-6 (remove jumper) | External stop (factory) | CRAC run contact, both pumps paralleled 2-2 / 6-6 |
| DI2 1-9 | External fault | Own flow switch no-flow contact in series with own relay 2 (Pump running) |
| DI3/OC1 10-6 | External fault | Own drip pan leak detector |
| AI1 4, +24 V 8 | Feedback sensor 4-20 mA | Own DP transmitter, 3/4 of longest run |
| Relay 1 C1 | Alarm | Local horn/strobe, autodialer (relay 1 takes up to 250 VAC) |
| Relay 2 C2 | Pump running | DI2 loss-of-flow circuit (PELV only) |
| A / Y / B | GENIbus | Other pump of the pair |

- External fault: input closed more than 5 s -> pump stops with a fault -> standby starts.
- Do NOT use the DI "Flow switch" function: that is the low-flow stop for pressure boosting (needs a diaphragm tank),
  not a changeover. Set Low-flow stop function to Not active on a closed condenser water loop.
- The flow switch contact goes in series with the pump's own "Pump running" relay so the idle pump (no flow) is not
  faulted. Relay 2 minimum load is 5 VDC / 10 mA; if the DI current is too low to keep the contact clean, add an
  interposing relay. Not yet confirmed by Grundfos.

## What the pump does not do (needs the BMS or a contact)

- Local audio/visual alarm: needs a horn/strobe on relay 1.
- Spec "1 hour every 4 hours" exercise timer: no such function in the pump. Met if the AC units run 24/7; otherwise a
  timer contact in parallel with the CRAC run contact on DI1.
- Flow proving before the AC unit starts: flow switch interlock to the unit (BMS / unit wiring).
- Leak valve closing: BMS relays to the isolation valves.
