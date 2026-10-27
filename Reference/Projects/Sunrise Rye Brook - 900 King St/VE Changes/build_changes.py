"""Sunrise Rye Brook - VE summary of changes for the customer (equipment removed / replaced, marked drawings).

Run: python3 build_changes.py  ->  VE Changes - Sunrise Rye Brook.pdf
Follows the summary of changes sent to Callahan 10/27/2026: boilers 3 -> 2, boiler and primary pumps deleted,
20 HW FCUs -> 9 electric unit heaters, HW cabinet heaters -> 10 electric, VAV 47 -> 30 (26 electric reheat,
4 cooling only), BMS removed (standalone controls), townhouses one system each. No RFI content.
Tag decisions and kW come from ../VE Mark-ups/build_markups.py.
"""
import os, io, importlib.util
import pymupdf
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak)
from reportlab.lib.styles import ParagraphStyle

S = os.path.dirname(os.path.abspath(__file__)) + "/"
spec = importlib.util.spec_from_file_location("mk", S + "../VE Mark-ups/build_markups.py")
mk = importlib.util.module_from_spec(spec); spec.loader.exec_module(mk)

OUT = S + "VE Changes - Sunrise Rye Brook.pdf"
DATE, REV = "10/27/2026", "Rev 0"
mk.DATE, mk.REV = DATE, REV            # used in the sheet legend header
RED = (0.85, 0.10, 0.10)
mk.ACT.update({
  "DELEQ": ("DELETE", RED, "Equipment deleted from the scope."),
  "BOILER": ("DELETE - BOILERS 3 TO 2", RED, "Boilers reduced from three to two; B-3 deleted, B-1 and B-2 remain."),
  "PUMP": ("DELETE PUMP", RED, "Boiler pumps BP-1 / BP-2 and primary pumps PP-1 / PP-2 deleted."),
  "HWPIPE": ("ELECTRIC - HW PIPING DELETED", (0.90, 0.45, 0.00),
             "Unit changed to electric heat; hot water piping to this unit deleted."),
  "DELFCU": ("DELETE FCU", (0.55, 0.15, 0.65), "Hot water FCU deleted; replaced by electric unit heaters (9) as marked "
                                                "on M2000 / M2002."),
})
VAV10_KW = 3.0   # VAV-10 (locker rooms) keeps its box with electric reheat


def vav_rows():
    """VAV list for the customer set: VAV-10 counted with electric reheat (26 boxes)."""
    rows = []
    for r in mk.VAV:
        r = list(r)
        if r[2] == "NC":
            r[2], r[4] = "EREHEAT", ""
            kw = VAV10_KW
        else:
            kw = mk.vav_kw(tuple(r))
        rows.append((r, kw))
    return rows


def zone(page, fx0, fy0, fx1, fy1, act, text):
    """Box around a diagram area with a note."""
    W, H = page.rect.width, page.rect.height
    r = pymupdf.Rect(fx0 * W, fy0 * H, fx1 * W, fy1 * H)
    rgb = mk.ACT[act][1]
    sh = page.new_shape(); sh.draw_rect(r); sh.finish(color=rgb, width=3, dashes="[12 6] 0"); sh.commit()
    fs = 12
    tw = mk.BOLD.text_length(text, fontsize=fs) + 12
    box = pymupdf.Rect(r.x0, r.y0 - 22, r.x0 + tw, r.y0 - 3)
    sh = page.new_shape(); sh.draw_rect(box); sh.finish(color=rgb, fill=(1, 1, 1), width=1.5); sh.commit()
    page.insert_text((box.x0 + 6, box.y1 - 5), text, fontsize=fs, fontname="hebo", fontfile=mk.FONT, color=rgb)


def stamp(page, lines, rgb=RED):
    """Note box at the top of a sheet (piping sheets)."""
    W, H = page.rect.width, page.rect.height
    x0, y0 = W * 0.30, H * 0.015
    fs = 13
    w = max(mk.BOLD.text_length(t, fontsize=fs) for t in lines) + 24
    h = 10 + (fs + 6) * len(lines)
    sh = page.new_shape(); sh.draw_rect(pymupdf.Rect(x0, y0, x0 + w, y0 + h))
    sh.finish(color=rgb, fill=(1, 1, 1), width=2); sh.commit()
    y = y0 + fs + 6
    for t in lines:
        page.insert_text((x0 + 12, y), t, fontsize=fs, fontname="hebo", fontfile=mk.FONT, color=rgb); y += fs + 6


