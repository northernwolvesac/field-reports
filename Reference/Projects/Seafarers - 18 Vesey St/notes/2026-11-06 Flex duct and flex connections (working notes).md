# Seafarers International House, 18 Vesey St: what the documents say about flex duct and flex connections

Sources reviewed (read-only):
- `Seafarers IFB 2026-01-08 - Mechanical M sheets.pdf`. I rendered and read M001, M103, M104, M105, M401, M402, M501, M502, M505 and M601 in full or by region. M503 and M504 are piping, boiler and caulked-seal details, and I checked their thumbnails only.
- `Seafarers IFB 2026-01-08 - Boiler BE sheets.pdf`: BE-600, section 5.
- Google Drive: "18_vesey_street-submittal#5-rev-0-ductwork_standards". This is Procore Submittal #230000-5.0, Ductwork Standards, Rev 0, closed.
- The renders are in `/tmp/claude-0/-home-user-field-reports/97728685-7977-5c3e-b5db-ec3e93af2532/scratchpad/flex/`.

## Short answer

1. **Flex duct runouts to diffusers or grilles: NO.** The drawings allowed it, but the engineer took it out at submittal review.
   - The bid drawings allowed it. M502 "Diffuser Connection Detail" says "MAXIMUM 6FT LENGTH FLEXIBLE DUCT FULLY EXTENDED".
   - ACE then rejected it on the approved duct standards submittal (#230000-5.0): **"ACE: FLEX DUCT SHALL NOT BE USED. USE RIGID ROUND DUCTS INSTEAD."**
   - That comment is the latest direction from the engineer of record. Treat all runouts as rigid round. Flex would need a new RFI or approval from ACE.
2. **Flexible (fabric) connections at fans and equipment: YES, they are specified.** M601 spec 5.D (repeated in BE-600 5.D) calls for neoprene-coated glass fabric connectors. The duct connector catalog in the submittal was not marked up.

---

## A. Flexible duct (runouts to diffusers, grilles, terminals)

### What the drawings say

| Sheet / location | Exact text | Notes |
|---|---|---|
| **M502, "DIFFUSER CONNECTION DETAIL", SIDE CONNECTION** (right side of sheet, middle) | "MAXIMUM 6FT LENGTH FLEXIBLE DUCT FULLY EXTENDED"; "ROUND DUCT CONNECTOR"; "ACOUSTIC LINING" (in the plenum box); "DIFFUSER NECK SIZE"; "6" MINIMUM" | Flex connects to the side of a lined plenum box on the diffuser. |
| **M502, "DIFFUSER CONNECTION DETAIL", TOP CONNECTION** | "MAXIMUM 6FT LENGTH FLEXIBLE DUCT FULLY EXTENDED"; "R=D" (bend radius equal to duct diameter at the elbow); "D MINIMUM" (straight collar height above the diffuser equals the duct diameter); "ROUND DUCT ADAPTOR FOR RECTANGULAR DIFFUSER"; "THERMAL INSULATION"; "2-3/4 IN. MINIMUM" | This is the only place in the drawings where flex duct appears. |
| M001 Mechanical Symbols and Abbreviations | No flex duct symbol or abbreviation. The only related abbreviation is "FC – FLEXIBLE CONNECTION". | |
| M103 / M104 / M105 floor and roof plans | No "FLEX" callouts found. Runouts and branches are drawn as rigid duct with sizes (for example "4"ø", "5"ø", 6X6), "PROVIDE VD (TYP. FOR ALL)", and boot or point-of-connection symbols. | |
| M103 (and the M104/M105 copies) DUCTWORK NOTES 1-17 | No mention of flex. Relevant notes: 3. "PROVIDE MIN. 24 GAGE FOR GENERAL DUCTWORK"; 7. "PROVIDE MIN. 1.5" INSULATION FOR ALL CONCEALED DUCTWORK DEDICATED FOR AC SUPPLY"; 13. "DUCT CONSTRUCTION AND INSTALLATION SHALL STRICTLY FOLLOW ANSI/SMACNA 006-2020 STANDARD"; 14. "PROVIDE VOLUME DAMPER/CORD OPERATED DAMPER FOR EVERY BRANCH OF DUCTWORK." | SMACNA 006-2020 is "HVAC Duct Construction Standards – Metal and Flexible". It covers flex duct installation, but on its own it does not authorize flex. |
| M601 Specifications, 5. SHEET METAL WORK | 5.A: "EXCEPT AS OTHERWISE SHOWN OR NOTED, ALL DUCTWORK AND OTHER SHEET METAL WORK SHALL BE GALVANIZED SHEET STEEL…" | There is **no flexible air duct specification**: no UL 181 class, no insulation R-value, no listing, no maximum length beyond the M502 detail. |
| M601 9.A (insulation, general) | "ALL INSULATION MATERIALS, INCLUDING JACKETS, FACING, ADHESIVE, COATINGS, AND ACCESSORIES ARE TO BE FIRE HAZARD RATED AND LISTED BY UNDERWRITERS LABORATORIES … UL 723 (ASTM E-84) … FLAMESPREAD: MAXIMUM 25 … SMOKE DEVELOPED: MAXIMUM 50." | Applies to insulation in general. |
| M601 11.A / schedule | Supply, concealed: 1" D-1 blanket, vaporseal. (M103 note 7 asks for 1.5" on concealed AC supply.) | |
| M601 6.A.5 / 6.B.5 | "ALL REGISTERS AND DIFFUSERS SHALL BE PROVIDED WITH OPPOSED BLADE VOLUME DAMPERS…". Linear diffuser: "CABLE DAMPER IN EACH BRANCH TAP WITH 3 FEET CABLE TO DIFFUSER FACE." | |
| M505 Duct Support Detail notes | "1. ALL DUCT TO BE HUNG FROM BUILDING CONSTRUCTION NOT TO BE SUPPORTED FROM HUNG CEILING." | No flex-specific hanger detail. |
| M501 Interpretation of Single Line Ductwork | Rises, drops and offsets "SHALL BE MADE WITH SMOOTH FITTINGS". | No flex shown. |

