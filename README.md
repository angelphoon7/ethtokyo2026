# Step 7C feasibility spike

Status: **TECHNICAL HOLD — live key verified; risk semantics/fixture, protected funded signer and owner spend policy remain open.**

Read [07C_HOLD_SPIKE_REPORT.md](07C_HOLD_SPIKE_REPORT.md) for findings and evidence. This is an experiment, not a submission-ready product.

```powershell
cd spike-7c
npm.cmd ci --ignore-scripts --no-audit --no-fund
npm.cmd test
```

The 22 tests replay a genuinely captured public 402 and one observed live API response against the official x402 packages. The downstream signer is a throwing sentinel: no private key, signature, payment, or settlement is produced. Injected approvals and risk holds are synthetic controls, not Intercepta verdicts. A separate live probe obtained a fresh 402 and authenticated scan, then held with zero backend calls.

Place `INTERCEPTA_API_KEY=your_key` in the Git-ignored `spike-7c/.env`. From that directory:

```powershell
node --env-file=.env scan.mjs
node --env-file=.env live-probe.mjs
```

The first command scans the previously captured actual payTo; the second obtains a fresh unpaid challenge and scans it inside the guard. Neither pays or loads a wallet key. `node --env-file=.env scan.mjs --documented-example` scans the address in the API documentation, which is not a certified known-risk fixture. `node capture.mjs 3` separately refreshes the original unpaid capture. These commands overwrite their corresponding evidence files; Git retains earlier committed observations.

The live responses contained `toxicScore: 0` and `traits: []`. The buyer currently maps this to `unknown` because coverage/unknown-address semantics remain unverified. This is our conservative hold policy, not an API assertion that either address is risky or unknown. No automatic allow mapping is enabled.

Integration files: [capture.mjs](spike-7c/capture.mjs), [scan.mjs](spike-7c/scan.mjs), [guard.mjs](spike-7c/guard.mjs), [live-probe.mjs](spike-7c/live-probe.mjs). Live trace: [live-gate.json](spike-7c/evidence/live-gate.json). The guard returns an authorization payload only if given a trusted signing backend and approved risk decision; this spike supplies neither in a live run. A deployment must put the backend and policy outside the purchasing agent's filesystem/process/tool permissions. JavaScript closures do not establish that isolation.

API feedback from this pass:

- First authenticated call succeeded after the owner supplied a key; recipient scans took 1,179 ms and 429 ms, with the documentation example taking 7,603 ms.
- The Markdown Quick Scan reference exposes `toxicScore` and `traits`; the rendered page was less explicit.
- The retrieved schema did not define numeric score ranges, coverage/freshness indicators, or an unknown-address example.
- Both examined subjects returned zero score and no traits; a known-risk fixture and documented unknown-address behavior are needed to validate a decision-changing risk case.

AI disclosure: Codex generated the spike code, tests, evidence collection and report on 25 September 2026. Human work supplied the concept, freeze and experiment request. Track eligibility and required submission materials remain unresolved; nothing was pushed or submitted.
