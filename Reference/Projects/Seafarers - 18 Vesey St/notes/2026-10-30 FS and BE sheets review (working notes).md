# Seafarers 18 Vesey - Fuel Storage (FS, S4) and Boiler (BE, S5) drawing review

Sources: `Seafarers IFB 2026-01-08 - Fuel Storage T001 FS sheets.pdf` (7 pp) and `... - Boiler BE sheets.pdf` (8 pp). All sheets are dated 01/06/2026, rev "01/08/26 BID SET". I rendered every sheet at 60 dpi and then cropped the notes, schedules, details and callouts at 170-400 dpi. The renders are in `/tmp/claude-0/-home-user-field-reports/97728685-7977-5c3e-b5db-ec3e93af2532/scratchpad/fsbe/`. All quotes below are verbatim and keep the drawings' own spelling.

---

## 1. Leak detection cable / probe / sensor: NOT SHOWN

I checked T001, FS101, FS102, FS103, FS104, FS105 and FS300: every note, legend, schedule, callout, the riser diagram and the details, including a 400 dpi crop of the tank and pump set. None of them shows or specifies a "leak detection cable", "probe cable", hydrocarbon sensing cable, tank interstitial sensor or sump sensor. The T001 HVAC symbols legend has no leak-detection symbol either.

These are the only leak-related or alarm items that do appear:
- FS101, sub-cellar tank room, callout to a box on the Brugg pipe: **"BRUGG VACUUM SYSTEM"**.
- FS300, riser diagram, lower right next to the 2-hr enclosure: **"BRUGG VACUUM LEAK PANEL"**. The panel is drawn tied into the FOS/FOR pipe run. This is interstitial vacuum monitoring of the double-wall Brugg pipe. It is not a cable or probe.
- FS101, tank callout: **"134 GALLON FUEL OIL TANK WITH 200% OUTER CONTAINMENT"**. FS300 tank: "134 GALLON FUEL OIL STORAGE TANK", "UL 142". No interstitial monitor is shown.
- FS300 riser diagram: "FLOW SWITCH" (symbol H) on the pump discharge, and "SMOKE DETECTOR AS PER MC 1305.3.4".
- FS300 riser diagram: "FUEL OIL MANAGEMENT AND LEVEL CONTROL CENTER CABINET." with dashed "CONTROL WIRING" to the tank and pump set. The cabinet has no inputs listed and is not tagged as a leak panel.
- FS102 / FS300: "OVERFILL ALARM" and the FS300 note "1. PROVIDE AUDIO AND VISUAL OVERFILL ALARM BOX."
- FS300 box note (left side): "AS PER MC 1301.8 ABSORBENT MATERIALS. THE BUILDING OWNER SHALL MAINTAIN A SUFFICIENT QUANTITY OF ABSORBENT MATERIALS..." FS101 shows a "5 GAL SPILL KIT".

**Conclusion:** the contract drawings show Brugg vacuum leak monitoring on the piping. They do not show an oil leak detection probe or cable. ACE's comment "OIL LEAK DETECTION PROBE CABLE TO BE PROVIDED" adds an item that is not on the drawings. Two caveats:
- BE-600 Spec 1.B incorporates "ALL APPLICABLE CODES, LAWS AND REGULATIONS" and puts the contractor on notice to report violations before bidding.
- The FS300 control cabinet is generic.

So ACE could argue the item is code-required. I did not check what NYC MC/FC requires here.

## 2. Pipe enclosures and shaft notes

