"""EOR contract drawing extract for Siemens: pump spec (M-101), sequence 3 (M-102), pump schedule (M-401),
and the CMTA review stamp on pump submittal H-02.00. Highlights the relevant text."""
import pymupdf
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "source"
OUT = Path(__file__).resolve().parent / "Snowflake CW pumps - EOR contract documents.pdf"

HIGHLIGHT = {
    1: ["BUILT-IN PUMP SYSTEM CONTROLLER", "STANDARD COMPONENT OF THE INTEGRATED VARIABLE",
        "DIGITAL REMOTE ON/OFF", "FIELDBUS COMMUNICATION PORT"],
    2: ["PROVIDE FOR LEAD/LAG SEQUENCING", "3.CONDENSER WATER PUMPS"],
    3: ["PRIMARY-STANDBY", "CRE3-DOL2VFD"],
}

out = pymupdf.open()
dwg = pymupdf.open(SRC / "Mech drawings M-001 to M-903.pdf")
for pno, needles in HIGHLIGHT.items():
    page = dwg[pno]
    for n in needles:
        for r in page.search_for(n):
            page.add_highlight_annot(r)
    out.insert_pdf(dwg, from_page=pno, to_page=pno)
sub = pymupdf.open(SRC / "Pump submittal H-02.00 Grundfos CRE.pdf")
out.insert_pdf(sub, from_page=0, to_page=0)
out.save(OUT, garbage=4, deflate=True)
print(OUT, OUT.stat().st_size)
