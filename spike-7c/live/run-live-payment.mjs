// LIVE allowed payment through the protected FUNDED signer (started separately: `npm run signer`).
// This agent-side process holds no payer key. It aborts unless the signer is the owner's expected payer address.
// Order: unapproved and changed-quote attempts (must yield 0 signatures) -> one exact allowed payment -> replay/budget/bypass attempts.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { x402Client, wrapFetchWithPayment, decodePaymentResponseHeader } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { encodePaymentRequiredHeader } from '@x402/core/http';
import { callSigner, connectSigner, createRemoteSigner } from '../agent/remote-signer.mjs';
import { buildPayingFetch } from '../agent/purchase.mjs';

const dir = fileURLToPath(new URL('..', import.meta.url));
const signerUrl = process.env.SIGNER_URL ?? 'http://127.0.0.1:8402';
const policy = JSON.parse(readFileSync(`${dir}signer/owner-policy.json`, 'utf8'));
const readiness = JSON.parse(readFileSync(`${dir}evidence/payer-readiness.json`, 'utf8'));
const RPC = 'https://sepolia.base.org';
assert.equal(process.env.PAYER_PRIVATE_KEY, undefined, 'agent process must not hold a payer key');

const rpc = async (method, params) => {
  const res = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const body = await res.json();
  if (body.error) throw new Error(`RPC_${method}_FAILED`);
  return body.result;
};
const usdcBalance = async address => BigInt(await rpc('eth_call', [{ to: policy.asset, data: `0x70a08231${address.toLowerCase().slice(2).padStart(64, '0')}` }, 'latest']));
const refusalOf = async promise => { try { await promise; return 'UNEXPECTED_SIGNATURE'; } catch (e) { return /SIGNER_REFUSED:(\w+)/.exec(e.message)?.[1] ?? e.message; } };

const startedAt = new Date().toISOString();
const address = await connectSigner(signerUrl);
const info = await callSigner(signerUrl, 'GET', '/address');
assert.equal(address.toLowerCase(), readiness.ownerAddress.toLowerCase(), 'signer is not the owner-approved payer address; aborting');
const before = await usdcBalance(address);
assert.ok(before >= BigInt(policy.perCall), 'insufficient test USDC');
const statsBefore = await callSigner(signerUrl, 'GET', '/stats');
assert.equal(statsBefore.signatures, 0, 'signer already signed something; restart it for a clean run');

const remoteFor = approvalId => createRemoteSigner(signerUrl, address, approvalId);
const sdkPay = async (approvalId, required, mutate) => {
  const remote = remoteFor(approvalId);
  const client = new x402Client();
  client.register('eip155:84532', new ExactEvmScheme({ address, signTypedData: t => remote.signTypedData(mutate ? mutate(structuredClone(t)) : t) }));
  return client.createPaymentPayload(required);
};

// 1. Attempts with no approval.
const preAttempts = { noApproval: await refusalOf(sdkPay(undefined, { x402Version: 2, error: '', resource: { url: policy.resourceUrls[0], description: '', mimeType: '' },
  accepts: [{ scheme: 'exact', network: policy.network, amount: policy.perCall, asset: policy.asset, payTo: policy.recipients[0], maxTimeoutSeconds: 300, extra: { name: 'USDC', version: '2' } }] })) };
preAttempts.defaultAutoPayWrapper = await (async () => {
  const client = new x402Client();
  client.register('eip155:84532', new ExactEvmScheme(remoteFor(undefined)));
  const required = { x402Version: 2, error: '', resource: { url: policy.resourceUrls[0], description: '', mimeType: '' },
    accepts: [{ scheme: 'exact', network: policy.network, amount: policy.perCall, asset: policy.asset, payTo: policy.recipients[0], maxTimeoutSeconds: 300, extra: { name: 'USDC', version: '2' } }] };
  const stub = async () => new Response('{}', { status: 402, headers: { 'payment-required': encodePaymentRequiredHeader(required) } });
  return refusalOf(wrapFetchWithPayment(stub, client)(policy.endpoint));
})();

// 2. Real quote -> live Intercepta scan inside the signer -> approval.
const quote = await callSigner(signerUrl, 'POST', '/quote', { url: policy.endpoint });
assert.equal(quote.decision, 'allow', `quote not approved: ${quote.reason}`);
const required = { x402Version: 2, error: 'Payment required', resource: { url: policy.resourceUrls[0], description: '', mimeType: '' }, accepts: [quote.quote] };