- FS300 riser diagram, right of the riser: **"FUEL OIL RISER SHALL BE 2 HR RATED SHEETROCK ENCLOSURE. 4" MIN. CLEAR BETWEEN PIPE OUTSIDE SURFACE AND ALL OTHER OBJECTS. SHAFT SHALL CONTAIN ONLY FUEL OIL PIPING."** A separate leader at the riser foot reads "2HR ENCLOSURE".
- FS300, left: **"DETAIL- FUEL OIL PIPING CHASE" (NO SCALE)**. Two pipes, "MIN.4"" dimensions on all sides, and one label: "2 HR RATED SHEETROCK ENCLOSURE". The detail draws two nested rectangles but labels only one enclosure. No second or double enclosure is called out.
- On every floor plan (FS101 to FS105) the Brugg riser is tagged: **"1" FOS/1½" FOR BRUGG PIPING IN 2 HR RATED SHEETROCK ENCLOSURE"**.
- FS101 sub-cellar, and the cellar at the "OPEN TO BELOW" area: the fill and vent run has its own callout, **"PROVIDE 2 HR RATED SHEETROCK ENCLOUSRE"** (sic). This is a separate single enclosure around a separate pipe run. It is not a second layer around the Brugg riser.
- FS103, 2nd floor: the riser offsets horizontally across the corridor and Huddle Rm 2-106 inside the dashed enclosure. It then rises again at the south wall.
- BE-101/102/103 Note 11 (boiler, not fuel): "BOILER ROOM AS WELL AS FLOOR IN BOILER ROOM IS TO BE A NONCOMBUSTIBLE 2 HOUR FIRE RATED ASSEMBLY".

**Answer:** each run gets one 2-hr sheetrock enclosure. No second or double 2-hr enclosure is required anywhere on the FS sheets.

## 3. Fill and vent

- **Location: Vesey Street facade, first floor**, at the east end of the hallway next to the exterior door. It is not in a garage. The driveway on FS102 is "EXISTING DRIVEWAY TO 10 BARCLAY STREET", hatched "NOT IN SCOPE OF WORK". FS102 callouts:
  - "4" OIL VENT / 2" OIL FILL / DN TO FUEL OIL TANK ROOM"
  - "OVERFILL ALARM"
  - "INSTALL ABOVE SPRINKLER CONNECTION". The leader points to the fill and vent at the facade.
  - FS101 sub-cellar: "4" OIL VENT UP", "2" OIL FILL UP". FS101 cellar: "4" OIL VENT UP/DN", "2" OIL FILL UP/DN".
- **Sizes:** 2" fill and 4" vent (FOV).
- **FS300 facade detail** (left of riser, mezzanine and ground floor level): "4" VENT FOV" ends in a return-bend or cap symbol above an "OVERFILL ALARM". A "MIN. 2'-0"" dimension runs between the vent outlet and the "2" WALL MOUNTED FUEL PORT".
- **Fill box / spill containment:** none is detailed. The fill is described only as "2" WALL MOUNTED FUEL PORT". No spill bucket, fill box, lock or cap detail is shown. The closest note is FS300 box note: "PER MC 1305.6.2, FUEL OIL FILL PIPE SHALL TERMINATE OUTSIDE OF A BUILDING AT OR ABOVE GRADE AT A POINT LEAST 2 FEET FROM ANY BUILDING OPENING AND 5 FEET AWAY FROM ANY SUBWAY GRATING AT THE SAME OR LOWER LEVEL. A FILL PIPE SHALL TERMINATE IN A MANNER DESIGNED TO MINIMIZE SPILLING WHEN THE FILLING HOSE IS DISCONNECTED."
- **Vent cap:** no vent cap is specified by type. Note 8C says "...EXTENDED TO A VENT HEAD."
- **Vent termination clearances:**
  - FS300 Note 1 and the boxed note: "VENT PIPE SHALL TERMINATE AT LEAST 2 FEET FROM ANY BUILDING OPENING AND NOT LESS THAN 2 FEET NO MORE THAN 12 FEET ABOVE THE THE FILL PIPE TERMINAL AND SHALL COMPLY WITH NEW YORK CITY BUILDING CODE SECTION MC 1305.7.2."
  - Note 8B: "FILL PIPES SHALL PITCH TOWARD TANKS, ... EXTENDED TO FILL PIPE TERMINALS NEAR THE SIDEWALK CURB, OR OTHERWISE SHOWN ON THE DRAWINGS."
  - Note 8C: "VENT PIPE SHALL PITCH TOWARD TANK".
  - Note 8A: "AT LEAST 1" IN 10"" (sic).
  - The riser diagram shows "4"FOV PITCH" toward the tank.