def tag_marks(page, tag, act, extra="", near=None):
    for r in mk.find(page, tag, near):
        mk.mark(page, r, act, extra)


def build_sheets():
    mk.PLACED.clear()
    src = pymupdf.open(mk.SRC)
    out = pymupdf.open()

    def add(pn):
        out.insert_pdf(src, from_page=pn - 1, to_page=pn - 1)
        return out[-1]

    # M5000 hydronic flow diagram
    p = add(39); acts, cnt = [], {}
    tag_marks(p, "B-3", "BOILER"); acts.append("BOILER"); cnt["BOILER"] = 1
    for t in ("BP-1", "BP-2", "PP-1", "PP-2"):
        tag_marks(p, t, "PUMP")
    acts.append("PUMP"); cnt["PUMP"] = 4
    zone(p, 0.035, 0.535, 0.455, 0.605, "HWPIPE", "IL VAV BOXES: HW REHEAT DELETED - ELECTRIC REHEAT / CANCELLED PER M2010-M2011")
    zone(p, 0.540, 0.535, 0.715, 0.605, "HWPIPE", "AL VAV BOXES: HW REHEAT DELETED - PER M2013")
    zone(p, 0.040, 0.615, 0.215, 0.675, "HWPIPE", "CABINET HEATERS: ELECTRIC, HW PIPING DELETED")
    zone(p, 0.040, 0.682, 0.275, 0.760, "DELFCU", "FCU-1 TO FCU-17: DELETED, ELECTRIC UNIT HEATERS")
    acts += ["HWPIPE", "DELFCU"]; cnt["HWPIPE"] = 3; cnt["DELFCU"] = 1
    mk.legend(p, "M5000", acts, cnt)

    # M6001 schedules: boilers, pumps, cabinet heaters
    p = add(44); acts, cnt = ["BOILER", "PUMP", "ECH"], {"BOILER": 1, "PUMP": 4, "ECH": 0}
    tag_marks(p, "B-3", "BOILER")
    for t in ("BP-1", "BP-2", "PP-1", "PP-2"):
        tag_marks(p, t, "PUMP")
    for t in ("CH-1", "CH-3", "CH-4", "CH-5", "CH-6", "CH-7", "CH-8", "CH-9", "CH-10", "CH-11", "CH-12"):
        tag_marks(p, t, "ECH"); cnt["ECH"] += 1
    mk.legend(p, "M6001", acts, cnt)

    # M6000 schedules: FCU-A and VAV list (label in a column right of the VAV schedule)
    p = add(43); W = p.rect.width
    tag_marks(p, "FCU-A", "DELFCU", "QTY 20")
    cnt = {"DELFCU": 1}
    for r, kw in vav_rows():
        if len(r) > 5 and r[3].startswith("Treatment"):
            continue
        n = int(r[1].split("-")[1]); stag = "VAV-%02d" % n
        hits = [w for w in p.get_text("words") if w[4] == stag]
        if not hits:
            continue
        w = hits[0]; act = r[2]; lab, rgb, _ = mk.ACT[act]
        if kw:
            lab += " (%g kW)" % kw
        x = W * 0.418
        p.insert_text((x, w[3] - 1), lab, fontsize=8.5, fontname="hebo", fontfile=mk.FONT, color=rgb)
        cnt[act] = cnt.get(act, 0) + 1
    mk.legend(p, "M6000", ["DELFCU", "CANCEL", "EREHEAT", "NOREHEAT"], cnt)

    # floor plans with VAV / CH / FCU marks
    for pn, sheet in [(6, "M2010"), (7, "M2011"), (9, "M2013"), (2, "M2000"), (4, "M2002")]:
        p = add(pn); acts, cnt = [], {}
        for r, kw in vav_rows():
            if r[0] != pn:
                continue
            near = r[5] if len(r) > 5 else None
            tag_marks(p, r[1], r[2], ("%g kW" % kw) if kw else "", near)
            cnt[r[2]] = cnt.get(r[2], 0) + 1
            if r[2] not in acts: acts.append(r[2])
        for q, tag, room, kw in mk.CH:
            if q == pn:
                tag_marks(p, tag, "ECH", "%g kW" % kw); cnt["ECH"] = cnt.get("ECH", 0) + 1
                if "ECH" not in acts: acts.append("ECH")
        for q, tag, x, y, act, room, kw in mk.FCU:
            if q != pn:
                continue
            act = "DEL" if act == "RFI" else act
            for w in p.get_text("words"):
                if w[4] == tag and abs(w[0] - x) < 3 and abs(w[1] - y) < 3:
                    mk.mark(p, pymupdf.Rect(w[:4]), act, ("%g kW" % kw) if kw else "")
            cnt[act] = cnt.get(act, 0) + 1
            if act not in acts: acts.append(act)
        if pn == 4:
            tag_marks(p, "B-3", "BOILER")
            for t in ("BP-1", "BP-2", "PP-1", "PP-2"):
                tag_marks(p, t, "PUMP")
            acts += ["BOILER", "PUMP"]; cnt["BOILER"] = 1; cnt["PUMP"] = 4
        mk.legend(p, sheet, acts, cnt)

    # 1st floor piping sheets: hot water piping to VAVs and cabinet heaters deleted
    for pn, sheet in [(10, "M2014"), (11, "M2015"), (12, "M2016")]:
        p = add(pn)
        stamp(p, ["VE: HOT WATER PIPING ON THIS SHEET DELETED (VAV REHEAT AND CABINET HEATERS",
                  "CHANGED TO ELECTRIC). SEE M2010 / M2011 / M2013 FOR VAV AND HEATER CHANGES."])
        for q, tag, room, kw in mk.CH:
            tag_marks(p, tag, "HWPIPE")
        for t in ("VAV-40", "VAV-44", "VAV-46"):
            tag_marks(p, t, "HWPIPE")
    return out


