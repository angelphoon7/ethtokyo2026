// Read-only follow-up to missing risk semantics. No wallet or payment capability.
// These are sponsor-published historical subjects, NOT Discord-pinned fixtures.
import { writeFile } from 'node:fs/promises';
import { quickScan } from './scan.mjs';

const source = 'https://intercepta.io/blog/mev-bot-scam-overview';
const subjects = [
  { address: '0x8232aa8c7d721ad5191954371a97a69ddcdcc492', label: 'contract in sponsor scam walkthrough' },
  { address: '0x39e27d5c1729b8a79970a3ed2926b460f07d9592', label: 'sponsor example of attacker-triggered withdrawals' },
];
const rows = [];
for (const subject of subjects) {
  const scan = await quickScan(subject.address);
  rows.push({ ...subject, source, sourceClass: 'SPONSOR_PUBLISHED_HISTORICAL_SUBJECT_NOT_EVENT_FIXTURE', scan });
  console.log(JSON.stringify({ subject: subject.address, status: scan.status, latencyMs: scan.latencyMs,
    decision: scan.decision, reason: scan.reason, observed: scan.observed }));
}
await writeFile(new URL('./evidence/sponsor-historical-scans.json', import.meta.url), JSON.stringify({
  recordedAt: new Date().toISOString(), rows,
  quoteCapturedForTheseSubjects: false, payerAuthorizationSignatures: 0, paymentMade: false,
}, null, 2) + '\n');
