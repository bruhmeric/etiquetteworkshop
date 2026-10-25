#!/usr/bin/env python3
"""Measure the two ticket-no boxes + external name line precisely."""
import fitz, json

doc = fitz.open("/home/z/my-project/scripts/ticket-700-full.pdf")
page = doc[0]
pix = page.get_pixmap(dpi=288, clip=fitz.Rect(700, 0, 954, 384.5))
S = 4.0
OX = 700.0

def px(x, y):
    return pix.pixel(int((x - OX) * S), int(y * S))

def is_cream(x, y):
    r, g, b = px(x, y)
    return r >= 248 and g >= 230 and b >= 220

def cream_bounds(x0, x1, y0, y1):
    # columns with ANY cream run >= 8pt
    cols = []
    for x in range(x0, x1):
        run = best = 0
        for y in range(y0, y1):
            run = run + 1 if is_cream(x, y) else 0
            best = max(best, run)
        if best >= 30:
            cols.append(x)
    if not cols:
        return None
    xa, xb = min(cols), max(cols)
    rows = []
    for y in range(y0, y1):
        run = best = 0
        for x in range(xa, xb):
            run = run + 1 if is_cream(x, y) else 0
            best = max(best, run)
        if best >= 30:
            rows.append(y)
    return [xa, min(rows), xb, max(rows)]

res = {}
res["student_no_box"] = cream_bounds(810, 950, 146, 182)
res["external_no_box"] = cream_bounds(810, 950, 342, 378)

# external name dotted line: looser
for y in range(320, 345):
    darks = [x for x in range(772, 938) if px(x, y)[0] < 225 and px(x, y)[1] < 210]
    if len(darks) > 15:
        res["external_name_line"] = [min(darks), y, max(darks), y]
        break

print(json.dumps(res, indent=2))
doc.close()
