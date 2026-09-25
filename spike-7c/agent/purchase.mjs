// The only purchase surface a buyer agent gets: ask the signer service for an approval, then pay with it.
import { x402Client, wrapFetchWithPayment, decodePaymentResponseHeader } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { callSigner, connectSigner, createRemoteSigner } from './remote-signer.mjs';

const NETWORK = 'eip155:84532';

export function buildPayingFetch(signerUrl, address, approvalId) {
  const client = new x402Client();
  client.register(NETWORK, new ExactEvmScheme(createRemoteSigner(signerUrl, address, approvalId)));
  return wrapFetchWithPayment(fetch, client);
}

export async function purchase({ signerUrl, url }) {
  const address = await connectSigner(signerUrl);
  const quote = await callSigner(signerUrl, 'POST', '/quote', { url });
  if (quote.decision !== 'allow') return { outcome: 'HELD', payer: address, quote };
  const paying = buildPayingFetch(signerUrl, address, quote.approvalId);
  const response = await paying(url, { headers: { accept: 'application/json' } });
  const header = response.headers.get('payment-response') ?? response.headers.get('x-payment-response');
  return { outcome: response.status === 200 ? 'PAID' : 'PAYMENT_NOT_ACCEPTED', payer: address, quote,
    status: response.status, body: await response.text(), settlement: header ? decodePaymentResponseHeader(header) : null };
}
