#!/usr/bin/env python3
"""Render cropbox view + full mediabox view of both ticket PDFs."""
import fitz

for fname, tag in [("Rs. 700.pdf", "700"), ("Rs. 1000.pdf", "1000")]:
    doc = fitz.open(f"/home/z/my-project/upload/{fname}")
    page = doc[0]
    print(f"{fname}: mediabox={page.mediabox}, cropbox={page.cropbox}, rect={page.rect}")

    # 1) visible (cropbox) render
    pix = page.get_pixmap(dpi=144)
    pix.save(f"/home/z/my-project/scripts/ticket-{tag}-visible.png")
    print("  saved visible:", pix.width, "x", pix.height)

    # 2) full mediabox render — reveal everything outside the crop
    page.set_cropbox(page.mediabox)
    pix2 = page.get_pixmap(dpi=96)
    pix2.save(f"/home/z/my-project/scripts/ticket-{tag}-full.png")
    print("  saved full:", pix2.width, "x", pix2.height)

    # text positions in full-page coordinates
    for w in page.get_text("words"):
        if w[4] in ("Ticket", "No:", "Name:", "Rs.", "700", "1,000", "STUDENT", "TICKET", "EXTERNAL"):
            print(f"    word {w[4]!r:12} [{w[0]:7.1f},{w[1]:7.1f} -> {w[2]:7.1f},{w[3]:7.1f}]")
    doc.close()
