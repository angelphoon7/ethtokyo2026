// Controlled local HTTPS seller that only issues a 402 (cannot accept or settle payment). Negative fixture.
import { createServer } from 'node:https';
import { writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { encodePaymentRequiredHeader } from '@x402/core/http';

export async function startControlledSeller(payTo) {
  await mkdir(new URL('../../.inspection/', import.meta.url), { recursive: true });
  const dir = await mkdtemp(fileURLToPath(new URL('../../.inspection/live-seller-tls-', import.meta.url)));
  const [keyPath, certPath, confPath] = ['tls-key.pem', 'tls-cert.pem', 'openssl.cnf'].map(f => join(dir, f));
  await writeFile(confPath, '[req]\ndistinguished_name=dn\n[dn]\n');
  const openssl = process.platform === 'win32' ? 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe' : 'openssl';
  execFileSync(openssl, ['req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256', '-nodes', '-keyout', keyPath,
    '-out', certPath, '-days', '1', '-config', confPath, '-subj', '/CN=localhost', '-addext', 'subjectAltName=IP:127.0.0.1',
    '-addext', 'basicConstraints=critical,CA:TRUE'], { windowsHide: true, stdio: 'ignore' });
  const [key, cert] = await Promise.all([readFile(keyPath), readFile(certPath)]);
  const requests = [];
  let offered;
  const server = createServer({ key, cert }, (req, res) => {
    const paid = Boolean(req.headers['payment-signature'] || req.headers['x-payment']);
    requests.push({ at: new Date().toISOString(), method: req.method, path: req.url, paymentHeaderPresent: paid });
    if (req.method !== 'GET' || req.url !== '/controlled-known-risk' || paid) { res.writeHead(paid ? 400 : 404).end(); return; }
    res.writeHead(402, { 'content-type': 'application/json', 'payment-required': encodePaymentRequiredHeader(offered) });
    res.end('{}');
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const endpoint = `https://127.0.0.1:${server.address().port}/controlled-known-risk`;
  offered = { x402Version: 2, error: 'Payment required',
    resource: { url: endpoint, description: 'Controlled known-risk negative fixture; no paid delivery', mimeType: 'application/json' },
    accepts: [{ scheme: 'exact', network: 'eip155:84532', amount: '10000', asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      payTo, maxTimeoutSeconds: 300, extra: { name: 'USDC', version: '2' } }] };
  return { endpoint, offered, requests, certPath,
    close: async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } };
}
