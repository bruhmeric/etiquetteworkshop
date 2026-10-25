/**
 * Generate sample personalised tickets for visual verification.
 * Run: bun run scripts/test-ticket-pdf.ts
 */
import { generateTicketPdf } from '../src/lib/ticket-pdf';
import fs from 'node:fs';

async function main() {
  const cases = [
    { full_name: 'Nethmini Rathnayake', ticket_code: 'TKT-AB12CD3', category: 'Lyceum Campus Student', file: 'out-student.pdf' },
    { full_name: 'Kasun Silva', ticket_code: 'TKT-XY98ZW7', category: 'External Participant', file: 'out-external.pdf' },
    // stress: very long name
    { full_name: 'Donal Anthony Wickramasinghe Perera', ticket_code: 'TKT-L0NGNM9', category: 'Lyceum Campus Student', file: 'out-longname.pdf' },
  ];
  for (const c of cases) {
    const bytes = await generateTicketPdf(c as never);
    if (!bytes) {
      console.error(`${c.file}: FAILED (null)`);
      continue;
    }
    fs.writeFileSync(`/home/z/my-project/scripts/${c.file}`, bytes);
    console.log(`${c.file}: ${(bytes.length / 1024).toFixed(0)} KB`);
  }
}

main();
