"""Sunrise Rye Brook - Mechanical Value Engineering Proposals (no pricing), with drawing screenshots.

Run: python3 crops.py && python3 build_ve_proposals.py
Screenshots come from the GMP mechanical set 07/15/2026 (crops.py). Pool, spa and sauna are by others and excluded.
"""
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
                                Image, KeepTogether, CondPageBreak, PageBreak)
from reportlab.lib.styles import ParagraphStyle

S = os.path.dirname(os.path.abspath(__file__)) + "/"
LOGO = os.path.join(S, "..", "..", "..", "..", "logo-full.png")
OUT = S + "VE Proposals - Sunrise Rye Brook.pdf"
IMG = S + "img/"

FD = "/usr/share/fonts/truetype/liberation/"
pdfmetrics.registerFont(TTFont("Arial", FD + "LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", FD + "LiberationSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", FD + "LiberationSans-Italic.ttf"))
registerFontFamily("Arial", normal="Arial", bold="Arial-Bold", italic="Arial-Italic", boldItalic="Arial-Bold")

PW, PH = letter
BLUE = colors.HexColor("#236fa1"); GREY = colors.HexColor("#aeaeae"); LIGHT = colors.HexColor("#eef3f8")
LINE = colors.HexColor("#c7ced6")
REV, DATE, QUOTE = "Rev 1", "10/6/2026", "3112"

