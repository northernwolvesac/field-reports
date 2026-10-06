"""Sunrise Rye Brook - VE drawing mark-ups (VAV zoning / electric reheat, cabinet heaters, basement FCUs) + RFI page.

Run: python3 build_markups.py  ->  VE Mark-ups - Sunrise Rye Brook.pdf
Marks are drawn on copies of the GMP mechanical sheets (07/15/2026). Tag positions are found by text search;
the per-tag decision and room are in the tables below. Pool, spa and sauna are by others (not marked up).
"""
import os, io
import pymupdf
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
                                PageBreak, NextPageTemplate)
from reportlab.lib.styles import ParagraphStyle

S = os.path.dirname(os.path.abspath(__file__)) + "/"
SRC = S + "../source/06 - Mechanical - IL AL GMP SET 2026-07-15.pdf"
LOGO = os.path.join(S, "..", "..", "..", "..", "logo-full.png")
OUT = S + "VE Mark-ups - Sunrise Rye Brook.pdf"
DATE, REV = "10/6/2026", "Rev 0"
FONT = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
BOLD = pymupdf.Font(fontfile=FONT)

# action -> (sheet label, color rgb, legend text)
ACT = {
  "CANCEL": ("CANCEL VAV", (0.85, 0.10, 0.10),
             "Cancel VAV box (open area / circulation). Branch duct stays with manual volume damper, balanced to "
             "design max CFM; area served directly by the RTU (RTU space sensor here). Gas heat from the RTU."),
  "EREHEAT": ("KEEP VAV - ELEC. REHEAT", (0.10, 0.35, 0.80),
              "Keep VAV box. Electric reheat coil with SCR in lieu of hot water coil; simple standalone "
              "thermostat. No hot water piping or control valve."),
  "NOREHEAT": ("KEEP VAV - NO REHEAT", (0.05, 0.55, 0.20),
               "Keep VAV box, cooling only. No reheat required: RTU is gas heat and the room is interior / "
               "back-of-house. Standalone thermostat."),
  "ECH": ("ELECTRIC CABINET HEATER", (0.90, 0.45, 0.00),
          "Replace hot water cabinet heater with electric cabinet heater with integral thermostat, same location. "
          "Delete hot water piping. Power by EC."),
  "EUH": ("DELETE FCU - ELEC. UNIT HEATER", (0.55, 0.15, 0.65),
          "Delete hot water / glycol FCU. Electric unit heater with integral thermostat. DOAS branch duct extended "
          "directly to the room diffuser; return grille deleted."),
  "RFI": ("DELETE FCU - SEE RFI-01", (0.70, 0.35, 0.10),
          "Delete heating-only FCU. Room needs cooling / ventilation, not heat: see RFI-01 (not priced)."),
  "NC": ("NO CHANGE", (0.45, 0.45, 0.45), "No change (pool / sauna area by others, or not part of this VE)."),
}

