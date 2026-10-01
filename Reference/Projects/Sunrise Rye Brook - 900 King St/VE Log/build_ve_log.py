"""Sunrise Rye Brook - Value Engineering Log (budget pricing from GMP drawing quantities).

Run: python3 build_ve_log.py  ->  VE Log - Sunrise Rye Brook.pdf next to this script.
Quantities: GMP mechanical set 07/15/2026 (source/06 - Mechanical - IL AL GMP SET 2026-07-15.pdf).
Pricing: bid method per Reference/Estimating Standards/Proposal Standards.md
  labor $60/hr, overhead 20%, misc 2% (both on base), NY tax 8.875% on material.
Unit material prices are budget figures (no vendor quotes yet); see VE Log Record.md.
"""
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table,
                                TableStyle, KeepTogether, PageBreak)
from reportlab.lib.styles import ParagraphStyle

S = os.path.dirname(os.path.abspath(__file__)) + "/"
LOGO = os.path.join(S, "..", "..", "..", "..", "logo-full.png")
OUT = S + "VE Log - Sunrise Rye Brook.pdf"

FD = "/usr/share/fonts/truetype/liberation/"
pdfmetrics.registerFont(TTFont("Arial", FD + "LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", FD + "LiberationSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", FD + "LiberationSans-Italic.ttf"))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily("Arial", normal="Arial", bold="Arial-Bold", italic="Arial-Italic", boldItalic="Arial-Bold")

PW, PH = letter
BLUE = colors.HexColor("#236fa1"); GREY = colors.HexColor("#aeaeae"); LIGHT = colors.HexColor("#eef3f8")
REV = "Rev 0"
DATE = "10/1/2026"
QUOTE = "3112"

LABOR = 60.0
OH, MISC, TAX = 0.20, 0.02, 0.08875

