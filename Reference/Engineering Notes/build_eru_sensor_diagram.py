"""Field wiring diagram: Greenheck RVE-85 ERU duct sensor package (IPA Church ERU-1,2,3).
Rev 1 (09/30/2026): base case approved by the client after ADE's 09/30 answers - duct CO2 on U9, SAT relocated into the
supply riser, high static cutoff on S1, web UI over Ethernet. Space temp/RH, building pressure (PS8, A-306, pickup) and
remote displays deleted; exhaust fan tracks supply. Rev 0 (issued to ADE 09/25/2026) is in git history.
Run:  python3 build_eru_sensor_diagram.py   -> ERU-ducted-sensor-wiring-R1.pdf + .png next to this script."""
import math
import os
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, black, white

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "ERU-ducted-sensor-wiring-R1.pdf")
W, H = landscape(letter)
STAMP = "REV 1  -  FOR INSTALLATION  09/30/2026"

NAVY = HexColor("#1d2d3d"); BLUE = HexColor("#1663a8"); GRAY = HexColor("#707070")
LIGHT = HexColor("#f2f4f7"); RED = HexColor("#c0392b"); GREEN = HexColor("#1e8449"); PURPLE = HexColor("#7d3c98")
WIRE = {"BLK": black, "WHT": HexColor("#a0a0a0"), "RED": RED, "GRN": GREEN}

c = canvas.Canvas(OUT, pagesize=(W, H))


def text(x, y, s, size=7, bold=False, color=black, align="l"):
    c.setFillColor(color); c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    {"l": c.drawString, "r": c.drawRightString, "c": c.drawCentredString}[align](x, y, s)


def box(x, y, w, h, title, sub=None, fill=white, tsize=8.5, stroke=NAVY, tcolor=NAVY):
    c.setFillColor(fill); c.setStrokeColor(stroke); c.setLineWidth(1.1)
    c.rect(x, y, w, h, fill=1, stroke=1)
    text(x + 5, y + h - 11, title, tsize, True, tcolor)
    if sub:
        text(x + 5, y + h - 20, sub, 6, False, GRAY)


def term(x, y, label, side="r", size=7, color=black):
    c.setFillColor(white); c.setStrokeColor(NAVY); c.setLineWidth(0.8)
    c.circle(x, y, 2.6, fill=1, stroke=1)
    if side == "r":
        text(x + 5, y - 2.5, label, size, color=color)
    else:
        text(x - 5, y - 2.5, label, size, color=color, align="r")


def wire(pts, color, lw=1.1, dash=None):
    c.setStrokeColor(color); c.setLineWidth(lw)
    if dash: c.setDash(dash)
    p = c.beginPath(); p.moveTo(*pts[0])
    for q in pts[1:]: p.lineTo(*q)
    c.drawPath(p, stroke=1, fill=0)
    if dash: c.setDash([])


def title_bar(title, sub):
    c.setFillColor(NAVY); c.rect(0, H - 40, W, 40, fill=1, stroke=0)
    text(28, H - 18, title, 11.5, True, white)
    text(W - 28, H - 18, STAMP, 7, True, HexColor("#ffd166"), "r")
    text(28, H - 32, sub, 7, False, white)


def table(x, y_top, cw, rows, rh=11.5, size=6.3):
    y0 = y_top - rh * len(rows)
    for i, r in enumerate(rows):
        yy = y0 + rh * (len(rows) - 1 - i)
        c.setFillColor(NAVY if i == 0 else (LIGHT if i % 2 else white)); c.rect(x, yy, sum(cw), rh, fill=1, stroke=0)
        xx = x
        for cell, w in zip(r, cw):
            text(xx + 3, yy + 3.3, cell, size, i == 0, white if i == 0 else black)
            xx += w
    c.setStrokeColor(NAVY); c.setLineWidth(0.8); c.rect(x, y0, sum(cw), rh * len(rows), fill=0, stroke=1)
    return y0


# ================================================================ PAGE 1: wiring
title_bar("ERU-1 / ERU-2 / ERU-3   Greenheck RVE-85-52D   -   field wiring, one unit (typical of 3)",
          "Northern Wolves AC  |  IPA Church, 310A S. Oyster Bay Rd, Syosset NY  |  ref. Greenheck wiring diagrams G31 (controller) and Y07 (expansion), sent by ADE 09/30/2026")

