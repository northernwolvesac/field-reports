"""Siemens call 10/30/2026 - CW pump controls meeting pack.

Builds highlighted extracts of the proposal, Siemens ATC R0 pump sheets, EOR drawings, pump submittal, Grundfos IOM,
Dolphin duty/standby guide, Barry's emails, Tekmar 132 option, plus the meeting sheet, and one combined PDF with
bookmarks. Run: python3 build_pack.py
"""
from pathlib import Path
import pymupdf
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

HERE = Path(__file__).resolve().parent
JOB = HERE.parent.parent
SRC = JOB / "source"
YELLOW = (1, 0.93, 0.2)
RED = (0.85, 0.1, 0.1)


def highlight(page, needles):
    for n in needles:
        for r in page.search_for(n):
            page.add_highlight_annot(r).set_colors(stroke=YELLOW)


def box(page, rect, label=None, color=RED, label_pos="above"):
    r = pymupdf.Rect(rect)
    a = page.add_rect_annot(r)
    a.set_colors(stroke=color)
    a.set_border(width=2.5)
    a.update()
    if label:
        y = r.y0 - 4 if label_pos == "above" else r.y1 + 12
        page.insert_text((r.x0, y), label, fontsize=10, color=color, fontname="helv")


def extract(src, pages, marks, out_name):
    """pages: 1-based list. marks: {page: [needles]}"""
    d = pymupdf.open(src)
    out = pymupdf.open()
    for p in pages:
        out.insert_pdf(d, from_page=p - 1, to_page=p - 1)
        highlight(out[-1], marks.get(p, []))
    out.save(HERE / out_name, garbage=4, deflate=True)
    return HERE / out_name


files = []

# 01 Siemens proposal
files.append(("01 Siemens proposal 10559656 - CW pumps scope, Alt 3, exclusions", extract(
    SRC / "Siemens proposal 10559656.pdf", [4, 5, 6, 8, 9],
    {4: ["CW Pumps", "Tenant Auto Dialers"],
     5: ["Siemens to wire pumps and associated sensors to local lead / lag panel (provided by others).",
         "Install and power manufacturer provided Lead / Lag panel", "Isolation valves - furnish and wire",
         "Leak detectors - furnish and wire. To alarm at BB BMS and Tenant AutoDialer", "Flow Switches - furnish and wire",
         "Pump - Start/stop and Status", "Differential pressure transmitter - to maintain pump speed",
         "Hardwire interlock to AC unit operation"],
     6: ["No connection to base building BMS", "Lead Lag panel provided by others",
         "Add $2,800 per Panel - Furnish (1) pump Lead / Lag DDC panel with software. Stand-alone. No tie-in", "to BMS"],
     8: ["Furnishing Lead / lag panels for pumps", "Base building BMS monitoring/control of (except Leak Detection):"],
     9: ["Miscellaneous wiring or power to 3rd party equipment has not been included, unless noted in Scope of"]},
    "01 Siemens proposal 10559656 - highlighted.pdf")))

# 02 Siemens ATC R0 sheets 300-300C (scanned, boxes at measured positions)
d = pymupdf.open(SRC / "Siemens ATC submittal R0 - valve schedule p17-22, CRAC 100-100B p29-31, pumps 300-300C p32-35.pdf")
out = pymupdf.open()
out.insert_pdf(d, from_page=9, to_page=12)
p300, p300a, p300b, p300c = out[0], out[1], out[2], out[3]
box(p300, (675, 47, 833, 126), "A: 'LEAD LAG PUMP CONTROLLER' = Siemens relays RE-1..5")
box(p300, (842, 90, 1144, 113), "B: note 2 'VFD mounted in ceiling' - no separate VFD", label_pos="below")
box(p300, (618, 245, 665, 264), "C: FS-1 'FBO'")
box(p300, (618, 448, 665, 465), "C: FS-2 'FBO'", label_pos="below")
box(p300, (872, 486, 1004, 519), "D: one DPTE, 0/15 psi (BOM 25 psi)", label_pos="below")
for pg, boxes in ((p300a, [(643, 181, 725, 594), (643, 663, 725, 1089)]),
                  (p300b, [(643, 198, 725, 614)])):
    for b in boxes:
        box(pg, b)  # E: lead/lag panel box by others = pump terminal numbers
