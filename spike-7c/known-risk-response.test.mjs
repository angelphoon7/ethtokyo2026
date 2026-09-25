import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validScanResponse, interpretObservedScan, ZERO_SCORE_POLICY, KNOWN_RISK_POLICY } from './scan.mjs';

const diagnostic = JSON.parse(await readFile(new URL('./evidence/documented-fixture-schema.json', import.meta.url), 'utf8'));
const observed = { toxicScore: diagnostic.diagnostic.toxicScore,
  traits: diagnostic.diagnostic.traits.map(t => ({ risk: t.risk, name: t.name, description: t.description })) };

test('observed live traits without transaction counts map to a named-risk hold', () => {
  assert.equal(diagnostic.status, 200);
  assert.equal(observed.toxicScore, 100);
  assert.equal(validScanResponse(observed), true);
  const mapped = interpretObservedScan(observed);
  assert.equal(mapped.decision, 'hold');
  assert.equal(mapped.policyBasis, KNOWN_RISK_POLICY);
  assert.deepEqual(mapped.matchedTraits, ['known_scammer', 'blacklist']);
});

test('optional count does not relax required fields or broaden the zero-empty allow rule', () => {
  const mutations = [
    b => { b.traits[0].txsCount = null; },
    b => { b.traits[0].txsCount = '1'; },
    b => { delete b.traits[0].risk; },
    b => { delete b.traits[0].description; },
    b => { b.traits[0] = null; },
    b => { b.toxicScore = '0'; },
  ];
  for (const mutate of mutations) {
    const bad = structuredClone(observed); mutate(bad);
    assert.equal(validScanResponse(bad), false);
    assert.equal(interpretObservedScan(bad).decision, 'unknown');
  }
  const allowed = interpretObservedScan({ toxicScore: 0, traits: [] });
  assert.equal(allowed.decision, 'allow');
  assert.equal(allowed.policyBasis, ZERO_SCORE_POLICY);
  assert.equal(interpretObservedScan({ toxicScore: 1, traits: [] }).decision, 'unknown');
  assert.equal(interpretObservedScan({ toxicScore: 0, traits: [{ risk: 1, name: 'unrecognized', description: 'Synthetic control' }] }).decision, 'unknown');
});