PX, PY, PW, PH = 28, 176, 272, 390
box(PX, PY, PW, PH, "ERU CONTROL CENTER  (inside the unit, 24 VAC class 2)", fill=LIGHT, tsize=9)
IX, IW = PX + 12, PW - 24
TX = IX + IW - 12

box(IX, 470, IW, 77, "24 VAC terminal strip", "S1: remove factory jumper R-G, high static switch goes in its place")
tR = (TX, 522); tC = (TX, 508); tG = (TX, 494); t70 = (TX, 480)
term(*tR, "R   24 VAC hot", "l"); term(*tC, "C   common (tied to controller GND)", "l"); term(*tG, "G   remote start S1 -> ID4", "l")
term(*t70, "70   fire S6 -> ID6  (E.C. / keep jumper R-70)", "l", 6.4, GRAY)

box(IX, 300, IW, 160, "DDC controller  (Carel c.pCO, main board)")
tU9 = (TX, 432); tG2 = (TX, 418); tSa = (TX, 398); tSb = (TX, 384); tEth = (TX, 362); tTp = (TX, 336); tTm = (TX, 322)
term(*tU9, "J20 U9    CO2 signal 0-10 V", "l"); term(*tG2, "J20 GND", "l")
term(*tSa, "J3 U4    SAT  (factory landed)", "l"); term(*tSb, "J3 GND", "l")
term(*tEth, "Ethernet RJ45   web UI, static IP", "l", color=PURPLE)
term(*tTp, "J26 T+ / T-   Modbus room stat: DELETED", "l", 6.4, GRAY); term(*tTm, "J24 +V / GND   not used", "l", 6.4, GRAY)
text(IX + 5, 306, "space temp / RH: none. Unit runs on SAT; VRF carries the space.", 5.8, color=GRAY)

box(IX, 236, IW, 54, "Expansion board  (c.pCOe)")
text(IX + 5, 264, "U1 space pressure (PS8): NOT USED", 7, color=GRAY)
text(IX + 5, 253, "exhaust fan control Type = supply tracking, 90% of supply", 6.2, color=GRAY)
text(IX + 5, 244, "(set by ADE at start-up, FAQ 12)", 6.2, color=GRAY)

box(IX, 188, IW, 40, "Leave as is", "RH1 (U10), OAT (U5), CCT (U3), VFDs, dampers: factory wired")

# ---------------------------------------------------------------- right: field devices
DX, DW = 470, 294
TDX = DX + 14

box(DX, 440, DW, 110, "C1  Honeywell C7232B1022   duct CO2", "in EA riser, probe across the duct, 12x12 access door beside it; jumper to 0-10 V", stroke=BLUE)
cGp = (TDX, 508); cGo = (TDX, 494); cO1 = (TDX, 480); cM = (TDX, 466)
term(*cGp, "G+      24 VAC"); term(*cGo, "GO      24 VAC common"); term(*cO1, "OUT1    0-10 V = 0-2000 ppm"); term(*cM, "M       signal common")
text(DX + 5, 446, "relay output not used. Shield drain at unit GND only, tape off at sensor.", 5.6, color=GRAY)

box(DX, 348, DW, 82, "C2  High static cutoff, manual reset", "Cleveland AFS-460 / Dwyer 1831 on the SUPPLY riser, set 2.0 in wg", stroke=RED, tcolor=RED)
sCom = (TDX, 398); sNC = (TDX, 384)
term(*sCom, "COM   from R"); term(*sNC, "N.C.  to G   (opens on high static, unit stops)")
text(DX + 5, 356, "N.O. not used. Scheduled supply ESP 1.50 in wc; confirm < 1.6 at full speed.", 5.6, color=GRAY)

box(DX, 262, DW, 76, "SAT  discharge air temp (factory Greenheck sensor)", "relocate into SUPPLY riser, 3-5 duct widths below the unit, straight run")
sA = (TDX, 300); sB = (TDX + 130, 300)
term(*sA, "lead 1  (U4)"); term(*sB, "lead 2  (GND)")
text(DX + 5, 270, "extend only if the factory whip is short: 2 cond. of 18/4, crimp splices in a box", 5.6, color=GRAY)

box(DX, 160, DW, 92, "C3  Network switch  (8-port unmanaged, 120 V plug-in)", "utility room 008 or 2nd floor closet; owner PC / laptop plugs in here", stroke=PURPLE, tcolor=PURPLE)
nP1 = (TDX, 218); nP2 = (TDX, 204); nP3 = (TDX, 190); nUp = (TDX, 174)
term(*nP1, "port 1   ERU-1  (Cat6 from this unit)"); term(*nP2, "port 2   ERU-2", color=GRAY); term(*nP3, "port 3   ERU-3", color=GRAY)
term(*nUp, "port 8   owner PC  (or owner network via their IT)")