# ------------------------------------------------------------------ cover pages
PW, PH = letter
BLUE = colors.HexColor("#236fa1"); GREY = colors.HexColor("#aeaeae"); LIGHT = colors.HexColor("#eef3f8")
LINE = colors.HexColor("#c7ced6")
pB = ParagraphStyle("b", fontName="Arial", fontSize=9.5, leading=12)
pS = ParagraphStyle("s", fontName="Arial", fontSize=8.5, leading=10.5)
pBul = ParagraphStyle("bul", parent=pS, leftIndent=12, bulletIndent=2)
pH = ParagraphStyle("h", fontName="Arial-Bold", fontSize=10.5, leading=13, textColor=BLUE, spaceBefore=8, spaceAfter=3)
pH2 = ParagraphStyle("h2", fontName="Arial-Bold", fontSize=9, leading=11, spaceBefore=5, spaceAfter=2)


def first(c, doc):
    img = ImageReader(mk.LOGO); w = 113; h = w * 1303 / 2367
    c.drawImage(img, 45, PH - 32 - h, width=w, height=h, mask="auto")
    c.setFont("Arial", 9); c.drawRightString(PW - 45, PH - 40, "Ref. Quote: 3112 / Date: %s / %s" % (DATE, REV))
    y = PH - 118
    for line in ["Northern Wolves AC", "55 9th St, 55-A2", "Brooklyn, NY", "11215, US", "(347) 463-9248", "",
                 "Prepared By:", "Alikhan Ilyas", "(347) 463-9248", "alikhan@northernwolvesac.com"]:
        c.drawString(45, y, line); y -= 10.5
    c.setFont("Arial", 8); c.setFillColor(GREY); c.drawRightString(PW - 45, PH - 118, "Customer")
    c.setFont("Arial", 9); c.setFillColor(colors.black)
    c.drawRightString(PW - 45, PH - 128, "Callahan Construction Managers")
    foot(c, doc)