The contract documents do **not** say anything about the following for flex duct:
- a UL 181 Class 0 or Class 1 requirement
- an insulated R-value
- a prohibition on running flex through walls, rated assemblies or exposed areas
- a flex support method

Only general code compliance applies to those items, through M001 Mechanical Code Note 6: "DUCT SYSTEMS … SHALL COMPLY WITH 2022 MECHANICAL CODE CHAPTER 6".

### Submittal #230000-5.0 Ductwork Standards (Drive file 1-1YfwktFzkIURubUjd5jf85XinJdISSu)

- Submitted by Northern Wolves (Jonathan Maginnis) as "Submittal #5.0 – Ductwork Standards, Hangers and Anchors", 4/30/2026.
- ACE stamp: "Approved with Comments" was checked, initialed "P.Y." and dated 05/08/26, with "ACE: SEE COMMENTS".
- The architect, Chris Santos (Arcari + Iovino), returned it 5/8/2026: "NO EXCEPTIONS TAKEN … Please see ACE comments".
- KBD distributed it 5/11/2026 as "Approved as Noted". Status: Closed.
- What we submitted on flex duct:
  - SMACNA "HVAC Duct Construction Standards Metal and Flexible" Fig. 3-8 "Types of Flexible Duct", plus Figs. 3-10 and 3-11 "Flexible Duct Supports". These include the support spacing of 4 ft maximum, max sag ½ in. per foot, a 1½ in. minimum strap/saddle, and duct extending straight "for several inches from a connection before bending". They also note that closer support intervals may be required "AS A CONDITION OF UL LISTING, PARTICULARLY IN FIRE RATED FLOOR-CEILING ASSEMBLIES".
  - A Thermaflex insulated flexible air duct data sheet. It lists:
    - "Listed and labeled by Underwriters' Laboratories, Inc., as a Class 1 Air Duct, Standard 181"
    - NFPA 90A/90B; flame spread ≤25 and smoke ≤50
    - R-4.2 / R-6.0 options, 1½" or 2" fiberglass blanket, metallized polyester vapor barrier
    - 25 ft lengths, 4"–20" diameter
- **ACE comment, on submittal PDF page 24, next to SMACNA Fig. 3-10 Flexible Duct Supports:**
  > **"ACE: FLEX DUCT SHALL NOT BE USED. USE RIGID ROUND DUCTS INSTEAD."**
- One other annotation in the package, on page 10 near the SMACNA rectangular elbows figure: "TURNING VANES AT ALL 90degree elbows". This is probably also a reviewer comment.
- Limitation: I could only read the Drive file as extracted text, because the PDF download failed (the file was too large for the connector). Any purely graphic markups such as clouds, strike-throughs or handwriting would not show up. Please look over the PDF itself to confirm there are no other markups.

**Conclusion (a):** the bid documents allowed flex runouts at diffusers, up to 6 ft fully extended (M502). The engineer's later submittal review prohibits flex duct and requires rigid round runouts. The approved-as-noted submittal is the governing direction now. Using flex would need an RFI and written acceptance from ACE.

---

## B. Flexible duct connectors (fabric connections at fans, ERV, AHUs, units)