VE = [
  dict(no="VE-01", title="Heating plant: delete boilers and hot water / glycol systems",
       area="AL basement boiler room, chimneys to roof, hot water and glycol piping throughout",
       designed=[
         "Three 1,999 MBH gas boilers B-1, B-2, B-3 (5,700 MBH output), primary / secondary with HS-1",
         "Pumps BP-1/2, PP-1/2, P-1 to P-4, expansion tanks ET-1/2, air separator AS-1, heat exchanger HX-3 to 30% glycol",
         "Fire-rated chimney enclosures basement to roof, combustion air areaway, water treatment, hot water and glycol "
         "distribution to the 1st floor and basement",
         "Connected heating load about 2,430 MBH: the plant is about 2.3 times the load",
       ],
       proposed=[
         "Delete the boiler plant and all hot water / glycol distribution; the building runs on gas rooftop units, "
         "heat pump DOAS and the electric terminal heat in VE-02 to VE-06",
         "No boiler room equipment, chimneys, combustion air, water treatment, flushing or hydronic balancing",
         "Pool and spa heating by the pool contractor (by others)",
       ],
       benefits="Largest single reduction in mechanical, controls and GC scope (chimney shafts, areaway, boiler room "
                "fit-out). Removes the boiler plant maintenance and its BMS sequences.",
       needs="Requires VE-02 to VE-06. IMEG redesign; Sunrise approval.",
       kw="See VE-02 to VE-05",
       imgs=[("m5000_boiler_room", "M5000 Hydronic flow diagram - boiler room"),
             ("m2002_boiler_room", "M2002 AL basement - boiler room, pumps, heat exchangers, chimney enclosures"),
             ("m6001_boiler_pump", "M6001 Boiler and pump schedules")]),
  dict(no="VE-02", title="VAV reheat: electric reheat only where needed",
       area="1st floor common areas, IL and AL (VAV-1 to VAV-47)",
       designed=[
         "47 VAV boxes with hot water reheat coils (629 MBH, 45 GPM) on 5 rooftop units",
         "Hot water piping, control valves, balancing and insulation to every box (M2014 to M2016)",
       ],
       proposed=[
         "Same rooftop units as designed (gas heat). VAV boxes kept in enclosed rooms (VE-03) get factory electric "
         "reheat coils with SCR control and a simple standalone thermostat: 25 boxes",
         "Interior / back-of-house rooms: VAV box kept cooling-only, no reheat required since the rooftop units are "
         "gas heat (VAV-8, VAV-14, VAV-31, VAV-32)",
         "No hot water piping, coil packages or control valves at any box. See mark-ups M2010, M2011, M2013",
       ],
       benefits="Deletes 1st floor hot water piping and 47 valve / coil packages; standalone thermostats instead of "
                "BMS zone control.",
       needs="IMEG redesign and energy code check (VAV minimums); electrical service capacity by EE.",
       kw="About +97 kW connected (25 boxes, per-box kW on the mark-ups: scheduled HW MBH / 3.412), versus about 185 kW if all 47 were electric",
       imgs=[("mk_m2010_b", "Mark-up M2010 IL area A - reception / lounge / bistro and offices"),
             ("m5000_vav_ch", "M5000 Hydronic flow diagram - IL and AL VAV reheat and cabinet heaters"),
             ("m6000_vav_sched", "M6000 VAV schedule - hydronic reheat (partial)")]),
  dict(no="VE-03", title="Common areas: cancel VAV boxes in open areas and circulation",
       area="1st floor lounges, bistros, dining rooms, reception, corridors, kitchen, restrooms",
       designed=["47 VAV zones on 5 rooftop units, including open areas that are one space with their neighbors"],
       proposed=[
         "Same rooftop units and main ductwork as designed. Cancel 18 VAV boxes in open areas and circulation "
         "(lounge, bistro, coffee shop, reception, formal / casual / AL dining, parlor, kitchen, corridors, restrooms)",
         "Branch ducts stay, with manual volume dampers balanced to the design maximum CFM; the area is served "
         "directly by its rooftop unit (rooftop unit space sensor in that area), gas heat from the rooftop unit",
         "VAV boxes stay only in enclosed rooms (offices, theaters, activity, fitness, salon, private dining, "
         "library, family rooms) - see VE-02. No ductless units added",
         "Each box is marked on the attached mark-ups: CANCEL VAV / KEEP VAV - ELEC. REHEAT / KEEP VAV - NO REHEAT",
       ],
       benefits="18 fewer VAV boxes, reheat coils, thermostats and controls; simpler operation.",
       needs="IMEG zoning review (rooftop unit control zone per unit); Sunrise approval.",
       kw="Reduces electric reheat (included in VE-02 figure)",
       imgs=[("mk_m2010_a", "Mark-up M2010 IL area A - multi-purpose, theater, salon, offices, corridor"),
             ("mk_m2011", "Mark-up M2011 IL area B - dining rooms, kitchen, restrooms"),
             ("mk_m2013", "Mark-up M2013 AL area D - bistro, parlor, reception, corridor, activity rooms")]),
  dict(no="VE-04", title="Cabinet heaters: hot water to electric",
       area="Entries, vestibules and trash room (CH-1, CH-3 to CH-12)",
       designed=["11 hot water cabinet heaters in the schedule (CH-8 not shown on plans) with piping and BMS control"],
       proposed=["Electric cabinet heaters with integral thermostats at the same locations; no piping, no BMS "
                 "points. Each heater is marked on mark-ups M2010 and M2011"],
       benefits="Deletes piping to 11 remote locations; standalone control.",
       needs="IMEG; EE.",
       kw="About +58 kW connected for the 10 heaters on the plans (5.3 kW typical, CH-9 10.4 kW)",
       imgs=[("mk_m2010_a", "Mark-up M2010 - CH-12 and other entries"),
             ("m6001_ch_sched", "M6001 Cabinet heater schedule")]),
  dict(no="VE-05", title="Basement fan coil units: electric unit heaters",
       area="IL and AL basement back-of-house rooms (FCU-A)",
       designed=[
         "FCU-A, quantity 20, \"basement heating\", hot water / glycol heating coil only (schedule data blank); "
         "M5000 shows FCU-1 to FCU-17 on the glycol loop with RAD-1/2",
         "Each FCU takes a small DOAS branch at its inlet and recirculates the room",
         "No glycol or hot water piping to these units is drawn on M2001 / M2003",
       ],
       proposed=[
         "Delete the FCUs and RAD-1/2. Electric unit heater with integral thermostat in each room that had an FCU "
         "(storage, trash, corridor, staff lounge, mechanical); DOAS branch duct extended directly to the room "
         "diffuser, return grille deleted. Each unit is marked on mark-ups M2000 and M2002",
         "Electrical room B123 and central laundry B121: FCU deleted; these rooms need cooling / ventilation, "
         "not heat - see RFI-01 (separate page, not priced)",
       ],
       benefits="Deletes the fan coils, glycol piping and their controls.",
       needs="IMEG; fire protection designer to confirm freeze-protection locations.",
       kw="About +35 kW connected (3 kW storage / corridor / lounge, 5 kW larger rooms and trash rooms; per-room kW on the mark-ups)",
       imgs=[("mk_m2002_n", "Mark-up M2002 AL basement - storage, corridor, staff lounge, mechanical, electrical, laundry"),
             ("mk_m2002_s", "Mark-up M2002 AL basement south - trash and storage rooms"),
             ("mk_m2000", "Mark-up M2000 IL basement - residents' storage, trash collection"),
             ("m6000_fcu_sched", "M6000 Fan coil unit schedule (FCU-A, quantity 20, no data)")]),
  dict(no="VE-06", title="Garage ramp snow melt",
       area="North and south garage ramps (HX-3, P-3 / P-4, 120 F glycol)",
       designed=["In-floor radiant snow melt loops on both ramps from the boiler plant through HX-3"],
       proposed=[
         "Option A: no snow melt; trench drains and salting (owner decision)",
         "Option B: electric snow melt cable by EC, storm-only operation with load shedding",
       ],
       benefits="Removes the long glycol mains from the boiler room to the ramps and the snow melt pumps.",
       needs="Owner decision; civil / landscape for drainage.",
       kw="Option A: 0; option B: about +240 kW (storm only)",
       imgs=[("m5000_garage_snow", "M5000 Hydronic flow diagram - basement FCUs, RAD-1/2 and ramp snow melt loops")]),
  dict(no="VE-07", title="Fire / smoke dampers at apartment duct branches",
       area="Floors 1 to 4, IL and AL corridors (about 360 FSD tags)",
       designed=[
         "Combination fire / smoke damper at every DOAS supply / return branch into each apartment "
         "(M2023 note: \"provide fire/smoke damper at all DOAS supply/return penetrations through demising walls\")",
         "Each damper needs power, fire alarm interface, access door in a finished ceiling and periodic testing",
       ],
       proposed=[
         "Apartment branches (6x4 to 8x6) under 100 sq in, 26 ga steel, no openings into the corridor, above the "
         "ceiling, with 12\" steel sleeve: no damper required at the corridor fire partition "
         "(IBC 717.5.4 exception); plain fire dampers as fallback",
         "Fire / smoke dampers kept at shafts and smoke barriers",
       ],
       benefits="Removes about 283 fire / smoke dampers with their power, fire alarm modules and access doors "
                "(mechanical, electrical and fire alarm scope).",
       needs="IMEG / HKS code analysis (AL Group I-1 smoke barriers), building department.",
       kw="Reduces damper power circuits",
       imgs=[("m2023_corridor_fsd", "M2023 AL 2nd floor - DOAS corridor ducts, FSD at shaft and note for all units"),
             ("m2023_corridor_2", "M2023 AL 2nd floor - DOAS branches with FSD into each apartment")]),
  dict(no="VE-08", title="Apartment bath exhaust to the DOAS energy recovery",
       area="All apartments, IL and AL (TX-A)",
       designed=[
         "Each apartment bath has its own exhaust fan TX-A (75 CFM) ducted out the exterior wall",
         "DOAS return is taken from corridors and a few rooms; some AL unit types show a DOAS return grille "
         "RG-2, the floor plans connect the return trunk to only a few (to be clarified)",
       ],
       proposed=[
         "Duct apartment bath exhaust to the DOAS exhaust trunk in the corridor (as on Sunrise of Northport); "
         "the DOAS energy wheel recovers the exhaust heat",
         "Delete the individual TX-A fans, wall caps and their electrical circuits; delete RG-2 in the units",
       ],
       benefits="Fewer wall penetrations and fans to maintain; better energy recovery and code compliance; "
                "the corridor return trunk serves every apartment.",
       needs="IMEG; DOAS exhaust airflow check.",
       kw="About -11 kW (fans deleted)",
       imgs=[("m2108_al_units", "M2108 AL unit plans - TX-A bath exhaust to exterior, SG-1 / RG-2 DOAS grilles")]),
  dict(no="VE-09", title="Controls: standalone equipment controls in lieu of BMS",
       area="Building-wide",
       designed=["Full BMS by the BMS contractor for boilers, pumps, heat exchangers, glycol, snow melt, "
                 "VAV reheat, FCUs, cabinet heaters, rooftop units and DOAS"],
       proposed=[
         "With VE-01 to VE-06 the hydronic sequences (about 120 to 150 points) are gone",
         "Rooftop units and DOAS on their factory controls with network cards for future monitoring; heaters, "
         "mini-splits and PTACs on standalone thermostats (as on other Sunrise communities)",
       ],
       benefits="Large reduction or deletion of the BMS contract; simpler operation for the community staff.",
       needs="Sunrise approval of the controls standard.",
       kw="-",
       imgs=[("m5000_vav_ch", "M5000 - BMS-controlled hydronic terminals eliminated by VE-01 to VE-05")]),
]

