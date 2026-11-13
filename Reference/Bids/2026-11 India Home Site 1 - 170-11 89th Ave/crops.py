"""Screenshots of the India Home Site 1 mechanical pricing set (07.31.2026) for the VE proposal.
Run: python3 crops.py   (writes img/*.png). Rects are in PDF points on the 2448 x 1584 sheets."""
import os, pymupdf
S = os.path.dirname(os.path.abspath(__file__)) + "/"
SRC = S + "source/M-100 to M-109 Mechanical Plans - Pricing Set 2026-07-31.pdf"
CROPS = {  # name: (page index, (x0, y0, x1, y1), dpi)
    "m103_units": (3, (640, 430, 1310, 740), 150),
    "m103_shafts": (3, (980, 660, 1600, 900), 150),
    "m108_ervs": (8, (740, 280, 1000, 700), 160),
    "m101_vrf": (1, (590, 170, 1200, 720), 120),
    "m101_lds": (1, (600, 1080, 1180, 1240), 150),
    "m102_tracing": (2, (1180, 880, 1480, 1080), 160),
    "m100_rooms": (0, (750, 170, 1400, 500), 130),
    "m101_ervcf": (1, (1060, 340, 1380, 720), 140),
}
d = pymupdf.open(SRC)
os.makedirs(S + "img", exist_ok=True)
for name, (pg, r, dpi) in CROPS.items():
    d[pg].get_pixmap(dpi=dpi, clip=pymupdf.Rect(*r)).save(S + "img/" + name + ".png")
    print(name)
