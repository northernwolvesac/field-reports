# Tutco E-Series electric duct heater (non-SSR) with Honeywell T6 Pro and a 1-stage AC air handler

Source: Tutco Electric Duct Heater Installation Manual 06-7121-00 Rev G, control sheet 06-6603-00 Rev E. Diagram: `Tutco-T6-wiring.png`.

## Which heater you have

- Look inside the control box. Tutco non-SSR heaters come two ways:
  - WITHOUT internal transformer (requires 24 VAC): thermostat supplies 24 VAC common to COM and switched 24 VAC to R1. Internal pilot relay drives the line-voltage contactors.
  - WITH internal transformer: a dry contact between COM and R1 turns the heater on; the internal transformer can power the thermostat.
- SSR heaters need a 0(2)-10 VDC or 4-20 mA signal and will NOT work with a 24 VAC thermostat.
- Field job 2026-09-17: heater had a pilot relay and no transformer (two thermostat terminals), so the direct wiring below applied.

## Wiring with one transformer (air handler) - heater without transformer

- Air handler to T6 as usual: R to R (Rc-Rh jumper in), C to C, G to G, Y to Y.
- T6 W to heater R1 (24 VAC hot on heat call). Air handler C to heater COM (can tap at air handler or T6).
- Do not land T6 R on the heater. Do not modify the heater's pressure switch, limits, relay or contactors.
- If the heater HAS its own transformer and the air handler also has one: use an isolation relay (RIB2401B / R8222). Coil on T6 W and C; dry N.O. contact between heater COM and R1. Never tie two Class 2 transformers together (Tutco note 10).

## T6 Pro programming

- Hold center Menu ~5 s, scroll to ISU, Select. ISU 120 = F. Sensor setting to match whatever is on S-S.
- ISU 200 system type = Conventional forced air. ISU 205 heating equipment type = **Electric forced air** (this makes G run with W so the heater's airflow switch proves).
- 1 heat stage (2 if the heater has R2 and the T6 has W2), 1 cool stage. Extended fan run after heat 60-90 s if offered. Cycle rates default (electric 9, cool 3). Compressor min off 5 min.
- Advanced menu TEST: fan, cool, heat. Heat test must start the fan first, then the heater relay and element current.

## Tutco installation requirements

- Heater at least 4 ft downstream of the air handler and filter, 2 ft from elbows, 4 ft from canvas connectors, 4 ft upstream of humidifiers.
- Airflow switch or fan interlock is mandatory. Minimum CFM/kW per the chart on IOM page 5; max 2000 FPM.
- 90 C copper wire, line voltage per nameplate, NEC Class 1 control unless noted.
