// JSON transport for EIP-712 payloads; bigint values survive the round trip.
export const encode = value => JSON.stringify(value, (_, x) => (typeof x === 'bigint' ? { $bigint: x.toString() } : x));
export const decode = text => JSON.parse(text, (_, x) => (x && typeof x === 'object' && !Array.isArray(x) &&
  Object.keys(x).length === 1 && typeof x.$bigint === 'string' && /^[0-9]+$/.test(x.$bigint) ? BigInt(x.$bigint) : x));
