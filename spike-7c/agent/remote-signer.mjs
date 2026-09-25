// Agent-side signer stub. It holds no key; every signature is a request to the protected signer service.
import { encode, decode } from '../wire.mjs';

export async function callSigner(baseUrl, method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(20000),
    ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: encode(body) }) });
  const parsed = decode(await res.text());
  return { status: res.status, ...parsed };
}

export async function connectSigner(baseUrl) {
  const info = await callSigner(baseUrl, 'GET', '/address');
  if (!/^0x[0-9a-fA-F]{40}$/.test(info.address ?? '')) throw new Error('SIGNER_UNAVAILABLE');
  return info.address;
}

// approvalId may be undefined (the default auto-pay path); the signer then refuses.
export function createRemoteSigner(baseUrl, address, approvalId) {
  return { address, async signTypedData(typedData) {
    const result = await callSigner(baseUrl, 'POST', '/sign', { approvalId, typedData });
    if (!result.signature) throw new Error(`SIGNER_REFUSED:${result.error ?? 'UNKNOWN'}`);
    return result.signature;
  } };
}