# ---------------------------------------------------------------- cables
def run(src, dst, cols, xs, label, ytop):
    for s, d, col, x in zip(src, dst, cols, xs):
        wire([s, (x, s[1]), (x, d[1]), d], WIRE[col])
    text(xs[0] + (len(xs) - 1) * 2.5, ytop, label, 7, True, BLUE, "c")


run([tR, tC, tU9, tG2], [cGp, cGo, cO1, cM], ["BLK", "WHT", "RED", "GRN"], [330, 335, 340, 345], "C1", 540)
run([tR, tG], [sCom, sNC], ["BLK", "WHT"], [365, 370], "C2", 470)
wire([tSa, (395, tSa[1]), (395, sA[1]), sA], NAVY, 0.9, [3, 2])
wire([tSb, (400, tSb[1]), (400, sB[1] - 10), (sB[0], sB[1] - 10), sB], NAVY, 0.9, [3, 2])
text(397, 320, "SAT", 7, True, BLUE, "c")
wire([tEth, (425, tEth[1]), (425, nP1[1]), nP1], PURPLE, 1.6, [5, 2])
text(430, 240, "Cat6", 7, True, PURPLE)
text(430, 232, "CMP", 6, color=PURPLE)

notes = [
    "C1, C2: 18/4 stranded, overall shield + drain, plenum rated (CMP). Unused conductors are spares, tape off.",
    "Shield drain on controller GND at the unit only. Never in a conduit with 208 V. Runs 20-60 ft.",
    "C3: Cat6 CMP, one home run per unit to the switch, no splices, under 328 ft; RJ45 at both ends.",
    "Route: unit base control knockout -> inside the curb -> down the duct shaft. No roof / wall penetrations.",
    "Fire S6 (R-70) and duct smoke detectors: E.C. scope, already installed; do not disturb.",
]
for i, n in enumerate(notes):
    text(PX, 164 - 10 * i, n, 6.0)

rows = [
    ("Cable", "Device", "BLK", "WHT", "RED", "GRN", "Length"),
    ("C1", "duct CO2  Honeywell C7232B1022", "R -> G+", "C -> GO", "OUT1 -> U9", "M -> GND (U9)", "20-60 ft"),
    ("C2", "high static cutoff, manual reset", "R -> COM", "N.C. -> G", "spare", "spare", "< 20 ft"),
    ("SAT", "discharge air temp (factory)", "lead 1 -> U4", "lead 2 -> GND", "-", "-", "factory lead"),
    ("C3", "Cat6 to network switch", "controller Ethernet port -> switch port 1/2/3", "", "", "", "to 008"),
]
cw = [30, 150, 74, 74, 70, 84, 46]
table(PX, 104, cw, rows)
text(PX + sum(cw) + 10, 90, "G31: C is tied to controller GND,", 6.3, color=GRAY)
text(PX + sum(cw) + 10, 81, "so M on the GND beside U9 = M on C", 6.3, color=GRAY)
text(PX + sum(cw) + 10, 72, "as the C7232 legend shows.", 6.3, color=GRAY)
text(PX + sum(cw) + 10, 58, "DELETED: HU-226 temp/RH, PR-274,", 6.3, True, RED)
text(PX + sum(cw) + 10, 49, "A-306 probe, tubing, A-489 pickup,", 6.3, True, RED)
text(PX + sum(cw) + 10, 40, "3 remote displays.", 6.3, True, RED)

# ================================================================ PAGE 2: section detail
c.showPage()
title_bar("ERU-1 / ERU-2 / ERU-3   -   sensor placement detail (section at the roof curb, not to scale)",
          "Northern Wolves AC  |  IPA Church, Syosset NY  |  unit arrangement per Greenheck overview drawing (OA inlet at end, SA discharge and EA intake through the bottom)")


def rect(x, y, w, h, fill=white, stroke=NAVY, lw=1.0):
    c.setFillColor(fill); c.setStrokeColor(stroke); c.setLineWidth(lw); c.rect(x, y, w, h, fill=1, stroke=1)