| Sheet / location | Exact text |
|---|---|
| **M601 spec 5.D** (Sheet Metal Work) | "**5.D. FLEXIBLE CONNECTIONS: NEOPRENE-COATED GLASS FABRIC WITH AN AREA DENSITY OF 30 OZ PER SQ YD. PROVIDE WITH SEWED AND CEMENTED SEAMS, SIMILAR TO VENT FABRICS AND WITH METAL COLLARS. ALLOW MINIMUM MOVEMENT OF 1 IN.**" |
| **BE-600 spec 5.D** (boiler set, same generic spec) | "D. FLEXIBLE CONNECTIONS: NEOPRENE-COATED GLASS FABRIC, 30 OZ PER SQ YD, WITH SEWED AND CEMENTED SEAMS, SIMILAR TO VENT FABRICS. PROVIDE WITH METAL COLLARS. ALLOW MINIMUM MOVEMENT OF 1 IN." |
| M001 Abbreviations | "FC – FLEXIBLE CONNECTION" |
| M601 12. Vibration Isolation | 12.A.1 "PROVIDE ISOLATION FOR EQUIPMENT, PIPING AND DUCTWORK." 12.B.1: suspended AC units on combination spring/neoprene hangers (Mason 30N), 1.25" static deflection minimum. 12.B.2: "ALL FANS SHALL BE HUNG FROM MASON TYPE HD HANGERS HAVING A MINIMUM STATIC DEFLECTION OF 0.35"." |
| M001 Mechanical Code Note 4 | "VIBRATION ISOLATION: ALL MECHANICAL EQUIPMENT AND APPLIANCES SHALL BE PROVIDED WITH SUPPORTED AND RESTRAINT AS REQUIRED UNDER 2022 MECHANICAL CODE SECTION 313" |
| M601 15.A | 1" acoustic lining "FOR THE FIRST 25FT RUN OF INDOOR DUCTWORK ON THE INLETS AND OUTLETS OF ALL FANS AND AC UNITS". Outdoor duct gets 2" lining. |
| M505 details | Equipment support, curb-mounted unit, AC unit support and curb-mounted roof exhaust fan details show vibration isolators. **None of these details draws or calls out a fabric flex connection.** |
| M105 roof plan, ERV-1 / DXF-1 / TXF-1 | There are no "FC" callouts at the duct connections. ERV-1 is a RenewAire HE 10RT on the roof, 660 CFM (M402). |

The submittal included Duro Dyne "Flexible Duct Connector" catalog pages: Metal-Fab, Super Metal-Fab, TDC/TDF, Econ-O-Fab and Junior. Fabrics offered are Durolon, Excelon, Neoprene and Teflon. The catalog says "Select Duro Dyne fabrics are designed to meet NFPA 90A & 90B" and "UL Classified". **I found no ACE comment on the flexible connector pages.** In the submittal response, the only flex comment is the one on flex duct.

**Conclusion (b):** provide fabric flexible connections at fans, the ERV and ducted AC/air handler connections.
- Spec: neoprene-coated glass fabric, 30 oz/sq yd, sewn and cemented seams, metal collars, at least 1" of movement.
- Choose a fabric that meets NFPA 90A, for example a neoprene connector.
- The drawings do not set a maximum length for these connectors and do not say where they go. Install them at each equipment connection per spec 5.D and SMACNA practice.

---

## C. NYC Mechanical Code (general code knowledge, NOT from the contract documents; verify against the 2022 NYC MC text)

These points come from my general knowledge of the IMC-based 2022 NYC Mechanical Code and NFPA 90A, not from the job documents. Please check section numbers and any NYC amendments against the current code book.

- **MC 603.6.1 Flexible air ducts:** must be tested to UL 181 and labeled Class 0 or Class 1. In the base IMC (MC 603.6.1.1) there is no limit on flexible air duct length. Check whether NYC amends this.
- **MC 603.6.2 Flexible air connectors:** must be UL 181 Class 0 or Class 1. **MC 603.6.2.1 limits connector length to 14 ft.** **MC 603.6.2.2 says flexible air connectors shall not pass through any wall, floor or ceiling.**
- **MC 603.6.3:** air temperature in flexible ducts or connectors must not exceed 250°F.
- **MC 603.6.4:** flex ducts and connectors need clearance from gas vents and vent connectors. In the IMC this is about 4 in. Verify the NYC figure.
- **Installation:** flex must be installed per the manufacturer's listing. In the IMC, joints are sealed with UL 181B-listed tape or mastic (MC 603.9). Insulation must meet MC 604 and the NYCECC. M001 note 6 already references MC 604.
- **Fire-rated assemblies:** penetrations must comply with MC 607 and BC 714. Flex duct and flex connectors generally may not pass through rated walls or floors; the fire or fire/smoke damper sleeve has to connect to rigid duct. M103 note 10 cites MC 607.1.1 and BC 716.5 for the 20 sq in. exemption.
- **Plenums (MC 602.2.1):** materials exposed in plenums must have a flame spread index of 25 or less and a smoke-developed index of 50 or less. UL 181 Class 1 flex meets this.
- **Fabric vibration-isolation connectors at equipment:** in IMC 2015/2018 (MC 603.6 / 602) and NFPA 90A, the product called a "flexible air connector" is treated separately from fabric vibration-isolation connectors. NFPA 90A requires the fabric to be approved flame-retardant and limits these connectors to about **10 in. in the direction of airflow**. Check the current NYC MC and NFPA 90A edition before quoting this to the owner.

---

## Suggested reply to the owner

"Not for the duct runouts. The drawings first allowed short flex runouts at diffusers, up to 6 ft (detail on M502). The engineer (ACE) then reviewed our ductwork standards submittal and wrote 'Flex duct shall not be used. Use rigid round ducts instead.' So runouts will be rigid round. Fabric flexible connections at the fans, ERV and AC units are required by spec M601 5.D (neoprene-coated glass fabric, 30 oz, metal collars), and we will install those. Using flex duct anywhere would need an RFI and written approval from ACE."
