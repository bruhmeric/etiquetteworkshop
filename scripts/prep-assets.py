#!/usr/bin/env python3
"""Prepare logo + image assets for the Etiquette Essentials site (Lyceum branding)."""
import re
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path('/home/z/my-project')
PUB = ROOT / 'public'
SCRIPTS = ROOT / 'scripts'

# ── 1. Lyceum logo: original (light backgrounds) ──────────────────
src = SCRIPTS / 'lyceum-logo.svg'
svg = src.read_text(encoding='utf-8')

light = PUB / 'lyceum-logo.svg'
light.write_text(svg, encoding='utf-8')
print('wrote', light, len(svg), 'bytes')

# ── 2. White variant (dark backgrounds) ───────────────────────────
dark_svg = svg
# replace every fill colour with white, keep fill-rule/clip-rule
dark_svg = re.sub(r'fill:#[0-9A-Fa-f]{3,8}', 'fill:#ffffff', dark_svg)
dark = PUB / 'lyceum-logo-dark.svg'
dark.write_text(dark_svg, encoding='utf-8')
print('wrote', dark)
print('  colors remaining:', sorted(set(re.findall(r'fill:#[0-9A-Fa-f]{3,8}', dark_svg))))

# ── 3. Favicon: Lyceum-blue rounded square with white "EE" ────────
FAVICON = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#1C2D5A"/>
  <rect x="4" y="4" width="56" height="56" rx="10" fill="none" stroke="#265AA2" stroke-width="2.5"/>
  <text x="32" y="41" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="24" font-weight="700" fill="#ffffff" letter-spacing="1.5">EE</text>
</svg>
'''
(ROOT / 'src' / 'app' / 'icon.svg').write_text(FAVICON, encoding='utf-8')
print('wrote favicon src/app/icon.svg')

# public/logo.svg — replace with the Lyceum logo (kept for backwards compat)
shutil.copy(light, PUB / 'logo.svg')
print('updated public/logo.svg -> Lyceum logo')