GAPS = [
  "Basement piping sheets M2001 / M2003 show no boiler room, main or glycol piping.",
  "FCU counts do not match: schedule FCU-A quantity 20 (all data blank), M5000 FCU-1 to FCU-17, plans about 12.",
  "Pump schedule PP-1 / PP-2 blank. RTU-5 heating output 864 MBH is greater than its 600 MBH input.",
    "AL unit plans show DOAS return grilles RG-2 in some unit types; floor plans connect the return trunk to only a few rooms.",
]

pB = ParagraphStyle("b", fontName="Arial", fontSize=9.5, leading=12)
pS = ParagraphStyle("s", fontName="Arial", fontSize=8.5, leading=10.5)
pBul = ParagraphStyle("bul", parent=pS, leftIndent=10, bulletIndent=0)
pCap = ParagraphStyle("cap", fontName="Arial-Italic", fontSize=7.5, leading=9, textColor=colors.HexColor("#555555"))
pH = ParagraphStyle("h", fontName="Arial-Bold", fontSize=10.5, leading=13, textColor=BLUE, spaceBefore=6, spaceAfter=4)
pT = ParagraphStyle("t", fontName="Arial-Bold", fontSize=11, leading=14, textColor=BLUE)
pL = ParagraphStyle("l", fontName="Arial-Bold", fontSize=8.5, leading=10.5, spaceBefore=4)


