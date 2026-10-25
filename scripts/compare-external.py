#!/usr/bin/env python3
"""Compare external strip price area from both source uploads."""
from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject
import fitz

def full_pdf(src, out):
    r = PdfReader(src)
    pg = r.pages[0]
    mb = pg.mediabox
    pg.cropbox = RectangleObject([0, 0, float(mb.width), float(mb.height)])
    w = PdfWriter()
    w.add_page(pg)
    with open(out, "wb") as f:
        w.write(f)

full_pdf("/home/z/my-project/upload/Rs. 1000.pdf", "/tmp/full-1000.pdf")

d700 = fitz.open("/home/z/my-project/scripts/ticket-700-full.pdf")
d1000 = fitz.open("/tmp/full-1000.pdf")

# price area of external stub: full-canvas x 760..920, y 240..300
for tag, doc in [("from700", d700), ("from1000", d1000)]:
    doc[0].get_pixmap(dpi=400, clip=fitz.Rect(750, 235, 930, 300)).save(f"/tmp/price-{tag}.png")
    print(tag, "rendered")
d700.close(); d1000.close()
