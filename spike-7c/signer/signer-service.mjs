// Protected signer process. The payer key exists only here; the agent side talks to it over loopback HTTP.
// Policy, the live risk scan and the exact-quote approval all live in this process, so a caller cannot
// self-approve. Limit: same-OS-user isolation only; a separate account/container is not provisioned.
import { createServer } from 'node:http';
import { get as httpsGet } from 'node:https';
import { rootCertificates } from 'node:tls';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { x402Client, x402HTTPClient } from '@x402/core/client';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { checkLocal } from '../guard.mjs';
import { quickScan } from '../scan.mjs';
import { encode, decode } from '../wire.mjs';

const authTypes = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' }, { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' }, { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' },
  ],
};
const isAddress = v => typeof v === 'string' && /^0x[0-9a-fA-F]{40}$/.test(v);
const same = (a, b) => isAddress(a) && isAddress(b) && a.toLowerCase() === b.toLowerCase();
const fail = code => { throw Object.assign(new Error(code), { code }); };
const ensure = (ok, code) => { if (!ok) fail(code); };
function deepFreeze(v) {
  if (v && typeof v === 'object') { Object.values(v).forEach(deepFreeze); Object.freeze(v); }
  return v;
}

export function liveChallenge(extraCa) {
  return url => new Promise((resolve, reject) => {
    const req = httpsGet(url, { headers: { accept: 'application/json' }, agent: false,
      ...(extraCa ? { ca: [...rootCertificates, extraCa] } : {}) }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.once('error', reject);
      res.on('end', () => {
        try {
          ensure(res.statusCode === 402, `CHALLENGE_NOT_402_STATUS_${res.statusCode}`);
          let body;
          try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { /* header carries the terms */ }
          resolve(new x402HTTPClient(new x402Client())
            .getPaymentRequiredResponse(name => res.headers[name.toLowerCase()], body));
        } catch (e) { reject(e); }
      });
    });
    req.setTimeout(10000, () => req.destroy(new Error('CHALLENGE_TIMEOUT')));
    req.once('error', reject);
  });
}

export function createSignerService({ policy, account, scan, fetchChallenge, audit = () => {}, now = Date.now,
  approvalTtlMs = 60000 }) {
  policy = deepFreeze(structuredClone(policy));
  const counts = { quoteRequests: 0, approvals: 0, holds: 0, signRequests: 0, signRejected: 0,
    signerInvocations: 0, signatures: 0 };
  const approvals = new Map();
  const nonces = new Set();
  let reserved = 0n;
  let quoteBusy = false;

  const sweep = () => {
    for (const [id, t] of approvals) {
      if (!t.used && now() - t.approvedAt > approvalTtlMs) { reserved -= t.amount; approvals.delete(id); }
    }
  };

  async function quote({ url }) {
    ensure(typeof url === 'string', 'BAD_REQUEST');
    counts.quoteRequests++;
    ensure(!quoteBusy, 'TASK_BUSY');
    quoteBusy = true;
    let reservedHere = 0n;
    try {
      sweep();
      let required, q;
      try {
        ensure(url === policy.endpoint, 'LOCAL_ENDPOINT');
        required = deepFreeze(structuredClone(await fetchChallenge(url)));
        q = required.accepts?.find(a => a.scheme === 'exact' && a.network === policy.network);
        ensure(q, 'NO_SUPPORTED_QUOTE');
        checkLocal(url, required, q, policy);
        const amount = BigInt(q.amount);
        ensure(reserved + amount <= BigInt(policy.taskBudget), 'TASK_BUDGET');
        reserved += amount; reservedHere = amount;
      } catch (e) {
        counts.holds++;
        const reason = e.code ?? e.message ?? 'LOCAL_POLICY_REJECTED';
        audit({ event: 'quote_held_local', url, reason: String(reason) });
        return { decision: 'hold', stage: 'local', reason: String(reason) };
      }
      const quoteSha256 = createHash('sha256').update(JSON.stringify(q)).digest('hex');
      let risk;
      try { risk = await scan(q.payTo); } catch { risk = null; }
      if (!risk || !same(risk.subject, q.payTo) || risk.decision !== 'allow') {
        counts.holds++;
        reserved -= reservedHere; reservedHere = 0n;
        const reason = risk?.decision === 'hold' ? risk.reason : 'RISK_UNKNOWN';
        audit({ event: 'quote_held_risk', quoteSha256, subject: q.payTo, riskDecision: risk?.decision ?? 'error', reason,
          status: risk?.status, latencyMs: risk?.latencyMs, traits: risk?.observed?.traits?.map(t => t.name) });
        return { decision: 'hold', stage: 'risk', reason, quoteSha256, localPolicy: 'ALLOW',
          scan: risk && { status: risk.status, latencyMs: risk.latencyMs, decision: risk.decision,
            toxicScore: risk.observed?.toxicScore, traits: risk.observed?.traits?.map(t => t.name) } };
      }
      const approvalId = randomUUID();
      approvals.set(approvalId, { quote: q, quoteSha256, amount: reservedHere, approvedAt: now(), used: false });
      reservedHere = 0n;
      counts.approvals++;
      audit({ event: 'quote_approved', quoteSha256, subject: q.payTo, latencyMs: risk.latencyMs, status: risk.status });
      return { decision: 'allow', approvalId, quote: q, quoteSha256, expiresInMs: approvalTtlMs,
        scan: { status: risk.status, latencyMs: risk.latencyMs, decision: risk.decision, reason: risk.reason,
          toxicScore: risk.observed?.toxicScore, traits: risk.observed?.traits?.map(t => t.name) } };
    } finally {
      reserved -= reservedHere;
      quoteBusy = false;
    }
  }

  async function sign({ approvalId, typedData }) {
    counts.signRequests++;
    const reject = code => { counts.signRejected++; audit({ event: 'sign_rejected', code }); fail(code); };
    const t = typeof approvalId === 'string' ? approvals.get(approvalId) : undefined;
    if (!t) reject('NO_GUARD_APPROVAL');
    if (t.used) reject('APPROVAL_CONSUMED');
    if (now() - t.approvedAt > approvalTtlMs) reject('STALE_GUARD_APPROVAL');
    const typed = deepFreeze(structuredClone(typedData ?? {}));
    const q = t.quote, d = typed.domain, m = typed.message;
    if (!(typed.primaryType === 'TransferWithAuthorization' && isDeepStrictEqual(typed.types, authTypes))) reject('MUTATED_TYPES');
    if (!(d && d.name === q.extra.name && d.version === q.extra.version && d.chainId === Number(q.network.split(':')[1]) &&
      same(d.verifyingContract, q.asset) && Object.keys(d).sort().join() === 'chainId,name,verifyingContract,version')) reject('MUTATED_DOMAIN');
    if (!(m && same(m.from, account.address) && same(m.to, q.payTo) && m.value === BigInt(q.amount))) reject('MUTATED_TRANSFER');
    const nowSec = BigInt(Math.floor(now() / 1000));
    if (!(m.validAfter === 0n && typeof m.validBefore === 'bigint' && m.validBefore > nowSec &&
      m.validBefore <= nowSec + BigInt(q.maxTimeoutSeconds))) reject('MUTATED_VALIDITY');
    if (!(Object.keys(m).sort().join() === 'from,nonce,to,validAfter,validBefore,value' &&
      /^0x[0-9a-fA-F]{64}$/.test(m.nonce) && !nonces.has(m.nonce))) reject('INVALID_NONCE_OR_FIELDS');
    t.used = true;
    nonces.add(m.nonce);
    counts.signerInvocations++;
    audit({ event: 'sign_invoked', quoteSha256: t.quoteSha256, to: m.to, value: m.value.toString() });
    // The amount stays reserved from here on; there is no settlement reconciliation in this spike.
    const signature = await account.signTypedData(typed);
    counts.signatures++;
    audit({ event: 'signed', quoteSha256: t.quoteSha256 });
    return { signature };
  }

  const routes = {
    'GET /address': async () => ({ address: account.address, policyId: policy.policyId }),
    'GET /stats': async () => ({ ...counts, reserved: reserved.toString() }),
    'POST /quote': quote,
    'POST /sign': sign,
  };

  const server = createServer(async (req, res) => {
    const send = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(encode(body)); };
    try {
      const handler = routes[`${req.method} ${req.url}`];
      if (!handler) return send(404, { error: 'NOT_FOUND' });
      const chunks = []; let size = 0;
      for await (const c of req) { size += c.length; if (size > 65536) return send(413, { error: 'TOO_LARGE' }); chunks.push(c); }
      let input = {};
      if (chunks.length) { try { input = decode(Buffer.concat(chunks).toString('utf8')); } catch { return send(400, { error: 'BAD_JSON' }); } }
      send(200, await handler(input));
    } catch (e) {
      send(e.code ? 403 : 500, { error: e.code ?? 'INTERNAL' });
    }
  });
  return { server, counts: () => ({ ...counts, reserved: reserved.toString() }) };
}