def first_page(c, doc):
    img = ImageReader(LOGO); w = 113; h = w * 1303 / 2367
    c.drawImage(img, 45, PH - 32 - h, width=w, height=h, mask="auto")
    c.setFont("Arial", 9)
    c.drawRightString(PW - 45, PH - 40, "Ref. Quote: %s / Date: %s / %s" % (QUOTE, DATE, REV))
    y = PH - 118
    for line in ["Northern Wolves AC", "55 9th St, 55-A2", "Brooklyn, NY", "11215, US", "(347) 463-9248", "",
                 "Prepared By:", "Alikhan Ilyas", "(347) 463-9248", "alikhan@northernwolvesac.com"]:
        c.drawString(45, y, line); y -= 10.5
    c.setFont("Arial", 8); c.setFillColor(GREY); c.drawRightString(PW - 45, PH - 118, "Customer")
    c.setFont("Arial", 9); c.setFillColor(colors.black)
    c.drawRightString(PW - 45, PH - 128, "Callahan Construction Managers")
    footer(c, doc)


def later_pages(c, doc):
    c.setFont("Arial", 8); c.setFillColor(GREY)
    c.drawString(45, PH - 30, "Sunrise Rye Brook - Mechanical Value Engineering Proposals %s - %s" % (REV, DATE))
    c.setFillColor(colors.black)
    footer(c, doc)


def footer(c, doc):
    c.setFont("Arial", 7.5); c.setFillColor(GREY)
    c.drawRightString(PW - 45, 25, "Page %d" % doc.page)
    c.drawString(45, 25, "Screenshots: IMEG mechanical GMP set dated 07.15.2026. Pricing to follow.")
    c.setFillColor(colors.black)


def pic(name, cap, maxw=PW - 90, maxh=300):
    ir = ImageReader(IMG + name + ".png"); iw, ih = ir.getSize()
    sc = min(maxw / iw, maxh / ih)
    im = Image(IMG + name + ".png", width=iw * sc, height=ih * sc)
    t = Table([[im], [Paragraph(cap, pCap)]], colWidths=[maxw])
    t.setStyle(TableStyle([("BOX", (0, 0), (0, 0), 0.5, LINE), ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                           ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]))
    return t


def bullets(items):
    return [Paragraph(t, pBul, bulletText="▪") for t in items]


doc = BaseDocTemplate(OUT, pagesize=letter, leftMargin=45, rightMargin=45, topMargin=45, bottomMargin=40,
                      title="Sunrise Rye Brook - Mechanical VE Proposals", author="Northern Wolves AC")
