#!/usr/bin/env python3
"""Extract precise geometry: label span colors, fill-box rects, strip boundary."""
import fitz

doc = fitz.open("/home/z/my-project/scripts/ticket-700-full.pdf")
page = doc[0]
H = page.rect.height
W = page.rect.width
print(f"page: {W} x {H}")

def hexc(c):
    return f"#{c:06x}"

print("\n--- text spans (Name / Ticket No / Rs) with colors ---")
for block in page.get_text("dict")["blocks"]:
    if "lines" not in block:
        continue
    for line in block["lines"]:
        for span in line["spans"]:
            t = span["text"].strip()
            if any(k in t for k in ("Name", "Ticket", "No:")) and len(t) < 14:
                print(f"  {t!r:12} font={span['font']:28} size={span['size']:5.2f} "
                      f"color={hexc(span['color'])} bbox=({span['bbox'][0]:.1f},{span['bbox'][1]:.1f},{span['bbox'][2]:.1f},{span['bbox'][3]:.1f})")

print("\n--- vector drawings near the stub (x > 700) ---")
for d in page.get_drawings():
    r = d["rect"]
    if r.x0 > 690 and r.width > 20 and r.height > 6:
        fill = d.get("fill")
        stroke = d.get("color")
        print(f"  rect=({r.x0:6.1f},{r.y0:6.1f},{r.x1:6.1f},{r.y1:6.1f}) w={r.width:5.1f} h={r.height:5.1f} "
              f"fill={'#%06x' % (int(fill[0]*255)*65536 + int(fill[1]*255)*256 + int(fill[2]*255)) if fill else None} "
              f"stroke={'#%06x' % (int(stroke[0]*255)*65536 + int(stroke[1]*255)*256 + int(stroke[2]*255)) if stroke else None} type={d['type']}")

print("\n--- pixel analysis: rows that are fully white (strip gap) ---")
pix = page.get_pixmap(dpi=72)  # 1px = 1pt approx (page 960x391 -> 960x391 px)
w, h = pix.width, pix.height
white_rows = []
for y in range(h):
    row_white = True
    for x in range(0, w, 4):
        r, g, b = pix.pixel(x, y)
        if r < 246 or g < 246 or b < 246:
            row_white = False
            break
    if row_white:
        white_rows.append(y)
# compress consecutive
groups = []
for y in white_rows:
    if groups and y - groups[-1][-1] <= 1:
        groups[-1].append(y)
    else:
        groups.append([y])
for g in groups:
    print(f"  white rows y={g[0]}..{g[-1]}")

print("\n--- left/right edge content (x<10, x>950) non-white pixels ---")
for x in list(range(0, 10)) + list(range(950, w)):
    col_nonwhite = 0
    for y in range(0, h, 3):
        r, g, b = pix.pixel(x, y)
        if r < 240 or g < 240 or b < 240:
            col_nonwhite += 1
    if col_nonwhite > 3:
        print(f"  x={x}: {col_nonwhite} non-white sample rows")
doc.close()
