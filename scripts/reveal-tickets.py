#!/usr/bin/env python3
"""Reset cropbox to full mediabox via pypdf, then render + extract all text."""
from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject
import fitz

for fname, tag in [("Rs. 700.pdf", "700"), ("Rs. 1000.pdf", "1000")]:
    src = f"/home/z/my-project/upload/{fname}"
    reader = PdfReader(src)
    page = reader.pages[0]
    mb = page.mediabox
    page.cropbox = RectangleObject([0, 0, float(mb.width), float(mb.height)])
    w = PdfWriter()
    w.add_page(page)
    out = f"/home/z/my-project/scripts/ticket-{tag}-full.pdf"
    with open(out, "wb") as f:
        w.write(f)

    doc = fitz.open(out)
    p = doc[0]
    print(f"\n===== {fname} full canvas: {p.rect} =====")
    pix = p.get_pixmap(dpi=110)
    pix.save(f"/home/z/my-project/scripts/ticket-{tag}-full.png")
    print("render:", pix.width, "x", pix.height)
    for w4 in p.get_text("words"):
        print(f"  [{w4[0]:7.1f},{w4[1]:7.1f} -> {w4[2]:7.1f},{w4[3]:7.1f}]  {w4[4]!r}")
    doc.close()
