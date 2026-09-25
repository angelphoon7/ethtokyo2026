# 07C — Hold resolution: live payment and pre-sign gate spike

**Decision: TECHNICAL HOLD. Zero/empty response now allowed under the owner's demo assumption; known-risk fixture and funded payment gates remain open.**

**Latest live follow-up, 2026-09-25 at 22:27 UTC: PASS for the live owner-policy path to a non-signing sentinel.** A fresh HTTP 402 and authenticated HTTP 200 scan returned `toxicScore: 0, traits: []`; the current adapter allowed under the owner's assumption, and the validating wrapper passed the exact transfer to the sentinel once. **Zero signatures, no paid retry, no settlement.** The supplied post-gate build prompt was reviewed; its full-build entry requirements remain unmet. Details and the smallest remaining spike appear below.

**Human scope decision received:** [07D_GO_NO_GO_DECISION.md](07D_GO_NO_GO_DECISION.md) records a **conditional GO for a limited Intercepta sponsor demo once the remaining 07C technical tests pass**. Customer need remains explicitly unproven. The written scope-choice dependency is resolved; technical prerequisites and spend authorization are not supplied by that decision.

A fresh supported HTTP 402 and authenticated Intercepta response were obtained in the earlier guarded run. The API returned `toxicScore: 0` and `traits: []`; the buyer then held pending coverage semantics, with zero downstream signer calls. **22 offline checks passed under that earlier policy.** No payer authorization, paid retry, settlement, or delivered paid result was obtained. The negative risk-based sponsor-value demonstration and a deployed non-bypassable signer remain unproven. This does not clear the product HOLD or authorize Step 8.

**Owner-policy change, 2026-09-25 at 22:21–22:23 UTC:** the owner explicitly instructed us to assume zero is safe and empty traits mean no suspicious activities reported. The demo now maps numeric zero plus an empty traits array to **ALLOW**, labeled as an owner assumption. Two targeted policy tests passed, including a replay reaching the non-signing sentinel once with the captured transfer terms. That policy-edit pass made no new API call, actual signature or payment; the later live run is recorded separately. Coverage clarification is no longer a prerequisite for this demo policy; a real risk-held quote and funded settlement remain unproven.

**Input review, 2026-09-25 from 22:11 UTC:** the owner supplied the completed [07B problem-validation report](07B_POST_FREEZE_PROBLEM_VALIDATION.md). Its missing-input blocker is **resolved**; its verdict is **HOLD — TARGETED EVIDENCE OR SPIKE REQUIRED**, with customer need unproven. This document review introduced no new experiment results; the 22 completed offline checks were not rerun. Repository confirmation and event eligibility remain open.

**Previous experiment resume, 2026-09-25 at 21:39–21:42 UTC:** only missing prerequisites/experiments were investigated. Two authenticated scans of sponsor-published historical subjects returned HTTP 404, not a risk verdict. The completed 07B report was unavailable at that time; its later receipt is reconciled below. No additional successful payment or live risk-held quote is claimed.

## Scope, dates and inputs

- Work date: **25 September 2026**. First recorded clock: **21:05:23 UTC / 22:05:23 Europe/London**; final findings review: **21:13:29 UTC / 22:13:29 Europe/London**. Evidence timestamps use UTC. This first go/no-go pass finished within the requested two-hour timebox; access dependencies stopped the live experiments early.
- Credential follow-up: **21:20:55–21:23:53 UTC**, followed by report updates. The owner supplied the key in Git-ignored `spike-7c/.env`; Node loaded it with `--env-file=.env`. Three authenticated read-only API calls were made. No key value was printed or committed.
- Repository inspected: `C:\Users\Jun Yee\Music\ethtokyo2026\ethtokyo2026`, origin `https://github.com/angelphoon7/ethtokyo2026.git`. It initially contained only `.git`, with no commits or project files. The enclosing workspace is not itself a Git repository. The intended-repository clarification had not been answered at report time.
- Initially read the supplied Step 7C text, `07_PROJECT_FREEZE.md`, `00_HACKATHON_CONTEXT.md`, and `07B_POST_FREEZE_PROBLEM_VALIDATION_PROMPT.md`. The user's request to execute **7C** defines this task. The initial 7B attachment was a prompt; its request to perform independent research was not treated as a separate user task.
- **Controlling input received and reviewed from 22:11 UTC:** [07B_POST_FREEZE_PROBLEM_VALIDATION.md](07B_POST_FREEZE_PROBLEM_VALIDATION.md), supplied from Downloads and copied unchanged into this repository. Its HOLD and evidence gaps are reconciled below. The IDE's `test-tokyo26/09_TECHNICAL_SPIKE_REPORT.md` was absent from this workspace. No previous simulated spike was reused or credited.
- At the first pass, no Intercepta/payer credentials were available. **The Intercepta credential blocker is now resolved.** Protected signer, owner-selected spend cap and sponsor-certified known-risk fixture remain unavailable. The owner was asked for the event Discord fixture address/source; no response was available at follow-up review time.