- **Pipe material and joints:** the only material spec is FS300 Note 10, headed "FUEL OIL VENT (FOV) 125 PSIG AND LESS". It is not limited to fill.
  - Not buried: "2½" AND LESS: STANDARD WEIGHT BLACK STEEL PIPE, WITH SCREWED END STANDARD WEIGHT MALLEABLE IRON FITTINGS AND FUEL RESISTANT THREAD SEALANT, OR WELD END STANDARD WEIGHT STEEL FITTINGS."
  - Not buried: "3" AND UP: STANDARD WEIGHT BLACK STEEL PIPE WITH WELD END STANDARD WEIGHT STEEL FITTINGS."
  - That puts the 2" fill at screwed or welded Sch 40 black steel and the 4" vent at welded Sch 40 black steel.
  - Item 3 also lists "ACCEPTABLE OPTIONS ... BRASS PIPE, COPPER OR COPPER-ALLOY PIPE OR TYPE K COPPER... PER MC TABLE 1302.3".
  - The buried options (Sch 80 with cathodic protection, or double-wall steel) do not apply.
- **Overfill alarm:** shown on FS102 and FS300 at the fill, with FS300 note "PROVIDE AUDIO AND VISUAL OVERFILL ALARM BOX." The tank-side sensor and the wiring are not shown.
- **Roof vent (FS105), likely not the fill vent:** "6" VENT. INSTALL 10 FT ABOVE BULKHEAD" and "TERMINATE 11 FT AWAY FROM PROPERTY LINE." Both point at a pipe on the generator. It is not tagged; it is probably the generator exhaust or the belly tank vent. The FS300 "REAR VIEW OF EMERGENCY GENERATOR" shows a 4" main tank vent, a 4" emergency vent and a 2" connector: "CONNECT 4" VENT PIPE TO 4" FLANGE PROVIDE BY GEN. MFGR", "OVERFLOW CONNECTION TO FUEL OIL RETURN PIPE". Ask ACE what the 6" vent is.

## 4. Piping, tank, pump, controls, testing, inspections, code

- **Supply/return piping:**
  - Sizes on every plan and the riser: "1" FOS/1½" FOR BRUGG PIPING". FS300 riser: "1"FOS & 1½"FOR BRUGG PIPING".
  - No Brugg product type is named (FLEXWELL etc. not stated).
  - The tank room has "BRUGG VACUUM SYSTEM" and there is a "BRUGG VACUUM LEAK PANEL", so double-wall Brugg with vacuum monitoring is implied.
  - Within the tank room and pump set, the FS300 diagram shows FOS/FOR with valves, but Note 10 is the only material spec.
  - FS300 Note 9: "FUEL OIL GAUGE PIPING SHALL BE COPPER MATERIAL, TYPE L, ASTM B88. PROTECTIVE ENCLOSURE PIPING, IF REQUIRED FOR FUEL OIL GAUGE PIPING SHALL BE BLACK STEEL SCHEDULE 40."
- **Tank:**
  - FS101: "134 GALLON FUEL OIL TANK WITH 200% OUTER CONTAINMENT" on "6" CONCRETE PAD", in the sub-cellar "FUEL OIL ROOM", with "3 FEET CLEARANCE" and "2 FEET CLEARANCE" callouts.
  - FS300: "134 GALLON FUEL OIL STORAGE TANK", "UL 142", 4" vent, top tappings and a gauge.
  - FS300 Note 3: "THE DIESEL TANK MUST BE FACTORY TESTED FOR AT LEAST 22.5 PSIG AND APPROPRIATE ASME STAMP SHALL BE AFFIXED ON IT. FUEL CONTAINMENT SHALL BE PROVIDED." An ASME stamp is unusual for a UL 142 atmospheric tank; ask ACE.
  - **No tank schedule exists.** T001 has only the pump schedule.
- **Pump set (T001 "FUEL OIL TRANSFER PUMP SCHEDULE"):**
  - F.O.P.-1, Location TANK ROOM, Service "EMERG. GENERATOR", "DUPPLEX" (sic), #2 oil at 60°F, 89 GPH, 100 psig max discharge.
  - Motor: PISTON DISPL, 1/3 HP, 1725 rpm, 115/1/60.
  - HAYES PUMP, INC., model "ATPSF-1121-103-120-100-D-DP-L-TG".
  - Remarks: "PROVIDE FACTORY ASSEMBLED SETS WITH STRTAINERS, GAUGES, VALVES, SWITCHES AND CONTROL PANEL".
  - FS300 shows "FUEL OIL TRANSFER PUMP SET" on "6" CONCRETE PAD" with "CTRL PNL", "DPG", "DUPLEX STRAINER (TYPICAL)", "DUPLEX FILTER (TYPICAL)", "ASV", "APPROX. 10'-0"", "FLOW SWITCH", and "PROVIDE FUSIBLE LINK OIL LINE FIRE-SAFETY VALVE".
