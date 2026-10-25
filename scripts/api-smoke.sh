#!/usr/bin/env bash
# End-to-end API smoke test for Etiquette Essentials (demo mode).
set -uo pipefail
BASE="http://localhost:3000"

gen_slip() {
  bun -e "const QR=require('qrcode');QR.toDataURL('demo payment slip test',{width:1200}).then(u=>console.log(u))" 2>/dev/null | tail -1
}

SLIP=$(gen_slip)
echo "slip data-url length: ${#SLIP}"

echo "=== 1. REGISTER (student) ==="
curl -s -X POST "$BASE/api/register" -H 'Content-Type: application/json' -d @- <<EOF
{"fullName":"Tharushi Bandara","email":"tharushi.b@example.lk","phone":"+94 75 210 8834","category":"Lyceum Campus Student","studentId":"BEd-PE-26-05-0015","slipBase64":"$SLIP","slipFileName":"slip.jpg"}
EOF
echo

echo "=== 2. REGISTER (bad email -> 400) ==="
curl -s -X POST "$BASE/api/register" -H 'Content-Type: application/json' -d @- <<EOF
{"fullName":"Test User","email":"not-an-email","phone":"0771234567","category":"External Participant","slipBase64":"$SLIP","slipFileName":"slip.jpg"}
EOF
echo

echo "=== 3. REGISTER (student, missing ID -> 400) ==="
curl -s -X POST "$BASE/api/register" -H 'Content-Type: application/json' -d @- <<EOF
{"fullName":"Test User","email":"t@example.lk","phone":"0771234567","category":"Lyceum Campus Student","slipBase64":"$SLIP","slipFileName":"slip.jpg"}
EOF
echo

echo "=== 3b. REGISTER (PDF slip -> success) ==="
PDF=$(bun -e "const b=Buffer.from('%PDF-1.4\n'+'%pad%'.repeat(400));console.log('data:application/pdf;base64,'+b.toString('base64'))" 2>/dev/null | tail -1)
curl -s -X POST "$BASE/api/register" -H 'Content-Type: application/json' -d @- <<EOF
{"fullName":"Nimal PDF Test","email":"nimal.pdf@example.lk","phone":"+94 71 222 3344","category":"External Participant","slipBase64":"$PDF","slipFileName":"bank-slip.pdf"}
EOF
echo

echo "=== 3c. REGISTER (fake PDF, bad magic bytes -> 400) ==="
FAKEPDF=$(bun -e "console.log('data:application/pdf;base64,'+Buffer.from('X'.repeat(1100)).toString('base64'))" 2>/dev/null | tail -1)
curl -s -X POST "$BASE/api/register" -H 'Content-Type: application/json' -d @- <<EOF
{"fullName":"Fake Pdf","email":"fake@example.lk","phone":"0771234567","category":"External Participant","slipBase64":"$FAKEPDF","slipFileName":"x.pdf"}
EOF
echo

echo "=== 3d. REGISTER (text/plain slip -> 400) ==="
curl -s -X POST "$BASE/api/register" -H 'Content-Type: application/json' -d @- <<EOF
{"fullName":"Txt Slip","email":"txt@example.lk","phone":"0771234567","category":"External Participant","slipBase64":"data:text/plain;base64,$(printf 'x%.0s' {1..1100})","slipFileName":"x.txt"}
EOF
echo

echo "=== 3e. PDF SLIP SERVED (expect 200 + application/pdf) ==="
PDFURL=$(curl -s -H "x-admin-key: ${ADMIN_KEY:-etiquette2027}" "$BASE/api/admin/registrations" | python3 -c "import json,sys; d=json.load(sys.stdin); print([x['slip_url'] for x in d['registrations'] if x['full_name']=='Nimal PDF Test'][0])")
echo "pdf slip url: $PDFURL"
curl -s -o /dev/null -w "http %{http_code} · %{content_type}\n" "$BASE$PDFURL"

NEWID=$(curl -s -H "x-admin-key: ${ADMIN_KEY:-etiquette2027}" "$BASE/api/admin/registrations" | python3 -c "import json,sys; d=json.load(sys.stdin); print([x['id'] for x in d['registrations'] if x['full_name']=='Tharushi Bandara'][0])")
echo "new id: $NEWID"

echo "=== 4. APPROVE via console API ==="
curl -s -X POST -H "x-admin-key: ${ADMIN_KEY:-etiquette2027}" "$BASE/api/admin/action" -H 'Content-Type: application/json' \
  -d "{\"id\":\"$NEWID\",\"action\":\"approve\",\"adminName\":\"SmokeTest\"}" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('success:',d.get('success'),'| emailSent:',d.get('emailSent'),'| emailSkipped:',d.get('emailSkipped'),'| qr len:',len(d.get('qrDataUrl','')))"

echo "=== 5. DOUBLE-APPROVE (idempotent) ==="
curl -s -X POST -H "x-admin-key: ${ADMIN_KEY:-etiquette2027}" "$BASE/api/admin/action" -H 'Content-Type: application/json' \
  -d "{\"id\":\"$NEWID\",\"action\":\"approve\"}" | head -c 120; echo

TKT=$(curl -s -H "x-admin-key: ${ADMIN_KEY:-etiquette2027}" "$BASE/api/admin/registrations" | python3 -c "import json,sys; d=json.load(sys.stdin); print([x['ticket_code'] for x in d['registrations'] if x['full_name']=='Tharushi Bandara'][0])")
echo "ticket: $TKT"

echo "=== 6. CHECKIN new ticket (expect success) ==="
curl -s -X POST "$BASE/api/checkin" -H 'Content-Type: application/json' -d "{\"code\":\"$TKT\"}"; echo

echo "=== 7. REJECT already-approved (expect 409) ==="
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "x-admin-key: ${ADMIN_KEY:-etiquette2027}" "$BASE/api/admin/action" -H 'Content-Type: application/json' \
  -d "{\"id\":\"$NEWID\",\"action\":\"reject\"}"

echo "=== 7b. ADMIN APIs WITHOUT KEY (expect 401) ==="
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/api/admin/registrations"

echo "=== 8. TELEGRAM WEBHOOK (fake callback, no token -> silent OK) ==="
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/api/telegram-webhook" -H 'Content-Type: application/json' \
  -d '{"callback_query":{"id":"cb1","data":"{\"a\":\"app\",\"id\":\"nonexistent\"}","from":{"first_name":"X"},"message":{"chat":{"id":1},"message_id":1,"text":"t"}}}'

echo "=== 9. ADMIN LOCKOUT (3 bad keys -> 429, correct key also 429 for 5 min) ==="
echo "NOTE: this leaves localhost locked out of the admin APIs for ~5 minutes."
for i in 1 2 3 4 5; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -H "x-admin-key: wrong-$i" "$BASE/api/admin/registrations")
  echo "wrong key #$i -> $code"
  [ "$code" = "429" ] && break
done
curl -s -o /dev/null -w "correct key while locked -> %{http_code} (expect 429)\n" -H "x-admin-key: ${ADMIN_KEY:-etiquette2027}" "$BASE/api/admin/registrations"
