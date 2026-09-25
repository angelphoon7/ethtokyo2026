// A real local HTTPS 402 and a fresh Intercepta response, with no payment retry.
// The seller is a controlled negative fixture, not a discovered malicious seller.
import assert from 'node:assert/strict';
import { createServer, get } from 'node:https';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, X509Certificate } from 'node:crypto';
import { x402Client, x402HTTPClient } from '@x402/core/client';
import { encodePaymentRequiredHeader } from '@x402/core/http';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createBoundary, checkLocal } from './guard.mjs';
import { quickScan, KNOWN_RISK_POLICY, ZERO_SCORE_POLICY } from './scan.mjs';

const startedAt = new Date().toISOString();
const fixture = {
  address: '0xa7Bf48749D2E4aA29e3209879956b9bAa9E90570',
  source: 'https://intercepta.io/blog/how-stolen-crypto-moves-two-stage-pipeline',
  sourceClass: 'SPONSOR_PUBLISHED_HISTORICAL_RISK_SUBJECT_NOT_DISCORD_FIXTURE',
  usage: 'CONTROLLED_NEGATIVE_QUOTE_ONLY_NO_PAYMENT_TO_THIS_SUBJECT',
};

// Only a local TLS key is written, in the Git-ignored inspection directory.
// No payer key is loaded, stored or funded. TLS verification remains enabled.
await mkdir(new URL('../.inspection/', import.meta.url), { recursive: true });
const tlsDir = await mkdtemp(fileURLToPath(new URL('../.inspection/risk-fixture-tls-', import.meta.url)));
const keyPath = join(tlsDir, 'tls-key.pem');
const certPath = join(tlsDir, 'tls-cert.pem');
const confPath = join(tlsDir, 'openssl.cnf');
await writeFile(confPath, '[req]\ndistinguished_name=dn\n[dn]\n');
const openssl = process.platform === 'win32' ? 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe' : 'openssl';
execFileSync(openssl, ['req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256',
  '-nodes', '-keyout', keyPath, '-out', certPath, '-days', '1', '-config', confPath,
  '-subj', '/CN=localhost', '-addext', 'subjectAltName=IP:127.0.0.1',
  '-addext', 'basicConstraints=critical,CA:TRUE'], { windowsHide: true, stdio: 'ignore' });
const [tlsKey, tlsCert] = await Promise.all([readFile(keyPath), readFile(certPath)]);
let offered;
const requests = [];
const server = createServer({ key: tlsKey, cert: tlsCert }, (req, res) => {
  const paymentHeaderPresent = Boolean(req.headers['payment-signature'] || req.headers['x-payment']);
  requests.push({ at: new Date().toISOString(), method: req.method, path: req.url, paymentHeaderPresent });
  if (req.method !== 'GET' || req.url !== '/controlled-known-risk') {
    res.writeHead(404).end(); return;
  }
  // This controlled endpoint cannot accept or settle a payment.
  if (paymentHeaderPresent) { res.writeHead(400).end(); return; }
  res.writeHead(402, { 'content-type': 'application/json',
    'payment-required': encodePaymentRequiredHeader(offered) });
  res.end('{}');
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });

try {
  const endpoint = `https://127.0.0.1:${server.address().port}/controlled-known-risk`;
  offered = {
    x402Version: 2, error: 'Payment required',
    resource: { url: endpoint, description: 'Controlled known-risk negative fixture; no paid delivery', mimeType: 'application/json' },
    accepts: [{ scheme: 'exact', network: 'eip155:84532', amount: '10000',
      asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', payTo: fixture.address,
      maxTimeoutSeconds: 300, extra: { name: 'USDC', version: '2' } }],
  };
  const requestStartedAt = new Date().toISOString();
  const t0 = performance.now();
  const response = await new Promise((resolve, reject) => {
    const req = get(endpoint, { ca: tlsCert, agent: false, headers: { accept: 'application/json' } }, res => {
      const tlsAuthorized = res.socket.authorized;
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.once('error', reject);
      res.on('end', () => resolve({ status: res.statusCode, tlsAuthorized,
        headers: { date: res.headers.date, 'content-type': res.headers['content-type'],
          'payment-required': res.headers['payment-required'] }, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.setTimeout(10000, () => req.destroy(new Error('LOCAL_FIXTURE_TIMEOUT')));
    req.once('error', reject);
  });
  assert.equal(response.status, 402);
  assert.equal(response.tlsAuthorized, true);
  const required = new x402HTTPClient(new x402Client()).getPaymentRequiredResponse(
    name => response.headers[name.toLowerCase()], JSON.parse(response.body));
  assert.deepEqual(required, offered);
  const selected = required.accepts[0];
  const quoteSha256 = createHash('sha256').update(JSON.stringify(selected)).digest('hex');
  const capture = { startedAt: requestStartedAt, completedAt: new Date().toISOString(),
    latencyMs: Math.round(performance.now() - t0), request: { url: endpoint, method: 'GET' },
    ...response, certificateFingerprint256: new X509Certificate(tlsCert).fingerprint256,
    bodySha256: createHash('sha256').update(response.body).digest('hex'), decodedPaymentRequired: required,
    selectedQuoteSha256: quoteSha256, fixture, evidenceClass: 'REAL_HTTPS_CAPTURE_FROM_CONTROLLED_LOCAL_NEGATIVE_SELLER',
    paidRetrySent: false };
  await writeFile(new URL('./evidence/controlled-risk-402.json', import.meta.url), JSON.stringify(capture, null, 2) + '\n');

  const policy = { endpoint, resourceUrls: [endpoint], network: 'eip155:84532', asset: selected.asset,
    recipients: [fixture.address], perCall: '10000', taskBudget: '10000', maxTimeoutSeconds: 300,
    domainName: 'USDC', domainVersion: '2' };
  assert.equal(checkLocal(endpoint, required, selected, policy), true);
  const trace = [{ event: 'real_controlled_402_captured', at: capture.completedAt, quoteSha256 },
    { event: 'local_policy_allowed', at: new Date().toISOString(), quoteSha256 }];
  // An actual cryptographic account, generated in memory solely for this negative
  // experiment. It is unfunded and NOT an isolated/protected deployment.
  const account = privateKeyToAccount(generatePrivateKey());
  let signerInvocations = 0;
  let completedSignatures = 0;
  let scan;
  const boundary = createBoundary({ policy,
    scan: async subject => {
      trace.push({ event: 'live_scan_started', at: new Date().toISOString(), subject, quoteSha256 });
      scan = await quickScan(subject);
      trace.push({ event: 'live_scan_completed', at: new Date().toISOString(), decision: scan.decision, reason: scan.reason });
      return scan;
    },
    rawSigner: { address: account.address, async signTypedData(typed) {
      signerInvocations++;
      const signature = await account.signTypedData(typed);
      completedSignatures++;
      return signature;
    } },
  });
  let outcome;
  try { await boundary.tool.purchase(endpoint, required); outcome = 'UNEXPECTED_AUTHORIZATION'; }
  catch (error) { outcome = error.message; }
  trace.push({ event: 'guard_completed', at: new Date().toISOString(), outcome });
  const evidence = {
    startedAt, completedAt: new Date().toISOString(), fixture, endpoint, selected, selectedQuoteSha256: quoteSha256,
    localPolicy: policy, localPolicyClass: 'CONTROLLED_NEGATIVE_TEST_POLICY_NO_SPEND_AUTHORIZATION',
    localOnly: 'ALLOW_UNDER_CONTROLLED_TEST_POLICY', riskPolicy: KNOWN_RISK_POLICY, zeroScorePolicy: ZERO_SCORE_POLICY,
    scan, outcome, counts: { ...boundary.inspect(), signerInvocations, payerAuthorizationSignatures: completedSignatures },
    signer: { publicAddress: account.address, type: 'EPHEMERAL_UNFUNDED_VIEM_ACCOUNT_IN_PROCESS',
      isolationProven: false, privateKeyPersisted: false, sentinel: false },
    paidRetrySent: false, settlement: null, requests, trace,
    evidenceClass: 'LIVE_RISK_HOLD_ON_REAL_CONTROLLED_HTTPS_402_WITH_ZERO_CRYPTOGRAPHIC_SIGNER_CALLS',
  };
  await writeFile(new URL('./evidence/controlled-risk-hold.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
  assert.equal(scan?.status, 200);
  assert.equal(scan?.liveRequestMade, true);
  assert.equal(scan?.subject.toLowerCase(), selected.payTo.toLowerCase());
  assert.equal(scan?.decision, 'hold');
  assert.equal(scan?.reason, 'KNOWN_RISK_TRAITS_REPORTED');
  assert.equal(outcome, 'RISK_HELD');
  assert.equal(boundary.inspect().boundaryCalls, 0);
  assert.equal(signerInvocations, 0);
  assert.equal(completedSignatures, 0);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].paymentHeaderPresent, false);
  console.log(JSON.stringify({ challengeStatus: response.status, localOnly: evidence.localOnly,
    scanStatus: scan.status, toxicScore: scan.observed.toxicScore, traits: scan.observed.traits.map(t => t.name),
    decision: scan.decision, outcome, signerInvocations, payerAuthorizationSignatures: completedSignatures,
    paymentMade: false, isolationProven: false }));
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