for pg, boxes in ((p300a, [(495, 273, 591, 401), (495, 735, 591, 860)]),
                  (p300b, [(495, 270, 591, 398)])):
    for b in boxes:
        box(pg, b, color=(0.1, 0.35, 0.85))  # F: separate 'VFD panels' that do not exist
for pg, boxes in ((p300a, [(139, 574, 336, 624), (139, 1085, 336, 1138)]),
                  (p300b, [(139, 705, 336, 755)])):
    for b in boxes:
        box(pg, b, color=(0.1, 0.6, 0.2))  # G: flow alarms already to Siemens DXR
for pg, boxes in ((p300a, [(139, 266, 339, 460), (139, 760, 339, 960)]),
                  (p300b, [(139, 300, 339, 495)])):
    for b in boxes:
        box(pg, b, color=(0.1, 0.6, 0.2))  # H: leak detectors already to Siemens DXR / autodialer
box(p300c, (145, 73, 650, 234), "I: BOM - no flow switches, no panel, no horn/strobe, 1 DPTE/floor")
box(p300c, (147, 364, 630, 392), "J: 3c loss of flow -> standby + local audio/visual alarm", label_pos="above")
box(p300c, (147, 397, 630, 424), None)
p300c.insert_text((640, 415), "K: 3d leak -> local A/V + landlord BMS", fontsize=10, color=RED, fontname="helv")
box(p300c, (147, 469, 630, 490), "L: 3f 24/7 timer, 1 h every 4 h", label_pos="below")
p300a.set_rotation(270)
p300b.set_rotation(270)
out.save(HERE / "02 Siemens ATC R0 sheets 300-300C - marked.pdf", garbage=4, deflate=True)
files.append(("02 Siemens ATC R0 sheets 300, 300A, 300B, 300C (7/22/26) - marked", HERE / "02 Siemens ATC R0 sheets 300-300C - marked.pdf"))

# 03 EOR contract documents (already highlighted extract)
eor = pymupdf.open(HERE.parent / "Snowflake CW pumps - EOR contract documents.pdf")
eor.save(HERE / "03 EOR contract documents M-101 M-102 M-401 + H-02.00 stamp.pdf", garbage=4, deflate=True)
files.append(("03 EOR contract documents - M-101 pump spec, M-102 seq. 3, M-401 schedule, CMTA stamp", HERE / "03 EOR contract documents M-101 M-102 M-401 + H-02.00 stamp.pdf"))

# 04 Pump submittal
files.append(("04 Pump submittal H-02.00 - controller, I/O, terminals", extract(
    SRC / "Pump submittal H-02.00 Grundfos CRE.pdf", [1, 5, 10],
    {1: ["MAKE CORRECTIONS AS NOTED"],
     5: ["The motor includes a frequency converter and PI controller in the motor terminal box",
         "two dedicated digital inputs", "two signal-relay outputs (potential-free contacts)", "GENIbus connection"],
     10: ["Connection terminals"]},
    "04 Pump submittal H-02.00 - highlighted.pdf")))

# 05 Grundfos IOM
files.append(("05 Grundfos IOM 98358864 - multipump, inputs, relays, restart, low-flow stop", extract(
    SRC / "Grundfos IOM 98358864.pdf", [11, 12, 15, 45, 46, 55, 56, 61, 62, 63],
    {11: ["The motor restarts automatically when", "Digital input 1 is factory-set to be start-stop",
          "two signal relay outputs", "GENIbus connection"],
     15: ["You can set the signal outputs", "to Operation, Pump running, Ready, Alarm and"],
     45: ["External stop: When the input is deactivated", "External fault: When the input is activated, a",
          "timer is started. If the input is activated for more", "than 5 seconds, the pump stops and a fault is"],
     46: ["Local motor stop: When the input is activated,"],
     55: ["Stop function (Low-flow stop function)"],
     56: ["Flow switch: When the digital input is activated", "You can only use the stop function if the system",
           "incorporates a pressure sensor, a non-return valve", "and a diaphragm tank."],
     61: ["without external controllers", "Alternating operation serves as a duty and standby",
          "the other pump or motor starts if the duty pump or", "motor stops due to an alarm."],
     62: ["Select Running pump sensor if the sensor is placed", "Wired"],
     63: ["Connect the two motors with each other with", "a 3-core screened cable between the GENIbus",
          "FM310 or FM311."]},
    "05 Grundfos IOM - highlighted extract.pdf")))