## Versions and official sources

Observed installation: Node **24.18.0**, npm **11.16.0**, `@x402/core`, `@x402/fetch`, `@x402/evm` **2.27.0**; transitive `viem` **2.56.9**. Selected protocol: **x402 v2, EVM exact, EIP-3009, Base Sepolia `eip155:84532`**. No Permit2, v1, mainnet payment or gas-sponsoring extension is enabled. [package-lock.json](spike-7c/package-lock.json) pins integrity hashes. Installation disabled lifecycle scripts.

All sources below were inspected on **2026-09-25**. Documentation claims are distinguished from executed observations.

| Official source | What it establishes / limit |
| --- | --- |
| [Buyer quickstart](https://docs.x402.org/getting-started/quickstart-for-buyers) | Source claim: the TypeScript fetch wrapper handles payment automatically. Actual ordering was independently inspected in installed 2.27.0. |
| [Fetch 2.27.0 package](https://registry.npmjs.org/@x402/fetch/-/fetch-2.27.0.tgz), [core package](https://registry.npmjs.org/@x402/core/-/core-2.27.0.tgz), [EVM package](https://registry.npmjs.org/@x402/evm/-/evm-2.27.0.tgz) | Observed executable implementation used in the tests, not an assumption about mutable `main`. Bundle hashes are in [inspection-hashes.json](spike-7c/evidence/inspection-hashes.json). |
| [Quick Scan reference](https://docs.web3antivirus.io/reference/quick-scan-address), [Markdown/OpenAPI representation](https://docs.web3antivirus.io/reference/quick-scan-address.md) | Observed documentation only: GET endpoint, header authentication and response schema. Markdown revision timestamp: `2026-05-12T09:23:11.000Z`. |
| [Deep Scan reference](https://docs.web3antivirus.io/reference/scan-address), [Getting Started](https://docs.web3antivirus.io/reference/getting-started-1), [Risk Library](https://docs.web3antivirus.io/reference/scam-and-risk-library) | Follow-up documentation inspection did not resolve zero-score versus unknown-address/coverage semantics or provide a certified known-risk address. The Deep Scan API itself was not called. |
| [Sandbox access](https://intercepta.io/ethglobal) | Source claim: request form issues an emailed sandbox key with 1,000 calls, potentially after a few hours. No request was submitted using an invented identity or unauthorized account. |
| [Tokyo Intercepta prize](https://ethglobal.com/events/tokyo2026/prizes) | Source claim: testnet payments permitted; live screening must govern a decision; risk coverage is mainnet; risky examples are pinned in Discord; successful and held flows plus a public repo/API feedback are required. No fixture was accessible in this session. |
| [Event rules](https://ethglobal.com/events/tokyo2026/info/details) | Source claim: Classic project-specific work must start during the event; continuity differs; meaningful history and AI disclosure matter. These rules do not establish this project's eligibility. |
| [Risk Screener product page](https://intercepta.io/products/risk-screener) | Latest-resume source claim: 0–100 scoring and block/warn/clear actions for the broader product. It does not establish the Quick Scan endpoint's zero-score/coverage mapping. |
| [Sponsor MEV scam analysis](https://intercepta.io/blog/mev-bot-scam-overview) | Sponsor-published historical subjects provided a separate read-only lead. They are not the event Discord fixtures and were not used as payment recipients. |

Some pages failed through the web viewer; the API Markdown and sandbox page were successfully read over HTTPS separately. Shell networking initially returned `EACCES`; approved network access allowed package installation and unpaid probes. This was an access restriction, not a protocol failure.

## Real HTTP challenge and selected terms

**Observed:** `GET https://x402.org/protected`, `Accept: application/json`, no credentials/payment header. Capture: **2026-09-25T21:08:21.999Z–21:08:22.244Z**, **243 ms**. Response: **HTTP 402**, `Content-Type: application/json`, body **`{}`**, `PAYMENT-REQUIRED` header containing base64 JSON. [http-3.json](spike-7c/evidence/http-3.json) preserves the raw header, body, decoded requirements, HTTP date and body hash. No secret or signature was present.

Selected actual `accepts[0]`:

```json
{
  "scheme": "exact",
  "network": "eip155:84532",
  "amount": "10000",
  "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "payTo": "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
  "maxTimeoutSeconds": 300,
  "extra": { "name": "USDC", "version": "2" }
}
```

The official parser accepted this response. Its second offer is Solana and is excluded. `10000` is the observed atomic amount; this is **not an owner-approved spend**. Candidate task: retrieve this protected demo resource once. Its paid output schema, usability and delivery remain unverified.

The advertised resource is `https://x402.vercel.app/protected`, different from the requested host, with description `Access to protected content` and empty `mimeType`. The **test policy explicitly permits that exact resource alias**; no blanket host equivalence is assumed. A live owner policy must approve it or reject the quote.

**Follow-up fresh challenge:** [http-live.json](spike-7c/evidence/http-live.json), **21:23:37.163–21:23:38.401 UTC**, **1,236 ms**, HTTP 402 with the identical EVM terms shown above. This capture fed the authenticated guarded run directly, rather than replaying the earlier HTTP response.

**Current-policy fresh challenge:** [http-live-owner-policy.json](spike-7c/evidence/http-live-owner-policy.json), **22:27:14.750–22:27:15.210 UTC**, measured request latency **455 ms**, HTTP 402 with the same selected EVM terms. It fed the current owner-assumption gate directly. Its `{}` body is still an unpaid challenge, not delivered content.

Other unpaid observations: the `www.x402.org` URL redirects to `x402.org` (301); the first strict-redirect probe rejected it in 340 ms. A second candidate, `https://x402-dotnet.azurewebsites.net/api/minimal/protected`, timed out after 20,002 ms. [http-1.json](spike-7c/evidence/http-1.json) and [http-2.json](spike-7c/evidence/http-2.json) preserve these initial failures. An exploratory public facilitator discovery path returned 404; it is not used.

## Experiment 1 — Pre-sign enforcement

**BLOCKED as a full experiment; PASS for SDK ordering, the limited in-process gate, the earlier live unknown-response hold and the current live owner-policy allow path to a sentinel.**

Observed 2.27.0 call path (paths relative to `spike-7c/node_modules`):

1. `@x402/fetch/dist/esm/index.mjs:5`: wrapper sends the initial request and decodes 402. At line 45 it calls `createPaymentPayload` **before** sending the paid retry. Its existing-payment-header rejection occurs later, at line 53; that rejection alone is not a pre-sign guard. A recovery branch at line 69 can create another payload.
2. `@x402/core/dist/esm/client/index.mjs:254`: selects requirements, runs before-creation hooks, then invokes the registered scheme at line 280. The abort-hook test confirms zero downstream calls.
3. `@x402/evm/dist/esm/chunk-3CXVARP6.mjs:107`: defaults to EIP-3009 unless Permit2 is selected. Lines 27–74 construct authorization, domain and typed message, then call `signer.signTypedData` at line 69. Recipient, amount, asset and chain come from the selected requirement.

The experimental [guard.mjs](spike-7c/guard.mjs) clones and freezes selected terms and trusted test policy, checks endpoint/resource, scheme/network, token, recipient, amount, validity and budget, reserves budget, then awaits screening for **that payTo**. Missing/held/unknown responses never enter the SDK. Only an allow decision for the matching subject installs a one-use approval context. At `protectedSigner.signTypedData`, it checks the exact EIP-712 type definition, domain, sender, recipient, amount, validity and nonce before calling the downstream backend. There is no asynchronous gap between that final check and backend invocation.

An outside wrapper with even the protected signer object cannot find the approval context. A concurrent purchase is held. A reached backend consumes the reservation even if it throws, preventing an ambiguous retry. No settlement reconciliation is implemented. The SDK receives only the selected offer and no extensions. Token signatures bind transfer terms, **not** the HTTP resource body or merchant identity.

The earlier version of [live-probe.mjs](spike-7c/live-probe.mjs) exercised: fresh real 402 → local test policy allowed → actual selected payTo scanned → HTTP 200 interpreted as inconclusive → `RISK_UNKNOWN` → **0 validating-wrapper calls, 0 backend calls, 0 signatures**. [live-gate.json](spike-7c/evidence/live-gate.json) records the timestamped order. The callback was a non-signing sentinel, not a funded payer. The updated script ran at 22:27 UTC under the owner-selected allow rule: fresh 402 → actual payTo scan → **ALLOW** → one wrapper call and one sentinel call, **zero signatures**. Its separate [current-policy live trace](spike-7c/evidence/live-gate-owner-policy.json) preserves the original hold evidence.

**Security limit:** this is an in-process seam, not a deployed key boundary. The factory, policy, scanner and payload-builder test seam are trusted host inputs. The test exposes instrumentation to the harness; a buyer agent would receive only `tool.purchase`. No OS account/container, remote signing policy, restricted tool list, or funded signer has been configured. An agent with this development shell could rewrite code or inspect a key placed in its environment. Do not place a funded payer key here and claim isolation. The absence of a funded key now is not proof that a future funded deployment cannot be bypassed.

## Experiment 2 — Live risk semantics

**PARTIAL PASS: authenticated integration and observed schema. Allow mapping now uses the owner's explicit demo assumption; provider-confirmed coverage semantics and a live known-risk verdict remain unverified.** The original missing-key observation remains in Git history. It is superseded by these authenticated observations:

| Subject and evidence | Start UTC, 2026-09-25 | HTTP | Latency | Observed response |
| --- | --- | ---: | ---: | --- |
| Actual payTo `0x209693Bc6afc0C5328bA36FaF03C514EF312287C`, [first scan](spike-7c/evidence/intercepta.json) | 21:21:05.303 | 200 | 1,179 ms | `toxicScore: 0`, `traits: []` |
| API documentation example `0x0d775e010f0b6c32c9468d43ba599ef47d596e47`, [example scan](spike-7c/evidence/intercepta-doc-example.json) | 21:22:03.946 | 200 | 7,603 ms | `toxicScore: 0`, `traits: []` |
| Actual payTo inside the fresh-quote guard, [live trace](spike-7c/evidence/live-gate.json) | 21:23:38.406 | 200 | 429 ms | `toxicScore: 0`, `traits: []` |
| Actual payTo inside the owner-policy guard, [new live trace](spike-7c/evidence/live-gate-owner-policy.json) | 22:27:15.216 | 200 | 906 ms | `toxicScore: 0`, `traits: []`; owner-assumption ALLOW |

The two guarded responses' complete top-level field-name lists were exactly `toxicScore`, `traits`; no explicit coverage, chain, freshness or known/unknown-address status was returned. These timings are individual observations, not a latency benchmark. The documentation example is **not** certified as a known-risk fixture, and its empty response proves no negative case.

Observed **documentation**: `GET https://api.web3antivirus.io/api/public/v2/extension/account/{address}/quick-scan`, authenticated by `X-API-KEY`. The documented JSON requires numeric `toxicScore` and array `traits`; each trait requires numeric `risk`, string `name`, numeric `txsCount`, string `description`. Names include `known_scammer` and `sanction_address`. **No nonempty trait object was observed live.** Numeric score bounds and unknown-address behavior were not defined in the inspected material; no threshold was invented.

[scan.mjs](spike-7c/scan.mjs) reads `INTERCEPTA_API_KEY` locally, sends it only to the fixed official host, rejects redirects and limits a request to ten seconds. It retains selected response fields and field names, not request credentials or arbitrary error bodies. Current buyer mapping:

| Input | Buyer action / reason |
| --- | --- |
| Valid HTTP 200, numeric score zero, empty traits | **ALLOW**: `NO_SUSPICIOUS_ACTIVITIES_REPORTED`, under `OWNER_ASSUMPTION_ZERO_SCORE_EMPTY_TRAITS_ALLOW`. Exercised with recorded data and the fresh 22:27 UTC API response. |
| Missing key, timeout, HTTP/schema error | Unknown hold due to unavailable/invalid evidence. Missing-key test remains an explicitly offline control. |
| Other valid score/trait combination, including zero with nonempty traits | Unknown hold pending review; none observed live in this run. |
| Hold specifically because of known risk | Not enabled/validated by the available evidence. |

The earlier zero-score hold was **our conservative interpretation**, not an Intercepta assertion that these addresses are unknown or dangerous. The owner has now replaced that policy with an explicit demo assumption: zero plus empty traits permits the risk gate. This does not establish provider coverage or a general safety guarantee. The original evidence files retain their historical unknown-hold reasons; the new mapping and targeted replay are recorded separately below.

The scan subject was the same actual EVM payTo, using the sponsor's mainnet-data address endpoint without a testnet selector. No specific mainnet activity, identity or coverage was verified for it. A testnet quote does not establish mainnet risk. No sponsor-certified known-risk subject or controlled negative seller quote was obtained.

## Experiment 3 — Same-quote comparison

**BLOCKED for incremental live sponsor value.** The identical captured EVM quote passes a deliberately explicit **unit-test policy**: fixed endpoint and resource alias, Base Sepolia, exact asset and recipient, per-call/task amount `10000`, timeout at most 300 seconds, expected domain. These limits were selected for an unpaid test and are not owner consent to payment.

| Comparison using identical selected terms | Observed result |
| --- | --- |
| A: local test policy alone | ALLOW under that test policy. |
| B: same test policy plus actual adapter without key | UNKNOWN HOLD; zero backend calls. This establishes missing-evidence behavior only. |
| B: fresh identical quote plus actual authenticated response | UNKNOWN HOLD because coverage semantics are unresolved; zero backend calls. This establishes live fail-closed behavior, not a known-risk decision change. |
| Injected allow/hold controls | Exercise gate mechanics; no sponsor-value evidence. |
| Same captured quote and recorded zero/empty response under the new owner policy | A and B both **ALLOW**. Replay reaches the sentinel once with exact transfer terms; no incremental risk-based decision or new live interaction. |
| Fresh 22:27 UTC quote plus fresh authenticated zero/empty response under the owner policy | A and B both **ALLOW**. One sentinel call, zero signatures; real API input governs the path, but no negative decision change or payment is demonstrated. |
| B: live risk justifies holding an A-allowed quote | Not run. **Negative demo unproven.** |

No real malicious seller was identified. No controlled sponsor fixture was substituted into the captured quote. A future fixture scenario must be labeled controlled and use an actually captured locally permitted quote.

## Experiment 4 — Allowed payment

**BLOCKED.** Real challenge and live scan before the signing boundary: observed under both the earlier hold policy and current owner-approved zero/empty allow assumption. Protected funded payer and owner-selected budget remain unavailable. Authorization: **none**. Paid retry: **none**. Settlement reference/transaction: **none**. Paid response and usable task result: **none**. Funds spent by this spike: **zero**. Neither the `{}` challenge body nor a sentinel invocation counts as delivered paid content.

## Experiment 5 — Negative and bypass cases

**BLOCKED for the complete risk-held/isolated-signer gate; PASS for 22 offline checks and one live uncertainty-hold run.** Follow-up `npm.cmd test`: **22 passed / 0 failed**, 2026-09-25 at approximately 21:23:53 UTC. Full timestamp and counts: [signer-counts.json](spike-7c/evidence/signer-counts.json). Unit tests replay the captured challenge; the new test also replays the observed live zero-score response. Neither replay is a fresh API interaction. The separate [live-gate.json](spike-7c/evidence/live-gate.json) records the actual network-backed guard run.

`boundaryCalls` counts calls to the validating wrapper; `rawSignerCalls` counts calls past the checks to a **throwing sentinel**. The sentinel has no private key and creates no signature. This distinction prevents confusing a rejected wrapper invocation with a payer authorization.

| Case | Boundary calls | Downstream sentinel calls | Actual signatures |
| --- | ---: | ---: | ---: |
| Bare official auto-wrapper, unsafe control | 0 | 1 | 0 |
| SDK before-creation abort | N/A | 0 | 0 |
| Injected risk hold | 0 | 0 | 0 |
| Unknown / missing / provider exception / wrong subject, each | 0 | 0 | 0 |
| Actual adapter with missing key | 0 | 0 | 0 |
| Exact terms after injected approval; later retry blocked | 1 | 1 | 0 |
| Post-scan payTo / amount / asset / network / expiry / types mutation, each | 1 | 0 | 0 |
| Unguarded auto-wrapper using protected signer | 1 | 0 | 0 |
| Concurrent purchase / outside approval theft | 1 | 0 | 0 |
| Local endpoint rejection | 0 | 0 | 0 |
| Second attempt reusing a consumed approval | 2 | 1 total; 0 on second | 0 |
| Caller mutates original quote during scan | 1 | 1, original screened terms only | 0 |
| Replay of observed zero-score API response, coverage unverified | 0 | 0 | 0 |
| Fresh 402 plus actual live recipient scan, uncertainty hold | 0 | 0 | 0 |
| Fresh 402 plus actual live recipient scan, owner-assumption allow at 22:27 UTC | 1 | 1 | 0 |
| Real live-risk-held quote | Not run | Not measured | Not generated |

Synthetic decisions only test the mechanism. The live unknown hold demonstrates real API input reaching the decision path, but still does not prove a known-risk response holding an otherwise allowed purchase. The positive sentinel test checks exact recipient/value/token/chain, not a valid cryptographic authorization. No alternate funded signer was present among inspected inputs; deployment isolation remains untested.

## Eligibility, history and product gate

The initial repository had no code to classify as pre-event. Prior project-specific documents existed in Downloads, and the freeze mentions earlier experimentation elsewhere; those assets' creation dates and reuse eligibility were not established. None of that experimental code was copied. Exact official start time and owner-selected track remain unverified. Being on the event date or having an empty repository does not prove Start Fresh eligibility.

This work uses real local commits for evidence capture, boundary checks and the report; nothing was pushed or submitted. AI assistance is disclosed in [README.md](README.md). Public visibility of the remote, account participation, submission materials and prize qualification are not established. The official rules' prompt/artifact disclosure requirements still need a submission review.

Product HOLD remains, consistent with the now-received [completed 07B report](07B_POST_FREEZE_PROBLEM_VALIDATION.md). Missing operator evidence includes an actual unattended paid workflow, frequency/cost of locally allowed risky counterparties, acceptable screening latency and false positives, and why existing limits/manual hold are insufficient. No operator interview, incident-frequency evidence, willingness to adopt, unique novelty, safety guarantee, merchant identity or delivery assurance was established here. Receiving the report resolves an input dependency, not these evidence gaps.

## Resume findings — missing experiments only

**Historical resume: 2026-09-25, beginning 21:39:02 UTC.** Re-read the freeze and master context from Downloads and reviewed the supplied 07C report. Searches in Downloads, Documents, Desktop, Music and named files in Codex attachments found the **07B prompt**, but not the completed `07B_POST_FREEZE_PROBLEM_VALIDATION.md`. This search did not establish that the document was absent elsewhere; the owner later supplied it, as recorded below. No replacement validation report was invented. The working repository remains `C:\Users\Jun Yee\Music\ethtokyo2026\ethtokyo2026`, origin `https://github.com/angelphoon7/ethtokyo2026.git`; its identity is observed, while the owner's explicit confirmation is pending.

### Sponsor information retrieval

- Rechecked official prize/API material and searched public official sources. The event's Discord connection opens an OAuth authorization flow; this session has no authenticated access to the pinned channel. Plugin discovery for Discord found no relevant integration. No unrelated connector was installed and no private Discord messages were retrieved.
- The [Risk Screener product page](https://intercepta.io/products/risk-screener) describes a 0–100 score and action labels for the wider product. **Interpretation:** this cannot be substituted for the specific Quick Scan API contract: our response contained only `toxicScore` and `traits`, with no action or coverage indicator. The zero/empty result is still not established as either adequately screened/clear or insufficient coverage.
- The [sponsor's scam analysis](https://intercepta.io/blog/mev-bot-scam-overview) names historical addresses. They were scanned as a bounded alternative lead, not relabeled as Discord-pinned fixtures. Their onchain history was not independently audited here. No wallet interacted with them.

### New live observations

Executed only `node --env-file=.env sponsor-subject-probe.mjs`. No offline suite, prior successful buyer scan, or prior bypass test was repeated. [Reproduction script](spike-7c/sponsor-subject-probe.mjs) and [timestamped evidence](spike-7c/evidence/sponsor-historical-scans.json):

| Sponsor-published subject | Scan start UTC | HTTP | Latency | Interpretation |
| --- | --- | ---: | ---: | --- |
| `0x8232aa8c7d721ad5191954371a97a69ddcdcc492`, contract in scam walkthrough | 21:40:15.312 | 404 | 953 ms | No accepted risk response; unknown hold. |
| `0x39e27d5c1729b8a79970a3ed2926b460f07d9592`, example of attacker-triggered withdrawals | 21:40:16.282 | 404 | 362 ms | No accepted risk response; unknown hold. |

The adapter discarded unvalidated error bodies. HTTP 404 alone does not establish its cause: no conclusion about coverage, address cleanliness or maliciousness follows. These calls produced no nonempty traits and did not resolve the negative case. **No quote was captured for either address**, no signer was instantiated by this script and no payment was attempted. Its zero authorization count is not a new guarded-signer proof. At this historical resume there had been five authenticated address-scan attempts, with three HTTP 200 responses and two HTTP 404 responses. The later 22:27 UTC call brings the current total to six: four HTTP 200 and two HTTP 404.

### Remaining experiment decisions

| Missing requirement | Status after this resume | Evidence / dependency |
| --- | --- | --- |
| Discord-pinned risky fixture and exact zero/unknown semantics | **HOLD** | Public lookup and alternative probes did not resolve them; authenticated sponsor information needed. |
| Controlled captured quote held because of live risk | **HOLD** | No live flagged response or eligible fixture available; no fabricated quote or risk label substituted. |
| Allowed testnet payment with settlement and usable output | **HOLD** | Protected signer, funded public address, owner cap and justified allow policy not supplied. No signing or payment attempted. |
| Zero authorizations for live held and deployed bypass paths | **HOLD** | Existing SDK/sentinel results preserved; no deployed funded signer available for the remaining proof. |
| Completed 07B and intended-repository confirmation | **HOLD at 21:42 UTC** | Neither had arrived at that review. The report was subsequently received; repository confirmation remains open. See the input review below. |

The completed local checks remain evidence of their original, limited pass; this table does not reset them. Missing inputs prevented the remaining experiments from being completed. No architecture, UI or broader product build was started.

### Prepared sponsor question — not sent

> We are testing an ETHGlobal Tokyo buyer guard with `GET /api/public/v2/extension/account/{address}/quick-scan`. For the actual selected payTo `0x209693Bc6afc0C5328bA36FaF03C514EF312287C`, HTTP 200 returned exactly `{"toxicScore":0,"traits":[]}`. Does that mean adequate mainnet coverage with no detected risks, or can an unseen/unindexed/unsupported address return the same result? What response identifies insufficient coverage? Please share the event's pinned known-risk address and expected current response/trait. Two addresses in your published MEV scam analysis returned HTTP 404; what does 404 mean for this endpoint? We will use a controlled negative quote and will not pay the risky subject.

This historical question remains available for the authenticated event channel or [sponsor contact route](https://intercepta.io/ethglobal). No message was sent on the owner's behalf. Following the owner's later policy instruction, coverage clarification is optional for the demo; the missing known-risk fixture/live verdict remains required for the negative case.

### Review of the updated decision

**TECHNICAL HOLD remains warranted.** The live API works for the original recipient, but the required allowed settlement, known-risk decision change and funded-signer isolation are still unproven. The two 404 responses are not evidence of technical success or grounds to reinterpret zero as safe. The subsequent completed 07B report confirms that operator evidence remains missing. The owner later selected a limited sponsor demo, conditional on technical passage, as recorded in 07D; that choice does not establish validated demand.

## Completed 07B received — input and decision reconciliation

**Review began 2026-09-25 at 22:11 UTC.** Read the completed report supplied at `C:\Users\Jun Yee\Downloads\07B_POST_FREEZE_PROBLEM_VALIDATION.md` and preserved an unchanged [repository copy](07B_POST_FREEZE_PROBLEM_VALIDATION.md). Both copies have SHA-256 `890130FFFC44607E1EC6AF3A8F70CF9E6099AD3F6D3F46C18503C361661E725B`. This supersedes the earlier missing-report status.

The supplied report identifies its inputs as `07_PROJECT_FREEZE(5).md` and `00_HACKATHON_CONTEXT(20260925-204751).md`. Its stated buyer-side, owner-scoped pre-sign concept matches this spike's scope; byte-for-byte identity with the differently named freeze/context read during 07C was not established. Its desk-research findings are attributed to the supplied report, not presented as newly independently verified external facts. Its proposed experiments were reviewed as context for the existing 07C request; receipt did not initiate outreach or a separate research task.

| Gate | Effect of receiving completed 07B |
| --- | --- |
| Required validation document | **PASS for receipt and review only.** The completed report is now available. |
| Problem validation | **HOLD.** 07B reports no direct operator evidence for a recurring, locally allowed risky payment that external screening would materially improve. |
| Differentiation | **Unproven.** 07B rejects the current finalist-differentiation claim because of overlapping prior art; this spike establishes no superiority. |
| Live technical feasibility | **TECHNICAL HOLD.** 07C already adds a real captured quote, authenticated responses and a limited uncertainty hold to the desk report. It still lacks a justified live risk hold, allowed settlement and deployed signer isolation. |
| Product progression | **Full Step 8 is not approved.** Technical success alone would support a narrowly described sponsor demo with customer need still unproven. |

07B's section 6 example is explicitly a **format fixture**, not a captured transaction or risk verdict. It supplies no new negative case or payment evidence. The real HTTP captures and live API observations in this report retain their original provenance and limits.

For the separate problem gate, 07B proposes two independent operator/maintainer conversations: at least one credible workflow demonstrating a material gap in existing controls, plus a second independent signal of recurrence or high consequence. That is a proposed threshold for reconsidering HOLD, not completed interviews or statistical market validation. No operator outreach was performed in this review. Supplying 07B itself did not constitute a go/no-go decision. The owner subsequently made a separate, explicit conditional sponsor-demo choice, recorded in 07D, with customer need still unproven.

**Verification:** the repository copy matches the supplied file's SHA-256. No offline tests, live API calls, signer attempts or payments were repeated during this document update. All experiment counts and outcomes above remain unchanged.

## User-supplied API overview follow-up — 2026-09-25, 22:15 UTC

Checked the [API overview](https://docs.web3antivirus.io/reference/api-overview), documentation index, Quick Scan and Deep Scan Markdown/OpenAPI definitions, Getting Started, Risk Library, Use Cases and the newly identified [Check Address Activity reference](https://docs.web3antivirus.io/reference/check-address-activity.md). This was documentation review only; no authenticated scan, offline check or payment was repeated.

- The overview establishes advertised address-screening capabilities and lists Base among supported chains. It does not establish Quick Scan coverage for a particular address or Base Sepolia support.
- The [Quick Scan schema](https://docs.web3antivirus.io/reference/quick-scan-address.md) describes `traits` as detected suspicious activities and `toxicScore` as a wallet risk measure. It does not define zero as adequately covered/clear, distinguish unindexed addresses, specify a numeric threshold, or document HTTP 404. Thus `traits: []` supports “no suspicious activities reported,” while coverage remains unresolved. Deep Scan documents the same response schema and does not resolve that distinction either.
- Check Address Activity returns `hasActivity` based on transactions, native balance or contract status, with an optional chain selector. **Interpretation:** on-chain activity is not evidence that Quick Scan completed sufficient risk screening; its response is not a documented substitute for the missing coverage signal. The API was not called.
- No event-certified known-risk fixture with an expected response was identified in these pages. The Quick/Deep Scan input example is the same `0x0d775e010f0b6c32c9468d43ba599ef47d596e47` already scanned with a zero/empty response; it is not labeled a known-risk test case.

**Disposition: HOLD unchanged.** The inspected documentation clarifies the fields but does not supply either missing sponsor answer. [Getting Started](https://docs.web3antivirus.io/reference/getting-started-1.md) lists `support@web3antivirus.io` for authentication questions; that is a documented contact route, not evidence that the requested risk semantics have been confirmed. No message was sent.

## Blockers and disposition

### Owner-selected zero-score policy — 2026-09-25

The owner explicitly chose to treat zero as safe and empty traits as no suspicious activities reported. [scan.mjs](spike-7c/scan.mjs) now returns `allow` only for numeric `toxicScore: 0` together with `traits: []`, with the display message “No suspicious activities reported.” and a recorded owner-assumption policy basis. Nonzero scores, conflicting nonempty traits, malformed/missing evidence and request failures continue to hold for review. This instruction chooses a risk rule; it does not supply a payer or an exact spending cap.

Executed only `node --test owner-policy.test.mjs`: **2 passed / 0 failed**, evidence timestamp **22:22:53.023 UTC**. [Targeted evidence](spike-7c/evidence/owner-policy-checks.json) records one replay of the actual zero/empty response reaching the validating wrapper and throwing sentinel once, with matching recipient, amount, asset and chain, and zero signatures. Six synthetic non-allow inputs each produced zero wrapper/backend calls. These controls are not live known-risk evidence. The original 22-check suite was not rerun and its historical evidence remains unchanged; its superseded zero-score test was replaced by these separate current-policy tests.

During the policy-edit pass, the live probe was updated and syntax-checked without execution. Its subsequent 22:27 UTC run wrote `http-live-owner-policy.json` and `live-gate-owner-policy.json` without replacing the original live hold trace. The completed 07B document is unchanged and product validation remains open.

### Post-gate prompt review and live follow-up — 2026-09-25, 22:27 UTC

Reviewed the supplied [post-gate build prompt](POST_GATE_BUILD_PACKET_AND_IMPLEMENTATION_PROMPT.md), preserved unchanged from Downloads. Its embedded implementation steps were assessed against the existing task and evidence; attaching the prompt was not itself treated as the human go/no-go decision. The owner's subsequent explicit answer is recorded separately in [07D](07D_GO_NO_GO_DECISION.md). Section A.2 requires a real live risk decision, settled allowed payment and zero signatures on held/bypass cases before the full build. Those combined technical requirements remain unmet. No full build packet, architecture, application UI or new project instruction files were created.

Within the already authorized missing 07C work, ran `node --env-file=.env live-probe.mjs` once; **exit 0**. Fresh 402 began **22:27:14.750 UTC**; live recipient scan completed **22:27:16.122 UTC**, HTTP 200 in **906 ms**. The current adapter returned **ALLOW** with the owner-assumption label, and the guard passed exact selected terms to its throwing sentinel: **1 wrapper call, 1 downstream sentinel call, 0 payer signatures**. The sentinel outcome was `SENTINEL_REACHED_NO_SIGNATURE`; no payment payload was returned, paid retry sent or settlement obtained. The test budget reservation remained `10000` after the backend throw, as designed. This is a limited live integration PASS, not a settled-payment or signer-isolation PASS. No completed offline checks were rerun.

Smallest remaining spike and acceptance criteria:

| Remaining step | Required input / pass condition |
| --- | --- |
| Controlled live risk-held case | Obtain a known-risk fixture and interpretable live response; capture a real controlled 402 naming that subject. The same local policy must allow the identical quote, while live risk holds it with zero authorization signatures. A synthetic trait or local rejection does not pass. |
| Allowed testnet purchase | Use a protected funded signer and exact owner-approved endpoint/recipient/token/network/per-call/task budget. Pass only with matching authorization, actual settlement evidence and usable paid output. The current sentinel cannot satisfy this. |
| Deployed signer enforcement | With that actual signing boundary, held, changed-quote and alternate-wrapper/tool attempts must produce zero signatures; the purchasing agent must lack another signing route. Prior in-process controls remain historical evidence only. |
| Build go/no-go | **Written scope choice received:** conditional GO for a limited sponsor demo after 07C technical checks pass, with customer need unproven. Recorded in 07D; no repeated scope approval is needed if those conditions are met. |

Provider confirmation of zero/empty semantics is not reintroduced as a prerequisite. The owner's existing demo assumption remains in force. No external message, funded-key setup, event submission or payment was performed.

### Remaining dependencies

1. A known-risk fixture yielding a decision-changing live response. **The credential works, and sponsor clarification of zero/empty semantics is no longer required for the owner's chosen demo assumption.**
2. Protected testnet signer outside agent access, funded balance and owner-selected exact spend policy.
3. A locally permitted captured negative quote and a settled positive purchase with usable output.
4. Intended repository confirmation and event-track eligibility evidence. **The completed 07B input is now received; its product HOLD remains.**
5. For a validated-product claim: the operator evidence identified by completed 07B. This is separate from the technical spike and cannot be satisfied by a successful sponsor fixture alone.

These are missing prerequisites, not successful gates. No inspected SDK ordering defect forces a stop: the supported pre-sign control exists. If live semantics cannot govern it, a funded deployment is bypassable, or the only negative remains synthetic/local-policy rejection after access is supplied, stop the Intercepta prize build. Do not expand into architecture or UI to compensate.

**TECHNICAL HOLD**

**One next action:** obtain the known-risk fixture and expected current response so a captured, locally permitted quote can be held on actual live risk evidence. The owner-selected zero/empty rule is implemented; a funded signer and exact spend cap are still needed for the payment test.
