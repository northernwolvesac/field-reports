"""Field wiring diagram: Greenheck RVE-85 ERU duct sensor package (IPA Church ERU-1,2,3).
Run:  python3 build_eru_sensor_diagram.py   -> ERU-ducted-sensor-wiring.pdf + .png next to this script."""
import os
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, black, white

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "ERU-ducted-sensor-wiring.pdf")
W, H = landscape(letter)

NAVY = HexColor("#1d2d3d"); BLUE = HexColor("#1663a8"); GRAY = HexColor("#707070")
LIGHT = HexColor("#f2f4f7"); RED = HexColor("#c0392b"); GREEN = HexColor("#1e8449")
WIRE = {"BLK": black, "WHT": HexColor("#a0a0a0"), "RED": RED, "GRN": GREEN}

c = canvas.Canvas(OUT, pagesize=(W, H))


def text(x, y, s, size=7, bold=False, color=black, align="l"):
    c.setFillColor(color); c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    {"l": c.drawString, "r": c.drawRightString, "c": c.drawCentredString}[align](x, y, s)


def box(x, y, w, h, title, sub=None, fill=white, tsize=8.5):
    c.setFillColor(fill); c.setStrokeColor(NAVY); c.setLineWidth(1.1)
    c.rect(x, y, w, h, fill=1, stroke=1)
    text(x + 5, y + h - 11, title, tsize, True, NAVY)
    if sub:
        text(x + 5, y + h - 20, sub, 6, False, GRAY)


def term(x, y, label, side="r", size=7):
    c.setFillColor(white); c.setStrokeColor(NAVY); c.setLineWidth(0.8)
    c.circle(x, y, 2.6, fill=1, stroke=1)
    if side == "r":
        text(x + 5, y - 2.5, label, size)
    else:
        text(x - 5, y - 2.5, label, size, align="r")


def wire(pts, color, lw=1.1, dash=None):
    c.setStrokeColor(color); c.setLineWidth(lw)
    if dash: c.setDash(dash)
    p = c.beginPath(); p.moveTo(*pts[0])
    for q in pts[1:]: p.lineTo(*q)
    c.drawPath(p, stroke=1, fill=0)
    if dash: c.setDash([])


# ---------------------------------------------------------------- title bar
c.setFillColor(NAVY); c.rect(0, H - 40, W, 40, fill=1, stroke=0)
text(28, H - 18, "ERU-1 / ERU-2 / ERU-3   Greenheck RVE-85-52D   -   duct sensor field wiring, one unit (typical of 3)", 11.5, True, white)
text(28, H - 32, "Northern Wolves AC  |  IPA Church, 310A S. Oyster Bay Rd, Syosset NY  |  ref. Greenheck submittal wiring diagrams G31 (p.15) and Y07 (p.18)", 7, False, white)

# ---------------------------------------------------------------- left: unit control center
PX, PY, PW, PH = 28, 150, 272, 416
box(PX, PY, PW, PH, "ERU CONTROL CENTER  (inside the unit, 24 VAC class 2)", fill=LIGHT, tsize=9)
IX, IW = PX + 12, PW - 24          # inner boxes
TX = IX + IW - 12                  # terminal dot x (right edge of inner box)

# 24 V terminal strip
box(IX, 462, IW, 85, "24 VAC terminal strip", "S1 jumper R-G and fire jumper R-70: remove where a field device lands")
tR = (TX, 522); tC = (TX, 508); tG = (TX, 494); t70 = (TX, 480); tGND = (TX, 468)
term(*tR, "R   24 VAC hot", "l"); term(*tC, "C   common", "l"); term(*tG, "G   unit start (S1)", "l")
term(*t70, "70   fire alarm input (S6)", "l"); term(*tGND, "GND", "l")

# DDC controller
box(IX, 322, IW, 130, "DDC controller  (Carel c.pCO, main board)")
tU9 = (TX, 424); tG2 = (TX, 410); tUa = (TX, 392); tUb = (TX, 378); tG3 = (TX, 364); tTp = (TX, 346); tTm = (TX, 332)
term(*tU9, "U9   CO2 signal 0-10 V", "l"); term(*tG2, "GND", "l")
term(*tUa, "U2*  space RH signal 0-10 V", "l"); term(*tUb, "U6*  space temp signal", "l"); term(*tG3, "GND", "l")
term(*tTp, "J26 T+   Modbus room stat, not used", "l"); term(*tTm, "J26 T-   leave open", "l")
text(IX, 313, "* inputs assigned by Greenheck / ADE when the controller is reconfigured for duct sensors", 5.6, color=GRAY)

