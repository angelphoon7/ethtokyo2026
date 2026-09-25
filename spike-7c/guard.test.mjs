import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { x402Client, x402HTTPClient } from '@x402/core/client';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { wrapFetchWithPayment } from '@x402/fetch';
import { createBoundary, checkLocal } from './guard.mjs';
import { quickScan } from './scan.mjs';

const capture = JSON.parse(await readFile(new URL('./evidence/http-3.json', import.meta.url), 'utf8'));
const required = new x402HTTPClient(new x402Client()).getPaymentRequiredResponse(
  name => capture.headers[name.toLowerCase()], JSON.parse(capture.body),
);
const quote = required.accepts.find(q => q.network === 'eip155:84532');
const endpoint = capture.request.url;
// TEST POLICY ONLY. This does not authorize spending and is not owner consent.
const policy = {
  endpoint, resourceUrls: ['https://x402.vercel.app/protected'],
  network: 'eip155:84532', asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  recipients: [quote.payTo], perCall: '10000', taskBudget: '10000',
  maxTimeoutSeconds: 300, domainName: 'USDC', domainVersion: '2',
};
const rows = [];
const results = [];
const allow = async subject => ({ subject, decision: 'allow', source: 'UNIT_TEST_CONTROL' });
const sentinel = () => ({
  address: '0x1111111111111111111111111111111111111111',
  calls: 0, last: null,
  async signTypedData(typed) {
    this.calls++;
    this.last = structuredClone(typed);
    throw new Error('SENTINEL_REACHED_NO_SIGNATURE');
  },
});
function setup(overrides = {}) {
  const raw = sentinel();
  const boundary = createBoundary({ policy, scan: allow, rawSigner: raw, ...overrides });
  return { raw, ...boundary };
}
function record(name, boundary, expected) {
  assert.equal(boundary.raw.calls, expected);
  rows.push({ case: name, ...boundary.inspect(), payerAuthorizationSignatures: 0,
    evidenceClass: 'OFFLINE_REPLAY_WITH_TEST_CONTROL_AND_THROWING_SENTINEL' });
}
function replay() {
  return new Response(capture.body, { status: capture.status, headers: {
    'payment-required': capture.headers['payment-required'], 'content-type': 'application/json',
  } });
}

test('captured response is a real supported quote; local comparison is a TEST policy', () => {
  assert.equal(capture.status, 402);
  assert.deepEqual(required, capture.decodedPaymentRequired);
  assert.equal(checkLocal(endpoint, required, quote, policy), true);
  results.push({ endpoint, selected: quote, localOnly: 'ALLOW_UNDER_TEST_POLICY_ONLY',
    plusLiveRisk: 'BLOCKED_LIVE_KEY_REQUIRED', liveNegativeComparison: 'UNPROVEN' });
});

test('official auto-payment wrapper reaches a naked sentinel without risk checks', async () => {
  const raw = sentinel();
  const client = new x402Client().register('eip155:84532', new ExactEvmScheme(raw));
  let fetchCalls = 0;
  const wrapped = wrapFetchWithPayment(async () => { fetchCalls++; return replay(); }, client);
  await assert.rejects(wrapped(endpoint), /SENTINEL_REACHED_NO_SIGNATURE/);
  assert.equal(raw.calls, 1);
  assert.equal(fetchCalls, 1);
  rows.push({ case: 'unguarded SDK control', boundaryCalls: 0, rawSignerCalls: 1,
    payerAuthorizationSignatures: 0, evidenceClass: 'UNGUARDED_OFFLINE_SENTINEL_CONTROL' });
});

test('SDK before-creation abort runs before EVM signer', async () => {
  const raw = sentinel();
  const client = new x402Client().register('eip155:84532', new ExactEvmScheme(raw));
  client.onBeforePaymentCreation(() => ({ abort: true, reason: 'TEST_HOLD' }));
  await assert.rejects(client.createPaymentPayload(required), /TEST_HOLD/);
  assert.equal(raw.calls, 0);
  rows.push({ case: 'SDK abort hook control', rawSignerCalls: 0, payerAuthorizationSignatures: 0,
    evidenceClass: 'OFFLINE_HOOK_CONTROL' });
});

for (const [name, scan, error] of [
  ['injected hold (NOT live risk)', async subject => ({ subject, decision: 'hold' }), /RISK_HELD/],
  ['unknown risk', async subject => ({ subject, decision: 'unknown' }), /RISK_UNKNOWN/],
  ['missing risk', async () => null, /RISK_UNKNOWN/],
  ['risk provider throws', async () => { throw new Error('offline outage'); }, /RISK_UNAVAILABLE/],
  ['wrong scan subject', async () => ({ subject: '0x2222222222222222222222222222222222222222', decision: 'allow' }), /RISK_UNKNOWN/],
]) {
  test(name, async () => {
    const b = setup({ scan });
    await assert.rejects(b.tool.purchase(endpoint, required), error);
    record(name, b, 0);
    assert.equal(b.inspect().reserved, '0');
  });
}