- **Controls and alarms:**
  - "FUEL OIL MANAGEMENT AND LEVEL CONTROL CENTER CABINET." with "CONTROL WIRING". No sequence or points list.
  - Overfill alarm, smoke detector per MC 1305.3.4, and Brugg vacuum leak panel.
  - Note 11: "PROVIDE FUSIBLE LINK OPERATED VALVE IN THE SUPPLY LINE TO STOP FUEL OIL FLOW IN AN EVENT OF FIRE."
  - Note 12: "PROVIDE A REMOTE CONTROL TO STOP THE FLOW OF OIL TO THE GENERATOR. LOCATE AND LABEL THE CONTROL "REMOTE CONTROL FOR GENERATOR"."
  - FS105: "PROVIDE EMERGENCY BREAK GLASS FOR EMERGENCY GENERATOR."
  - FS300 top: "PROVIDE FUSIBLE LINK OIL LINE FIRE-SAFETY VALVE" at the generator.
- **Tightness / pressure test (FS300 Note 4):**
  - "A. INSTALL ALL THE FUEL OIL LINES IN SUCH A WAY AS TO FACILITATE TESTING OF THE PIPE WITH THE EQUIPMENT INSTALLED AND VALVED OFF."
  - "B. ... VALVE AND TEE INSTALLED IN THE SUPPLY SIDE AND THE SUCTION SIDE OF THE PUMP ... ALL VALVES SHALL HAVE UNIONS..."
  - "C. TEST THE LINES WITH OIL OR WATER."
  - "D. ... THE FUEL OIL PIPING SHALL BE PRESSURIZED TO A PRESSURE OF 150 PSI AND SHALL MAINTAIN THAT PRESSURE FOR A PERIOD OF ONE (1) HOUR,"
  - "E. ANY LEAKS DETECTED OR DROP IN PRESSURE ... SHALL INDICATE A FAILED TEST."
  - "F. IF THE TEST SHOULD FAIL, CONTRACTOR SHALL REPAIR THE PIPE AND/OR REPLACE THE FITTINGS AT NO ADDITIONAL COST."
  - "G. ALL ISOLATION VALVES INSTALLED FOR THIS TEST AND ALL VALVES SHALL BE OF THE POST INDICATOR TYPE."
  - "H. ... PRESSURE GAUGE ... INDICATIONS OF ONE (1) POUND/SQUARE INCH INCREMENTS."
  - Note 5: "ALL FIELD TESTING SHALL BE PERFORMED IN THE PRESENCE OF THE DOB INSPECTOR AND THE SPECIAL INSPECTION AGENCY".
  - Watch two items:
    - 150 psi hydro of Brugg flexible pipe. Check against the Brugg test rating.
    - "post indicator type" valves for all valves. That is a fire-protection term and does not fit oil valves.
