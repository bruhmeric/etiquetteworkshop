#!/usr/bin/env python3
"""Compare image-based rebuild sizes at various settings."""
import fitz, os

src = fitz.open("/home/z/my-project/scripts/ticket-700-full.pdf")
page = src[0]

for name, clip in [("student", fitz.Rect(8, 0, 954, 192.252)),
                   ("external", fitz.Rect(8, 192.252, 954, 384.504))]:
    for dpi, mode, q in [(250, "png", None), (250, "jpg", 92), (300, "jpg", 90), (200, "png", None)]:
        pix = page.get_pixmap(dpi=dpi, clip=clip)
        img_path = f"/tmp/{name}-{dpi}{mode}{q or ''}.{mode}"
        if mode == "png":
            pix.save(img_path)
        else:
            pix.pil_save(img_path, format="JPEG", quality=q)
        # wrap single image into a PDF of exact page size
        doc = fitz.open()
        p = doc.new_page(width=946, height=192.252)
        p.insert_image(p.rect, filename=img_path)
        pdf_path = f"/tmp/{name}-{dpi}{mode}{q or ''}.pdf"
        doc.save(pdf_path, deflate=True, garbage=4)
        doc.close()
        print(f"{name} {dpi}dpi {mode} q{q}: img={os.path.getsize(img_path)//1024}KB pdf={os.path.getsize(pdf_path)//1024}KB")
src.close()