doc.addPageTemplates([
    PageTemplate("first", [Frame(45, 40, PW - 90, PH - 278, id="f1")], onPage=first_page, autoNextPageTemplate="later"),
    PageTemplate("later", [Frame(45, 40, PW - 90, PH - 85, id="f2")], onPage=later_pages)])

st = [Paragraph('Project: <b>Sunrise Rye Brook - Independent Living / Assisted Living</b>', pB), Spacer(1, 3),
      Paragraph('Address: <b>900 King St, Rye Brook, NY 10573</b>', pB), Spacer(1, 3),
      Paragraph('<b>Mechanical drawings dated: 07.15.2026 (GMP set)</b>', pB),
      Paragraph("Mechanical Value Engineering Proposals", pH),
      Paragraph("Northern Wolves reviewed the GMP mechanical set and proposes the value engineering items below. "
                "The design today relies on a 5,700 MBH boiler plant with hot water and glycol distribution, "
                "hydronic VAV reheat, fan coils and cabinet heaters, plus a full BMS. Most of this can be replaced "
                "by the gas rooftop units and heat pump DOAS already in the design and small electric or heat pump "
                "terminals, as done on other recent Sunrise communities. Pricing of each item will follow once the "
                "owner selects the items to pursue. Pool, spa and sauna systems are by others and not part of this "
                "review.", pS), Spacer(1, 6)]

rows = [["VE", "Item", "Area", "Approvals"]]
for v in VE:
    rows.append([v["no"], Paragraph(v["title"], pS), Paragraph(v["area"], pS), Paragraph(v["needs"], pS)])
t = Table(rows, colWidths=[38, 190, 160, 134], repeatRows=1)
t.setStyle(TableStyle([("FONT", (0, 0), (-1, 0), "Arial-Bold", 8.5), ("FONT", (0, 1), (0, -1), "Arial-Bold", 8.5),
                       ("BACKGROUND", (0, 0), (-1, 0), LIGHT), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                       ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                       ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
st += [t, Spacer(1, 4),
       Paragraph("VE-01 requires VE-02 to VE-06. Electrical work for electric heat by EC; "
                 "electrical service capacity to be confirmed by the EE and utility.", pS)]

for v in VE:
    st.append(CondPageBreak(260))
    head = [Spacer(1, 10), Paragraph("%s  %s" % (v["no"], v["title"]), pT),
            Paragraph("<b>Area:</b> %s" % v["area"], pS),
            Paragraph("As designed", pL)] + bullets(v["designed"]) + [Paragraph("Proposed", pL)] + bullets(v["proposed"])
    st.append(KeepTogether(head))
    st += [Paragraph("<b>Benefits:</b> " + v["benefits"], pS),
           Paragraph("<b>Electrical impact:</b> " + v["kw"], pS),
           Paragraph("<b>Approvals / coordination:</b> " + v["needs"], pS), Spacer(1, 4)]
    for name, cap in v["imgs"]:
        st += [pic(name, cap), Spacer(1, 6)]

st.append(CondPageBreak(150))
st.append(Paragraph("Coordination items found during the review (RFI to follow)", pH))
st += bullets(GAPS)

# RFI-01 (same text as the mark-up set), on its own page, not priced
import importlib.util
_spec = importlib.util.spec_from_file_location("mk", S + "../VE Mark-ups/build_markups.py")
_mk = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_mk)
st += [PageBreak(), Paragraph("RFI-01 - Cooling and ventilation of equipment rooms (to IMEG)", pH),
       Paragraph("Reference: mechanical GMP set dated 07.15.2026, sheets M2000, M2002, M2013, M6000. "
                 "Not included in our VE proposals or pricing.", pS), Spacer(1, 6)]
rows = [["#", "Room", "Question"]] + [[str(i), Paragraph(r, pS), Paragraph(q, pS)] for i, (r, q) in enumerate(_mk.RFI, 1)]
t = Table(rows, colWidths=[20, 150, 352])
t.setStyle(TableStyle([("FONT", (0, 0), (-1, 0), "Arial-Bold", 8.5), ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
                       ("VALIGN", (0, 0), (-1, -1), "TOP"), ("GRID", (0, 0), (-1, -1), 0.4, LINE)]))
st += [t, Spacer(1, 6), Paragraph("Response requested: design load and the system to be provided for each room, "
                                  "so it can be priced separately.", pS)]

doc.build(st)
print(OUT)