# expansion board
box(IX, 258, IW, 46, "Expansion board  (c.pCOe)")
tXU1 = (TX, 280); tXG = (TX, 266)
term(*tXU1, "U1   building pressure 0-10 V", "l"); term(*tXG, "GND", "l")

# pressure transducer inside cabinet
box(IX, 160, IW, 88, "Mamac PR-274-R2A-VDC  (mount inside this cabinet)", "range jumper +/-0.25 in wg; 3 wires inside cabinet, 18 AWG")
pP = (IX + 14, 214); pM = (IX + 14, 200); pO = (IX + 14, 186)
term(*pP, "+     from R"); term(*pM, "-     from C"); term(*pO, "OUT   to expansion U1")
pHI = (TX, 214); pLO = (TX, 196)
term(*pHI, "HI port -> space", "l"); term(*pLO, "LO port -> outdoor ref.", "l")

# ---------------------------------------------------------------- right: field devices
DX, DW = 470, 294
TDX = DX + 14  # device terminal x

box(DX, 518, DW, 40, "ROOF  Dwyer A-306 outdoor static probe", "bracket 3 ft above roof, away from exhaust hood; tubing sloped, no traps")
aPort = (TDX, 526); term(*aPort, "tube port")

box(DX, 412, DW, 96, "Mamac HU-226-3-VDC-8   duct TEMP + RH", "in EA riser, probe across the duct, 12x12 access door beside it")
hPp = (TDX, 476); hPm = (TDX, 462); hRH = (TDX, 448); hT = (TDX, 434)
term(*hPp, "PWR +    24 VAC"); term(*hPm, "PWR -    common"); term(*hRH, "RH OUT   0-10 V"); term(*hT, "TEMP OUT  (per -8 option code)")
text(DX + 5, 418, "shield: tape off at the sensor, drain wire only at unit GND", 5.6, color=GRAY)

box(DX, 306, DW, 96, "Honeywell C7232B1022   duct CO2", "in EA riser next to temp/RH; output jumper set to 0-10 V")
cGp = (TDX, 370); cGo = (TDX, 356); cO1 = (TDX, 342); cM = (TDX, 328)
term(*cGp, "G+      24 VAC"); term(*cGo, "GO      common"); term(*cO1, "OUT1    0-10 V = 0-2000 ppm"); term(*cM, "M       signal common")
text(DX + 5, 312, "relay output not used", 5.6, color=GRAY)

box(DX, 232, DW, 64, "High static cutoff   (by others per Greenheck sequence p.25)", "Cleveland AFS-460 or Dwyer 1910-1, manual reset, on the SUPPLY duct")
sN1 = (TDX, 262); sN2 = (TDX, 248)
term(*sN1, "N.C. contact   from R"); term(*sN2, "N.C. contact   to G   (opens ~2.0 in wg, stops unit)")

box(DX, 158, DW, 64, "Duct smoke detectors, supply + exhaust   (furnished / wired by E.C.)", "System Sensor D4120 + 1.5 ft sampling tube; 120 V power by E.C.")
kN1 = (TDX, 188); kN2 = (TDX, 174)
term(*kN1, "N.C. alarm contact   from R"); term(*kN2, "N.C. alarm contact   to 70   (both detectors in series)")

box(DX, 100, DW, 48, "SPACE  static pickup in ceiling plenum beside the EA riser", "hard ceiling: Dwyer A-489 pickup plate near an exhaust grille")
sPort = (TDX, 110); term(*sPort, "tube end, open to the space")

# ---------------------------------------------------------------- cables
def run(src, dst, cols, xs, label, ytop):
    for s, d, col, x in zip(src, dst, cols, xs):
        wire([s, (x, s[1]), (x, d[1]), d], WIRE[col])
    text(xs[0] + (len(xs) - 1) * 2.5, ytop, label, 7, True, BLUE, "c")

