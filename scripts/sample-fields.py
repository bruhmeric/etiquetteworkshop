#!/usr/bin/env python3
"""Sample pixels to map the Ticket No box + verify external dotted line."""
import fitz

doc = fitz.open("/home/z/my-project/scripts/ticket-700-full.pdf")
page = doc[0]
pix = page.get_pixmap(dpi=288, clip=fitz.Rect(700, 0, 954, 384.5))
S = 4.0
OX, OY = 700.0, 0.0

def px(x, y):
    return pix.pixel(int((x - OX) * S), int((y - OY) * S))

print("sample colors, student TicketNo row y=155..170:")
for x in [740, 760, 815, 830, 850, 880, 900, 920, 935, 945]:
    print(f"  x={x}: y156={px(x,156)} y162={px(x,162)} y168={px(x,168)}")

print("\nstudent TicketNo box: scan row y=161 for border (darker) columns:")
for x in range(770, 950):
    r, g, b = px(x, 161)
    if r < 215 and g < 200:
        pass  # collect below
border_cols = [x for x in range(770, 950) if px(x, 161)[0] < 215 and px(x, 161)[1] < 200]
print("  dark cols:", border_cols[:5], "...", border_cols[-5:] if border_cols else "none")

print("\nvertical extent of box at x=850:")
col = [(y, px(850, y)) for y in range(148, 180)]
for y, c in col:
    tag = "light" if (c[0] > 232 and c[1] > 226 and c[2] > 214) else ("border" if c[0] < 215 else "")
    if tag:
        print(f"  y={y} {c} {tag}")

print("\nexternal Name dotted line check (y 330..340 at x 800..930):")
for y in range(328, 342):
    darks = [x for x in range(770, 940) if px(x, y)[0] < 205 and px(x, y)[1] < 190]
    if len(darks) > 5:
        print(f"  y={y}: {len(darks)} dark px, x {min(darks)}..{max(darks)}")
doc.close()
