#!/usr/bin/env python3
"""Smoke tests: client-provided payment reference + admin telegram API."""
import json, urllib.request, base64, zlib, struct, random

def make_png(size=64):
    sig = b'\x89PNG\r\n\x1a\n'
    def chunk(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 0, 0, 0, 0))
    raw = b''.join(b'\x00' + bytes(random.randbytes(size*3)) for _ in range(size))
    return sig + ihdr + chunk(b'IDAT', zlib.compress(raw, 0)) + chunk(b'IEND', b'')

png_b64 = 'data:image/png;base64,' + base64.b64encode(make_png()).decode()
BASE = 'http://localhost:3000'

def post(url, body, headers=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json', **(headers or {})})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except Exception: return e.code, {}

# 1. register WITH paymentRef -> server must keep it
s, r = post(f'{BASE}/api/register', {
    'fullName': 'Ref Test One', 'email': 'ref1@example.lk', 'phone': '+94 77 111 2222',
    'category': 'External Participant', 'studentId': None,
    'slipBase64': png_b64, 'slipFileName': 'slip.png', 'paymentRef': 'EE-999902'})
print('1) register with paymentRef EE-999902 ->', s, r.get('refCode'))
assert s == 200 and r.get('refCode') == 'EE-999902'

# 2. register WITHOUT paymentRef -> server generates EE-XXXXXX
s, r = post(f'{BASE}/api/register', {
    'fullName': 'Ref Test Two', 'email': 'ref2@example.lk', 'phone': '+94 77 333 4444',
    'category': 'External Participant', 'studentId': None,
    'slipBase64': png_b64, 'slipFileName': 'slip.png'})
print('2) register without paymentRef         ->', s, r.get('refCode'))
assert s == 200 and r.get('refCode', '').startswith('EE-')

# 3. GARBAGE paymentRef -> rejected, server generates its own
s, r = post(f'{BASE}/api/register', {
    'fullName': 'Ref Test Three', 'email': 'ref3@example.lk', 'phone': '+94 77 555 6666',
    'category': 'External Participant', 'studentId': None,
    'slipBase64': png_b64, 'slipFileName': 'slip.png', 'paymentRef': 'EVIL<script>'})
print('3) register with garbage ref           ->', s, r.get('refCode'))
assert s == 200 and r.get('refCode', '').startswith('EE-') and r.get('refCode') != 'EVIL<script>'

# 4. COLLISION: reuse EE-999902 -> server must regenerate (dup ref forbidden)
s, r = post(f'{BASE}/api/register', {
    'fullName': 'Ref Test Four', 'email': 'ref4@example.lk', 'phone': '+94 77 777 8888',
    'category': 'External Participant', 'studentId': None,
    'slipBase64': png_b64, 'slipFileName': 'slip.png', 'paymentRef': 'EE-999902'})
print('4) register duplicate ref EE-999902    ->', s, r.get('refCode'))
assert s == 200 and r.get('refCode') != 'EE-999902'

# 5. telegram status: 401 without key
s, r = get(f'{BASE}/api/admin/telegram')
print('5) telegram status, no key             ->', s)
assert s == 401

# 6. telegram status with key (dev: no token) -> tokenConfigured false, isLocal true
s, r = get(f'{BASE}/api/admin/telegram', {'x-admin-key': 'etiquette2027'})
print('6) telegram status, dev                -> token:', r.get('tokenConfigured'),
      '| local:', r.get('isLocal'), '| expectedUrl:', r.get('expectedUrl'))
assert s == 200 and r.get('tokenConfigured') is False and r.get('isLocal') is True

# 7. set webhook without token -> clear 400
s, r = post(f'{BASE}/api/admin/telegram', {'action': 'set'}, {'x-admin-key': 'etiquette2027'})
print('7) set webhook, no bot token           ->', s, r.get('error', '')[:60])
assert s == 400

# 8. bad action -> 400
s, r = post(f'{BASE}/api/admin/telegram', {'action': 'nope'}, {'x-admin-key': 'etiquette2027'})
print('8) bad action                          ->', s)
assert s == 400

print('ALL REF/TELEGRAM TESTS PASSED')