- **Special inspections (T001 "BUILDING DEPARTMENT NOTES, MECHANICAL" 2.A):** "FUEL OIL STORAGE AND FUEL OIL PIPING SYSTEM BC 1705.22" and "FIRE-RESISTANT PENETRATIONS AND JOINTS BC 1705.17". The FS set does not say who hires the special inspector. On BE-600, Spec 2.D (below) puts it on the contractor.
- **Other code notes:**
  - T001: "REVIEW REQUESTED UNDER 2022 MECHANICAL CODE"; T001 Building Dept Note 1 refers to "BUILDING CODE, CITY OF NEW YORK, EFFECTIVE 2014".
  - MC 1301.8 absorbent materials, owner to maintain.
  - "AS PER 1301.9 CERTIFICATE OF FITNESS ... A QUALIFIED EMPLOYEE OR CONTRACTED GENERAL COMPANY HOLDING A CERTIFICATE OF FITNESS FROM THE FIRE DEPARTMENT SHALL MAINTAIN THE FUEL-OIL SYSTEM."
  - MC 1305.6.2 fill; MC 1305.7.2 vent; MC 1305.3.4 smoke detector; MC Table 1302.3 and MC 1303.x joints.
  - "PER NYC BC 2702.1.6, GENERATOR HAS TO BE REGISTERED WITH DEP BEFORE SIGN-OFF."
  - "PER NYC BC 110.6, OBTAIN CERTIFICATE OF COMPLIANCE PRIOR TO SIGN-OFF".
  - T001 General Note 5A: fire stopping "REFER TO SPECIFICATION SECTION 07270"; 5B: "COMPLY WITH NYC BC 712".
  - FS105: "PROVIDE MECHANICAL SCREEN PER ZR 37-22".
  - **No FDNY permit or Local Law note** appears on the FS sheets.
  - FS300 notes skip No. 2 (1, 3, 4...).
  - The FS300 note "6. LIFTING POINTS ARE CONSTRUCTED FOR LIFTING 20,000# EACH." looks like boilerplate.
- **Generator and sub-base tank: the sheets CONFLICT.**
  - FS105 roof plan: "80 KW EMERGENCY GENERATOR / MFG: TAYLOR / MODEL# TD80 / FUEL CONSUMPTION: 6.26 GPH". Also "SUB-BASE FUEL STORAGE 134 GALLON "BELLY" TANK WITH BUILT-IN 200% CONTAINMENT LOCATED UNDER SERVICE GENERATOR". Also "80KW GENERATOR" and "GENERATOR FILED UNDER RELATED JOB#M01244603-S1".
  - FS300 riser, top: "200KW EMERGENCY GENERATOR / MFG: TAYLOR / MODEL# TD80 / FUEL CONSUMPTION: 6.26 GPH" and "SUB-BASE FUEL STORAGE 275 GALLON "BELLY" TANK WITH BUILT-IN 200% CONTAINMENT LOCATED UNDER SERVICE GENERATOR".
  - So it is 134 gal / 80 kW on FS105 against 275 gal / 200 kW on FS300, with the same TD80 model on both. Neither sheet uses 75 gal.
  - The cellar day tank is also 134 gal (FS101, FS300).
  - TD80 at 6.26 GPH matches 80 kW, so the FS300 "200KW / 275 GALLON" looks like a leftover.

## 5. Notes that assign work

| Sheet / location | Quote |
|---|---|
| FS105, roof, at the generator | "PROVIDE STEEL DUNNAGE (BY OTHERS). RAISE 3 FT. REFER TO STRUCTUAL" |
| FS300, top | "WEATHER-PROTECTIVE ENCLOSURES (BY MFR.)" |
| FS300, generator rear view | "CONNECT 4" VENT PIPE TO 4" FLANGE PROVIDE BY GEN. MFGR" |
| FS300, generator rear view | "PROVIDE ELECTRICAL GROUNDING TO BELLY TANK. SEE ELECTRICAL DRAWINGS." |
| FS105 | "GENERATOR FILED UNDER RELATED JOB#M01244603-S1" |
| BE-401, gas riser | gas meter "FILED UNDER RELATED JOB #M01244603-S2", "(N)GAS METER 650CFH" |
| T001, General Building Code Notes 2 | "CONTRACTOR SHALL FILE FOR AND OBTAIN PERMITS FOR ALL MECHANICAL SYSTEMS." |
| FS300, Note 4F | "...CONTRACTOR SHALL REPAIR THE PIPE AND/OR REPLACE THE FITTINGS AT NO ADDITIONAL COST." |
| FS300, MC 1301.8 box | "THE BUILDING OWNER SHALL MAINTAIN ... ABSORBENT MATERIALS" |
| BE-001, Mechanical Drawing Notes 12 | "MECHANICAL CONTRACTOR SHALL COORDINATE ALL TIE-INS, PLUS REMOVALS WITH GENERAL CONTRACTOR AND OWNER'S SCHEDULE." |
| BE-001, Mechanical Drawing Notes 13 | "THIS CONTRACTOR SHALL PAY FEES, GIVE NOTICE, FILE NECESSARY DRAWINGS AND OBTAIN PERMITS AND CERTIFICATES OF APPROVAL..." |
| BE-001, Certificate of Compliance box | "CERTIFICATE OF COMPLIANCE SHALL BE OBTAINED BY CONTRACTOR..." |
| BE-600, Spec 1.K | "HVAC CONTRACTOR TO FURNISH ACCESS LOCATION REQUIREMENTS TO GENERAL CONTRACTOR." |
| BE-600, Spec 2.D | **"SPECIAL INSPECTION BY A LICENSED PROFESSIONAL ENGINEER TO BE HIRED BY THIS CONTRACTOR."** |
| BE-600, Spec 1.C | "THE CONTRACTOR SHALL ALLOW IN HIS PRICE FOR ROUTING OF DUCTWORK AND PIPING TO AVOID OBSTRUCTIONS." |
| BE-600, Spec 1.E | "...CHANGES WHICH INVOLVE EXTRA COST SHALL NOT BE MADE WITHOUT APPROVAL." |
| BE-600, Spec 1.B | codes incorporated; contractor to report violations "PRIOR TO SUBMITTING A PROPOSAL" |
| BE-501, roof duct support detail | "PITCH POCKET BY GENERAL CONTRACTOR" |
| BE-101/102/103, Notes 5-7 | "BOILER MANUFACTURER SHALL PROVIDE CONTROL PANELS." / "...VENTLESS GAS TRAY." (BE-401 reads "VENTLESS GAS TRAIN") / "...CONDENSATE NEUTRALIZATION KIT." |
| BE-501, piping detail | "1 1/2"x1 1/2"x1/8" ANGLE IRON TIGHT TO WALL OR FLOOR. ALL AROUND DUCT BY SHEETMETAL CONTRACTOR" |