# ---------------------------------------------------------------------------------------------
# Line items: (description, qty, unit, material per unit, man-hours per unit, services lump)
# Negative qty = deduct from quote 3112 scope, positive = add.
# ---------------------------------------------------------------------------------------------
VE = [
  dict(no="VE-1", title="VAV reheat: hot water coils to electric reheat",
       sheets="M2014-M2016, M6001 VAV schedule",
       desc="47 VAV boxes with hot water reheat (VAV-01 to VAV-47, 629 MBH). Replace hot water coils, coil piping "
            "packages and control valve installation with factory electric reheat coils with SCR control.",
       kw="+185 kW (EC)", needs="IMEG redesign / energy code; EE and utility service capacity",
       lines=[
         ("Hot water reheat coils at VAV boxes", -47, "ea", 450, 0),
         ("Coil piping packages (valves, balancing valve, strainer, unions)", -47, "ea", 350, 4.0),
         ("Install BMS-furnished control valves", -47, "ea", 0, 2.0),
         ("Electric reheat coils with SCR control, factory mounted", 47, "ea", 1350, 3.0),
       ]),
  dict(no="VE-2", title="Cabinet heaters: hot water to electric",
       sheets="M2014-M2016, M6001 cabinet heater schedule",
       desc="CH-1 to CH-12 at entries and stairs (234 MBH). Replace with electric cabinet heaters with integral "
            "thermostats, no BMS points.",
       kw="+70 kW (EC)", needs="IMEG; EE",
       lines=[
         ("Hot water cabinet heaters CH-1 to CH-12 (CH-9 large)", -12, "ea", 2280, 8.0),
         ("Hot water piping hook-ups at cabinet heaters", -12, "ea", 180, 4.0),
         ("Electric cabinet heaters with integral thermostat", 12, "ea", 1650, 6.0),
       ]),
  dict(no="VE-3", title="Basement FCUs: delete, heat / cool only where needed",
       sheets="M2000, M2002, M5000, M6000 FCU schedule",
       desc="FCU-A (20, hot water/glycol heating only) and RAD-1/2 in basement back-of-house rooms. DOAS branch "
            "ducts connect directly to diffusers. Electric heaters only for freeze protection; ductless AC and "
            "thermostatic exhaust for electrical rooms, MDF and laundry (not on the drawings today).",
       kw="+30 kW (EC)", needs="IMEG; fire protection designer for freeze-risk rooms",
       lines=[
         ("FCU-A fan coil units, horizontal, hot water", -20, "ea", 2800, 10.0),
         ("FCU piping hook-ups (valves, unions, flex)", -20, "ea", 220, 6.0),
         ("RAD-1, RAD-2", -2, "ea", 2000, 8.0),
         ("Electric unit / wall heaters with integral thermostat", 8, "ea", 900, 5.0),
         ("Ductless heat pump AC, MDF / electrical rooms, with line set", 4, "ea", 6500, 24.0),
         ("Thermostatic exhaust fans, laundry / electrical, with duct and louver", 3, "ea", 1800, 12.0),
       ]),
  dict(no="VE-4", title="Garage ramp snow melt: delete hydronic snow melt",
       sheets="M5000 (HX-3, P-3/P-4 120 F glycol to north and south ramps)",
       desc="Delete glycol mains and manifolds to the ramps. Owner options: no snow melt (trench drains, salting) or "
            "electric snow melt cable by EC. In-slab tubing not included in this deduct.",
       kw="0 / +240 kW if electric by EC", needs="Owner decision; civil / landscape for drainage",
       lines=[
         ("Glycol mains to ramps, 2-1/2\" (allowance, not drawn)", -400, "lf", 35, 0.6),
         ("Snow melt manifolds and controls connections", -2, "ea", 1500, 12.0),
       ]),
  dict(no="VE-5", title="Pool and spa: dedicated gas heaters in lieu of HX-1 / HX-2",
       sheets="M5000, M6000 (HX-1 pool 500 MBH, HX-2 spa 245 MBH)",
       desc="Delete pool and spa heat exchangers and their boiler-side piping. Dedicated condensing gas pool and spa "
            "heaters with venting (gas piping by plumber, excluded). Deduct only if heaters move to pool contractor.",
       kw="0", needs="Pool designer; NY All-Electric Buildings Act check for new gas appliances",
       lines=[
         ("HX-1 pool heat exchanger", -1, "ea", 6000, 24.0),
         ("HX-2 spa heat exchanger", -1, "ea", 4000, 24.0),
         ("Boiler-side piping to HX-1 / HX-2, 2\" (allowance)", -150, "lf", 30, 0.5),
         ("Gas pool heater ~600 MBH input, condensing", 1, "ea", 14000, 32.0),
         ("Gas spa heater ~300 MBH input, condensing", 1, "ea", 8000, 24.0),
         ("Heater venting, sidewall / areaway", 2, "ea", 3000, 16.0),
       ]),
  dict(no="VE-6", title="Delete boiler plant and hot water / glycol distribution",
       sheets="M2001-M2003, M2014-M2016, M5000, M6000",
       desc="Possible only with VE-1 to VE-5. Deletes B-1/2/3, BP-1/2, PP-1/2, P-1 to P-4, HS-1, ET-1/2, AS-1, "
            "HX-3, chemical feed, glycol fill, boiler room piping, basement mains and risers, 1st floor hot water "
            "piping, insulation, boiler venting, combustion air, water treatment, hydronic balancing and start-up. "
            "GC also saves the fire-rated chimney enclosures and combustion air areaway.",
       kw="-", needs="IMEG; Sunrise",
       lines=[
         ("Boilers B-1, B-2, B-3 (1,999 MBH each), set and connect", -3, "ea", 68000, 80.0),
         ("Pumps BP-1/2, PP-1/2", -4, "ea", 8000, 16.0),
         ("Pumps P-1 to P-4 (glycol)", -4, "ea", 4500, 16.0),
         ("HS-1, ET-1/2, AS-1, chemical feeder, glycol fill package", -1, "ls", 22000, 60.0),
         ("HX-3 glycol heat exchanger", -1, "ea", 9000, 24.0),
         ("Boiler room piping 2-1/2\" to 6\" welded (allowance, not drawn)", -400, "lf", 55, 1.2),
         ("Boiler room valves, trim, gauges (allowance)", -1, "ls", 25000, 120.0),
         ("Basement mains and risers, 2-1/2\" avg (allowance, not drawn)", -1200, "lf", 35, 0.6),
         ("Glycol piping to garage / basement units, 1-1/2\" (allowance)", -900, "lf", 22, 0.4),
         ("1st floor HW piping 1/2\" to 1\" (measured, M2014-M2016)", -3400, "lf", 14, 0.30),
         ("1st floor HW mains 1-1/4\" to 2-1/2\" (measured, M2014-M2016)", -1500, "lf", 28, 0.45),
         ("Pipe insulation, hot water and glycol", -7800, "lf", 5, 0.08),
         ("Boiler venting, basement to roof (3 boilers)", -200, "lf", 90, 0.5),
         ("Combustion air duct, louver, damper", -1, "ls", 4000, 40.0),
         ("Flush, fill, water treatment, pressure test", -1, "ls", 6000, 80.0),
         ("Boiler factory start-up", -1, "ls", 0, 0, 6000),
         ("Hydronic balancing (3rd party)", -1, "ls", 0, 0, 18000),
       ]),
  dict(no="VE-9", title="Fire/smoke dampers at apartment duct branches",
       sheets="M2020-M2043, M2100-M2110 (about 360 FSD tags)",
       desc="DOAS supply branches to each apartment (6x4 to 8x6) are drawn with combination fire/smoke dampers. "
            "Branches under 100 sq in in 26 ga steel, no openings into the corridor, above the ceiling, with 12\" "
            "steel sleeve: no damper required at corridor fire partitions (IBC 717.5.4 exception). Dampers stay at "
            "shafts and smoke barriers. EC and fire alarm credits for damper power and modules are additional.",
       kw="-", needs="IMEG / HKS code analysis (AL Group I-1, smoke barriers), building department",
       lines=[
         ("Combination fire/smoke dampers at apartment branches", -283, "ea", 650, 3.0),
         ("Access doors at dampers", -283, "ea", 60, 0.5),
         ("Steel sleeves at corridor wall penetrations", 283, "ea", 40, 1.0),
       ]),
  dict(no="VE-14", title="Apartment bath exhaust ducted to DOAS exhaust",
       sheets="M2020-M2043, M2100-M2110, M6001 (TX-A)",
       desc="Each apartment bath has its own exhaust fan TX-A (75 CFM) ducted out the exterior wall. Duct bath "
            "exhaust to the DOAS exhaust trunk in the corridor instead (energy wheel recovers it). Deletes 283 fans, "
            "wall caps and EC circuits. Corridor return trunk is reused as the exhaust trunk.",
       kw="-11 kW", needs="IMEG; DOAS exhaust airflow check",
       lines=[
         ("TX-A bath exhaust fans", -283, "ea", 180, 2.5),
         ("Wall caps and exhaust duct to exterior wall", -283, "ea", 105, 1.5),
         ("Exhaust branch to corridor trunk with grille (no damper, VE-9)", 283, "ea", 120, 3.0),
         ("Corridor exhaust trunk upsizing (allowance)", 1, "ls", 30000, 400.0),
       ]),
]

