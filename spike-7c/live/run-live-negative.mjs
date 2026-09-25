// LIVE negative/bypass run against the protected signer as a SEPARATE PROCESS.
// The signer uses its own ephemeral, unfunded key that this agent-side process never sees.
// Real: x402.org 402, Intercepta API, local HTTPS seller, loopback signer HTTP. No payment is attempted.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { x402Client, wrapFetchWithPayment } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { callSigner, connectSigner, createRemoteSigner } from '../agent/remote-signer.mjs';
import { purchase } from '../agent/purchase.mjs';
import { startControlledSeller } from './local-seller.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = fileURLToPath(new URL('../evidence/x402/', import.meta.url));
mkdirSync(outDir, { recursive: true });
const ownerPolicy = JSON.parse(readFileSync(`${root}signer/owner-policy.json`, 'utf8'));
const FIXTURE = '0xa7Bf48749D2E4aA29e3209879956b9bAa9E90570';
assert.equal(process.env.PAYER_PRIVATE_KEY, undefined, 'agent process must not hold a payer key');
const agentEnvNames = { PAYER_PRIVATE_KEY: 'PAYER_PRIVATE_KEY' in process.env, INTERCEPTA_API_KEY: 'INTERCEPTA_API_KEY' in process.env };

async function startSigner({ name, policy, extraCaFile, useIntercepta = true, envOverride = {} }) {
  const auditFile = `${outDir}signer-audit-${name}.jsonl`;
  rmSync(auditFile, { force: true });
  const args = [...(useIntercepta ? [`--env-file=${root}.env`] : []), `${root}signer/signer-service.mjs`];
  const child = spawn(process.execPath, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: {
    PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, SIGNER_EPHEMERAL: '1', SIGNER_PORT: '0',
    SIGNER_AUDIT_FILE: auditFile, SIGNER_POLICY_JSON: JSON.stringify(policy),
    ...(extraCaFile ? { SIGNER_EXTRA_CA_FILE: extraCaFile } : {}), ...envOverride } });
  let stderr = '';
  child.stderr.on('data', c => (stderr += c));
  const info = await new Promise((resolve, reject) => {
    let buf = '';
    child.stdout.on('data', c => { buf += c; const line = buf.split('\n')[0]; if (buf.includes('\n')) { try { resolve(JSON.parse(line)); } catch (e) { reject(e); } } });
    child.once('exit', code => reject(new Error(`signer exited ${code}: ${stderr.trim()}`)));
    setTimeout(() => reject(new Error('signer start timeout')), 15000);
  });
  const url = `http://${info.listening}`;
  return { url, info, auditFile, pid: child.pid,
    stats: () => callSigner(url, 'GET', '/stats'),
    stop: () => new Promise(resolve => { child.once('exit', resolve); child.kill(); }) };
}

// Official SDK typed data forwarded to the signer, optionally mutated on the way.
async function sdkPay(signer, address, approvalId, required, mutate) {
  const remote = createRemoteSigner(signer.url, address, approvalId);
  const wrapper = { address, signTypedData: t => remote.signTypedData(mutate ? mutate(structuredClone(t)) : t) };
  const client = new x402Client();
  client.register('eip155:84532', new ExactEvmScheme(wrapper));
  return client.createPaymentPayload(required);
}
const refusalOf = async promise => { try { await promise; return 'UNEXPECTED_SIGNATURE'; } catch (e) { return /SIGNER_REFUSED:(\w+)/.exec(e.message)?.[1] ?? e.message; } };
const summarize = q => ({ decision: q.decision, stage: q.stage, reason: q.reason, quoteSha256: q.quoteSha256, scan: q.scan });
const auditOf = file => readFileSync(file, 'utf8').trim().split('\n').map(l => JSON.parse(l));

const startedAt = new Date().toISOString();
const results = {};

// S1: live allow path, then every post-approval mutation. Zero signatures.
{
  const signer = await startSigner({ name: 'mutation', policy: ownerPolicy });
  try {
    const address = await connectSigner(signer.url);
    const t0 = new Date().toISOString();
    const quote = await callSigner(signer.url, 'POST', '/quote', { url: ownerPolicy.endpoint });
    const other = '0x0000000000000000000000000000000000000009';
    const mutations = {
      payTo: t => { t.message.to = other; return t; }, amount: t => { t.message.value += 1n; return t; },
      asset: t => { t.domain.verifyingContract = other; return t; }, network: t => { t.domain.chainId = 1; return t; },
      validityLater: t => { t.message.validBefore += 1000n; return t; }, from: t => { t.message.from = other; return t; },
    };
    const refusals = {};
    if (quote.decision === 'allow') {
      const required = { x402Version: 2, error: 'Payment required', resource: { url: ownerPolicy.resourceUrls[0], description: '', mimeType: '' }, accepts: [quote.quote] };
      for (const [name, mutate] of Object.entries(mutations)) refusals[name] = await refusalOf(sdkPay(signer, address, quote.approvalId, required, mutate));
    }
    const stats = await signer.stats();
    results.mutatedAfterApproval = { startedAt: t0, signerPid: signer.pid, signerAddress: address, quote: summarize(quote), refusals, stats,
      audit: auditOf(signer.auditFile).map(({ event, code, reason, quoteSha256 }) => ({ event, code, reason, quoteSha256 })) };
    assert.equal(quote.decision, 'allow');
    assert.deepEqual(Object.values(refusals).every(r => r.startsWith('MUTATED_')), true);
    assert.equal(stats.signatures, 0); assert.equal(stats.signerInvocations, 0);
  } finally { await signer.stop(); }
}

