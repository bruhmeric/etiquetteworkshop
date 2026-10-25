#!/usr/bin/env python3
"""Build the two single-page base ticket PDFs from the uploaded Canva design.

Source: upload/Rs. 700.pdf — full canvas 960x390.96 contains BOTH designs:
  student strip  = y 0..192.252   (with "LYCEUM CAMPUS STUDENTS" subtitle)
  external strip = y 192.252..384.504
Visible x range: 8..954 (matches the original export cropbox).
Each base page: 946 x 192.252 pt, clean origin at bottom-left.
"""
import fitz

SRC = "/home/z/my-project/upload/Rs. 700.pdf"
PAGE_W, PAGE_H = 946.0, 192.252

# full-canvas source (reveal hidden content first, like reveal-tickets.py did)
from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject
reader = PdfReader(SRC)
pg = reader.pages[0]
mb = pg.mediabox
pg.cropbox = RectangleObject([0, 0, float(mb.width), float(mb.height)])
w = PdfWriter()
w.add_page(pg)
tmp = "/home/z/my-project/scripts/ticket-700-full.pdf"
with open(tmp, "wb") as f:
    w.write(f)

src = fitz.open(tmp)

STRIPS = {
    "student-ticket.pdf": fitz.Rect(8, 0, 954, 192.252),
    "external-ticket.pdf": fitz.Rect(8, 192.252, 954, 384.504),
}

for out, clip in STRIPS.items():
    doc = fitz.open()
    page = doc.new_page(width=PAGE_W, height=PAGE_H)
    page.show_pdf_page(page.rect, src, 0, clip=clip)
    path = f"/home/z/my-project/public/tickets/{out}"
    doc.save(path, garbage=4, deflate=True)
    doc.close()
    import os
    print(out, os.path.getsize(path), "bytes")

# quick verification renders + text sanity
doc = fitz.open("/home/z/my-project/public/tickets/student-ticket.pdf")
print("student page:", doc[0].rect)
doc[0].get_pixmap(dpi=288).save("/home/z/my-project/scripts/base-student.png")
doc.close()
doc = fitz.open("/home/z/my-project/public/tickets/external-ticket.pdf")
print("external page:", doc[0].rect)
doc[0].get_pixmap(dpi=288).save("/home/z/my-project/scripts/base-external.png")
doc.close()
