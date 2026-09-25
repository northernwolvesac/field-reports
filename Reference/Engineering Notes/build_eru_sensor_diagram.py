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

box(DX, 232, DW, 64, "High static cutoff   (by others per Greenheck sequence p.25)", "Cleveland AFS-460 (manual reset) or Dwyer 1831, on the SUPPLY duct")
sN1 = (TDX, 262); sN2 = (TDX, 248)
term(*sN1, "N.C. contact   from R"); term(*sN2, "N.C. contact   to G   (opens ~2.0 in wg, stops unit)")

box(DX, 160, DW, 48, "SPACE  static pickup: Dwyer A-489 plate in the served space", "or open tube end in the closet / utility room the shaft passes through")
sPort = (TDX, 170); term(*sPort, "tube end, open to the space")
text(DX, 148, "Duct smoke detectors: already installed and wired by the E.C.", 5.8, color=GRAY)
text(DX, 141, "If their contacts are to stop the unit, E.C. lands them on R-70 (fire input S6).", 5.8, color=GRAY)

# ---------------------------------------------------------------- cables
def run(src, dst, cols, xs, label, ytop):
    for s, d, col, x in zip(src, dst, cols, xs):
        wire([s, (x, s[1]), (x, d[1]), d], WIRE[col])
    text(xs[0] + (len(xs) - 1) * 2.5, ytop, label, 7, True, BLUE, "c")

run([tR, tC, tUa, tUb], [hPp, hPm, hRH, hT], ["BLK", "WHT", "RED", "GRN"], [318, 323, 328, 333], "C1", 486)
run([tR, tC, tU9, tG2], [cGp, cGo, cO1, cM], ["BLK", "WHT", "RED", "GRN"], [348, 353, 358, 363], "C2", 380)
run([tR, tG], [sN1, sN2], ["BLK", "WHT"], [378, 383], "C3", 272)

wire([pLO, (446, pLO[1]), (446, aPort[1]), aPort], BLUE, 1.4, [4, 3])
wire([pHI, (436, pHI[1]), (436, sPort[1]), sPort], BLUE, 1.4, [4, 3])
text(405, 548, "1/4 in FR poly tubing,", 6, color=BLUE)
text(405, 541, "outdoor reference", 6, color=BLUE)
text(430, 184, "1/4 in FR poly tubing,", 6, color=BLUE, align="r")
text(430, 177, "space, down the shaft", 6, color=BLUE, align="r")