// S2: locally allowed quote whose payTo is the documented risk fixture -> live Intercepta HOLD; plus bypass attempts.
{
  const seller = await startControlledSeller(FIXTURE);
  const policy = { ...ownerPolicy, policyId: 'controlled-known-risk-local-allow', endpoint: seller.endpoint,
    resourceUrls: [seller.endpoint], recipients: [FIXTURE] };
  const signer = await startSigner({ name: 'held', policy, extraCaFile: seller.certPath });
  try {
    const address = await connectSigner(signer.url);
    const quote = await callSigner(signer.url, 'POST', '/quote', { url: seller.endpoint });
    const bypass = {
      noApproval: await refusalOf(sdkPay(signer, address, undefined, seller.offered)),
      forgedApproval: await refusalOf(sdkPay(signer, address, 'ffffffff-ffff-4fff-8fff-ffffffffffff', seller.offered)),
      defaultAutoPayWrapper: await (async () => {
        const client = new x402Client();
        client.register('eip155:84532', new ExactEvmScheme(createRemoteSigner(signer.url, address, undefined)));
        const sellerFetch = async () => new Response('{}', { status: 402, headers: { 'payment-required': Buffer.from(JSON.stringify(seller.offered)).toString('base64') } });
        return refusalOf(wrapFetchWithPayment(sellerFetch, client)(seller.endpoint));
      })(),
      agentPurchaseTool: (await purchase({ signerUrl: signer.url, url: seller.endpoint })).outcome,
      exportKeyRoute: (await callSigner(signer.url, 'POST', '/exportKey')).error,
    };
    const stats = await signer.stats();
    results.riskHeld = { signerPid: signer.pid, signerAddress: address, quote: summarize(quote), bypass, stats, sellerRequests: seller.requests,
      audit: auditOf(signer.auditFile).map(({ event, code, reason, quoteSha256, traits, status, latencyMs }) => ({ event, code, reason, quoteSha256, traits, status, latencyMs })) };
    assert.equal(quote.decision, 'hold'); assert.equal(quote.stage, 'risk'); assert.equal(quote.reason, 'KNOWN_RISK_TRAITS_REPORTED');
    assert.equal(quote.localPolicy, 'ALLOW');
    assert.equal(stats.signatures, 0); assert.equal(stats.signerInvocations, 0);
    assert.ok(seller.requests.every(r => !r.paymentHeaderPresent));
  } finally { await signer.stop(); await seller.close(); }
}

// S3: real live Intercepta error (invalid key) on an otherwise allowed quote -> hold, zero signatures.
{
  const signer = await startSigner({ name: 'intercepta-error', policy: ownerPolicy, useIntercepta: false, envOverride: { INTERCEPTA_API_KEY: 'invalid-key-for-error-path' } });
  try {
    const address = await connectSigner(signer.url);
    const quote = await callSigner(signer.url, 'POST', '/quote', { url: ownerPolicy.endpoint });
    const refusal = await refusalOf(sdkPay(signer, address, undefined, { x402Version: 2, error: '', resource: { url: ownerPolicy.resourceUrls[0], description: '', mimeType: '' },
      accepts: [{ scheme: 'exact', network: ownerPolicy.network, amount: '10000', asset: ownerPolicy.asset, payTo: ownerPolicy.recipients[0], maxTimeoutSeconds: 300, extra: { name: 'USDC', version: '2' } }] }));
    const stats = await signer.stats();
    results.interceptaError = { signerPid: signer.pid, quote: summarize(quote), refusalWithoutApproval: refusal, stats,
      audit: auditOf(signer.auditFile).map(({ event, reason, riskDecision, status }) => ({ event, reason, riskDecision, status })) };
    assert.equal(quote.decision, 'hold'); assert.equal(quote.reason, 'RISK_UNKNOWN');
    assert.equal(stats.signatures, 0); assert.equal(stats.signerInvocations, 0);
  } finally { await signer.stop(); }
}

const evidence = { startedAt, completedAt: new Date().toISOString(), evidenceClass: 'LIVE_SEPARATE_PROCESS_SIGNER_EPHEMERAL_UNFUNDED_KEY_NO_PAYMENT',
  agentProcess: { ...agentEnvNames, note: 'agent-side runner holds neither the payer key nor the Intercepta key; the signer child loads its own' },
  isolation: { processBoundary: true, osAccountBoundary: false, note: 'Signer is a separate process, but same OS user; a separate account/container is not provisioned.' },
  fundedSignerTested: false, paymentAttempted: false, results };
const file = `${outDir}live-signer-negative.json`;
writeFileSync(file, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ mutation: { decision: results.mutatedAfterApproval.quote.decision, refusals: results.mutatedAfterApproval.refusals, signatures: results.mutatedAfterApproval.stats.signatures },
  riskHeld: { decision: results.riskHeld.quote.decision, reason: results.riskHeld.quote.reason, traits: results.riskHeld.quote.scan?.traits, bypass: results.riskHeld.bypass, signatures: results.riskHeld.stats.signatures },
  interceptaError: { decision: results.interceptaError.quote.decision, reason: results.interceptaError.quote.reason, signatures: results.interceptaError.stats.signatures },
  evidenceSha256: createHash('sha256').update(readFileSync(file)).digest('hex') }, null, 2));