# (page, tag, action, room, note) ; optional 'near' (x, y fraction) picks one of several same tags
VAV = [
  (6, "VAV-1", "EREHEAT", "Movement Studio 1045", ""),
  (6, "VAV-2", "EREHEAT", "Fitness 1044", ""),
  (6, "VAV-3", "EREHEAT", "Multi-Purpose Room 1043", ""),
  (6, "VAV-4", "EREHEAT", "Theater 1042", ""),
  (6, "VAV-5", "CANCEL", "Corridor / gallery", ""),
  (6, "VAV-6", "CANCEL", "Corridor", ""),
  (6, "VAV-7", "EREHEAT", "Spa / Salon 1041A", ""),
  (6, "VAV-8", "NOREHEAT", "IT Office 1036 / AV Closet", ""),
  (6, "VAV-9", "EREHEAT", "Gen. Manager Office 1035", ""),
  (6, "VAV-10", "NC", "Locker rooms / sauna (pool area)", "Pool / sauna by others - not marked"),
  (6, "VAV-11", "EREHEAT", "Art 1032", ""),
  (6, "VAV-12", "CANCEL", "Lounge 1004A", ""),
  (6, "VAV-13", "CANCEL", "Lounge / Bistro 1004A-B", ""),
  (6, "VAV-14", "NOREHEAT", "Security 1033 / Package 1003B", ""),
  (6, "VAV-15", "EREHEAT", "AVC 1034B", ""),
  (6, "VAV-16", "EREHEAT", "Sales Office 1034C", ""),
  (6, "VAV-17", "EREHEAT", "Family Meeting Room 1002", ""),
  (6, "VAV-18", "CANCEL", "Reception 1003A", "", (0.64, 0.74)),
  (6, "VAV-18", "EREHEAT", "Treatment Rm 1041C", "Tag duplicated on drawing - clarify", (0.41, 0.85)),
  (6, "VAV-19", "CANCEL", "Coffee Shop 1006", ""),
  (6, "VAV-20", "EREHEAT", "Library 1007", ""),
  (6, "VAV-21", "EREHEAT", "Store 1008", ""),
  (6, "VAV-22", "EREHEAT", "Activity Room 1009", ""),
  (6, "VAV-24", "CANCEL", "Bistro 1004B", ""),
  (7, "VAV-23", "CANCEL", "Restrooms 1012-1013 / Mailroom", ""),
  (7, "VAV-25", "CANCEL", "Casual Dining 1015", ""),
  (7, "VAV-26", "EREHEAT", "Private Dining 1016", ""),
  (7, "VAV-27", "CANCEL", "Formal Dining 1017", ""),
  (7, "VAV-28", "CANCEL", "Restrooms / kitchen corridor", ""),
  (7, "VAV-29", "CANCEL", "Main Kitchen 1019", ""),
  (7, "VAV-30", "EREHEAT", "Private Dining 130 / Dry Storage", ""),
  (7, "VAV-31", "NOREHEAT", "Storage 1031 / Trash 1030 / Receiving", ""),
  (7, "VAV-32", "NOREHEAT", "Chef Office 1027", ""),
  (7, "VAV-33", "CANCEL", "AL Dining 128", ""),
  (9, "VAV-34", "CANCEL", "Bistro 127", ""),
  (9, "VAV-35", "CANCEL", "Bistro / dining 127", ""),
  (9, "VAV-36", "CANCEL", "Parlor 131", ""),
  (9, "VAV-37", "CANCEL", "Reception 126", ""),
  (9, "VAV-38", "EREHEAT", "Family Room 120", ""),
  (9, "VAV-39", "EREHEAT", "Work Room / Sales / Exec. Director", ""),
  (9, "VAV-40", "CANCEL", "Corridor 100C", ""),
  (9, "VAV-41", "EREHEAT", "Salon 132A", ""),
  (9, "VAV-42", "EREHEAT", "Theater 135", ""),
  (9, "VAV-43", "EREHEAT", "Activity 136", ""),
  (9, "VAV-44", "EREHEAT", "Fitness 141", ""),
  (9, "VAV-45", "EREHEAT", "Fitness / Wellness Office", ""),
  (9, "VAV-46", "EREHEAT", "Wellness Office", ""),
  (9, "VAV-47", "EREHEAT", "Exam / AVC Office", ""),
]

# hot water reheat MBH from M6000 (for electric kW of the boxes kept with reheat)
MBH = {1: 26.9, 2: 44, 3: 37.5, 4: 12.2, 5: 13, 6: 13, 7: 8.1, 8: 3.3, 9: 4.9, 10: 8.9, 11: 16.8, 12: 42.3,
       13: 19.5, 14: 19.5, 15: 8.1, 16: 8.9, 17: 14.7, 18: 16.3, 19: 2.4, 20: 4.9, 21: 4.9, 22: 8.4, 23: 3.3,
       24: 6.6, 25: 35.8, 26: 8.1, 27: 13.8, 28: 17.1, 29: 19.5, 30: 8.1, 31: 13, 32: 2.4, 33: 36.3, 34: 14.7,
       35: 8.1, 36: 4.9, 37: 4.9, 38: 10.9, 39: 8.9, 40: 3.3, 41: 4.9, 42: 7.6, 43: 13, 44: 16.3, 45: 11.5,
       46: 8.1, 47: 9.8}

