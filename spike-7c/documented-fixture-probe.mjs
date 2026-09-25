// Read-only fixture discovery. No signer, wallet, authorization or paid request.
import { writeFile } from 'node:fs/promises';
import { quickScan } from './scan.mjs';

const fixture = {
  address: '0xa7Bf48749D2E4aA29e3209879956b9bAa9E90570',
  source: 'https://intercepta.io/blog/how-stolen-crypto-moves-two-stage-pipeline',
  sourcePublishedDate: '2026-07-23',
  sourceClass: 'SPONSOR_PUBLISHED_HISTORICAL_RISK_SUBJECT_NOT_DISCORD_FIXTURE',
  sourceFinding: 'Sponsor describes this address as the recipient of an August 2023 poisoning theft and a subsequent USDT blacklist.',
  expectedCurrentApiResponse: 'UNVERIFIED; a historical source does not guarantee a current API verdict',
};
const scan = await quickScan(fixture.address);
await writeFile(new URL('./evidence/documented-fixture-scan.json', import.meta.url), JSON.stringify({
  recordedAt: new Date().toISOString(), fixture, scan,
  quoteCaptured: false, signerInstantiated: false, payerAuthorizationSignatures: 0, paymentMade: false,
}, null, 2) + '\n');
console.log(JSON.stringify({ subject: fixture.address, status: scan.status, latencyMs: scan.latencyMs,
  decision: scan.decision, reason: scan.reason, observed: scan.observed }));