# Items without a number yet (need a quote or a redesign).
TBD = [
  ("VE-11", "No BMS: standalone equipment controls only (Sunrise Northport precedent)",
   "Deduct = BMS amount carried in quote 3112 less standalone controls. Needs the BMS contractor's breakdown. "
   "Supersedes VE-7."),
  ("VE-12", "Common areas: delete 47 VAV boxes; single-zone RTUs for large spaces, ductless / VRF for small rooms",
   "Replaces VE-1 if taken. Priced after IMEG issues a zoning concept."),
  ("VE-10", "Shorten DOAS corridor return", "Included in VE-14 (return trunk reused as exhaust)."),
]


def money(x):
    s = "${:,.0f}".format(abs(x))
    return "-" + s if x < 0 else s


def price(lines):
    mat = sum(q * m for _, q, _, m, *_ in lines)
    mh = sum(q * h for _, q, _, _, h, *_ in lines)
    svc = sum(q * (l[5] if len(l) > 5 else 0) for l in lines for q in [l[1]])
    lab = mh * LABOR
    base = mat + lab + svc
    total = base * (1 + OH + MISC) + mat * TAX
    return mat, mh, lab, svc, base, round(total / 100.0) * 100


for v in VE:
    v["mat"], v["mh"], v["lab"], v["svc"], v["base"], v["total"] = price(v["lines"])

