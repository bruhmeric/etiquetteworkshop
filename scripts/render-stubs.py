#!/usr/bin/env python3
"""Render zoomed crops of the ticket stubs for close inspection."""
import fitz

doc = fitz.open("/home/z/my-project/scripts/ticket-700-full.pdf")
page = doc[0]

crops = [
    ("student-stub", fitz.Rect(700, 0, 954, 192.252)),
    ("external-stub", fitz.Rect(700, 192.252, 954, 384.5)),
    ("student-full-strip", fitz.Rect(8, 0, 954, 192.252)),
    ("external-full-strip", fitz.Rect(8, 192.252, 954, 384.5)),
]
for name, clip in crops:
    pix = page.get_pixmap(dpi=288, clip=clip)
    out = f"/home/z/my-project/scripts/zoom-{name}.png"
    pix.save(out)
    print(name, pix.width, "x", pix.height, "->", out)
doc.close()
