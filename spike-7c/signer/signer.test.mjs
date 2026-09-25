// OFFLINE CONTROLS: ephemeral unfunded key, injected scan/challenge functions, loopback HTTP.
// These exercise the signer boundary mechanics with the official x402 SDK; they are not live evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { x402Client, wrapFetchWithPayment } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { encodePaymentRequiredHeader } from '@x402/core/http';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { verifyTypedData } from 'viem';
import { createSignerService } from './signer-service.mjs';
import { callSigner, connectSigner, createRemoteSigner } from '../agent/remote-signer.mjs';

const ASSET = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const PAY_TO = '0x209693Bc6afc0C5328bA36FaF03C514EF312287C';
const URL_OK = 'https://seller.test/protected';
const basePolicy = { policyId: 'test', endpoint: URL_OK, resourceUrls: ['https://seller.test/resource'],
  network: 'eip155:84532', asset: ASSET, recipients: [PAY_TO], perCall: '10000', taskBudget: '10000',
  maxTimeoutSeconds: 300, domainName: 'USDC', domainVersion: '2' };
const quoteOf = over => ({ scheme: 'exact', network: 'eip155:84532', amount: '10000', asset: ASSET, payTo: PAY_TO,
  maxTimeoutSeconds: 300, extra: { name: 'USDC', version: '2' }, ...over });
const requiredOf = over => ({ x402Version: 2, error: 'Payment required',
  resource: { url: 'https://seller.test/resource', description: 'test', mimeType: '' }, accepts: [quoteOf(over)] });
const allow = subject => ({ subject, decision: 'allow', reason: 'NO_SUSPICIOUS_ACTIVITIES_REPORTED', status: 200, latencyMs: 1,
  observed: { toxicScore: 0, traits: [] } });

