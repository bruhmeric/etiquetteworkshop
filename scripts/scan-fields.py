#!/usr/bin/env python3
"""Find the Name dotted line and Ticket No box bounds precisely."""
import fitz

doc = fitz.open("/home/z/my-project/scripts/ticket-700-full.pdf")
page = doc[0]
pix = page.get_pixmap(dpi=288, clip=fitz.Rect(700, 0, 954, 384.5))
# clip origin (700,0); scale 4px/pt (288dpi = 4x)
S = 4.0
OX, OY = 700.0, 0.0

def px(x, y):
    return pix.pixel(int((x - OX) * S), int((y - OY) * S))

def light(x, y):
    r, g, b = px(x, y)
    return r > 232 and g > 226 and b > 214

def darkish(x, y):
    r, g, b = px(x, y)
    return r < 205 and g < 190

# --- Ticket No box (student band y 148..176, external y 344..372) ---
for label, y0, y1 in [("STUDENT TicketNo", 146, 178), ("EXTERNAL TicketNo", 342, 374)]:
    cols_light = []
    for x in range(705, 950):
        n = sum(1 for y in range(y0, y1, 1) if light(x, y))
        if n >= (y1 - y0) * 0.9:
            cols_light.append(x)
    groups = []
    for x in cols_light:
        if groups and x - groups[-1][-1] <= 3:
            groups[-1].append(x)
        else:
            groups.append([x])
    print(f"{label}: light column groups:", [(g[0], g[-1]) for g in groups if len(g) > 10])
    # vertical extent of the widest group
    if groups:
        widest = max(groups, key=len)
        xa, xb = widest[0], widest[-1]
        rows_light = []
        for y in range(y0 - 8, y1 + 8):
            n = sum(1 for x in range(xa, xb, 1) if light(x, y))
            if n >= (xb - xa) * 0.9:
                rows_light.append(y)
        rg = []
        for y in rows_light:
            if rg and y - rg[-1][-1] <= 2:
                rg[-1].append(y)
            else:
                rg.append([y])
        print(f"{label}: box rows:", [(g[0], g[-1]) for g in rg])

# --- Name dotted line (student band y 118..140, external y 318..340) ---
for label, y0, y1 in [("STUDENT Name", 118, 145), ("EXTERNAL Name", 318, 345)]:
    for y in range(y0, y1):
        darks = [x for x in range(770, 945, 1) if darkish(x, y)]
        if len(darks) > 5:
            # dotted line = periodic dark pixels
            print(f"{label}: dotted-ish row y={y} dark_px={len(darks)} x range {min(darks)}..{max(darks)}")
    # light box around name field?
    cols_light = []
    for x in range(705, 950):
        n = sum(1 for y in range(y0 - 16, y0 + 6) if light(x, y))
        if n >= 22 * 0.9:
            cols_light.append(x)
    groups = []
    for x in cols_light:
        if groups and x - groups[-1][-1] <= 3:
            groups[-1].append(x)
        else:
            groups.append([x])
    print(f"{label}: light col groups in name row:", [(g[0], g[-1]) for g in groups if len(g) > 10])
doc.close()
