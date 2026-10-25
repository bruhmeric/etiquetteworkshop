#!/usr/bin/env python3
"""Inspect the two uploaded ticket-design PDFs: pages, sizes, text bboxes."""
import fitz  # PyMuPDF
import json

for fname in ["Rs. 700.pdf", "Rs. 1000.pdf"]:
    path = f"/home/z/my-project/upload/{fname}"
    doc = fitz.open(path)
    print(f"\n===== {fname} — {doc.page_count} page(s), file size below =====")
    import os
    print("size:", os.path.getsize(path), "bytes")
    for i, page in enumerate(doc):
        r = page.rect
        print(f"\n--- page {i+1}: {r.width:.1f} x {r.height:.1f} pt "
              f"({r.width/72:.2f} x {r.height/72:.2f} in) rot={page.rotation}")
        words = page.get_text("words")  # x0,y0,x1,y1,word,block,line,word_no
        # group words into lines by (block,line)
        lines = {}
        for w in words:
            key = (w[5], w[6])
            lines.setdefault(key, []).append(w)
        for key in sorted(lines):
            ws = sorted(lines[key], key=lambda w: w[7])
            text = " ".join(w[4] for w in ws)
            x0 = min(w[0] for w in ws); y0 = min(w[1] for w in ws)
            x1 = max(w[2] for w in ws); y1 = max(w[3] for w in ws)
            print(f"  [{x0:7.1f},{y0:7.1f} -> {x1:7.1f},{y1:7.1f}]  {text!r}")
        # fonts used
        fonts = page.get_fonts()
        print("  fonts:", [(f[3], f[4]) for f in fonts][:8])
        # images
        imgs = page.get_images(full=True)
        print("  images:", len(imgs))
    doc.close()
