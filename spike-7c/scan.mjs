// Live read-only integration surface with an explicit owner-selected demo policy.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const ZERO_SCORE_POLICY = 'OWNER_ASSUMPTION_ZERO_SCORE_EMPTY_TRAITS_ALLOW';
export const KNOWN_RISK_POLICY = 'DEMO_HOLD_ON_KNOWN_SCAMMER_OR_BLACKLIST_TRAIT';

export function validScanResponse(body) {
  return Number.isFinite(body?.toxicScore) && Array.isArray(body?.traits) &&
    body.traits.every(t => t && typeof t.name === 'string' && Number.isFinite(t.risk) &&
      typeof t.description === 'string' && (!Object.hasOwn(t, 'txsCount') || Number.isFinite(t.txsCount)));
}

export function interpretObservedScan(observed) {
  const unknown = { decision: 'unknown', reason: 'LIVE_SCHEMA_RECEIVED_MAPPING_REQUIRES_REVIEW' };
  if (!validScanResponse(observed)) return unknown;
  // The live historical fixture returned these documented trait names. The demo
  // holds on their presence; it does not invent a numeric score threshold.
  const matchedTraits = observed.traits.filter(t => ['known_scammer', 'blacklist'].includes(t.name)).map(t => t.name);
  if (matchedTraits.length) return { decision: 'hold', reason: 'KNOWN_RISK_TRAITS_REPORTED',
    message: `Held: ${matchedTraits.join(', ')}.`, policyBasis: KNOWN_RISK_POLICY, matchedTraits };
  // Owner-selected demo rule, not proof that the address is safe or covered.
  if (observed.toxicScore === 0 && observed.traits.length === 0) {
    return { decision: 'allow', reason: 'NO_SUSPICIOUS_ACTIVITIES_REPORTED',
      message: 'No suspicious activities reported.', policyBasis: ZERO_SCORE_POLICY };
  }
  return unknown;
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
    // Actual nonempty HTTP 200 responses omit the documented txsCount field.
    // Accept that omission only; a present invalid count or missing risk field holds.
    const valid = response.ok && validScanResponse(body);
    // Whitelist schema fields; never persist headers, keys, or generic error bodies.
    const observed = valid ? { toxicScore: body.toxicScore, traits: body.traits.map(t => ({
      name: t.name.replaceAll(key, '[REDACTED]'), risk: t.risk,
      ...(Object.hasOwn(t, 'txsCount') ? { txsCount: t.txsCount } : {}),
      description: t.description.replaceAll(key, '[REDACTED]'),
    })) } : null;
    const responseFields = valid ? Object.keys(body).map(name => name.replaceAll(key, '[REDACTED]')).sort() : [];
    return { subject, startedAt, completedAt: new Date().toISOString(), latencyMs: Math.round(performance.now() - start),
      status: response.status, liveRequestMade: true, responseFields, observed,
      ...(valid && body.traits.some(t => !Object.hasOwn(t, 'txsCount'))
        ? { schemaNotes: ['LIVE_TRAITS_OMIT_DOCUMENTED_TXS_COUNT'] } : {}),
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
