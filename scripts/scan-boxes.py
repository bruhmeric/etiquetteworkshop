#!/usr/bin/env python3
"""Pixel-scan the stub area to find the white fill-in boxes for Name / Ticket No."""
import fitz

doc = fitz.open("/home/z/my-project/scripts/ticket-700-full.pdf")
page = doc[0]
pix = page.get_pixmap(dpi=144)  # 2px per pt
scale = 2.0

def is_white(x, y):
    r, g, b = pix.pixel(int(x * scale), int(y * scale))
    return r > 244 and g > 244 and b > 244

def box_scan(y_top, y_bot, x_lo=700, x_hi=950, label=""):
    """Scan a horizontal band for a run of rows that are mostly white in x range."""
    # find columns x where the band is white
    white_cols = []
    for x in range(int(x_lo), int(x_hi)):
        white_count = sum(1 for y in range(int(y_top), int(y_bot)) if is_white(x, y))
        if white_count >= (int(y_bot) - int(y_top)) * 0.85:
            white_cols.append(x)
    if not white_cols:
        print(f"{label}: no white box found")
        return
    # group consecutive columns
    groups = []
    for x in white_cols:
        if groups and x - groups[-1][-1] <= 2:
            groups[-1].append(x)
        else:
            groups.append([x])
    for g in groups:
        if len(g) > 15:
            print(f"{label}: white box x={g[0]}..{g[-1]} (w={g[-1]-g[0]}) in band y={y_top}..{y_bot}")

# student strip: Name label y 104-118, TicketNo label y 154-168
box_scan(100, 122, label="STUDENT Name box  ")
box_scan(150, 172, label="STUDENT TicketNo  ")
# external strip: Name label y 304-318, TicketNo label y 349-364
box_scan(300, 322, label="EXTERNAL Name box  ")
box_scan(346, 368, label="EXTERNAL TicketNo  ")

# check strip boundary: sample colors along x=800 for y 175..205
print("\nboundary colors at x=800:")
for y in range(176, 206, 2):
    x_px, y_px = int(800 * scale), int(y * scale)
    print(f"  y={y}: {pix.pixel(x_px, y_px)}")
doc.close()
