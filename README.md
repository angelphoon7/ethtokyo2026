# Step 7C feasibility spike

Status: **HOLD — live controlled risk-HOLD passed; funded settlement and deployed signer-bypass proof remain open.** Zero/empty remains an owner-selected demo ALLOW policy, not proof of address safety.

Read [07C_HOLD_SPIKE_REPORT.md](07C_HOLD_SPIKE_REPORT.md) for findings and evidence. This is an experiment, not a submission-ready product.

The owner supplied the completed [07B problem-validation report](07B_POST_FREEZE_PROBLEM_VALIDATION.md) on 25 September 2026; it is preserved unchanged here. Its missing-input blocker is resolved, but its verdict remains **HOLD** with customer need unproven. A technical PASS would not by itself clear that product gate or approve full Step 8.

```powershell
cd spike-7c
npm.cmd ci --ignore-scripts --no-audit --no-fund
npm.cmd test
```

The original run passed 22 offline checks against the official x402 packages. Its zero-score case used the earlier uncertainty-hold policy. The changed policy has a separate targeted check: `node --test owner-policy.test.mjs` (2 tests passed; the original suite was not rerun). The downstream signer is a throwing sentinel: no private key, signature, payment, or settlement is produced. Injected approvals and risk holds are synthetic controls, not Intercepta verdicts. The earlier live trace recorded an uncertainty hold. A fresh live probe at 22:27 UTC on 25 September returned HTTP 402 then Intercepta HTTP 200 with zero/empty, allowed under the owner's rule and reached the sentinel once with zero signatures.

The latest remaining-gates resume completed a **live risk-based HOLD**: a real HTTPS 402 from a controlled local server named a sponsor-documented historical risk subject. Local policy allowed the quote; Intercepta returned score 100 with `known_scammer` and `blacklist`, and the gate held with **zero cryptographic signer calls and zero signatures**. [Captured quote](spike-7c/evidence/controlled-risk-402.json), [live trace](spike-7c/evidence/controlled-risk-hold.json). The negative case used an ephemeral unfunded account, so it proves neither payment nor signer isolation. Two new response-handling tests passed; previous completed suites were not rerun.

Place `INTERCEPTA_API_KEY=your_key` in the Git-ignored `spike-7c/.env`. From that directory:

```powershell
node --env-file=.env scan.mjs
node --env-file=.env live-probe.mjs
```

The first command scans the previously captured actual payTo; the second obtains a fresh unpaid challenge and scans it inside the guard. Neither pays or loads a wallet key. `node --env-file=.env scan.mjs --documented-example` scans the address in the API documentation, which is not a certified known-risk fixture. `node capture.mjs 3` separately refreshes the original unpaid capture. These commands overwrite their corresponding evidence files; Git retains earlier committed observations. The current live probe writes `http-live-owner-policy.json` and `live-gate-owner-policy.json`, preserving the original uncertainty-hold files.

The owner selected `toxicScore: 0` with `traits: []` as the demo ALLOW rule. The buyer returns `allow`, displays “No suspicious activities reported.” and records `OWNER_ASSUMPTION_ZERO_SCORE_EMPTY_TRAITS_ALLOW`; this is not proof that an address is safe. Valid responses containing `known_scammer` or `blacklist` now map to a named-risk HOLD. Other non-allow responses and request/schema errors remain unknown holds. Missing `txsCount` is accepted because that exact omission was observed live; the adapter does not invent counts or relax required risk/name/description fields. No spending cap or funded signer is supplied by these rules.

Earlier experiment resume (21:39–21:42 UTC): two sponsor-published historical addresses returned HTTP 404, yielding no usable negative-risk response. `node --env-file=.env sponsor-subject-probe.mjs` reproduces those read-only probes; [their evidence](spike-7c/evidence/sponsor-historical-scans.json) is separate from the successful original scans. They are not Discord fixtures or captured risk-held seller quotes. The report contains the remaining blockers and a prepared sponsor question.

Integration files: [capture.mjs](spike-7c/capture.mjs), [scan.mjs](spike-7c/scan.mjs), [guard.mjs](spike-7c/guard.mjs), [live-probe.mjs](spike-7c/live-probe.mjs), [controlled-risk-probe.mjs](spike-7c/controlled-risk-probe.mjs). Historical hold trace: [live-gate.json](spike-7c/evidence/live-gate.json). Current live allow trace: [live-gate-owner-policy.json](spike-7c/evidence/live-gate-owner-policy.json). The ordinary positive probe uses a sentinel; the negative probe uses an ephemeral in-memory cryptographic account that is never funded and was never invoked. No protected funded signer is connected. A deployment must put the backend and policy outside the purchasing agent's filesystem/process/tool permissions.

To reproduce only the new controlled negative experiment from `spike-7c`, run `node --env-file=.env controlled-risk-probe.mjs`. It creates a loopback HTTPS fixture, verifies TLS with a local certificate, makes one live recipient scan, and sends no payment. It requires OpenSSL (`C:\Program Files\Git\usr\bin\openssl.exe` on this Windows setup, or `openssl` on PATH elsewhere). TLS material stays in Git-ignored `.inspection`; no payer key is persisted. The controlled seller only issues an unpaid challenge and cannot settle or deliver paid content. The command overwrites its two dedicated evidence files; Git retains earlier observations. `node --test known-risk-response.test.mjs` checks the changed response parser without network access.

The supplied [post-gate build prompt](POST_GATE_BUILD_PACKET_AND_IMPLEMENTATION_PROMPT.md) is preserved for review. [07D](07D_GO_NO_GO_DECISION.md) records the owner's conditional GO for a limited Intercepta sponsor demo once 07C technical checks pass; customer need remains unproven. The live risk-held case now passes. Actual settlement and deployed signer enforcement remain outstanding. The owner confirmed this repository and explicitly limited this work to the remaining spike gates. No full build packet or MVP has been started.

API feedback from this pass:

- First authenticated call succeeded after the owner supplied a key; recipient scans took 1,179 ms and 429 ms, with the documentation example taking 7,603 ms.
- The Markdown Quick Scan reference exposes `toxicScore` and `traits`; the rendered page was less explicit.
- The retrieved schema requires `txsCount`, but every trait in the new live flagged response omitted it; the adapter now handles that observed difference explicitly.
- A sponsor-published poisoning-theft subject returned score 100 with four traits and now drives the controlled HOLD. The guarded scan took 845 ms; earlier historical leads returned 404. Zero/unknown/404 behavior and coverage indicators remain useful API feedback, while the owner's zero/empty demo assumption stays in force.

AI disclosure: Codex generated the spike code, tests, evidence collection and report on 25 September 2026. Human work supplied the concept, freeze and experiment request. Track eligibility and required submission materials remain unresolved; nothing was pushed or submitted.