test('exact captured terms reach sentinel once after test approval; retry budget stays reserved', async () => {
  let scanned;
  const b = setup({ scan: async subject => { scanned = subject; return allow(subject); } });
  await assert.rejects(b.tool.purchase(endpoint, required), /SENTINEL_REACHED_NO_SIGNATURE/);
  assert.equal(scanned, quote.payTo);
  assert.equal(b.raw.last.message.to.toLowerCase(), quote.payTo.toLowerCase());
  assert.equal(b.raw.last.message.value, BigInt(quote.amount));
  assert.equal(b.raw.last.domain.verifyingContract.toLowerCase(), quote.asset.toLowerCase());
  assert.equal(b.raw.last.domain.chainId, 84532);
  await assert.rejects(b.tool.purchase(endpoint, required), /TASK_BUDGET/);
  record('exact terms / uncertain retry prevented', b, 1);
});

for (const [name, change, error] of [
  ['payTo', t => { t.message.to = '0x2222222222222222222222222222222222222222'; }, /MUTATED_TRANSFER/],
  ['amount', t => { t.message.value += 1n; }, /MUTATED_TRANSFER/],
  ['asset', t => { t.domain.verifyingContract = '0x2222222222222222222222222222222222222222'; }, /MUTATED_DOMAIN/],
  ['network', t => { t.domain.chainId = 8453; }, /MUTATED_DOMAIN/],
  ['expiry', t => { t.message.validBefore += 1000n; }, /MUTATED_VALIDITY/],
  ['types', t => { t.types.TransferWithAuthorization[2].type = 'uint128'; }, /MUTATED_TYPES/],
]) {
  test(`post-scan mutation: ${name}`, async () => {
    const b = setup({ buildPayload: async (r, signer) => {
      const adversarialSigner = { address: signer.address, signTypedData: t => {
        const changed = structuredClone(t); change(changed); return signer.signTypedData(changed);
      } };
      return new ExactEvmScheme(adversarialSigner).createPaymentPayload(2, r.accepts[0]);
    } });
    await assert.rejects(b.tool.purchase(endpoint, required), error);
    record(`mutated ${name}`, b, 0);
  });
}

test('unguarded automatic route with protected signer has no approval capability', async () => {
  const b = setup();
  const client = new x402Client().register('eip155:84532', new ExactEvmScheme(b.protectedSigner));
  await assert.rejects(wrapFetchWithPayment(async () => replay(), client)(endpoint), /NO_GUARD_APPROVAL/);
  record('unguarded wrapper / protected signer', b, 0);
});

test('concurrent tool call and outside signer cannot borrow a pending scan approval', async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const b = setup({ scan: async subject => { await pending; return { subject, decision: 'unknown' }; } });
  const first = b.tool.purchase(endpoint, required);
  await assert.rejects(b.tool.purchase(endpoint, required), /TASK_BUSY/);
  await assert.rejects(new ExactEvmScheme(b.protectedSigner).createPaymentPayload(2, quote), /NO_GUARD_APPROVAL/);
  release();
  await assert.rejects(first, /RISK_UNKNOWN/);
  record('concurrency and approval theft', b, 0);
});

test('unexpected endpoint is rejected before scanning', async () => {
  let scanned = false;
  const b = setup({ scan: async subject => { scanned = true; return allow(subject); } });
  await assert.rejects(b.tool.purchase('https://example.invalid/resource', required), /LOCAL_ENDPOINT/);
  assert.equal(scanned, false);
  record('local endpoint rejection', b, 0);
});

test('a second signature attempt cannot reuse the same approval', async () => {
  const b = setup({ buildPayload: async (r, signer) => {
    const scheme = new ExactEvmScheme(signer);
    await assert.rejects(scheme.createPaymentPayload(2, r.accepts[0]), /SENTINEL_REACHED_NO_SIGNATURE/);
    return scheme.createPaymentPayload(2, r.accepts[0]);
  } });
  await assert.rejects(b.tool.purchase(endpoint, required), /NO_GUARD_APPROVAL/);
  record('one-shot approval cannot be reused', b, 1);
});

test('caller mutation while scan is pending cannot change the captured snapshot', async () => {
  const callerOwned = structuredClone(required);
  const b = setup({ scan: async subject => {
    callerOwned.accepts[0].amount = '999999999';
    callerOwned.accepts[0].payTo = '0x2222222222222222222222222222222222222222';
    return allow(subject);
  } });
  await assert.rejects(b.tool.purchase(endpoint, callerOwned), /SENTINEL_REACHED_NO_SIGNATURE/);
  assert.equal(b.raw.last.message.value, BigInt(quote.amount));
  assert.equal(b.raw.last.message.to.toLowerCase(), quote.payTo.toLowerCase());
  record('caller mutation isolated by snapshot', b, 1);
});

test('unconfigured Intercepta adapter holds without fabricating a response', async () => {
  // Tests never read or send an existing secret and never make a network call.
  const saved = process.env.INTERCEPTA_API_KEY;
  delete process.env.INTERCEPTA_API_KEY;
  try {
    const b = setup({ scan: quickScan });
    const observed = await quickScan(quote.payTo);
    assert.equal(observed.reason, 'BLOCKED: LIVE KEY REQUIRED');
    assert.equal(observed.liveRequestMade, false);
    await assert.rejects(b.tool.purchase(endpoint, required), /RISK_UNKNOWN/);
    record('actual adapter / missing key', b, 0);
  } finally {
    if (saved !== undefined) process.env.INTERCEPTA_API_KEY = saved;
  }
});

after(async () => {
  await writeFile(new URL('./evidence/signer-counts.json', import.meta.url), JSON.stringify({
    recordedAt: new Date().toISOString(), warning: 'OFFLINE REPLAY ONLY. No key, crypto signing, paid retry, or settlement.',
    rows, comparison: results,
  }, null, 2) + '\n');
});
