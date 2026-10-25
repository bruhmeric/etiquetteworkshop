#!/usr/bin/env python3
"""Final precise field geometry extraction -> JSON constants for the TS impl."""
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
    return r >= 248 and g >= 232 and b >= 224

def cream_rect(x0, x1, y0, y1, min_frac=0.9):
    """Largest cream rectangle inside the scan window."""
    xs = [x for x in range(x0, x1) if sum(is_cream(x, y) for y in range(y0, y1, 2)) >= (len(range(y0, y1, 2)) * min_frac)]
    if not xs:
        return None
    xa, xb = min(xs), max(xs)
    ys = [y for y in range(y0, y1) if sum(is_cream(x, y) for x in range(xa, xb, 2)) >= (len(range(xa, xb, 2)) * min_frac)]
    if not ys:
        return None
    ya, yb = min(ys), max(ys)
    return [xa, ya, xb, yb]

def dotted_line(y0, y1, x0=770, x1=940):
    for y in range(y0, y1):
        darks = [x for x in range(x0, x1) if px(x, y)[0] < 210 and px(x, y)[1] < 195]
        if len(darks) > 8:
            return [min(darks), y, max(darks), y]
    return None

geo = {}
# student strip (labels at y 104 / 154)
geo["student_name_box"] = cream_rect(762, 945, 100, 133)
geo["student_name_line"] = dotted_line(124, 142)
geo["student_no_box"] = cream_rect(812, 945, 148, 178)
# external strip (+199.9 offset)
geo["external_name_box"] = cream_rect(762, 945, 300, 333)
geo["external_name_line"] = dotted_line(324, 342)
geo["external_no_box"] = cream_rect(812, 945, 348, 378)

print(json.dumps(geo, indent=2))

# also verify strip boundary: darkest row between 188..196
print("\nstrip boundary check (x=400):")
for y in range(188, 198):
    print(f"  y={y}: {px(400, y)}")
doc.close()
