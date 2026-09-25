# Step 7C feasibility spike

Status: **TECHNICAL HOLD — live key, protected funded signer, owner spend policy and risk fixture required.**

Read [07C_HOLD_SPIKE_REPORT.md](07C_HOLD_SPIKE_REPORT.md) for findings and evidence. This is an experiment, not a submission-ready product.

```powershell
cd spike-7c
npm.cmd ci --ignore-scripts --no-audit --no-fund
npm.cmd test
```

Tests replay a genuinely captured public 402 against the official x402 packages. The downstream signer is a throwing sentinel: no private key, signature, payment, or settlement is produced. Test approvals and holds are explicitly synthetic controls, not Intercepta verdicts.

`node capture.mjs 3` refreshes the unpaid canonical x402 challenge. `node scan.mjs` reads `INTERCEPTA_API_KEY` from the environment and scans the captured actual `payTo`; without a key it records `BLOCKED: LIVE KEY REQUIRED`. Do not put secrets in chat or tracked files. The adapter deliberately holds pending inspection of live response semantics, including when it receives valid JSON. Neither command pays.

Integration files: [capture.mjs](spike-7c/capture.mjs), [scan.mjs](spike-7c/scan.mjs), [guard.mjs](spike-7c/guard.mjs). The guard returns an authorization payload only if given a trusted signing backend and approved risk decision; this spike supplies neither in a live run. A deployment must put the backend and policy outside the purchasing agent's filesystem/process/tool permissions. JavaScript closures do not establish that isolation.

API feedback from this pass:

- Time to first authenticated call: blocked by unavailable sandbox credentials.
- The Markdown Quick Scan reference exposes `toxicScore` and `traits`; the rendered page was less explicit.
- The retrieved schema did not define numeric score ranges, coverage/freshness indicators, or an unknown-address example.
- A documented normal/risky response pair and accessible sponsor fixture would make policy validation easier.

AI disclosure: Codex generated the spike code, tests, evidence collection and report on 25 September 2026. Human work supplied the concept, freeze and experiment request. Track eligibility and required submission materials remain unresolved; nothing was pushed or submitted.