def arrow(x1, y1, x2, y2, color=NAVY):
    wire([(x1, y1), (x2, y2)], color, 0.9)
    a = math.atan2(y2 - y1, x2 - x1)
    for d in (0.5, -0.5):
        wire([(x2, y2), (x2 - 6 * math.cos(a + d), y2 - 6 * math.sin(a + d))], color, 0.9)


def dim(x, y1, y2, label1, label2, side="r"):
    wire([(x, y1), (x, y2)], GRAY, 0.6)
    for yy in (y1, y2):
        wire([(x - 4, yy), (x + 4, yy)], GRAY, 0.6)
    tx, al = (x + 6, "l") if side == "r" else (x - 6, "r")
    text(tx, (y1 + y2) / 2 + 3, label1, 5.6, color=GRAY, align=al); text(tx, (y1 + y2) / 2 - 4, label2, 5.6, color=GRAY, align=al)


ROOF = 400; CEIL = 150; FLOOR = 100
c.setFillColor(HexColor("#d9dde3")); c.rect(40, ROOF, 720, 8, fill=1, stroke=0)
text(44, ROOF + 11, "ROOF DECK + INSULATION", 6, color=GRAY)
c.setStrokeColor(GRAY); c.setLineWidth(0.8); c.setDash([6, 3]); c.line(40, CEIL, 760, CEIL); c.setDash([])
text(44, CEIL + 4, "FINISHED CEILING", 6, color=GRAY)
c.setFillColor(HexColor("#e8ebef")); c.rect(40, FLOOR - 6, 720, 6, fill=1, stroke=0)
text(44, FLOOR - 15, "FLOOR OF THE SERVED SPACE  (ERU-1, ERU-2: basement;  ERU-3: first / second floor)", 6, color=GRAY)
text(44, 300, "DUCT SHAFT / ABOVE-CEILING SPACE", 6, color=GRAY)
text(44, 293, "risers continue down to the floor served", 5.6, color=GRAY)

# curb and unit
rect(300, ROOF + 8, 260, 20, fill=HexColor("#c9ced6"))
text(305, ROOF + 15, "GKD ROOF CURB 14 in", 6, color=NAVY)
rect(280, ROOF + 28, 320, 110, fill=LIGHT, lw=1.3)
text(290, ROOF + 128, "GREENHECK RVE-85-52D", 8, True, NAVY)
rect(262, ROOF + 60, 18, 50)
text(258, ROOF + 50, "OA hood", 5.6, color=GRAY, align="r")
arrow(230, ROOF + 85, 258, ROOF + 85)
for x0, lab in ((300, "wheel"), (360, "DX coil / IG furnace"), (450, "supply fan"), (500, "exhaust fan")):
    text(x0 + 4, ROOF + 108, lab, 5.6, color=GRAY)
rect(548, ROOF + 32, 48, 100)
text(552, ROOF + 120, "CONTROL", 6, True, NAVY); text(552, ROOF + 112, "CENTER", 6, True, NAVY)
text(552, ROOF + 42, "base knockout", 5, color=GRAY); text(552, ROOF + 36, "control wiring", 5, color=GRAY)
arrow(600, ROOF + 100, 630, ROOF + 100); text(604, ROOF + 104, "EA out", 5.6, color=GRAY)

# risers: SA and EA (inside the building below the deck)
SAx, EAx, DW_ = 330, 470, 40
DUCT_BOT = 200
for x0, lab in ((SAx, "SA"), (EAx, "EA")):
    c.setStrokeColor(NAVY); c.setLineWidth(1.2)
    c.line(x0, ROOF, x0, DUCT_BOT); c.line(x0 + DW_, ROOF, x0 + DW_, DUCT_BOT)
    text(x0 + 4, DUCT_BOT + 6, lab, 8, True, NAVY)
rect(180, DUCT_BOT - 30, SAx + DW_ - 180, 30); rect(EAx, DUCT_BOT - 30, 290, 30)
text(SAx - 8, ROOF - 12, "supply riser", 6, color=NAVY, align="r")
text(EAx + DW_ + 8, ROOF - 12, "exhaust riser", 6, color=NAVY)
arrow(SAx + 20, ROOF - 30, SAx + 20, ROOF - 60)
arrow(EAx + 20, ROOF - 60, EAx + 20, ROOF - 30)
rect(200, CEIL - 10, 40, 6); arrow(220, CEIL - 10, 220, CEIL - 30); text(200, CEIL - 38, "supply diffuser", 5.6, color=GRAY)
rect(700, CEIL - 10, 40, 6); arrow(720, CEIL - 30, 720, CEIL - 10); text(700, CEIL - 38, "exhaust grille", 5.6, color=GRAY)