run([tR, tC, tUa, tUb], [hPp, hPm, hRH, hT], ["BLK", "WHT", "RED", "GRN"], [318, 323, 328, 333], "C1", 486)
run([tR, tC, tU9, tG2], [cGp, cGo, cO1, cM], ["BLK", "WHT", "RED", "GRN"], [348, 353, 358, 363], "C2", 380)
run([tR, tG], [sN1, sN2], ["BLK", "WHT"], [378, 383], "C3", 272)
run([tR, t70], [kN1, kN2], ["BLK", "WHT"], [398, 403], "C4", 198)

wire([pLO, (446, pLO[1]), (446, aPort[1]), aPort], BLUE, 1.4, [4, 3])
wire([pHI, (436, pHI[1]), (436, sPort[1]), sPort], BLUE, 1.4, [4, 3])
text(405, 548, "1/4 in FR poly tubing,", 6, color=BLUE)
text(405, 541, "outdoor reference", 6, color=BLUE)
text(430, 124, "1/4 in FR poly tubing,", 6, color=BLUE, align="r")
text(430, 117, "space, down the shaft", 6, color=BLUE, align="r")

# ---------------------------------------------------------------- notes (below left panel)
notes = [
    "Same cable everywhere: 18/4 stranded, overall shield + drain, plenum rated (CMP). Unused conductors are spares, tape off.",
    "Shield drain on controller GND at the unit only; cut and tape at the device. Never in a conduit with 208 V. Runs 20-60 ft.",
    "Route: unit base control knockout -> inside the curb -> down the duct shaft along the EA riser. No roof / wall penetrations.",
    "Remote display: Greenheck 6-wire RJ12 cable (150 ft), no splices. BACnet MS/TP if a BMS is added: 22 AWG shielded pair.",
    "After wiring, ADE / Greenheck reconfigure the controller: duct sensors on U2*/U6*, CO2 on U9, building pressure on exp. U1.",
]
for i, n in enumerate(notes):
    text(PX, 138 - 10.5 * i, n, 6.0)

# ---------------------------------------------------------------- conductor table
rows = [
    ("Cable", "Device", "BLK", "WHT", "RED", "GRN", "Length"),
    ("C1", "duct temp/RH  Mamac HU-226", "R -> PWR+", "C -> PWR-", "RH OUT -> U2*", "TEMP OUT -> U6*", "20-60 ft"),
    ("C2", "duct CO2  Honeywell C7232B", "R -> G+", "C -> GO", "OUT1 -> U9", "M -> GND", "20-60 ft"),
    ("C3", "high static cutoff switch", "R -> N.C.", "N.C. -> G", "spare", "spare", "< 20 ft"),
    ("C4", "smoke detector contacts (E.C.)", "R -> N.C.", "N.C. -> 70", "spare", "spare", "< 30 ft"),
]
cw = [34, 150, 74, 74, 90, 96, 46]
TY = 24; RH = 11.5
for i, r in enumerate(rows):
    yy = TY + RH * (len(rows) - 1 - i)
    c.setFillColor(NAVY if i == 0 else (LIGHT if i % 2 else white)); c.rect(PX, yy, sum(cw), RH, fill=1, stroke=0)
    x = PX
    for cell, w in zip(r, cw):
        text(x + 3, yy + 3.3, cell, 6.3, i == 0, white if i == 0 else black)
        x += w
c.setStrokeColor(NAVY); c.setLineWidth(0.8); c.rect(PX, TY, sum(cw), RH * len(rows), fill=0, stroke=1)
text(PX + sum(cw) + 10, TY + 30, "Wire colors are the usual 18/4 jacket set;", 6.3, color=GRAY)
text(PX + sum(cw) + 10, TY + 21, "if the spool differs, keep the same order:", 6.3, color=GRAY)
text(PX + sum(cw) + 10, TY + 12, "24 V hot, common, signal 1, signal 2.", 6.3, color=GRAY)

c.save()

import pymupdf
d = pymupdf.open(OUT)
d[0].get_pixmap(dpi=200).save(OUT.replace(".pdf", ".png"))
print("built", OUT)
