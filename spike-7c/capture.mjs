// Unpaid public HTTP probe. No wallet, API credential, or payment wrapper.
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const targets = [
  'https://www.x402.org/protected',
  'https://x402-dotnet.azurewebsites.net/api/minimal/protected',
  'https://x402.org/protected',
];
await mkdir(new URL('./evidence/', import.meta.url), { recursive: true });
for (const [index, url] of targets.entries()) {
  if (process.argv[2] && Number(process.argv[2]) !== index + 1) continue;
  const startedAt = new Date().toISOString();
  const started = performance.now();
  let record;
  try {
    const response = await fetch(url, {
      method: 'GET', headers: { accept: 'application/json' },
      redirect: 'error', signal: AbortSignal.timeout(20000),
    });
    const body = await response.text();
    const header = response.headers.get('payment-required');
    let decoded = null;
    try { decoded = header ? JSON.parse(Buffer.from(header, 'base64').toString('utf8')) : JSON.parse(body); }
    catch { /* Preserve the observed response without inventing a quote. */ }
    record = {
      startedAt, completedAt: new Date().toISOString(),
      latencyMs: Math.round(performance.now() - started),
      request: { url, method: 'GET', headers: { accept: 'application/json' } },
      status: response.status,
      headers: Object.fromEntries(['date', 'content-type', 'payment-required'].map(k => [k, response.headers.get(k)])),
      body: response.status === 402 ? body : body.slice(0, 500),
      bodySha256: createHash('sha256').update(body).digest('hex'),
      decodedPaymentRequired: response.status === 402 ? decoded : null,
      payerAuthorizationSignatures: 0, paidRetrySent: false,
    };
  } catch (error) {
    record = { startedAt, url, latencyMs: Math.round(performance.now() - started),
      error: error.name, cause: error.cause?.code ?? null,
      payerAuthorizationSignatures: 0, paidRetrySent: false };
  }
  await writeFile(new URL(`./evidence/http-${index + 1}.json`, import.meta.url), JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify({ url, status: record.status, error: record.error, latencyMs: record.latencyMs,
    payment: record.decodedPaymentRequired }));
}