def later(c, doc):
    c.setFont("Arial", 8); c.setFillColor(GREY)
    c.drawString(45, PH - 30, "Sunrise Rye Brook - VE summary of changes %s - %s" % (REV, DATE))
    c.setFillColor(colors.black); foot(c, doc)


def foot(c, doc):
    c.setFont("Arial", 7.5); c.setFillColor(GREY)
    c.drawString(45, 25, "Mark-ups on IMEG mechanical GMP set dated 07.15.2026")
    c.drawRightString(PW - 45, 25, "Page %d" % doc.page); c.setFillColor(colors.black)


def bl(items):
    return [Paragraph(t, pBul, bulletText="-") for t in items]


def tbl(rows, widths, total=False):
    t = Table(rows, colWidths=widths, repeatRows=1)
    st = [("FONT", (0, 0), (-1, 0), "Arial-Bold", 8), ("FONT", (0, 1), (-1, -1), "Arial", 8),
          ("BACKGROUND", (0, 0), (-1, 0), LIGHT), ("VALIGN", (0, 0), (-1, -1), "TOP"),
          ("GRID", (0, 0), (-1, -1), 0.4, LINE), ("TOPPADDING", (0, 0), (-1, -1), 2),
          ("BOTTOMPADDING", (0, 0), (-1, -1), 2)]
    if total:
        st += [("FONT", (0, -1), (-1, -1), "Arial-Bold", 8), ("BACKGROUND", (0, -1), (-1, -1), LIGHT)]
    t.setStyle(TableStyle(st)); return t


