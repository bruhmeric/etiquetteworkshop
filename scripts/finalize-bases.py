#!/usr/bin/env python3
"""Finalize public/tickets/{student,external}-ticket.pdf — 300dpi JPEG q90 on exact 946x192.252pt pages."""
import fitz, os

src = fitz.open("/home/z/my-project/scripts/ticket-700-full.pdf")
page = src[0]

for name, clip in [("student-ticket", fitz.Rect(8, 0, 954, 192.252)),
                   ("external-ticket", fitz.Rect(8, 192.252, 954, 384.504))]:
    pix = page.get_pixmap(dpi=300, clip=clip)
    img = f"/tmp/{name}.jpg"
    pix.pil_save(img, format="JPEG", quality=90)
    doc = fitz.open()
    p = doc.new_page(width=946, height=192.252)
    p.insert_image(p.rect, filename=img)
    out = f"/home/z/my-project/public/tickets/{name}.pdf"
    doc.save(out, deflate=True, garbage=4)
    doc.close()
    print(name, os.path.getsize(out) // 1024, "KB")

    # verification render of the finalized base
    d = fitz.open(out)
    d[0].get_pixmap(dpi=288).save(f"/home/z/my-project/scripts/base-{name}.png")
    d.close()
src.close()
