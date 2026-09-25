import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createBoundary } from './guard.mjs';
import { interpretObservedScan, ZERO_SCORE_POLICY } from './scan.mjs';

const capture = JSON.parse(await readFile(new URL('./evidence/http-3.json', import.meta.url), 'utf8'));
const live = JSON.parse(await readFile(new URL('./evidence/intercepta.json', import.meta.url), 'utf8'));
const required = capture.decodedPaymentRequired;
const quote = required.accepts.find(q => q.network === 'eip155:84532');
const endpoint = capture.request.url;
const rows = [];
function setup(observed) {
  let calls = 0;
  let typed;
  const boundary = createBoundary({
    policy: { endpoint, resourceUrls: ['https://x402.vercel.app/protected'],
      network: 'eip155:84532', asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      recipients: [quote.payTo], perCall: '10000', taskBudget: '10000',
      maxTimeoutSeconds: 300, domainName: 'USDC', domainVersion: '2' },
    scan: async subject => ({ subject, ...interpretObservedScan(observed) }),
    rawSigner: { address: '0x1111111111111111111111111111111111111111',
      async signTypedData(input) {
        calls++;
        typed = input;
        throw new Error('SENTINEL_REACHED_NO_SIGNATURE');
      } },
  });
  return { ...boundary, calls: () => calls, typed: () => typed };
}

test('owner assumption allows the recorded zero/empty response to reach the exact-terms sentinel', async () => {
  assert.equal(live.status, 200);
  assert.deepEqual(live.observed, { toxicScore: 0, traits: [] });
  const mapped = interpretObservedScan(live.observed);
  assert.equal(mapped.decision, 'allow');
  assert.equal(mapped.policyBasis, ZERO_SCORE_POLICY);
  assert.equal(mapped.message, 'No suspicious activities reported.');
  const b = setup(live.observed);
  await assert.rejects(b.tool.purchase(endpoint, required), /SENTINEL_REACHED_NO_SIGNATURE/);
  assert.equal(b.calls(), 1);
  assert.equal(b.inspect().boundaryCalls, 1);
  assert.equal(b.typed().message.to.toLowerCase(), quote.payTo.toLowerCase());
  assert.equal(b.typed().message.value, BigInt(quote.amount));
  assert.equal(b.typed().domain.chainId, 84532);
  assert.equal(b.typed().domain.verifyingContract.toLowerCase(), quote.asset.toLowerCase());
  rows.push({ case: 'recorded zero/empty response under owner policy', result: 'PASS',
    decision: mapped.decision, policyBasis: mapped.policyBasis, ...b.inspect(), payerAuthorizationSignatures: 0 });
});

test('owner assumption does not allow nonzero, conflicting or incomplete responses', async () => {
  for (const [label, observed, expectedDecision = 'unknown'] of [
    ['nonzero', { toxicScore: 1, traits: [] }],
    ['conflicting trait', { toxicScore: 0, traits: [{ name: 'known_scammer', risk: 1, txsCount: 1, description: 'Synthetic control' }] }, 'hold'],
    ['missing traits', { toxicScore: 0 }],
    ['missing score', { traits: [] }],
    ['string score', { toxicScore: '0', traits: [] }],
    ['missing response', null],
  ]) {
    const b = setup(observed);
    await assert.rejects(b.tool.purchase(endpoint, required), expectedDecision === 'hold' ? /RISK_HELD/ : /RISK_UNKNOWN/);
    assert.equal(b.calls(), 0);
    assert.equal(b.inspect().boundaryCalls, 0);
    rows.push({ case: label, result: 'PASS', decision: expectedDecision, ...b.inspect(), payerAuthorizationSignatures: 0 });
  }
});

after(async () => {
  await writeFile(new URL('./evidence/owner-policy-checks.json', import.meta.url), JSON.stringify({
    recordedAt: new Date().toISOString(), riskPolicy: ZERO_SCORE_POLICY,
    evidenceClass: 'TARGETED_OFFLINE_REPLAY_AND_SYNTHETIC_CONTROLS_WITH_NON_SIGNING_SENTINEL',
    liveRequestMade: false, paidRetrySent: false, settlement: null, rows,
  }, null, 2) + '\n');
});