PACKAGE = ["VE-1", "VE-2", "VE-3", "VE-4", "VE-5", "VE-6", "VE-9", "VE-14"]
PKG_TOTAL = sum(v["total"] for v in VE if v["no"] in PACKAGE)

# sanity: VE-6 must be a deduct, package must be a net deduct
assert [v for v in VE if v["no"] == "VE-6"][0]["total"] < 0
assert PKG_TOTAL < 0

# ---------------------------------------------------------------------------------------------
pB = ParagraphStyle("b", fontName="Arial", fontSize=9, leading=11)
pS = ParagraphStyle("s", fontName="Arial", fontSize=8, leading=9.6)
pSB = ParagraphStyle("sb", fontName="Arial-Bold", fontSize=8, leading=9.6)
pH = ParagraphStyle("h", fontName="Arial-Bold", fontSize=10.5, leading=13, textColor=BLUE, spaceBefore=8, spaceAfter=4)
pT = ParagraphStyle("t", fontName="Arial-Bold", fontSize=9.5, leading=12)


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
    c.drawString(45, PH - 30, "Sunrise Rye Brook - Value Engineering Log %s - %s" % (REV, DATE))
    c.setFillColor(colors.black)
    footer(c, doc)


def footer(c, doc):
    c.setFont("Arial", 7.5); c.setFillColor(GREY)
    c.drawRightString(PW - 45, 25, "Page %d" % doc.page)
    c.drawString(45, 25, "Budget pricing from GMP drawing quantities - final pricing after IMEG revised drawings")
    c.setFillColor(colors.black)


doc = BaseDocTemplate(OUT, pagesize=letter, leftMargin=45, rightMargin=45, topMargin=45, bottomMargin=40,
                      title="Sunrise Rye Brook - VE Log", author="Northern Wolves AC")
f1 = Frame(45, 40, PW - 90, PH - 278, id="f1")
f2 = Frame(45, 40, PW - 90, PH - 85, id="f2")
doc.addPageTemplates([PageTemplate("first", [f1], onPage=first_page, autoNextPageTemplate="later"),
                      PageTemplate("later", [f2], onPage=later_pages)])

st = []
st.append(Paragraph('Project: <b>Sunrise Rye Brook - Independent Living / Assisted Living</b>', pB))
st.append(Spacer(1, 4))
st.append(Paragraph('Address: <b>900 King St, Rye Brook, NY 10573</b>', pB))
st.append(Spacer(1, 4))
st.append(Paragraph('<b>Mechanical drawings: GMP set dated 07.15.2026 / Base: Quote 3112 (drawings 06.05.2026)</b>', pB))
st.append(Paragraph("Value Engineering Log - Summary", pH))

hdr = ["VE", "Item", "Deduct / Add", "Electric", "Approvals needed"]
rows = [hdr]
for v in VE:
    rows.append([v["no"], Paragraph(v["title"], pS), money(v["total"]), Paragraph(v["kw"], pS), Paragraph(v["needs"], pS)])
for no, t, note in TBD:
    rows.append([no, Paragraph(t, pS), "TBD", "", Paragraph(note, pS)])