async function main() {
  const dir = dirname(fileURLToPath(import.meta.url));
  const policy = process.env.SIGNER_POLICY_JSON
    ? JSON.parse(process.env.SIGNER_POLICY_JSON) : JSON.parse(readFileSync(`${dir}/owner-policy.json`, 'utf8'));
  ensure(!policy.ownerCapAtomic || BigInt(policy.taskBudget) <= BigInt(policy.ownerCapAtomic), 'POLICY_EXCEEDS_OWNER_CAP');
  let privateKey = process.env.PAYER_PRIVATE_KEY;
  delete process.env.PAYER_PRIVATE_KEY;
  const ephemeral = process.env.SIGNER_EPHEMERAL === '1';
  if (ephemeral) privateKey = generatePrivateKey();
  ensure(privateKey && /^0x[0-9a-fA-F]{64}$/.test(privateKey), 'PAYER_KEY_MISSING_OR_MALFORMED');
  const account = privateKeyToAccount(privateKey);
  privateKey = undefined;
  if (process.env.SIGNER_EXPECTED_ADDRESS) ensure(same(process.env.SIGNER_EXPECTED_ADDRESS, account.address), 'PAYER_ADDRESS_MISMATCH');
  const extraCa = process.env.SIGNER_EXTRA_CA_FILE ? readFileSync(process.env.SIGNER_EXTRA_CA_FILE) : undefined;
  const auditFile = process.env.SIGNER_AUDIT_FILE || fileURLToPath(new URL('../evidence/x402/signer-audit.jsonl', import.meta.url));
  mkdirSync(dirname(auditFile), { recursive: true });
  const audit = e => appendFileSync(auditFile, JSON.stringify({ at: new Date().toISOString(), ...e }) + '\n');
  const service = createSignerService({ policy, account, scan: quickScan, fetchChallenge: liveChallenge(extraCa), audit });
  const port = Number(process.env.SIGNER_PORT ?? 8402);
  await new Promise((resolve, reject) => { service.server.once('error', reject); service.server.listen(port, '127.0.0.1', resolve); });
  audit({ event: 'signer_started', address: account.address, policyId: policy.policyId, ephemeral });
  console.log(JSON.stringify({ listening: `127.0.0.1:${service.server.address().port}`, address: account.address,
    policyId: policy.policyId, ephemeral }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error('SIGNER_START_FAILED', e.code ?? e.message); process.exit(1); });
}