# 06 Dolphin duty/standby guide
files.append(("06 Dolphin / Grundfos CRE duty-standby guide (Barry 9/28)", extract(
    SRC / "Grundfos CRE duty-standby guide (from Dolphin).pdf", [1, 2, 3, 4, 5, 6, 7],
    {1: ["Each MLE must be connected to a pressure sensor", "All field wiring to be done by the contractor"],
     2: ["The external switch (SW) will start the complete system", "Ext stop"],
     3: ["The multi pump function enables the control of two pumps connected in parallel without the use of external",
         "Alternating operation, energy – RECOMMENDED SET-UP OPTION",
         "This is only possible if each pump is configured with a dedicated pressure sensor",
         "standby pump takes over if the running pump stops due to an alarm"],
     7: ["without the use of external controllers"]},
    "06 Dolphin duty-standby guide - highlighted.pdf")))

# 08 Tekmar 132 option
t = pymupdf.open()
for src, pages, marks in ((SRC / "Tekmar 132 submittal C132.pdf", [1, 2], {}),
                          (SRC / "Tekmar 132 data brochure D132.pdf", [1, 3, 4, 6, 8, 12],
                           {3: ["If a flow proof signal is not present within the selected time, the control turns off the",
                                "Equal Run Time Rotation", "If a pump has not been operated at least once every three days"],
                            6: ["There is no power available on these terminals from the control"],
                            8: ["The Frequency of Rotation dial can be set from 12 to 168 hours or Off"],
                            12: ["120 V (ac) ±10% 60 Hz 6 VA"]})):
    s = pymupdf.open(src)
    for p in pages:
        t.insert_pdf(s, from_page=p - 1, to_page=p - 1)
        highlight(t[-1], marks.get(p, []))
t.save(HERE / "08 Tekmar 132 option - submittal and data brochure.pdf", garbage=4, deflate=True)

# 00 meeting sheet + 07 Barry / June emails (reportlab)
ss = getSampleStyleSheet()
H1 = ParagraphStyle("h1", parent=ss["Heading1"], fontSize=15, spaceAfter=4)
H2 = ParagraphStyle("h2", parent=ss["Heading2"], fontSize=11.5, spaceBefore=8, spaceAfter=3, textColor=colors.HexColor("#1F3A5F"))
B = ParagraphStyle("b", parent=ss["BodyText"], fontSize=9, leading=11.5)
S = ParagraphStyle("s", parent=B, fontSize=8, leading=10)


def bl(items):
    return [Paragraph("&bull; " + i, B) for i in items]


def tbl(rows, widths):
    data = [[Paragraph(str(c), S) for c in r] for r in rows]
    tb = Table(data, colWidths=widths, repeatRows=1)
    tb.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#DCE6F1")),
                            ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                            ("VALIGN", (0, 0), (-1, -1), "TOP")]))
    return tb


story = [Paragraph("Snowflake 7TS Fl 29-31 - CW pump controls - Siemens call 10/30/2026 10:00", H1),
         Paragraph("Siemens: Alan Parrish (Ops Mgr), Brendan Jackson (PM), Brian Greda, Rachael Werner. NW: Ruslan, "
                   "Christino, Andrei. Tabs 01-08 refer to the files in this folder / bookmarks in the combined pack.", S),
         Paragraph("Goal of the call", H2)]
story += bl(["Agree the pump control scope: no separate panel, no $50k/floor. Pumps do duty/standby themselves; "
             "Siemens provides the points already in its proposal.",
             "Get a date for ATC submittal R1 (CRAC units on site mid-November, start-up after).",
             "Close the 9/28 items list (below)."])