rows.append(["", Paragraph("<b>Recommended package: %s</b>" % ", ".join(PACKAGE), pS), money(PKG_TOTAL), "", Paragraph("plus VE-11 / VE-12 when priced", pS)])
t = Table(rows, colWidths=[34, 190, 66, 70, 162], repeatRows=1)
t.setStyle(TableStyle([
    ("FONT", (0, 0), (-1, 0), "Arial-Bold", 8), ("FONT", (0, 1), (-1, -1), "Arial", 8),
    ("FONT", (2, -1), (2, -1), "Arial-Bold", 8.5),
    ("BACKGROUND", (0, 0), (-1, 0), LIGHT), ("BACKGROUND", (0, -1), (-1, -1), LIGHT),
    ("ALIGN", (2, 0), (2, -1), "RIGHT"), ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#c7ced6")),
    ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
]))
st.append(t)
st.append(Paragraph("Notes", pH))
for n in [
    "Budget pricing from quantities on the GMP mechanical set dated 07.15.2026. Piping on the basement sheets is not "
    "drawn; those runs are allowances. Final pricing after IMEG issues revised drawings.",
    "Negative amounts are deducts from quote 3112, positive amounts are adds. VE-6 is available only together with "
    "VE-1 to VE-5. VE-12 replaces VE-1 if taken.",
    "Electrical work for electric heat (power, disconnects, service upgrade) by EC and is not included. "
    "Electrical, fire alarm and GC credits (damper power, TX-A circuits, chimney enclosures, combustion air areaway) "
    "are additional to the amounts shown.",
    "Gas piping excluded (as in quote 3112). Redesign, re-filing and permit fees by others.",
    "VE-7 (packaged controls) is superseded by VE-11. VE-8 (full VRF for common areas) not recommended.",
]:
    st.append(Paragraph("&#9642;&nbsp; " + n, pS))
    st.append(Spacer(1, 2))

st.append(Spacer(1, 6))
st.append(Paragraph("Value Engineering Log - Detail", pH))
for v in VE:
    block = [Paragraph("%s  %s" % (v["no"], v["title"]), pT),
             Paragraph("<i>Drawings: %s</i>" % v["sheets"], pS), Spacer(1, 2),
             Paragraph(v["desc"], pS), Spacer(1, 4)]
    rows = [["Line item", "Qty", "Unit", "Material", "MH", "Labor", "Services"]]
    for l in v["lines"]:
        dsc, q, u, m, h = l[:5]
        svc = l[5] if len(l) > 5 else 0
        rows.append([Paragraph(dsc, pS), "{:,}".format(q), u, money(q * m) if m else "",
                     "{:,.0f}".format(q * h) if h else "", money(q * h * LABOR) if h else "",
                     money(q * svc) if svc else ""])
    rows.append(["Subtotal", "", "", money(v["mat"]), "{:,.0f}".format(v["mh"]), money(v["lab"]),
                 money(v["svc"]) if v["svc"] else ""])
    rows.append(["Overhead 20%, misc 2%, tax 8.875% on material", "", "", "", "", "",
                 money(v["total"] - v["base"])])
    rows.append(["%s total (rounded)" % v["no"], "", "", "", "", "", money(v["total"])])
    t = Table(rows, colWidths=[226, 40, 26, 62, 40, 54, 54])
    t.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, 0), "Arial-Bold", 7.5), ("FONT", (0, 1), (-1, -1), "Arial", 7.5),
        ("FONT", (0, -3), (-1, -1), "Arial-Bold", 7.5),
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT), ("BACKGROUND", (0, -1), (-1, -1), LIGHT),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"), ("ALIGN", (2, 0), (2, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("SPAN", (0, -2), (5, -2)), ("SPAN", (0, -1), (5, -1)),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#c7ced6")),
        ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    block.append(t)
    block.append(Paragraph("Electric: %s.  Approvals: %s." % (v["kw"], v["needs"]), pS))
    block.append(Spacer(1, 12))
    st.append(KeepTogether(block))

st.append(Paragraph("Open items (not priced)", pH))
for no, tt, note in TBD:
    st.append(Paragraph("<b>%s</b>  %s. %s" % (no, tt, note), pS)); st.append(Spacer(1, 3))

doc.build(st)
for v in VE:
    print("%-6s %12s  mat %10s  MH %6.0f" % (v["no"], money(v["total"]), money(v["mat"]), v["mh"]))
print("package", money(PKG_TOTAL))
print(OUT)