// 3. Changed-quote attempts against the approved quote must all fail.
const other = '0x0000000000000000000000000000000000000009';
const mutations = { payTo: t => { t.message.to = other; return t; }, amount: t => { t.message.value += 1n; return t; },
  asset: t => { t.domain.verifyingContract = other; return t; }, network: t => { t.domain.chainId = 1; return t; },
  validityLater: t => { t.message.validBefore += 1000n; return t; }, from: t => { t.message.from = other; return t; } };
const mutationRefusals = {};
for (const [name, mutate] of Object.entries(mutations)) mutationRefusals[name] = await refusalOf(sdkPay(quote.approvalId, required, mutate));
const statsAfterAttacks = await callSigner(signerUrl, 'GET', '/stats');
assert.equal(statsAfterAttacks.signatures, 0, 'a signature was produced before the exact allowed payment');

// 4. The one exact allowed payment via the official auto-pay wrapper bound to this approval.
const paidAt = new Date().toISOString();
const response = await buildPayingFetch(signerUrl, address, quote.approvalId)(policy.endpoint, { headers: { accept: 'application/json' } });
const body = await response.text();
const header = response.headers.get('payment-response') ?? response.headers.get('x-payment-response');
const settlement = header ? decodePaymentResponseHeader(header) : null;

// 5. After payment: replay, budget and bypass attempts.
const postAttempts = {
  replayConsumedApproval: await refusalOf(sdkPay(quote.approvalId, required)),
  secondQuote: (await callSigner(signerUrl, 'POST', '/quote', { url: policy.endpoint })).reason,
  noApprovalAgain: await refusalOf(sdkPay(undefined, required)),
  otherEndpoint: (await callSigner(signerUrl, 'POST', '/quote', { url: 'https://example.com/protected' })).reason,
  exportKeyRoute: (await callSigner(signerUrl, 'POST', '/exportKey')).error,
};
const statsFinal = await callSigner(signerUrl, 'GET', '/stats');

// 6. Independent settlement verification on-chain.
let receipt = null, transferLog = null;
const tx = settlement?.transaction;
if (/^0x[0-9a-fA-F]{64}$/.test(tx ?? '')) {
  for (let i = 0; i < 10 && !receipt; i++) { receipt = await rpc('eth_getTransactionReceipt', [tx]); if (!receipt) await new Promise(r => setTimeout(r, 2000)); }
  const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  transferLog = receipt?.logs?.find(l => l.address.toLowerCase() === policy.asset.toLowerCase() && l.topics[0] === TRANSFER &&
    l.topics[1]?.toLowerCase().endsWith(address.toLowerCase().slice(2)) && l.topics[2]?.toLowerCase().endsWith(policy.recipients[0].toLowerCase().slice(2)) &&
    BigInt(l.data) === BigInt(policy.perCall)) ?? null;
}
const after = await usdcBalance(address);

const evidence = { startedAt, completedAt: new Date().toISOString(), evidenceClass: 'LIVE_FUNDED_SIGNER_PROCESS_BOUNDARY_BASE_SEPOLIA',
  signer: { url: signerUrl, address, policyId: info.policyId }, policy,
  agentProcess: { hasPayerKeyEnv: 'PAYER_PRIVATE_KEY' in process.env },
  quote: { decision: quote.decision, quoteSha256: quote.quoteSha256, selected: quote.quote, scan: quote.scan },
  preApprovalAttempts: preAttempts, changedQuoteRefusals: mutationRefusals, signaturesBeforeAllowedPayment: statsAfterAttacks.signatures,
  payment: { at: paidAt, httpStatus: response.status, body, settlement,
    explorer: tx ? `https://sepolia.basescan.org/tx/${tx}` : null },
  onchain: { receiptStatus: receipt?.status ?? null, blockNumber: receipt ? BigInt(receipt.blockNumber).toString() : null, matchingUsdcTransfer: Boolean(transferLog) },
  balances: { beforeAtomic: before.toString(), afterAtomic: after.toString(), deltaAtomic: (before - after).toString() },
  postPaymentAttempts: postAttempts, signerStatsFinal: statsFinal,
  isolation: { processBoundary: true, osAccountBoundary: false } };
mkdirSync(`${dir}evidence/x402`, { recursive: true });
writeFileSync(`${dir}evidence/x402/allowed-payment.json`, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ quote: quote.decision, httpStatus: response.status, settled: settlement?.success ?? null, tx: tx ?? null,
  receiptStatus: receipt?.status ?? null, matchingUsdcTransfer: Boolean(transferLog), balanceDeltaAtomic: (before - after).toString(),
  signatures: statsFinal.signatures, changedQuoteRefusals: mutationRefusals, postPaymentAttempts: postAttempts }, null, 2));
assert.equal(response.status, 200); assert.equal(statsFinal.signatures, 1);
