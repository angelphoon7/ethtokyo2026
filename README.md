# Step 7C feasibility spike

Status: **TECHNICAL HOLD — zero/empty response now allowed under the owner's demo assumption; known-risk fixture, protected funded signer and owner spend policy remain open.**

Read [07C_HOLD_SPIKE_REPORT.md](07C_HOLD_SPIKE_REPORT.md) for findings and evidence. This is an experiment, not a submission-ready product.

The owner supplied the completed [07B problem-validation report](07B_POST_FREEZE_PROBLEM_VALIDATION.md) on 25 September 2026; it is preserved unchanged here. Its missing-input blocker is resolved, but its verdict remains **HOLD** with customer need unproven. A technical PASS would not by itself clear that product gate or approve full Step 8.

```powershell
cd spike-7c
npm.cmd ci --ignore-scripts --no-audit --no-fund
npm.cmd test
```

The original run passed 22 offline checks against the official x402 packages. Its zero-score case used the earlier uncertainty-hold policy. The changed policy has a separate targeted check: `node --test owner-policy.test.mjs` (2 tests passed; the original suite was not rerun). The downstream signer is a throwing sentinel: no private key, signature, payment, or settlement is produced. Injected approvals and risk holds are synthetic controls, not Intercepta verdicts. The earlier live trace recorded an uncertainty hold. A fresh live probe at 22:27 UTC on 25 September returned HTTP 402 then Intercepta HTTP 200 with zero/empty, allowed under the owner's rule and reached the sentinel once with zero signatures.

Place `INTERCEPTA_API_KEY=your_key` in the Git-ignored `spike-7c/.env`. From that directory:

```powershell
node --env-file=.env scan.mjs
node --env-file=.env live-probe.mjs
```

The first command scans the previously captured actual payTo; the second obtains a fresh unpaid challenge and scans it inside the guard. Neither pays or loads a wallet key. `node --env-file=.env scan.mjs --documented-example` scans the address in the API documentation, which is not a certified known-risk fixture. `node capture.mjs 3` separately refreshes the original unpaid capture. These commands overwrite their corresponding evidence files; Git retains earlier committed observations. The current live probe writes `http-live-owner-policy.json` and `live-gate-owner-policy.json`, preserving the original uncertainty-hold files.

The owner instructed the demo to treat `toxicScore: 0` with `traits: []` as safe to allow. The buyer now returns `allow`, displays “No suspicious activities reported.” and records `OWNER_ASSUMPTION_ZERO_SCORE_EMPTY_TRAITS_ALLOW` as its policy basis. Provider coverage semantics remain unverified, but sponsor clarification is no longer a prerequisite for this chosen demo rule. Other scores, conflicting traits, missing data and API errors still hold for review. This rule does not supply a spending cap or a funded signer.

Earlier experiment resume (21:39–21:42 UTC): two sponsor-published historical addresses returned HTTP 404, yielding no usable negative-risk response. `node --env-file=.env sponsor-subject-probe.mjs` reproduces those read-only probes; [their evidence](spike-7c/evidence/sponsor-historical-scans.json) is separate from the successful original scans. They are not Discord fixtures or captured risk-held seller quotes. The report contains the remaining blockers and a prepared sponsor question.

Integration files: [capture.mjs](spike-7c/capture.mjs), [scan.mjs](spike-7c/scan.mjs), [guard.mjs](spike-7c/guard.mjs), [live-probe.mjs](spike-7c/live-probe.mjs). Historical hold trace: [live-gate.json](spike-7c/evidence/live-gate.json). Current policy replay: [owner-policy-checks.json](spike-7c/evidence/owner-policy-checks.json). Current live allow trace: [live-gate-owner-policy.json](spike-7c/evidence/live-gate-owner-policy.json). The spike has no cryptographic signing backend. A deployment must put the backend and policy outside the purchasing agent's filesystem/process/tool permissions. JavaScript closures do not establish that isolation.

The supplied [post-gate build prompt](POST_GATE_BUILD_PACKET_AND_IMPLEMENTATION_PROMPT.md) is preserved for review. [07D](07D_GO_NO_GO_DECISION.md) records the owner's conditional GO for a limited Intercepta sponsor demo once 07C technical checks pass; customer need remains unproven. Full-build technical prerequisites remain unmet: live risk-held case, actual settlement and deployed signer enforcement. The 07C report records the smallest remaining spike and pass conditions. No full build packet or MVP has been started.

API feedback from this pass:

- First authenticated call succeeded after the owner supplied a key; recipient scans took 1,179 ms and 429 ms, with the documentation example taking 7,603 ms.
- The Markdown Quick Scan reference exposes `toxicScore` and `traits`; the rendered page was less explicit.
- The retrieved schema did not define numeric score ranges, coverage/freshness indicators, or an unknown-address example.
- The first two subjects returned zero score/no traits; two later sponsor-published historical subjects returned 404. A known-risk fixture is still needed for the negative demonstration. Zero/unknown/404 semantics remain useful provider feedback; the owner has chosen an explicit zero/empty demo assumption.

AI disclosure: Codex generated the spike code, tests, evidence collection and report on 25 September 2026. Human work supplied the concept, freeze and experiment request. Track eligibility and required submission materials remain unresolved; nothing was pushed or submitted.