The FS sheets have no note that assigns work to "electrical" by name. They only say "SEE ELECTRICAL DRAWINGS". The FS300 control wiring, the overfill alarm wiring, the smoke detector and the break glass are not assigned to any trade.

---

## 6. Boiler (BE)

- **Scope (BE-001 "SCOPE OF WORK"):** "-INSTALL NEW BOILER FOR BUILDING HEATING SYSTEM."
- **Location:** the existing rooftop "BOILER ROOM" (BE-103 roof plan), next to the stair bulkhead and the elevator machine room. BE-401 tags the unit "(R)BOILER" on the roof.
- **Schedule (BE-401 "BOILER & BURNER SCHEDULE"), BOILER-1:**
  - Approx. operating weight 735 lbs; relief valve setting 30 psig.
  - Output at full fire (130°F RWT) 237 MBH; gas input 282 CFH (1000 Btu/cf); "THERMAL EFFICIENCY AT 120/100° @ 100% INPUT" 84%; EWT/LWT 130°/200°.
  - Manufacturer WEIL-MCLAIN, model EG-75; burner turndown blank; MAWP 160 PSI; gas inlet 4"/13" w.g.
  - Electrical: 120 V, 1 ph, 60 Hz, <5 FLA.
  - Fuel: natural gas. Riser callout: "GAS BOILER (282 CFH AT MIN. 4 IN. W.C.)".
  - The schedule gives **no vent category, flue size, combustion air size or burner type**.
- **BE-401 notes:**
  - "1. BOILER MANUFACTURER SHALL PROVIDE CONTROL PANELS."
  - "2. ... VENTLESS GAS TRAIN."
  - "3. ... CONDENSATE NEUTRALIZATION KIT"
  - "4. MAINTAIN MINIMUM WATER FLOW..."
  - "5. BOILER IS CSA LISTED AND LOW PRESSURE"
  - "6. BOILER IS WATER-TUBE AND CAST IRON"
  - "7. BOILER TO CONNECT TO VENT, GALVANIZED STEEL"
  - "8. BOILER TO SERVE 2ND TO 5TH FLOOR"
