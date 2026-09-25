// Experimental in-process gate. Host construction/configuration is trusted.
// This module is NOT an OS security boundary or a deployed wallet service.
import { AsyncLocalStorage } from 'node:async_hooks';
import { isDeepStrictEqual } from 'node:util';
import { x402Client } from '@x402/core/client';
import { ExactEvmScheme } from '@x402/evm/exact/client';

const authTypes = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' }, { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' }, { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' },
  ],
};
const address = value => typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);
const sameAddress = (a, b) => address(a) && address(b) && a.toLowerCase() === b.toLowerCase();
const ensure = (condition, reason) => { if (!condition) throw new Error(reason); };
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export function checkLocal(url, required, selected, policy) {
  ensure(url === policy.endpoint && new URL(url).protocol === 'https:', 'LOCAL_ENDPOINT');
  // This seller advertises a different resource URL. Require an explicit alias.
  ensure(policy.resourceUrls.includes(required.resource?.url), 'LOCAL_RESOURCE');
  ensure(required.x402Version === 2 && selected.scheme === 'exact', 'LOCAL_SCHEME');
  ensure(selected.network === 'eip155:84532' && selected.network === policy.network, 'LOCAL_NETWORK');
  ensure(sameAddress(selected.asset, policy.asset), 'LOCAL_ASSET');
  ensure(policy.recipients.some(a => sameAddress(a, selected.payTo)), 'LOCAL_RECIPIENT');
  ensure(typeof selected.amount === 'string' && /^[1-9][0-9]*$/.test(selected.amount), 'LOCAL_AMOUNT');
  ensure(BigInt(selected.amount) <= BigInt(policy.perCall), 'LOCAL_CAP');
  ensure(Number.isSafeInteger(selected.maxTimeoutSeconds) && selected.maxTimeoutSeconds > 0 &&
    selected.maxTimeoutSeconds <= policy.maxTimeoutSeconds, 'LOCAL_VALIDITY');
  ensure(selected.extra?.name === policy.domainName && selected.extra?.version === policy.domainVersion &&
    [undefined, 'eip3009'].includes(selected.extra?.assetTransferMethod), 'LOCAL_EIP3009');
  ensure(!required.extensions || Object.keys(required.extensions).length === 0, 'LOCAL_EXTENSIONS');
  return true;
}

async function officialPayload(required, signer) {
  const client = new x402Client();
  client.register('eip155:84532', new ExactEvmScheme(signer));
  return client.createPaymentPayload(required);
}

export function createBoundary({ policy, scan, rawSigner, buildPayload = officialPayload }) {
  policy = freeze(structuredClone(policy));
  const context = new AsyncLocalStorage();
  const nonces = new Set();
  const counts = { boundaryCalls: 0, rawSignerCalls: 0 };
  let reserved = 0n;
  let busy = false;
  const protectedSigner = Object.freeze({
    address: rawSigner.address,
    async signTypedData(input) {
      counts.boundaryCalls++;
      const ticket = context.getStore();
      ensure(ticket && !ticket.used && ticket.active, 'NO_GUARD_APPROVAL');
      ensure(Date.now() - ticket.approvedAt <= 30000, 'STALE_GUARD_APPROVAL');
      const typed = freeze(structuredClone(input));
      const q = ticket.quote;
      const d = typed.domain;
      const m = typed.message;
      ensure(typed.primaryType === 'TransferWithAuthorization' && isDeepStrictEqual(typed.types, authTypes), 'MUTATED_TYPES');
      ensure(d?.name === q.extra.name && d?.version === q.extra.version &&
        d?.chainId === Number(q.network.split(':')[1]) && sameAddress(d?.verifyingContract, q.asset) &&
        Object.keys(d).sort().join() === 'chainId,name,verifyingContract,version', 'MUTATED_DOMAIN');
      ensure(sameAddress(m?.from, rawSigner.address) && sameAddress(m?.to, q.payTo) &&
        m?.value === BigInt(q.amount), 'MUTATED_TRANSFER');
      ensure(m.validAfter === 0n && typeof m.validBefore === 'bigint' &&
        m.validBefore > BigInt(Math.floor(Date.now() / 1000)) &&
        m.validBefore <= BigInt(Math.floor(ticket.approvedAt / 1000) + q.maxTimeoutSeconds), 'MUTATED_VALIDITY');
      ensure(Object.keys(m).sort().join() === 'from,nonce,to,validAfter,validBefore,value' &&
        /^0x[0-9a-fA-F]{64}$/.test(m.nonce) && !nonces.has(m.nonce), 'INVALID_NONCE_OR_FIELDS');
      ticket.used = true;
      nonces.add(m.nonce);
      counts.rawSignerCalls++;
      // No await between the last check and invoking the trusted signing backend.
      return rawSigner.signTypedData(typed);
    },
  });

  async function purchase(url, paymentRequired) {
    ensure(!busy, 'TASK_BUSY');
    busy = true;
    let ticket;
    let amount = 0n;
    let hasReservation = false;
    try {
      const required = freeze(structuredClone(paymentRequired));
      const q = required.accepts.find(q => q.scheme === 'exact' && q.network === policy.network);
      ensure(q, 'NO_SUPPORTED_QUOTE');
      checkLocal(url, required, q, policy);
      amount = BigInt(q.amount);
      ensure(reserved + amount <= BigInt(policy.taskBudget), 'TASK_BUDGET');
      reserved += amount;
      hasReservation = true;
      let risk;
      try { risk = await scan(q.payTo); }
      catch { throw new Error('RISK_UNAVAILABLE'); }
      ensure(risk && sameAddress(risk.subject, q.payTo), 'RISK_UNKNOWN');
      ensure(risk.decision === 'allow', risk.decision === 'hold' ? 'RISK_HELD' : 'RISK_UNKNOWN');
      ticket = { quote: q, approvedAt: Date.now(), used: false, active: true };
      return await context.run(ticket, () => buildPayload(
        freeze({ ...required, accepts: [q] }), protectedSigner,
      ));
    } finally {
      if (ticket) ticket.active = false;
      // A signer invocation may have produced an authorization even if it threw.
      // Keep that budget reserved; this spike has no reconciliation/retry feature.
      if (hasReservation && !ticket?.used) reserved -= amount;
      busy = false;
    }
  }
  return Object.freeze({
    // Only this object would be handed to a restricted buyer agent.
    tool: Object.freeze({ purchase }),
    // Host/test instrumentation only. This signer still requires a live ticket.
    protectedSigner,
    inspect: () => ({ ...counts, reserved: reserved.toString() }),
  });
}