async function harness({ policy = basePolicy, required = requiredOf(), scan, now, approvalTtlMs } = {}) {
  const key = generatePrivateKey();
  const account = privateKeyToAccount(key);
  const audit = [];
  const calls = { scan: 0, challenge: 0 };
  const service = createSignerService({ policy, account, now, approvalTtlMs, audit: e => audit.push(e),
    scan: async subject => { calls.scan++; return (scan ?? allow)(subject); },
    fetchChallenge: async () => { calls.challenge++; return required; } });
  await new Promise(resolve => service.server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${service.server.address().port}`;
  return { url, account, key, audit, calls, service, address: await connectSigner(url),
    stats: async () => (await callSigner(url, 'GET', '/stats')),
    close: () => new Promise(resolve => { service.server.closeAllConnections(); service.server.close(resolve); }) };
}

// Produce the official SDK's typed data and forward it, optionally mutated, to the signer.
async function pay(h, approvalId, required = requiredOf(), mutate) {
  const remote = createRemoteSigner(h.url, h.address, approvalId);
  const signer = { address: h.address, signTypedData: typed => remote.signTypedData(mutate ? mutate(structuredClone(typed)) : typed) };
  const client = new x402Client();
  client.register('eip155:84532', new ExactEvmScheme(signer));
  return client.createPaymentPayload(required);
}
const refused = async (promise, code) => assert.rejects(promise, e => e.message.includes(`SIGNER_REFUSED:${code}`), code);

test('allowed exact quote signs exactly once; signature verifies against the same typed data', async () => {
  const h = await harness();
  try {
    const q = await callSigner(h.url, 'POST', '/quote', { url: URL_OK });
    assert.equal(q.decision, 'allow');
    let seen;
    const payload = await pay(h, q.approvalId, requiredOf(), typed => (seen = typed));
    assert.equal(await verifyTypedData({ address: h.address, ...seen, signature: payload.payload.signature }), true);
    const s = await h.stats();
    assert.equal(s.signatures, 1); assert.equal(s.signerInvocations, 1); assert.equal(s.approvals, 1);
    assert.equal(s.reserved, '10000');
  } finally { await h.close(); }
});

test('risk hold, unknown, error and wrong subject: no approval and zero signatures', async () => {
  const cases = { hold: s => ({ subject: s, decision: 'hold', reason: 'KNOWN_RISK_TRAITS_REPORTED', status: 200,
      observed: { toxicScore: 100, traits: [{ name: 'known_scammer' }] } }),
    unknown: s => ({ subject: s, decision: 'unknown', reason: 'HTTP_OR_SCHEMA_UNKNOWN' }),
    thrown: () => { throw new Error('boom'); }, nothing: () => null,
    wrongSubject: () => allow('0x0000000000000000000000000000000000000001') };
  for (const [name, scan] of Object.entries(cases)) {
    const h = await harness({ scan });
    try {
      const q = await callSigner(h.url, 'POST', '/quote', { url: URL_OK });
      assert.equal(q.decision, 'hold', name); assert.equal(q.approvalId, undefined, name);
      await refused(pay(h, undefined), 'NO_GUARD_APPROVAL');
      await refused(pay(h, 'forged-approval-id'), 'NO_GUARD_APPROVAL');
      const s = await h.stats();
      assert.equal(s.signatures, 0, name); assert.equal(s.signerInvocations, 0, name); assert.equal(s.reserved, '0', name);
    } finally { await h.close(); }
  }
});

test('local policy failures hold before any live scan', async () => {
  const cases = { network: { network: 'eip155:1' }, cap: { amount: '10001' }, recipient: { payTo: '0x0000000000000000000000000000000000000002' },
    asset: { asset: '0x0000000000000000000000000000000000000003' }, timeout: { maxTimeoutSeconds: 301 } };
  for (const [name, over] of Object.entries(cases)) {
    const h = await harness({ required: requiredOf(over) });
    try {
      const q = await callSigner(h.url, 'POST', '/quote', { url: URL_OK });
      if (name === 'network') assert.equal(q.reason, 'NO_SUPPORTED_QUOTE');
      else assert.equal(q.decision, 'hold', name);
      assert.equal(h.calls.scan, 0, name);
      assert.equal((await h.stats()).signatures, 0, name);
    } finally { await h.close(); }
  }
  const h = await harness();
  try {
    const q = await callSigner(h.url, 'POST', '/quote', { url: 'https://evil.test/protected' });
    assert.equal(q.decision, 'hold'); assert.equal(q.reason, 'LOCAL_ENDPOINT');
    assert.equal(h.calls.challenge, 0); assert.equal(h.calls.scan, 0);
  } finally { await h.close(); }
});

test('quote mutated after approval: every field change yields zero signatures, legitimate signing still works', async () => {
  const h = await harness();
  try {
    const q = await callSigner(h.url, 'POST', '/quote', { url: URL_OK });
    const other = '0x0000000000000000000000000000000000000009';
    const mutations = {
      payTo: t => { t.message.to = other; return t; },
      amount: t => { t.message.value = t.message.value + 1n; return t; },
      asset: t => { t.domain.verifyingContract = other; return t; },
      network: t => { t.domain.chainId = 1; return t; },
      validityLater: t => { t.message.validBefore = t.message.validBefore + 1000n; return t; },
      validAfter: t => { t.message.validAfter = 1n; return t; },
      from: t => { t.message.from = other; return t; },
      extraField: t => { t.message.extra = 'x'; return t; },
      types: t => { t.types.TransferWithAuthorization.push({ name: 'x', type: 'uint256' }); return t; },
      domainName: t => { t.domain.name = 'FAKE'; return t; },
    };
    for (const [name, mutate] of Object.entries(mutations)) {
      await assert.rejects(pay(h, q.approvalId, requiredOf(), mutate), /SIGNER_REFUSED:MUTATED_|SIGNER_REFUSED:INVALID_NONCE/, name);
      const s = await h.stats();
      assert.equal(s.signerInvocations, 0, name); assert.equal(s.signatures, 0, name);
    }
    assert.equal((await h.stats()).signRejected, Object.keys(mutations).length);
    await pay(h, q.approvalId);
    assert.equal((await h.stats()).signatures, 1);
  } finally { await h.close(); }
});

test('approval is single-use and concurrent signing yields one signature', async () => {
  const h = await harness();
  try {
    const q = await callSigner(h.url, 'POST', '/quote', { url: URL_OK });
    const results = await Promise.allSettled([pay(h, q.approvalId), pay(h, q.approvalId)]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    await refused(pay(h, q.approvalId), 'APPROVAL_CONSUMED');
    const s = await h.stats();
    assert.equal(s.signatures, 1); assert.equal(s.signerInvocations, 1);
  } finally { await h.close(); }
});

test('budget: consumed spend blocks the next quote; concurrent quotes are serialised', async () => {
  const h = await harness();
  try {
    const q = await callSigner(h.url, 'POST', '/quote', { url: URL_OK });
    await pay(h, q.approvalId);
    const again = await callSigner(h.url, 'POST', '/quote', { url: URL_OK });
    assert.equal(again.decision, 'hold'); assert.equal(again.reason, 'TASK_BUDGET');
    assert.equal(h.calls.scan, 1);
  } finally { await h.close(); }
  let release;
  const gate = new Promise(resolve => (release = resolve));
  const busy = await harness({ scan: async s => { await gate; return allow(s); } });
  try {
    const first = callSigner(busy.url, 'POST', '/quote', { url: URL_OK });
    await new Promise(resolve => setTimeout(resolve, 50));
    const second = await callSigner(busy.url, 'POST', '/quote', { url: URL_OK });
    assert.equal(second.error, 'TASK_BUSY');
    release();
    assert.equal((await first).decision, 'allow');
  } finally { release(); await busy.close(); }
});

test('stale approval is refused and its reservation is released', async () => {
  let clock = 1_800_000_000_000;
  const h = await harness({ now: () => clock, approvalTtlMs: 60000 });
  try {
    const q = await callSigner(h.url, 'POST', '/quote', { url: URL_OK });
    clock += 61000;
    await refused(pay(h, q.approvalId), 'STALE_GUARD_APPROVAL');
    const next = await callSigner(h.url, 'POST', '/quote', { url: URL_OK });
    assert.equal(next.decision, 'allow');
    assert.equal((await h.stats()).signatures, 0);
  } finally { await h.close(); }
});

test('bypass: the default auto-pay wrapper with no approval gets no signature', async () => {
  const h = await harness();
  try {
    const client = new x402Client();
    client.register('eip155:84532', new ExactEvmScheme(createRemoteSigner(h.url, h.address, undefined)));
    const sellerFetch = async () => new Response('{}', { status: 402, headers: { 'payment-required': encodePaymentRequiredHeader(requiredOf()) } });
    await assert.rejects(wrapFetchWithPayment(sellerFetch, client)('https://seller.test/protected'), /SIGNER_REFUSED:NO_GUARD_APPROVAL/);
    const s = await h.stats();
    assert.equal(s.signatures, 0); assert.equal(s.signerInvocations, 0); assert.equal(s.signRejected, 1);
    assert.equal((await callSigner(h.url, 'POST', '/sign', { typedData: {} })).error, 'NO_GUARD_APPROVAL');
    assert.equal((await callSigner(h.url, 'POST', '/exportKey')).error, 'NOT_FOUND');
  } finally { await h.close(); }
});

test('the private key never appears in API responses or the audit log', async () => {
  const h = await harness();
  try {
    const q = await callSigner(h.url, 'POST', '/quote', { url: URL_OK });
    await pay(h, q.approvalId);
    const surface = JSON.stringify([await callSigner(h.url, 'GET', '/address'), await h.stats(), q, h.audit]);
    assert.equal(surface.includes(h.key.slice(2)), false);
  } finally { await h.close(); }
});

test('agent-side code contains no key material, env access, or signer-module import', () => {
  const dir = new URL('../agent/', import.meta.url);
  for (const file of ['remote-signer.mjs', 'purchase.mjs']) {
    const source = readFileSync(new URL(file, dir), 'utf8');
    for (const forbidden of [/PRIVATE_KEY/, /privateKeyToAccount/, /generatePrivateKey/, /viem\/accounts/, /process\.env/, /\.env/,
      /signer-service/, /readFile/, /node:fs/, /child_process/]) assert.doesNotMatch(source, forbidden, `${file} ${forbidden}`);
    const imports = [...source.matchAll(/from '([^']+)'/g)].map(m => m[1]);
    for (const spec of imports) assert.ok(['@x402/fetch', '@x402/evm/exact/client', './remote-signer.mjs', '../wire.mjs'].includes(spec), `${file} imports ${spec}`);
  }
  assert.equal(process.env.PAYER_PRIVATE_KEY, undefined);
});
