// Live read-only integration surface. No fabricated scores or approval threshold.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function interpretObservedScan(observed) {
  // A zero score without any traits was observed live. Coverage/unknown-address
  // semantics remain undocumented, so it is not promoted to a safe/allow verdict.
  return { decision: 'unknown', reason: observed?.toxicScore === 0 &&
    Array.isArray(observed.traits) && observed.traits.length === 0
    ? 'NO_REPORTED_TRAITS_COVERAGE_UNVERIFIED'
    : 'LIVE_SCHEMA_RECEIVED_MAPPING_REQUIRES_REVIEW' };
}

export async function quickScan(subject) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(subject)) throw new Error('INVALID_SUBJECT');
  const key = process.env.INTERCEPTA_API_KEY;
  const startedAt = new Date().toISOString();
  if (!key) return { subject, startedAt, decision: 'unknown', reason: 'BLOCKED: LIVE KEY REQUIRED', liveRequestMade: false };
  const start = performance.now();
  try {
    const response = await fetch(`https://api.web3antivirus.io/api/public/v2/extension/account/${subject}/quick-scan`, {
      headers: { 'X-API-KEY': key, accept: 'application/json' },
      redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    let body;
    try { body = await response.json(); } catch { /* Unknown holds. */ }
    const valid = response.ok && Number.isFinite(body?.toxicScore) && Array.isArray(body?.traits) &&
      body.traits.every(t => typeof t.name === 'string' && Number.isFinite(t.risk) &&
        Number.isFinite(t.txsCount) && typeof t.description === 'string');
    // Whitelist schema fields; never persist headers, keys, or generic error bodies.
    const observed = valid ? { toxicScore: body.toxicScore, traits: body.traits.map(t => ({
      name: t.name.replaceAll(key, '[REDACTED]'), risk: t.risk, txsCount: t.txsCount, description: t.description.replaceAll(key, '[REDACTED]'),
    })) } : null;
    const responseFields = valid ? Object.keys(body).map(name => name.replaceAll(key, '[REDACTED]')).sort() : [];
    return { subject, startedAt, completedAt: new Date().toISOString(), latencyMs: Math.round(performance.now() - start),
      status: response.status, liveRequestMade: true, responseFields, observed,
      ...(valid ? interpretObservedScan(observed) : { decision: 'unknown', reason: 'HTTP_OR_SCHEMA_UNKNOWN' }) };
  } catch (error) {
    return { subject, startedAt, latencyMs: Math.round(performance.now() - start), liveRequestMade: true,
      decision: 'unknown', reason: error.name === 'TimeoutError' ? 'RISK_TIMEOUT' : 'RISK_UNAVAILABLE' };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const capture = JSON.parse(await readFile(new URL('./evidence/http-3.json', import.meta.url), 'utf8'));
  const quote = capture.decodedPaymentRequired.accepts.find(q => q.network === 'eip155:84532');
  const example = process.argv[2] === '--documented-example';
  if (process.argv[2] && !example) throw new Error('Use no argument or --documented-example');
  // This is an API documentation example, not a sponsor-certified risk fixture.
  const subject = example ? '0x0d775e010f0b6c32c9468d43ba599ef47d596e47' : quote.payTo;
  const result = await quickScan(subject);
  if (example) result.subjectSource = 'https://docs.web3antivirus.io/reference/quick-scan-address';
  const file = example ? 'intercepta-doc-example.json' : 'intercepta.json';
  await writeFile(new URL(`./evidence/${file}`, import.meta.url), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ decision: result.decision, reason: result.reason, liveRequestMade: result.liveRequestMade }));
}