CH = [
  (6, "CH-1", "Movement Studio entry", 5.3), (6, "CH-3", "Pool deck / stair entry", 5.3),
  (6, "CH-4", "Exterior door at gallery", 5.3), (6, "CH-5", "Fitness entry", 5.3),
  (6, "CH-12", "Multi-Purpose Room entry", 5.3), (6, "CH-6", "Vestibule 1001", 5.3),
  (7, "CH-7", "Formal Dining entry", 5.3), (7, "CH-9", "Trash 1030 / Storage", 10.4),
  (7, "CH-10", "Casual Dining entry", 5.3), (7, "CH-11", "Casual Dining entry", 5.3),
]

FCU = [  # (page, tag, x, y in points as found, action, room)
  (2, "FCU", 822, 2023, "EUH", "Residents' Storage B107"),
  (2, "FCU-A", 919, 1993, "EUH", "Trash Collection B106"),
  (4, "FCU", 723, 892, "EUH", "Kitchen Storage B113"),
  (4, "FCU", 1263, 761, "EUH", "Corridor B100"),
  (4, "FCU", 1269, 843, "EUH", "Residents' Storage B115"),
  (4, "FCU", 1717, 651, "EUH", "Team Member Lounge B119A"),
  (4, "FCU", 2079, 563, "EUH", "Mechanical B118"),
  (4, "FCU", 828, 2042, "EUH", "Trash room, AL south (400 CFM exhaust)"),
  (4, "FCU", 1656, 2031, "EUH", "Storage room, AL south"),
  (4, "FCU", 1911, 312, "RFI", "Electrical B123"),
  (4, "FCU", 1853, 497, "RFI", "Central Laundry B121"),
]

SHEETS = [(6, "M2010"), (7, "M2011"), (9, "M2013"), (2, "M2000"), (4, "M2002")]

RFI = [
  ("Electrical rooms B111 (Main Electrical), B120, B122 and B123",
   "No cooling or ventilation is scheduled; B123 has a heating-only FCU. Transformer and switchgear heat is "
   "year-round. Please confirm the design heat load and provide cooling or thermostatic ventilation "
   "(ductless AC or exhaust / transfer fan) as required."),
  ("MDF B116 and IDF rooms (IDF 123 on 1st floor, IDF B134)",
   "Please confirm the cooling source for the MDF / IDF rooms (24/7 load). A DX-FCU is shown near B115 / B116 "
   "on M2002 - confirm it serves the MDF and provide its schedule data."),
  ("Central Laundry B121",
   "Heating-only FCU shown. Dryer heat and make-up air for the dryers: please confirm make-up air, exhaust and "
   "cooling / ventilation requirements for the laundry."),
  ("Mechanical B112 / B118 (with VE-01 boiler plant deleted)",
   "Please confirm the ventilation requirement for the mechanical rooms once the boilers are deleted."),
]


def find(page, tag, near=None):
    W, H = page.rect.width, page.rect.height
    hits = [w for w in page.get_text("words") if w[4] == tag and w[0] < W * 0.86]
    if near:
        hits.sort(key=lambda w: (w[0] / W - near[0]) ** 2 + (w[1] / H - near[1]) ** 2)
        hits = hits[:1]
    return [pymupdf.Rect(w[:4]) for w in hits]


PLACED = {}


def mark(page, r, act, extra=""):
    label, rgb, _ = ACT[act]
    if extra:
        label = label + " (" + extra + ")"
    sh = page.new_shape()
    c = pymupdf.Rect(r.x0 - 10, r.y0 - 7, r.x1 + 10, r.y1 + 7)
    sh.draw_oval(c); sh.finish(color=rgb, width=2.2)
    fs = 10
    tw = BOLD.text_length(label, fontsize=fs) + 10
    cands = [pymupdf.Rect(c.x1 + 4, c.y0 - 17, c.x1 + 4 + tw, c.y0 - 2),
             pymupdf.Rect(c.x1 + 4, c.y1 + 2, c.x1 + 4 + tw, c.y1 + 17),
             pymupdf.Rect(c.x0 - 4 - tw, c.y0 - 17, c.x0 - 4, c.y0 - 2),
             pymupdf.Rect(c.x0 - 4 - tw, c.y1 + 2, c.x0 - 4, c.y1 + 17),
             pymupdf.Rect(c.x0, c.y0 - 34, c.x0 + tw, c.y0 - 19),
             pymupdf.Rect(c.x0, c.y1 + 19, c.x0 + tw, c.y1 + 34)]
    placed = PLACED.setdefault(page.number, [])
    ok = [b for b in cands if b.x1 < page.rect.width * 0.86 and not any(b.intersects(q) for q in placed)]
    box = ok[0] if ok else cands[0]
    placed.append(box)
    sh.draw_rect(box); sh.finish(color=rgb, fill=(1, 1, 1), width=1.4, fill_opacity=0.92)
    sh.commit()
    page.insert_text((box.x0 + 5, box.y1 - 4), label, fontsize=fs, fontname="hebo", fontfile=FONT, color=rgb)