def dev(x, y, name, sub, col, probe_from, probe_to):
    rect(x, y, 64, 26, stroke=col)
    text(x + 4, y + 16, name, 6.4, True, col); text(x + 4, y + 6, sub, 5, color=GRAY)
    wire([(probe_from, y + 13), (probe_to, y + 13)], col, 1.6)


# high static switch: supply riser, 3-4 ft below deck
dev(SAx - 76, 350, "HI-STATIC", "man. reset, 2.0 in wg", RED, SAx - 12, SAx + 10)
text(SAx - 80, 343, "static tip into SA, 3-4 ft below deck", 5, color=GRAY, align="l")
# SAT: 3-5 duct widths below the unit
dev(SAx - 76, 240, "SAT", "factory sensor, moved", NAVY, SAx - 12, SAx + 20)
rect(SAx - 50, 208, 22, 22, fill=HexColor("#fff6dc")); text(SAx - 48, 220, "12x12", 4.8, True); text(SAx - 48, 213, "door", 4.8, True)
dim(235, ROOF, 253, "SAT 3-5 duct widths below the unit:", "36 in: 9-15 ft / 42 in: 10.5-17.5 ft", "l")
text(229, ROOF - 88, "straight run, no elbow or", 5.6, color=GRAY, align="r"); text(229, ROOF - 95, "transition just upstream", 5.6, color=GRAY, align="r")
# CO2: EA riser, min 2 duct widths below curb
dev(EAx + DW_ + 60, 322, "C7232B", "duct CO2", BLUE, EAx + DW_ + 60, EAx + 18)
rect(EAx + DW_ + 60, 290, 22, 22, fill=HexColor("#fff6dc")); text(EAx + DW_ + 62, 302, "12x12", 4.8, True); text(EAx + DW_ + 62, 295, "door", 4.8, True)
dim(EAx + DW_ + 190, ROOF, 335, "CO2 min 2 duct widths", "below the curb, straight run")

# control cable route: control center -> base knockout -> curb -> shaft
CX = 440
wire([(572, ROOF + 32), (572, ROOF + 4), (CX, ROOF + 4), (CX, 253)], NAVY, 1.0, [3, 2])
wire([(CX, 363), (SAx + DW_, 363)], NAVY, 1.0, [3, 2])
wire([(572, ROOF + 4), (660, ROOF + 4), (660, 335), (EAx + DW_ + 124, 335)], NAVY, 1.0, [3, 2])
wire([(CX, 253), (SAx + DW_, 253)], NAVY, 1.0, [3, 2])
text(SAx + DW_ + 6, 232, "C1, C2 (18/4 CMP), SAT lead:", 5.4, True, NAVY)
text(SAx + DW_ + 6, 225, "base knockout, inside the curb,", 5.4, color=NAVY)
text(SAx + DW_ + 6, 218, "strapped to the risers", 5.4, color=NAVY)
# Cat6 home run to the switch
NX = 452
wire([(580, ROOF + 32), (580, ROOF - 4), (NX, ROOF - 4), (NX, 120), (540, 120)], PURPLE, 1.4, [5, 2])
rect(540, 110, 90, 22, stroke=PURPLE); text(544, 123, "NETWORK SWITCH", 5.8, True, PURPLE); text(544, 114, "room 008 / 2nd fl closet", 5, color=GRAY)
text(NX + 4, 136, "C3 Cat6 CMP home run, down the shaft", 5.4, True, PURPLE)

nx, ny = 40, 66
text(nx, ny, "PLACEMENT NOTES", 7.5, True, NAVY)
for i, n in enumerate([
    "1. CO2 on the exhaust riser, first straight section reachable from inside: ERU-3 at the 2nd floor ceiling (grid 8.7-9.2), ERU-1 / ERU-2 at the top of the shaft under the deck. Probe across the centerline, gasketed hole, 12x12 door within 2 ft.",
    "2. SAT (Greenheck FAQ 6): in the supply duct 3-5 duct widths downstream of the unit, away from elbows, transitions and major turns. Probe across the centerline, access door beside it.",
    "3. High static cutoff on the supply riser 3-4 ft below the deck, static tip only (low port open to the shaft). Manual reset, in series with S1 R-G (factory jumper removed). Nothing inside the curb or on the roof section of the ducts.",
    "4. Web UI: one Cat6 home run per unit to the switch; ADE sets a static IP per unit on 10/29. Space temp/RH, building pressure sensor, outdoor probe and remote displays are deleted (client approved 09/30).",
]):
    text(nx, ny - 10 - 9.5 * i, n, 5.9)

