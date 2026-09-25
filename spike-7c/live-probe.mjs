// Fresh unpaid 402 -> actual authenticated scan -> instrumented guarded gate.
// There is no private-key loader, paid retry, or cryptographic signer here.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { x402Client, x402HTTPClient } from '@x402/core/client';
import { createBoundary, checkLocal } from './guard.mjs';
import { quickScan } from './scan.mjs';

const endpoint = 'https://x402.org/protected';
const startedAt = new Date().toISOString();
const t0 = performance.now();
const response = await fetch(endpoint, { headers: { accept: 'application/json' },
  redirect: 'error', signal: AbortSignal.timeout(20000) });
assert.equal(response.status, 402, 'A real HTTP 402 is required');
const body = await response.text();
const headers = Object.fromEntries(['date', 'content-type', 'payment-required'].map(k => [k, response.headers.get(k)]));
const httpClient = new x402HTTPClient(new x402Client());
const required = httpClient.getPaymentRequiredResponse(k => response.headers.get(k), JSON.parse(body));
const quote = required.accepts.find(q => q.scheme === 'exact' && q.network === 'eip155:84532');
assert.ok(quote, 'No supported EVM offer');
const challenge = { startedAt, completedAt: new Date().toISOString(), latencyMs: Math.round(performance.now() - t0),
  request: { url: endpoint, method: 'GET', headers: { accept: 'application/json' } },
  status: response.status, headers, body, bodySha256: createHash('sha256').update(body).digest('hex'),
  decodedPaymentRequired: required, payerAuthorizationSignatures: 0, paidRetrySent: false };
await writeFile(new URL('./evidence/http-live.json', import.meta.url), JSON.stringify(challenge, null, 2) + '\n');

// Lab policy from the first captured quote, never authorization to spend funds.
const policy = {
  endpoint, resourceUrls: ['https://x402.vercel.app/protected'], network: 'eip155:84532',
  asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  recipients: ['0x209693Bc6afc0C5328bA36FaF03C514EF312287C'],
  perCall: '10000', taskBudget: '10000', maxTimeoutSeconds: 300,
  domainName: 'USDC', domainVersion: '2',
};
checkLocal(endpoint, required, quote, policy);
const trace = [{ event: 'real_402_captured', at: challenge.completedAt },
  { event: 'local_test_policy_allowed', at: new Date().toISOString() }];
let scanEvidence;
let sentinelCalls = 0;
const boundary = createBoundary({ policy,
  scan: async subject => {
    trace.push({ event: 'live_scan_started', at: new Date().toISOString(), subject });
    scanEvidence = await quickScan(subject);
    trace.push({ event: 'live_scan_completed', at: new Date().toISOString(), decision: scanEvidence.decision,
      reason: scanEvidence.reason });
    return scanEvidence;
  },
  rawSigner: { address: '0x1111111111111111111111111111111111111111', async signTypedData() {
    sentinelCalls++;
    throw new Error('SENTINEL_REACHED_NO_SIGNATURE');
  } },
});
let outcome;
try { await boundary.tool.purchase(endpoint, required); outcome = 'UNEXPECTED_PAYLOAD'; }
catch (error) { outcome = error.message; }
trace.push({ event: 'guard_completed', at: new Date().toISOString(), outcome });
const evidence = {
  startedAt, completedAt: new Date().toISOString(), endpoint, selected: quote,
  localPolicyClass: 'TEST_POLICY_ONLY_NO_OWNER_SPEND_AUTHORIZATION',
  localOnly: 'ALLOW_UNDER_TEST_POLICY_ONLY', scan: scanEvidence, outcome,
  counts: { ...boundary.inspect(), sentinelCalls, payerAuthorizationSignatures: 0 },
  paidRetrySent: false, settlement: null, trace,
  evidenceClass: 'LIVE_CHALLENGE_AND_AUTHENTICATED_SCAN_WITH_NON_SIGNING_SENTINEL',
};
await writeFile(new URL('./evidence/live-gate.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
assert.equal(scanEvidence?.status, 200, 'Live API did not return HTTP 200');
assert.equal(scanEvidence?.liveRequestMade, true, 'No live request was made');
assert.equal(outcome, 'RISK_UNKNOWN', 'Expected an inconclusive response to hold');
assert.equal(sentinelCalls, 0, 'Unknown risk must not reach the signing backend');
console.log(JSON.stringify({ challengeStatus: response.status, riskStatus: scanEvidence.status,
  riskLatencyMs: scanEvidence.latencyMs, outcome, rawSignerCalls: sentinelCalls, paymentMade: false }));