- **Internal inconsistencies to flag. These come from my product knowledge; I did not verify them against a cut sheet:**
  - The Weil-McLain EG series is, to my knowledge, an atmospheric, non-condensing, cast-iron gas boiler sold mainly in steam versions. Its 282 MBH input matches EG-75.
  - "Water-tube and cast iron" contradicts itself.
  - A condensate neutralization kit is not normally used on an 84% non-condensing boiler.
  - "Galvanized steel" vent is not a normal vent material for a gas appliance. A Category I appliance would need Type B vent or a listed liner.
  - The schedule shows hot water (130/200°F, 30 psig relief) while the model may be a steam unit. Confirm with ACE whether EG-75 (steam) or a hot-water model is intended.
- **Flue / chimney / liner / vent connector:**
  - **No flue, chimney, liner or vent connector detail on any BE sheet.**
  - The only references are BE-103 "VIF CONDITION OF EXISTING EXHAUST DUCT" (leader to the boiler), BE-401 note 7 "BOILER TO CONNECT TO VENT, GALVANIZED STEEL", and BE-101 Note 10 "...INCLUDING ALL PROPOSED PIPING, AND THE PROPER BREECHING MATERIAL BEING INSTALLED."
  - Notes 2 and 3 only say intake and exhaust locations "SHALL COMPLY WITH 2022 MECHANICAL CODE".
- **Combustion air:** BE-103: "EXISTING LOUVER FOR BOILER OUTSIDE AIR INTAKE. RECONNECTING EXISTING MD TO BOILER, VIF."
- **Expansion tank, makeup water / backflow preventer, air separator, PRV fill: NOT SHOWN** on any BE sheet. Relief valve: only the 30 psig setting in the schedule.
- **Pumps:** BE-103: "EXISTING HOT WATER HEATING PUMPS TO REMAIN (TYP. FOR 2)". No pump schedule.
- **Controls:**
  - Note 9 (BE-101/102/103): "HOT WATER BOILERS THAT SUPPLY HEAT TO THE BUILDING THROUGH ONE OR TWO PIPE HEATING SYSTEMS SHALL HAVE AN OUTDOOR SETBACK CONTROL THAT LOWERS THE BOILER WATER TEMPERATURE BASED ON THE OUTDOOR TEMPERATURE IN ACCORDANCE WITH THE NYCECC C403.4.1.5."
  - "BOILER MANUFACTURER SHALL PROVIDE CONTROL PANELS."
  - Note 8: "MAINTAIN MINIMUM WATER FLOW TO THE BOILER AS PER MANUFACTURER RECOMMENDATION PER BOILER CODE."
  - Interlocks: the only one is the motorized damper ("RECONNECTING EXISTING MD TO BOILER, VIF").
  - Emergency switches: "VIF FOR EMERGENCY SWITCH. INSTALL NEW IF NONE IN FIELD" at the boiler, and "VIF IF EMERGENCY SWITCH SERVICE BOILER" at the bulkhead door.
  - Detectors: "VIF FOR SMOKE AND CARBON DETECTORS. INSTALL NEW IF NONE IN FIELD" (CO and SC symbols).
- **Pad:** none shown for the boiler on BE sheets.
- **Gas:**
  - BE-103: "CONNECT TO (E)GAS INCOMING (VIF)".
  - BE-401 gas riser: "(E)2"" from the cellar up to the roof; "(E)2" INCOMING GAS SERVICE"; "(N)GAS METER 650CFH" (GM1) "FILED UNDER RELATED JOB #M01244603-S2"; gas cocks at the boiler and the meter; regulator symbol shown.
- **Special inspections:**
  - BE-001 TR-1: "1. FIRE-RESISTANT PENETRATIONS AND JOINTS BC 1705.17"; "2. HEATING SYSTEMS BC 1705.31".
  - TR-8: "HVAC-R AND SERVICE WATER HEATING EQUIPMENT (IB3), (IIB3)", "...CONTROLS (IB4), (IIB4)", "...PIPING DESIGN AND INSULATION (IB5), (IIB5)", "MAINTENANCE INFORMATION (ID1), (IID1)".
  - BE-600 2.D: contractor hires the special inspector.