# ---------------------------------------------------------------- notes (below left panel)
notes = [
    "Same cable for C1-C3: 18/4 stranded, overall shield + drain, plenum rated (CMP). Unused conductors are spares, tape off.",
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

# ================================================================ PAGE 2: section detail
c.showPage()
c.setFillColor(NAVY); c.rect(0, H - 40, W, 40, fill=1, stroke=0)
text(28, H - 18, "ERU-1 / ERU-2 / ERU-3   -   duct sensor placement detail (section at the roof curb, not to scale)", 11.5, True, white)
text(28, H - 32, "Northern Wolves AC  |  IPA Church, Syosset NY  |  unit arrangement per Greenheck overview drawing (OA inlet at end, SA discharge and EA intake through the bottom)", 7, False, white)

DUCT = HexColor("#3b4a5a")

def rect(x, y, w, h, fill=white, stroke=NAVY, lw=1.0):
    c.setFillColor(fill); c.setStrokeColor(stroke); c.setLineWidth(lw); c.rect(x, y, w, h, fill=1, stroke=1)

def arrow(x1, y1, x2, y2, color=NAVY):
    wire([(x1, y1), (x2, y2)], color, 0.9)
    import math
    a = math.atan2(y2 - y1, x2 - x1)
    for d in (0.5, -0.5):
        wire([(x2, y2), (x2 - 6 * math.cos(a + d), y2 - 6 * math.sin(a + d))], color, 0.9)

# roof deck and ceiling
ROOF = 372; CEIL = 190; FLOOR = 110
c.setFillColor(HexColor("#d9dde3")); c.rect(40, ROOF, 720, 8, fill=1, stroke=0)
text(44, ROOF + 11, "ROOF DECK + INSULATION", 6, color=GRAY)
c.setStrokeColor(GRAY); c.setLineWidth(0.8); c.setDash([6, 3]); c.line(40, CEIL, 760, CEIL); c.setDash([])
text(44, CEIL + 4, "FINISHED CEILING", 6, color=GRAY)
c.setFillColor(HexColor("#e8ebef")); c.rect(40, FLOOR - 6, 720, 6, fill=1, stroke=0)
text(44, FLOOR - 15, "FLOOR OF THE SERVED SPACE  (ERU-1, ERU-2: basement;  ERU-3: first / second floor)", 6, color=GRAY)
text(44, 296, "ABOVE-CEILING SPACE / DUCT SHAFT", 6, color=GRAY)
text(44, 289, "riser continues down the shaft to the floor served", 5.6, color=GRAY)

# curb and unit
rect(300, ROOF + 8, 260, 20, fill=HexColor("#c9ced6"))
text(305, ROOF + 15, "GKD ROOF CURB 14 in", 6, color=NAVY)
rect(280, ROOF + 28, 320, 110, fill=LIGHT, lw=1.3)
text(290, ROOF + 128, "GREENHECK RVE-85-52D", 8, True, NAVY)
# OA hood at left end
rect(262, ROOF + 60, 18, 50, fill=white)
text(279, ROOF + 50, "OA hood", 5.6, color=GRAY, align="r")
arrow(230, ROOF + 85, 258, ROOF + 85)
# compartments
for x0, lab in ((300, "wheel"), (360, "DX coil / IG furnace"), (450, "supply fan"), (500, "exhaust fan")):
    text(x0 + 4, ROOF + 108, lab, 5.6, color=GRAY)
# control center at right end
rect(548, ROOF + 32, 48, 100, fill=white)
text(552, ROOF + 122, "CONTROL", 6, True, NAVY); text(552, ROOF + 114, "CENTER", 6, True, NAVY)
rect(554, ROOF + 60, 36, 26, fill=LIGHT)
text(557, ROOF + 76, "PR-274", 5.6, True); text(557, ROOF + 68, "HI   LO", 5.6)
text(552, ROOF + 40, "base knockout", 5, color=GRAY); text(552, ROOF + 34, "for control wires", 5, color=GRAY)
# exhaust discharge on side
arrow(600, ROOF + 100, 630, ROOF + 100); text(604, ROOF + 104, "EA out", 5.6, color=GRAY)

# SA riser and EA riser
SAx, EAx = 330, 470; DW_ = 40
rect(SAx, 232, DW_, ROOF + 8 - 232, fill=white, stroke=DUCT, lw=1.3)
rect(EAx, 232, DW_, ROOF + 8 - 232, fill=white, stroke=DUCT, lw=1.3)
rect(180, 232 - 30, SAx + DW_ - 180, 30, fill=white, stroke=DUCT, lw=1.3)
rect(EAx, 232 - 30, 230, 30, fill=white, stroke=DUCT, lw=1.3)
text(SAx + 3, 250, "SA", 7, True, DUCT); text(EAx + 3, 250, "EA", 7, True, DUCT)
text(SAx - 60, ROOF - 6, "supply riser", 6, color=DUCT); text(EAx + DW_ + 44, ROOF - 6, "exhaust riser", 6, color=DUCT)
arrow(SAx + 20, 350, SAx + 20, 310, DUCT)
arrow(EAx + 20, 310, EAx + 20, 350, DUCT)
# diffuser and grille
rect(190, CEIL - 6, 40, 6, fill=white, stroke=DUCT); text(186, CEIL - 15, "supply diffuser", 5.6, color=GRAY)
arrow(210, CEIL - 6, 210, CEIL - 26, DUCT)
rect(716, CEIL - 6, 40, 6, fill=white, stroke=DUCT); text(712, CEIL - 15, "exhaust grille", 5.6, color=GRAY)
arrow(736, CEIL - 26, 736, CEIL - 6, DUCT)

# devices (all on the shaft side, between the two risers)
def dev(x, y, name, sub, col, probe_to):
    bw, bh = 54, 22
    rect(x, y - bh / 2, bw, bh, fill=white, stroke=col, lw=1.0)
    text(x + 3, y + 3, name, 5.8, True, col); text(x + 3, y - 6, sub, 5, color=GRAY)
    if probe_to > x + bw:
        wire([(x + bw, y), (probe_to, y)], col, 1.6)
    else:
        wire([(x, y), (probe_to, y)], col, 1.6)

dev(EAx - 66, 340, "HU-226", "duct temp + RH", BLUE, EAx + 26)
dev(EAx - 66, 308, "C7232B", "duct CO2", BLUE, EAx + 26)
dev(SAx + DW_ + 8, 262, "HI-STATIC", "cutoff, man. reset", RED, SAx + DW_ - 10)
text(SAx + DW_ + 8, 246, "static tip into SA, set ~2.0 in wg", 5, color=GRAY)
# access door on EA riser
rect(EAx + 8, 268, 24, 24, fill=HexColor("#fff6dc"), stroke=NAVY)
text(EAx + 10, 277, "12x12", 5, True); text(EAx + 10, 271, "door", 5, True)
# dimension: sensors at least 2 duct widths below curb
wire([(EAx + DW_ + 40, ROOF + 8), (EAx + DW_ + 40, 340)], GRAY, 0.6)
wire([(EAx + DW_ + 36, 340), (EAx + DW_ + 44, 340)], GRAY, 0.6)
text(EAx + DW_ + 44, 352, "min 2 duct widths (3 ft)", 5.6, color=GRAY); text(EAx + DW_ + 44, 345, "below the curb, straight run", 5.6, color=GRAY)

# control cable route: control center -> base knockout -> inside the curb -> down the shaft beside the EA riser
CX = EAx - 8
wire([(572, ROOF + 32), (572, ROOF + 10), (CX, ROOF + 10), (CX, 262)], NAVY, 1.0, [3, 2])
wire([(CX, 340), (EAx - 12, 340)], NAVY, 1.0, [3, 2])
wire([(CX, 308), (EAx - 12, 308)], NAVY, 1.0, [3, 2])
wire([(CX, 262), (SAx + DW_ + 62, 262)], NAVY, 1.0, [3, 2])
text(SAx - 8, 300, "dashed = 18/4 shielded plenum C1-C3:", 5.4, True, NAVY, "r")
text(SAx - 8, 293, "base knockout, inside the curb,", 5.4, color=NAVY, align="r")
text(SAx - 8, 286, "strapped to the riser in the shaft", 5.4, color=NAVY, align="r")

# tubing: LO to A-306 on roof, HI down to ceiling plenum
rect(676, ROOF + 8, 4, 44, fill=GRAY, stroke=GRAY)
rect(668, ROOF + 52, 20, 10, fill=white, stroke=BLUE)
text(694, ROOF + 58, "Dwyer A-306 outdoor static probe", 5.8, True, BLUE)
text(694, ROOF + 51, "on bracket, 3 ft above roof", 5, color=GRAY)
wire([(590, ROOF + 66), (640, ROOF + 66), (640, ROOF + 20), (676, ROOF + 20), (676, ROOF + 52)], BLUE, 1.2, [4, 3])
text(602, ROOF + 70, "LO ref. tubing", 5.2, color=BLUE)
HX = EAx + DW_ + 14
wire([(590, ROOF + 60), (596, ROOF + 60), (596, ROOF + 10), (HX, ROOF + 10), (HX, CEIL + 6), (HX + 30, CEIL + 6)], BLUE, 1.2, [4, 3])
c.setFillColor(BLUE); c.circle(HX + 30, CEIL + 6, 2.2, fill=1, stroke=0)
text(HX + 36, CEIL + 4, "building static pickup: A-489 plate in a central corridor / foyer (one per unit)", 5.6, True, BLUE)
text(HX + 36, CEIL - 8, "alternative per RFI: exhaust fan tracks supply at 90%, no pressure sensor", 5.2, color=GRAY)
text(HX + 4, 250, "HI tubing", 5.2, color=BLUE)

# legend / notes
nx, ny = 40, 82
text(nx, ny, "PLACEMENT NOTES", 7.5, True, NAVY)
for i, n in enumerate([
    "1. Temp/RH and CO2 sensors on the exhaust riser, first straight section reachable from inside the building: ERU-3 at the 2nd floor ceiling (grid 8.7-9.2), ERU-1 / ERU-2 at the top of the shaft under the roof deck.",
    "2. Probes across the duct centerline through a gasketed hole; sensor housings outside the insulation; 12x12 access door within 2 ft. Nothing inside the curb or on the roof section of the duct.",
    "3. High static cutoff on the supply riser 3-4 ft below the deck, static tip only (no low port). Manual reset, wired in series with the start circuit R-G (remove the S1 jumper).",
    "4. PR-274 stays inside the control center. Two 1/4 in FR poly tubes: LO to the A-306 (on a post or the unit side, not the curb, away from EA louver and condenser), HI down the shaft to the space pickup. Both tubes and the 18/4 cables leave the unit through the base knockout.",
    "   Pickup = building pressure, one point per unit in a central corridor / foyer (ERU-3: foyer 102 or fellowship hall 113; ERU-1/2: corridor 015). Not in the EA duct (fan suction), vestibules, toilets, kitchen.",
    "   Preferred alternative (RFI to DMG): exhaust VFD tracks the supply VFD at 90% (schedule ratio 4,800/5,375 and 5,775/6,370); no transducer, tubing or roof probe, and the three units cannot fight over one building pressure.",
    "5. Smoke detectors already installed and wired by the E.C. Remote display: mount in the utility room / closet at the shaft, using Greenheck's own 150 ft cable, if the engineer does not accept the web UI.",
]):
    text(nx, ny - 10 - 9.5 * i, n, 6.0)

c.save()

import pymupdf
d = pymupdf.open(OUT)
d[0].get_pixmap(dpi=200).save(OUT.replace(".pdf", ".png"))
d[1].get_pixmap(dpi=200).save(OUT.replace(".pdf", "-detail.png"))
print("built", OUT)
