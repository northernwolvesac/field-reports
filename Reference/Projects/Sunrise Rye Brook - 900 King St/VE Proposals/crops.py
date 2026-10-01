"""Drawing screenshots for the VE proposal report. Crops are page fractions of the GMP set (07/15/2026)."""
import os, sys, pymupdf
S = os.path.dirname(os.path.abspath(__file__)) + "/"
P = S + "../source/06 - Mechanical - IL AL GMP SET 2026-07-15.pdf"
# name: (page, x0, y0, x1, y1, dpi)
CROPS = {
  "m5000_boiler_room":   (39, 0.540, 0.680, 0.905, 0.855, 130),
  "m5000_vav_ch":        (39, 0.030, 0.535, 0.720, 0.690, 110),
  "m5000_garage_snow":   (39, 0.030, 0.680, 0.540, 0.890, 120),
  "m2002_boiler_room":   (4,  0.470, 0.040, 0.670, 0.420, 110),
  "m2002_basement_fcu":  (4,  0.150, 0.150, 0.450, 0.430, 110),
  "m2000_trash_storage": (2,  0.160, 0.640, 0.330, 0.830, 130),
  "m6000_fcu_sched":     (43, 0.045, 0.340, 0.390, 0.392, 200),
  "m6000_vav_sched":     (43, 0.045, 0.400, 0.760, 0.560, 110),
  "m6001_ch_sched":      (44, 0.045, 0.498, 0.360, 0.590, 170),
  "m6001_boiler_pump":   (44, 0.045, 0.800, 0.555, 0.875, 150),
  "m2015_hw_piping":     (11, 0.270, 0.100, 0.620, 0.620, 90),
  "m2023_corridor_fsd":  (16, 0.360, 0.100, 0.660, 0.350, 120),
  "m2023_corridor_2":    (16, 0.290, 0.270, 0.490, 0.540, 110),
  "m2011_vav_duct":      (7,  0.270, 0.100, 0.620, 0.620, 90),
  "m2108_al_units":      (36, 0.100, 0.100, 0.300, 0.660, 110),
}
d = pymupdf.open(P)
names = sys.argv[1:] or list(CROPS)
for n in names:
    pg, x0, y0, x1, y1, dpi = CROPS[n]
    p = d[pg - 1]; W, H = p.rect.width, p.rect.height
    clip = pymupdf.Rect(x0 * W, y0 * H, x1 * W, y1 * H)
    p.get_pixmap(dpi=dpi, clip=clip).save(S + "img/%s.png" % n)
    print(n)
