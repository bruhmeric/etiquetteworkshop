#!/usr/bin/env python3
"""Definitive box measurement with numpy masks."""
import fitz
import numpy as np

doc = fitz.open("/home/z/my-project/scripts/ticket-700-full.pdf")
page = doc[0]
pix = page.get_pixmap(dpi=288, clip=fitz.Rect(700, 0, 954, 384.5))
S = 4.0
arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3]

def measure(x0, x1, y0, y1, label):
    """x0.. in points; find cream box bounds within window."""
    xa, xb = int((x0 - 700) * S), int((x1 - 700) * S)
    ya, yb = int(y0 * S), int(y1 * S)
    win = arr[ya:yb, xa:xb].astype(int)
    # cream mask: high R, G clearly above pink's ~210-220
    cream = (win[:, :, 0] >= 247) & (win[:, :, 1] >= 228) & (win[:, :, 2] >= 218)
    if cream.sum() < 500:
        print(f"{label}: no cream region ({cream.sum()} px)")
        return
    ys, xs = np.where(cream)
    print(f"{label}: cream px={cream.sum()} x={700 + (xa + xs.min())/S:.1f}..{700 + (xa + xs.max())/S:.1f} "
          f"y={(ya + ys.min())/S:.1f}..{(ya + ys.max())/S:.1f}")

measure(812, 950, 146, 184, "STUDENT TicketNo box")
measure(812, 950, 342, 380, "EXTERNAL TicketNo box")
measure(760, 948, 98, 136, "STUDENT Name field ")
measure(760, 948, 298, 336, "EXTERNAL Name field ")

# strip boundary: find rows y 185..200 where the row at x 750-950 is much darker than pink
for y in range(186, 200):
    row = arr[int(y * S), int(50 * S):int(250 * S)]  # x 750..950
    m = row.mean(axis=0)
    if m[0] < 230 or m[1] < 200:
        print(f"boundary row y={y}: mean={m.astype(int)}")
doc.close()