def build_cover():
    buf = io.BytesIO()
    doc = BaseDocTemplate(buf, pagesize=letter, leftMargin=45, rightMargin=45, topMargin=45, bottomMargin=40)
    doc.addPageTemplates([PageTemplate("first", [Frame(45, 40, PW - 90, PH - 278)], onPage=first, autoNextPageTemplate="later"),
                          PageTemplate("later", [Frame(45, 40, PW - 90, PH - 85)], onPage=later)])
    vr = vav_rows()
    e = [(r, kw) for r, kw in vr if r[2] == "EREHEAT"]
    c = [r for r, kw in vr if r[2] == "NOREHEAT"]
    x = [r for r, kw in vr if r[2] == "CANCEL"]
    kw_vav = sum(kw for r, kw in e); kw_ch = sum(q[3] for q in mk.CH)
    euh = [(q[5], q[6]) for q in mk.FCU if q[4] == "EUH"]; kw_euh = sum(k for _, k in euh)

    s = [Paragraph("Project: <b>Sunrise Rye Brook - 900 King St, Rye Brook, NY 10573</b>", pB), Spacer(1, 3),
         Paragraph("<b>Mechanical drawings dated: 07.15.2026 (GMP set)</b>", pB),
         Paragraph("Value Engineering - Summary of Changes", pH),
         Paragraph("<b>1. Heating system - hot water to electric</b>", pH2)]
    s += bl(["Boilers reduced from (3) to (2)", "Boiler pumps and primary pumps deleted",
             "(20) hot water fan coil units deleted and replaced with (9) electric unit heaters",
             "Hot water cabinet heaters replaced with (10) electric cabinet heaters",
             "Hot water heating piping reduced accordingly"])
    s += [Paragraph("<b>2. VAV boxes</b>", pH2)]
    s += bl(["Reduced from (47) to (30): (26) with electric reheat and (4) cooling only",
             "(18) VAV boxes eliminated in open areas and circulation spaces; these areas will be served directly by "
             "the RTUs, with manual volume dampers balanced to design airflow"])
    s += [Paragraph("<b>3. Controls</b>", pH2)]
    s += bl(["For now, we have removed the BMS by ABM and priced standalone controls (factory-mounted controllers with "
             "wall thermostats / sensors).",
             "As an alternative, we can provide BMS for the essential systems only, with the remaining equipment on "
             "standalone controls.", "We are currently working on a revised BMS scope and will get back to you shortly."])
    s += [Paragraph("<b>4. Townhouses</b>", pH2)]
    s += bl(["HVAC system consolidated from two split systems per townhouse to a single system per townhouse.",
             "Each system: 5-ton cooling condensing unit with cased coil and 2-stage 120 MBH gas furnace.",
             "Revised price: $1,750,000 (previously $2,600,000)."])

    s += [PageBreak(), Paragraph("Equipment removed", pH)]
    rows = [["Equipment", "Tags", "Qty", "Drawings"],
            ["Boiler", "B-3 (B-1, B-2 remain)", "1", "M5000, M2002, M6001"],
            ["Boiler pumps", "BP-1, BP-2", "2", "M5000, M2002, M6001"],
            ["Primary pumps", "PP-1, PP-2", "2", "M5000, M2002, M6001"],
            ["Hot water fan coil units", "FCU-A (M5000 FCU-1 to FCU-17)", "20", "M6000, M5000, M2000, M2002"],
            ["Hot water cabinet heaters", "CH-1, CH-3 to CH-12", "11", "M6001, M2010, M2011"],
            ["VAV boxes", ", ".join(r[1] for r in x), str(len(x)), "M2010, M2011, M2013, M6000"],
            ["Hot water reheat coils at VAV boxes", "all VAV boxes", "47", "M6000, M5000"],
            ["Hot water piping to VAV boxes, cabinet heaters and fan coils", "-", "lot", "M2014, M2015, M2016, M5000"],
            ["BMS (ABM)", "-", "lot", "-"]]
    s += [tbl([[Paragraph(str(v), pS) for v in r] for r in rows], [150, 190, 35, 147])]

    s += [Paragraph("Equipment replaced / added", pH),
          Paragraph("VAV boxes with electric reheat and standalone controller with wall thermostat (%d)" % len(e), pH2)]
    rows = [["VAV", "Room / area served", "Electric reheat"]]
    for r, kw in e:
        tag = "VAV-18 (2nd tag)" if (len(r) > 5 and r[3].startswith("Treatment")) else r[1]
        rows.append([tag, r[3], "%g kW" % kw])
    rows.append(["Total", "", "%g kW" % kw_vav])
    s += [tbl(rows, [80, 330, 112], total=True)]
    s += [Paragraph("VAV boxes cooling only, standalone controller with wall thermostat (%d)" % len(c), pH2),
          tbl([["VAV", "Room / area served"]] + [[r[1], r[3]] for r in c], [80, 442])]
    s += [Paragraph("Electric cabinet heaters with integral thermostat (%d)" % len(mk.CH), pH2)]
    rows = [["Tag", "Location", "Electric heat"]] + [[q[1], q[2], "%g kW" % q[3]] for q in mk.CH]
    rows.append(["Total", "", "%g kW" % kw_ch])
    s += [tbl(rows, [80, 330, 112], total=True)]
    s += [Paragraph("Electric unit heaters with integral thermostat, in lieu of hot water fan coils (%d)" % len(euh), pH2)]
    rows = [["#", "Location (basement)", "Electric heat"]] + [["EUH-%d" % i, rm, "%g kW" % k] for i, (rm, k) in enumerate(euh, 1)]
    rows.append(["Total", "", "%g kW" % kw_euh])
    s += [tbl(rows, [80, 330, 112], total=True),
          Spacer(1, 6),
          Paragraph("Electric heat added: about %g kW connected (VAV reheat %g kW, cabinet heaters %g kW, unit "
                    "heaters %g kW), 208 V. Electrical work by EC. Marked-up drawings follow: M5000, M6001, M6000, "
                    "M2010, M2011, M2013, M2000, M2002, M2014, M2015, M2016." %
                    (round(kw_vav + kw_ch + kw_euh, 1), kw_vav, kw_ch, kw_euh), pS)]
    doc.build(s)
    return pymupdf.open("pdf", buf.getvalue())


if __name__ == "__main__":
    out = pymupdf.open()
    out.insert_pdf(build_cover())
    out.insert_pdf(build_sheets())
    out.set_metadata({"title": "Sunrise Rye Brook - VE Summary of Changes", "author": "Northern Wolves AC"})
    out.save(OUT, garbage=3, deflate=True)
    print(OUT, len(out), "pages")