- **Existing to remain vs new:**
  - New: BOILER-1 and its gas connection. The meter is new but under the S2 filing.
  - Existing to remain: "EXISTING HWS/R PIPING TO REMAIN (TYP. FOR ALL)", the 2 HW pumps, the louver, the MD (reconnect), the exhaust duct (VIF), "(E)2"" gas riser, "EXISTING 2" HWS/R DN. VIF" at the roof, and "EXISTING 2" HWS/R UP. VIF" / "EXISTING 2" HWS/R, VIF" at Stair 2 on the 5th floor.
  - Floors 2-5 (BE-101/102):
    - "EXISTING 1¼" HWS/R, VIF (TYP. FOR ALL)".
    - 2nd floor: "CAP RISER, VIF. EXISTING RADIATOR TO BE REMOVED (TYP. FOR ALL)".
    - 3rd-5th floors: "TIE TO EXISTING RISER TO PTAC, VIF (TYP. FOR ALL)". PTAC-A and PTAC-B are drawn at the windows, which implies hot-water-coil PTACs fed from the existing risers.
    - 5th floor Stair 1: "(2) CAP HWS/R. EXISTING CONVECTION HEATER TO BE REMOVED", "(2) EXISTING 1" HWS/R, VIF".
  - Each floor sheet has a "WATER PIPE SIZING CHART" (GPM to size, up to 6").
- **BE-500 / BE-501 / BE-600** are generic boilerplate (duct details, fire dampers, AC stand, gooseneck, clevis hanger, penetrations, roof pipe support, mechanical spec). None of them has boiler-specific content. BE-001 Mechanical Drawing Note 17 even cites "THE RHODE ISLAND BUILDING CODE".

## 7. Floor heat mats

**Not shown or mentioned anywhere** in the BE or FS sheets: plans, notes, schedules, details or BE-600 spec. I checked the spec at 170-210 dpi; it is readable.

## 8. BE vs M504

M504 ("MECHANICAL DETAILS IV", filed under M01244603-**S1**) "TYPICAL BOILER ELEVATION" shows an **oil-fired steam boiler**: "FORCED DRAFT BURNER", "OIL BURNER PAN", "8"ø STEAM RUNOUT W/ INSULATION", "3" SAFETY VALVE SET AT 15 PSI", "SEQUENCE DRAFT DAMPER", "ELEC. SEQ. DRAFT DAMPER ACTUATOR MOTOR", a 20"x46" / 28"x40" breeching with "TAP TO HORIZONTAL DUCT MUST BE AT 45° ANGLE", "SMOKE DETECTOR", "TUBE PULL", "4" CONCRETE PAD", and "BURNER CONTROL PANEL ON 4"H CONCRETE PAD".

The BE (S5) set contradicts M504 on every point:
- **Fuel:** gas. BE has "GAS BOILER (282 CFH...)", "CONNECT TO (E)GAS INCOMING", "VENTLESS GAS TRAIN".
- **Medium:** hot water. BE has HWS/R, EWT/LWT 130/200°F, 30 psig relief and the outdoor reset note. The model EG-75 may itself be a steam unit; see above.
- **Size:** 237 MBH, a small residential-scale boiler, not a large forced-draft unit with an 8" steam runout.
- **Location:** rooftop boiler room.
- **Relief:** 30 psig against 15 psi.
- **Pad:** BE shows none.

M504 looks like a leftover typical detail and is not applicable. The BE set (S5) is the boiler filing and should govern. Confirm by RFI.

---

## Could not make out / limitations
- All text on all 15 sheets was legible at the zoom levels used. No overlapping-text problems except the following:
  - The BE-600 Spec 1.D phrase "SHALL NOT EXCEED ?% 70F RATED INSERT CAPABILITY" is overprinted (two strings on top of each other).
  - In the BE-600 air outlet item 4, "...SIZED ... AND 20 ... LESS THAN NOTED ..." is overprinted.
- I did not crop every room tag on FS103/FS104 at high zoom. The riser callouts on those sheets are the same "1" FOS/1½" FOR BRUGG PIPING IN 2 HR RATED SHEETROCK ENCLOSURE" / "FOR UP/DN" pattern, and I confirmed it on FS103.
- The FS300 diagram shows symbols on the tank top (four tappings plus a gauge) and pump-set symbols. They carry no labels beyond what is quoted above.
- T001 drawing list says FS-102 is "FUEL STORAGE GROUND AND FIRST FLOOR PLAN", but the sheet title is "FIRST AND MEZZANINE FLOOR PLAN". This is a minor index error.