story.append(Paragraph("Our position in four lines", H2))
story += bl(["The design never had a separate panel: EOR specifies pumps with <b>integrated VFD and built-in pump system "
             "controller</b> (M-101 2.07.D items 5, 15, 17) and schedules them as <b>two pumps primary-standby</b> "
             "(M-401). No revision, no bulletin on this (tab 03).",
             "Sequence 3b asks for lead/lag <i>sequencing</i>: 'one pump running and the other as stand-by'. That is the "
             "Grundfos multipump 'Alternating operation': duty/standby, standby starts on alarm, no external controller "
             "(IOM 7.49 p.61, Dolphin guide p.3 - tabs 05, 06).",
             "Siemens had the approved pump submittal and the Grundfos manual on <b>6/29</b> (our email proposing "
             "multipump instead of a panel, resent 7/9). No objection; R0 came 7/22 still drawn with a panel and VFDs (tab 07).",
             "Siemens' own proposal p.5 already lists the field points (flow switches, leak detectors to BB BMS and "
             "autodialer, start/stop and status, DP transmitter, AC interlock). If a panel is still wanted: Alt 3 is "
             "<b>$2,800 per panel</b> (tab 01)."])

story.append(Paragraph("Answers to Alan (emails 10/28 and 10/29)", H2))
story.append(tbl([
    ["Alan says", "Answer", "Where"],
    ["No panel, something in the VFDs does the rotation - so no BMS interaction for rotation?",
     "Correct. Pumps are linked by GENIbus and run Alternating operation. No BMS logic for rotation.",
     "05 p.61; 06 p.3"],
    ["No alarm point in the documents / proposal; '100% standalone, no connection to the BMS at all'",
     "'No connection to base building BMS' is about pump control. Alarms ARE in scope: leak detectors 'to alarm at "
     "BB BMS and Tenant AutoDialer', flow switches, start/stop + status (p.5); Excl. 6 'except Leak Detection'; seq 3c/3d "
     "local A/V alarm + landlord BMS - copied on their own 300C; their 300A already wires flow and leak alarms to DXRs.",
     "01 p.5, p.8; 02 marks G, H, J, K; 03 M-102"],
    ["Did the VFD vendor confirm the drives act as the lead/lag panel?",
     "Yes - Dolphin 9/28: duty/standby guide, 'Standard startup/programming can be used', 'Contractor needs to run the "
     "interconnecting wiring', 'One pressure sensor is required per MLE motor'. Start-up scope confirmation requested.",
     "06; 07"],
    ["Pump panels should come with the mechanical package (Alan 10/27)",
     "On this job the EOR specified the controller inside the pump; nothing else is scheduled. M-102 ATC spec: control "
     "panels/power are controls contractor's work.", "03"],
], [1.8 * inch, 3.9 * inch, 1.3 * inch]))

story.append(Paragraph("Scope split we want to agree (per floor, x3)", H2))
story.append(tbl([
    ["Item", "Who", "Basis"],
    ["Pumps, check valves, drip pans, piping, DP taps; install DP transmitters and flow switches (pipe devices)", "NW",
     "Siemens Excl. 18 'installation of pipe mounted devices'"],
    ["GENIbus cable between the two pumps (A-Y-B, 16 ga shielded)", "NW / EC (low voltage) - agree on call", "Dolphin: 'contractor'"],
    ["Pump multipump setup, sensor setup, I/O settings at start-up", "Dolphin (confirming)", "Barry 9/28"],
    ["CRAC run (enable) contact -> DI1 of both pumps, jumper 2-6 removed", "Siemens", "p.5 'Hardwire interlock to AC unit'"],
    ["Flow switches FS-1/FS-2: furnish and wire; contact to DXR (alarm) + to that pump's DI2 (External fault)", "Siemens",
     "p.5 'Flow Switches - furnish and wire'"],
    ["Leak detectors LD (pump pans): to DXR, BB BMS, autodialer + contact to that pump's DI3", "Siemens", "p.5"],
    ["DP transmitters: 2 per floor (one per pump) wired to AI1 4-20 mA", "Siemens", "Grundfos / Barry; IOM 'running pump sensor'"],
    ["Pump status / alarm (relay 1 Alarm, OC1 or relay 2 Running) to DXR / autodialer", "Siemens", "p.5 'Start/stop and Status'"],
    ["Pump isolation valves V-1/V-2, one relay per valve (leak on one pump closes only that pump)", "Siemens", "p.5; seq 3d"],
    ["Local audio/visual alarm (horn/strobe) for loss of flow and leak", "Siemens", "seq 3c/3d on their 300C"],
    ["1 h in 4 h run timer (3f)", "Met if CRAC runs 24/7 (4a IDF); else DXR timer contact in parallel on DI1", "seq 3f / 4a"],
    ["Delete from R0: lead/lag panel box, VFD panels, VFD run/speed wiring, CS-1/CS-2 optional", "Siemens R1", "9/28 email"],
], [3.6 * inch, 1.6 * inch, 1.8 * inch]))