def legend(page, sheet, acts, counts):
    W, H = page.rect.width, page.rect.height
    x0, y0, w = W * 0.015, H * 0.015, 620
    lines = [("NORTHERN WOLVES AC - VALUE ENGINEERING MARK-UP  %s  %s" % (REV, DATE), (0, 0, 0)),
             ("Sheet %s (GMP set 07.15.2026). For discussion - not a design document." % sheet, (0.3, 0.3, 0.3))]
    for a in acts:
        lab, rgb, txt = ACT[a]
        lines.append(("%s (%d): %s" % (lab, counts.get(a, 0), txt), rgb))
    h = 26 + 15 * len(lines) + 12 * sum(len(t) // 110 for t, _ in lines)
    sh = page.new_shape(); sh.draw_rect(pymupdf.Rect(x0, y0, x0 + w, y0 + h))
    sh.finish(color=(0, 0, 0), fill=(1, 1, 1), width=1.2); sh.commit()
    y = y0 + 8
    for i, (t, rgb) in enumerate(lines):
        fs = 12 if i == 0 else 9
        rr = pymupdf.Rect(x0 + 8, y, x0 + w - 8, y + 60)
        used = page.insert_textbox(rr, t, fontsize=fs, fontname="hebo" if i == 0 or i > 1 else "helv",
                                   fontfile=FONT if i == 0 or i > 1 else None, color=rgb)
        nlines = 1 + int(pymupdf.get_text_length(t, fontsize=fs) * 1.05 // (w - 16))
        y += (fs + 3) * nlines + 3


def build_sheets():
    src = pymupdf.open(SRC)
    out = pymupdf.open()
    for pn, sheet in SHEETS:
        out.insert_pdf(src, from_page=pn - 1, to_page=pn - 1)
        page = out[-1]
        acts, counts = [], {}
        for row in VAV:
            if row[0] != pn:
                continue
            p, tag, act, room, note = row[:5]
            near = row[5] if len(row) > 5 else None
            if act == "NC":
                continue
            for r in find(page, tag, near):
                mark(page, r, act)
            counts[act] = counts.get(act, 0) + 1
            if act not in acts: acts.append(act)
        for p, tag, room, kw in CH:
            if p != pn:
                continue
            for r in find(page, tag):
                mark(page, r, "ECH")
            counts["ECH"] = counts.get("ECH", 0) + 1
            if "ECH" not in acts: acts.append("ECH")
        for p, tag, x, y, act, room in FCU:
            if p != pn:
                continue
            hits = [pymupdf.Rect(w[:4]) for w in page.get_text("words") if w[4] == tag
                    and abs(w[0] - x) < 3 and abs(w[1] - y) < 3]
            for r in hits:
                mark(page, r, act)
            counts[act] = counts.get(act, 0) + 1
            if act not in acts: acts.append(act)
        legend(page, sheet, acts, counts)
    return out


# ------------------------------------------------------------------ cover + RFI pages (reportlab)
FD = "/usr/share/fonts/truetype/liberation/"
pdfmetrics.registerFont(TTFont("Arial", FD + "LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", FD + "LiberationSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", FD + "LiberationSans-Italic.ttf"))
registerFontFamily("Arial", normal="Arial", bold="Arial-Bold", italic="Arial-Italic", boldItalic="Arial-Bold")
PW, PH = letter
BLUE = colors.HexColor("#236fa1"); GREY = colors.HexColor("#aeaeae"); LIGHT = colors.HexColor("#eef3f8")
LINE = colors.HexColor("#c7ced6")
pB = ParagraphStyle("b", fontName="Arial", fontSize=9.5, leading=12)
pS = ParagraphStyle("s", fontName="Arial", fontSize=8, leading=9.8)
pH = ParagraphStyle("h", fontName="Arial-Bold", fontSize=10.5, leading=13, textColor=BLUE, spaceBefore=8, spaceAfter=4)


def hdr(c, doc):
    img = ImageReader(LOGO); w = 113; h = w * 1303 / 2367
    c.drawImage(img, 45, PH - 32 - h, width=w, height=h, mask="auto")
    c.setFont("Arial", 9); c.drawRightString(PW - 45, PH - 40, "Ref. Quote: 3112 / Date: %s / %s" % (DATE, REV))
    c.setFont("Arial", 8); c.setFillColor(GREY); c.drawRightString(PW - 45, PH - 58, "Customer")
    c.setFont("Arial", 9); c.setFillColor(colors.black)
    c.drawRightString(PW - 45, PH - 68, "Callahan Construction Managers")
    c.setFont("Arial", 7.5); c.setFillColor(GREY)
    c.drawString(45, 25, "Sunrise Rye Brook - VE mark-ups on IMEG mechanical GMP set dated 07.15.2026")
    c.setFillColor(colors.black)


def table(rows, widths, colorcol=None):
    codes = [r[-1] for r in rows] if colorcol is not None else None
    if colorcol is not None:
        rows = [r[:-1] for r in rows]; widths = widths[:-1]
    t = Table(rows, colWidths=widths, repeatRows=1)
    st = [("FONT", (0, 0), (-1, 0), "Arial-Bold", 8), ("FONT", (0, 1), (-1, -1), "Arial", 8),
          ("BACKGROUND", (0, 0), (-1, 0), LIGHT), ("VALIGN", (0, 0), (-1, -1), "TOP"),
          ("GRID", (0, 0), (-1, -1), 0.4, LINE), ("TOPPADDING", (0, 0), (-1, -1), 2),
          ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]
    if colorcol is not None:
        for i, code in enumerate(codes[1:], 1):
            rgb = ACT[code][1] if code in ACT else (0, 0, 0)
            st.append(("TEXTCOLOR", (colorcol, i), (colorcol, i), colors.Color(*rgb)))
            st.append(("FONT", (colorcol, i), (colorcol, i), "Arial-Bold", 8))
    t.setStyle(TableStyle(st))
    return t


def build_text_pages():
    buf = io.BytesIO()
    doc = BaseDocTemplate(buf, pagesize=letter, leftMargin=45, rightMargin=45, topMargin=100, bottomMargin=40)
    doc.addPageTemplates([PageTemplate("p", [Frame(45, 40, PW - 90, PH - 140)], onPage=hdr)])
    s = [Paragraph("Project: <b>Sunrise Rye Brook - 900 King St, Rye Brook, NY 10573</b>", pB),
         Paragraph("Value Engineering Mark-ups - VAV zoning, cabinet heaters, basement fan coils", pH),
         Paragraph("The following sheets of the GMP mechanical set are marked up with our proposals. Same rooftop "
                   "units as designed (gas heat). VAV boxes in open areas and circulation are cancelled and the "
                   "areas are served directly from the rooftop units; VAV boxes stay in enclosed rooms, with "
                   "electric reheat and simple standalone thermostats where reheat is needed, and with no reheat "
                   "in interior / back-of-house rooms. Hot water cabinet heaters and basement fan coils are "
                   "replaced by electric heaters. Rooms that need cooling or ventilation are listed in RFI-01 "
                   "(last page) and are not priced. Pool, spa and sauna are by others.", pS), Spacer(1, 6)]
    rows = [["Mark", "Meaning"]]
    for a in ["CANCEL", "EREHEAT", "NOREHEAT", "ECH", "EUH", "RFI", "NC"]:
        rows.append([ACT[a][0], Paragraph(ACT[a][2], pS)])
    t = Table(rows, colWidths=[150, 372])
    t.setStyle(TableStyle([("FONT", (0, 0), (-1, -1), "Arial-Bold", 8), ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
                           ("GRID", (0, 0), (-1, -1), 0.4, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP")] +
                          [("TEXTCOLOR", (0, i), (0, i), colors.Color(*ACT[a][1]))
                           for i, a in enumerate(["CANCEL", "EREHEAT", "NOREHEAT", "ECH", "EUH", "RFI", "NC"], 1)]))
    s += [t]

    def kw_of(tag):
        n = int(tag.split("-")[1]); return MBH[n] / 3.412
    cnt = {a: sum(1 for r in VAV if r[2] == a) for a in ACT}
    kw_reheat = sum(kw_of(r[1]) for r in VAV if r[2] == "EREHEAT" and len(r) == 5)
    s += [Paragraph("VAV boxes (47 on the drawings)", pH),
          Paragraph("Cancel %d / keep with electric reheat %d / keep without reheat %d / no change %d (one tag, "
                    "VAV-18, appears twice on M2010). Electric reheat about %.0f kW connected for the boxes kept "
                    "with reheat (from scheduled hot water MBH), versus about 185 kW for all 47." %
                    (cnt["CANCEL"], cnt["EREHEAT"], cnt["NOREHEAT"], cnt["NC"], kw_reheat), pS), Spacer(1, 3)]
    rows = [["Sheet", "VAV", "Room / area served", "Note", "Proposal", ""]]
    sheet = {6: "M2010", 7: "M2011", 9: "M2013"}
    for r in VAV:
        rows.append([sheet[r[0]], r[1], Paragraph(r[3], pS), Paragraph(r[4], pS), ACT[r[2]][0], r[2]])
    tb = table(rows, [38, 40, 170, 104, 170, 0], colorcol=4)
    s += [tb]
    s += [Paragraph("Cabinet heaters (VE-04)", pH),
          Paragraph("All hot water cabinet heaters on the plans become electric with integral thermostats. "
                    "CH-8 is in the schedule but not shown on the plans; CH-2 is not used. Please confirm.", pS),
          Spacer(1, 3)]
    rows = [["Sheet", "Tag", "Location", "Electric (approx.)", "Proposal", ""]]
    for p, tag, room, kw in CH:
        rows.append([sheet[p], tag, room, "%.1f kW" % kw, ACT["ECH"][0], "ECH"])
    s += [table(rows, [38, 40, 200, 70, 174, 0], colorcol=4)]
    s += [Paragraph("Basement fan coil units (VE-05)", pH), Spacer(1, 3)]
    rows = [["Sheet", "Tag", "Room", "Proposal", ""]]
    fsheet = {2: "M2000", 4: "M2002"}
    for p, tag, x, y, act, room in FCU:
        rows.append([fsheet[p], tag, room, ACT[act][0], act])
    s += [table(rows, [38, 40, 230, 214, 0], colorcol=3),
          Paragraph("Electric unit heaters about 3 kW each, sized by IMEG. DX-FCUs on M2002 are not changed.", pS)]

    s += [PageBreak(), Paragraph("RFI-01 - Cooling and ventilation of equipment rooms (to IMEG)", pH),
          Paragraph("To: IMEG (via Callahan Construction Managers). From: Northern Wolves AC. Date: %s. "
                    "Reference: mechanical GMP set dated 07.15.2026, sheets M2000, M2002, M2013, M6000. "
                    "Not included in our VE proposals or pricing." % DATE, pS), Spacer(1, 6)]
    rows = [["#", "Room", "Question"]]
    for i, (room, q) in enumerate(RFI, 1):
        rows.append([str(i), Paragraph(room, pS), Paragraph(q, pS)])
    s += [table(rows, [20, 150, 352]), Spacer(1, 8),
          Paragraph("Response requested: design load and the system to be provided for each room, so it can be "
                    "priced separately.", pS)]
    doc.build(s)
    return pymupdf.open("pdf", buf.getvalue())


if __name__ == "__main__":
    text = build_text_pages()
    sheets = build_sheets()
    out = pymupdf.open()
    out.insert_pdf(text, from_page=0, to_page=len(text) - 2)
    out.insert_pdf(sheets)
    out.insert_pdf(text, from_page=len(text) - 1, to_page=len(text) - 1)
    out.set_metadata({"title": "Sunrise Rye Brook - VE Mark-ups", "author": "Northern Wolves AC"})
    out.save(OUT, garbage=3, deflate=True)
    print(OUT, len(out), "pages")