# ================================================================ PAGE 3: purchase list
c.showPage()
title_bar("ERU-1 / ERU-2 / ERU-3   -   purchase list, all 3 units (base case approved by client 09/30/2026)",
          "Northern Wolves AC  |  IPA Church, Syosset NY  |  order now: everything is distributor stock; install complete by 10/23, ADE start-up 10/29 7:00-7:30 am")
rows = [
    ("#", "Item", "Qty", "Where", "Approx. each", "Approx. total"),
    ("1", "Honeywell C7232B1022 duct CO2 sensor with LCD (Greenheck 472066)", "3", "SupplyHouse, Kele, parts-hvac", "$280-570", "$850-1,710"),
    ("2", "Manual reset air pressure switch, SPDT (Cleveland AFS-460 or AFS-305; Dwyer 1831)", "3", "SupplyHouse, Cleveland dist.", "$120-170", "$360-510"),
    ("3", "Static pressure tip for the switch (Dwyer A-301 or equal) + 10 ft 1/4 in tubing each", "3", "Kele, SupplyHouse", "$20-30", "$60-90"),
    ("4", "18/4 stranded shielded plenum (CMP) cable, 500 ft spool  (C1 CO2, C2 switch, SAT ext.)", "1", "CablingPlus, CableWholesale", "$120-180", "$120-180"),
    ("5", "Cat6 plenum (CMP) solid cable, 1000 ft box  (C3, one home run per unit)", "1", "electrical / datacom supply", "$200-300", "$200-300"),
    ("6", "Cat6 RJ45 plugs (bag of 50) + 3 ft patch cords x4", "1 lot", "electrical / datacom supply", "$40-60", "$40-60"),
    ("7", "8-port unmanaged gigabit switch, metal case (Netgear GS308 or equal)", "1", "any", "$30-60", "$30-60"),
    ("8", "12x12 insulated duct access doors  (CO2 on EA riser, SAT on SA riser)", "6", "our shop / Ventlok", "$35-60", "$210-360"),
    ("9", "Misc: J-hooks / bridle rings, plenum cable ties, knockout bushings, 4x4 box + gel crimp", "1 lot", "stock", "", "$100-150"),
    ("", "   splices for SAT lead extension (only if factory whip is short), labels, duct sealant", "", "", "", ""),
    ("", "TOTAL MATERIAL, 3 units", "", "", "", "$1,970-3,420"),
]
table(28, H - 60, [18, 380, 40, 150, 70, 76], rows, rh=16, size=7)
y = H - 60 - 16 * len(rows) - 20
text(28, y, "NOT PURCHASED (deleted with the client's approval):", 8, True, RED)
for i, n in enumerate([
    "Mamac HU-226 duct temp/RH - no duct RH input on this program; unit controls on SAT, VRF carries the space.",
    "Mamac PR-274 transducer, Dwyer A-306 outdoor probe, A-489 pickup, pressure tubing - exhaust fan set to track supply at 90%.",
    "3 Greenheck remote displays (~$1,400 each) - replaced by the unit web UI over Ethernet (no license).",
    "ADE reduced sensor package ($10,500 + tax) - we buy the parts; programming is in the PO start-up visit on 10/29.",
]):
    text(40, y - 13 - 11 * i, "- " + n, 7)
y2 = y - 70
text(28, y2, "BY OTHERS / CHECK:", 8, True, NAVY)
for i, n in enumerate([
    "Owner PC or laptop for the web UI, and any connection to the owner's network / remote access: owner and their IT.",
    "120 V outlet at the network switch location (utility room 008 or 2nd floor closet): confirm one exists, else E.C.",
    "Smoke detectors and fire input S6: E.C., already installed. Existing SAT sensors: in the units, reused.",
    "Prices are Sept 2026 web prices before tax and shipping; links in the engineering note 'Where to buy'.",
]):
    text(40, y2 - 13 - 11 * i, "- " + n, 7)

c.save()

import pymupdf
d = pymupdf.open(OUT)
d[0].get_pixmap(dpi=200).save(OUT.replace(".pdf", ".png"))
d[1].get_pixmap(dpi=200).save(OUT.replace(".pdf", "-detail.png"))
print("built", OUT)