story.append(Paragraph("Questions to ask Siemens", H2))
story += bl([
    "With no panel and no BMS rotation, what exactly is left in the '$50k per floor'? Itemize it.",
    "Do you agree the field points on proposal p.5 stay in base scope (flow switches, leak detectors, valves, status, interlock, DP)?",
    "How will you provide the local audio/visual alarm (3c/3d) and the 3f timer - both are in your own 300C sequence but not on any sheet?",
    "Flow switches: proposal says 'furnish and wire', R0 shows 'FBO' and not in BOM. Confirm you furnish.",
    "V-1/V-2: missing from the valve schedule; both on RE-1. Will R1 show one relay per valve?",
    "CRAC valves (100A): open with unit, close when off, 4 h daily flush (4h); 5-minute delay (4i/4j); separate condensate alarm.",
    "Which contact is the 'unit status' RE-x-1 - fan/enable or compressor? Must be enable/fan, or CRAC and pumps never start (flow switch 4k).",
    "Who powers the valve actuators and relays at start-up - DXR 24 V as on 300A?",
    "Date for ATC submittal R1, and who from Siemens attends start-up with Dolphin.",
    "If you still want a panel: Alt 3 at $2,800 per panel - what would it do that the pumps do not?"])

story.append(Paragraph("Keep in mind", H2))
story += bl([
    "DP transmitters: 2 per floor needed (R0 has 1). Do not raise the extra cost - wait for Siemens to bring it up.",
    "Alternation: Grundfos recommends 'energy'; 'time' needs FM310/FM311 per current IOM p.63 (our pumps FM 300 per "
    "submittal I/O). Spec says 150 h - minor deviation; note for the EOR if asked.",
    "Do not use the pump DI 'Flow switch' function (that is low-flow stop, needs a diaphragm tank). Low-flow stop = Not active.",
    "Bypass HD-053 still open (Siemens RFI). Ask status.",
    "Fallback if Siemens insists on a panel: (1) Alt 3 at $2,800/panel ($8,400); (2) NW furnishes a Tekmar 132 per pair "
    "(~$800-1,100; tab 08) and Siemens installs, powers and wires it per p.5 'Install and power manufacturer provided "
    "Lead / Lag panel'. Mention only if needed."])

story.append(Paragraph("Still open from our 9/28 email", H2))
story += bl(["Flow switches in BOM", "V-1/V-2 in valve schedule", "One relay per pump valve (3d)", "3c/3d/3f alarm and timer",
             "300B typos (CWP-29 labels on fl. 31, LD-8 twice, DPTE-1)", "CRAC valve logic 4h; 4i/4j delay; condensate alarm",
             "DP range 0-15 vs 0-25 psi", "Sheet 100 relay table all WCCU-29-1"])

story.append(PageBreak())
story.append(Paragraph("Tab 02 legend - marks on Siemens ATC R0", H2))
story.append(tbl([
    ["Mark", "Sheet", "What it shows"],
    ["A", "300", "'LEAD LAG PUMP CONTROLLER' box = Siemens' own RIBU1C relays RE-1..5 (BOM 15) - their relays were to sit at the by-others panel"],
    ["B", "300", "Note 2 'VFD mounted in ceiling near pump set' - the VFD is integral to the pump motor"],
    ["C", "300", "Flow switches FS-1/FS-2 marked 'FBO'; proposal p.5 says furnish and wire"],
    ["D", "300", "One DP transmitter per floor, 0/15 psi (BOM says 25 psi); Grundfos needs one per pump"],
    ["E (red, 300A/300B)", "300A/B", "'CWP-xx-1&2 LEAD LAG PANEL' by others - not in BOM, no model, no power; terminal numbers 2/6, 4/6, 12/18, 10/20 are the Grundfos CRE motor terminals"],
    ["F (blue)", "300A/B", "'VFD panels' - do not exist; 300B labels the 31st floor as CWP-29"],
    ["G (green)", "300A/B", "Flow alarms RE-2-1 / RE-4-1 already wired to Siemens DXRs"],
    ["H (green)", "300A/B", "Leak detectors LD-1..4 already wired to Siemens DXRs / autodialer"],
    ["I", "300C", "BOM: no flow switches, no panel, no horn/strobe"],
    ["J, K, L", "300C", "Their sequence copies M-102 3c (local A/V alarm), 3d (leak local + landlord BMS), 3f (timer)"],
], [1.1 * inch, 0.7 * inch, 5.2 * inch]))
story.append(Paragraph("Tab 07 - Barry (Dolphin) 9/28 and our 6/29 email to Siemens", H2))
story.append(tbl([
    ["Date / from", "Text (verbatim)"],
    ["9/28 8:09 Barry", "Wiring diagram was included in the submittal. I am attaching it again. (generic 'control by BMS' diagram)"],
    ["9/28 10:50 Barry", "I am not sending you the generic drawing but that's how the pump was designed, specified, approved & released. "
     "Our startup tech will also start the pump based on this drawing only. Any advanced programming or pump setup will be by others. "
     "I will try to get answers to your comments below from the factory."],
    ["9/28 3:31 pm Barry", "Duty/standby instructions are attached. -Standard startup/programming can be used. -Contractor needs to run the "
     "interconnecting wiring. -One pressure sensor is required per MLE motor."],
    ["Open with Barry", "Draft 10/27 (not sent): confirm start-up does multipump + DP sensor + I/O settings on all 3 pairs, price if extra, "
     "notice to schedule; panel option price. Weak spot: '10:50' line says advanced programming by others - get the confirmation in writing."],
    ["6/29 Ruslan to Brendan + Brian", "Since each floor operates as an independent system serving only one data room AC unit, we can use the native "
     "multi-pump functionality built into the Grundfos CRE drives. See attached Manual ... Section 7.49 ... By linking the two pump heads directly "
     "via their GENIbus communication terminals, they will automatically handle all duty rotation, staging, and standby redundancy on their own. "
     "With this setup and since pumps not going to base building BMS, i think lead/lag panel not necessary here. (Attached: Grundfos IOM and "
     "approved H-02.00.) Resent 7/9 'please confirm'. No reply on this point; R0 issued 7/22."],
], [1.4 * inch, 5.6 * inch]))

doc = SimpleDocTemplate(str(HERE / "00 Meeting sheet - Siemens call 10-30.pdf"), pagesize=letter,
                        leftMargin=0.6 * inch, rightMargin=0.6 * inch, topMargin=0.5 * inch, bottomMargin=0.5 * inch)
doc.build(story)

# 07: June 29 email
june = pymupdf.open(SRC / "2026-06-29 NW to Siemens - multipump instead of lead-lag panel.pdf")
highlight(june[0], ["we can use the native multi-pump functionality", "lead/lag panel not necessary here",
                    "98358864", "H-02.00"])
june.save(HERE / "07 Our 6-29 email to Siemens - multipump instead of panel.pdf", garbage=4, deflate=True)

order = [("00 Meeting sheet", HERE / "00 Meeting sheet - Siemens call 10-30.pdf")] + files[:6] + \
        [("07 Our 6/29 email to Siemens (approved submittal + IOM, multipump instead of panel)",
          HERE / "07 Our 6-29 email to Siemens - multipump instead of panel.pdf"),
         ("08 Tekmar 132 option (fallback only)", HERE / "08 Tekmar 132 option - submittal and data brochure.pdf")]
pack = pymupdf.open()
toc = []
for title, f in order:
    toc.append([1, title, len(pack) + 1])
    pack.insert_pdf(pymupdf.open(f))
pack.set_toc(toc)
pack.save(HERE / "Snowflake CW pumps - Siemens call pack 10-30 (combined).pdf", garbage=4, deflate=True)
for title, f in order:
    print(f.name)
print("combined pages:", len(pack))
