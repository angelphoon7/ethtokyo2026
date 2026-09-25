# 07C — Hold resolution: live payment and pre-sign gate spike

**Decision: TECHNICAL HOLD. BLOCKED: LIVE KEY REQUIRED.**

A genuine supported HTTP 402 was captured, and 21 offline checks passed against the pinned official buyer packages. No authenticated Intercepta response, real payer authorization, paid retry, settlement, or delivered paid result was obtained. The negative sponsor-value demonstration and a deployed non-bypassable signer remain unproven. This does not clear the product HOLD or authorize Step 8.

## Scope, dates and inputs

- Work date: **25 September 2026**. First recorded clock: **21:05:23 UTC / 22:05:23 Europe/London**; final findings review: **21:13:29 UTC / 22:13:29 Europe/London**. Evidence timestamps use UTC. This first go/no-go pass finished within the requested two-hour timebox; access dependencies stopped the live experiments early.
- Repository inspected: `C:\Users\Jun Yee\Music\ethtokyo2026\ethtokyo2026`, origin `https://github.com/angelphoon7/ethtokyo2026.git`. It initially contained only `.git`, with no commits or project files. The enclosing workspace is not itself a Git repository. The intended-repository clarification had not been answered at report time.
- Read the supplied Step 7C text, `07_PROJECT_FREEZE.md`, `00_HACKATHON_CONTEXT.md`, and `07B_POST_FREEZE_PROBLEM_VALIDATION_PROMPT.md`. The user's request to execute **7C** defines this task. The 7B attachment is a prompt, **not the completed validation report**; its request to perform independent research was not treated as a separate user task.
- **Missing controlling input:** `07B_POST_FREEZE_PROBLEM_VALIDATION.md`. Preserve the HOLD specified by 7C; do not invent that report's findings. The IDE's `test-tokyo26/09_TECHNICAL_SPIKE_REPORT.md` was absent from this workspace. No previous simulated spike was reused or credited.
- No relevant Intercepta/payer environment variables or local project secret files were found. No authenticated sponsor/mailbox session, protected signer, owner-selected spend cap, or known-risk fixture was provided. Variable presence was checked without printing values. The owner was asked for locations/names rather than secrets.

## Versions and official sources

Observed installation: Node **24.18.0**, npm **11.16.0**, `@x402/core`, `@x402/fetch`, `@x402/evm` **2.27.0**; transitive `viem` **2.56.9**. Selected protocol: **x402 v2, EVM exact, EIP-3009, Base Sepolia `eip155:84532`**. No Permit2, v1, mainnet payment or gas-sponsoring extension is enabled. [package-lock.json](spike-7c/package-lock.json) pins integrity hashes. Installation disabled lifecycle scripts.

All sources below were inspected on **2026-09-25**. Documentation claims are distinguished from executed observations.

| Official source | What it establishes / limit |
| --- | --- |
| [Buyer quickstart](https://docs.x402.org/getting-started/quickstart-for-buyers) | Source claim: the TypeScript fetch wrapper handles payment automatically. Actual ordering was independently inspected in installed 2.27.0. |
| [Fetch 2.27.0 package](https://registry.npmjs.org/@x402/fetch/-/fetch-2.27.0.tgz), [core package](https://registry.npmjs.org/@x402/core/-/core-2.27.0.tgz), [EVM package](https://registry.npmjs.org/@x402/evm/-/evm-2.27.0.tgz) | Observed executable implementation used in the tests, not an assumption about mutable `main`. Bundle hashes are in [inspection-hashes.json](spike-7c/evidence/inspection-hashes.json). |
| [Quick Scan reference](https://docs.web3antivirus.io/reference/quick-scan-address), [Markdown/OpenAPI representation](https://docs.web3antivirus.io/reference/quick-scan-address.md) | Observed documentation only: GET endpoint, header authentication and response schema. Markdown revision timestamp: `2026-05-12T09:23:11.000Z`. |
| [Sandbox access](https://intercepta.io/ethglobal) | Source claim: request form issues an emailed sandbox key with 1,000 calls, potentially after a few hours. No request was submitted using an invented identity or unauthorized account. |
| [Tokyo Intercepta prize](https://ethglobal.com/events/tokyo2026/prizes) | Source claim: testnet payments permitted; live screening must govern a decision; risk coverage is mainnet; risky examples are pinned in Discord; successful and held flows plus a public repo/API feedback are required. No fixture was accessible in this session. |
| [Event rules](https://ethglobal.com/events/tokyo2026/info/details) | Source claim: Classic project-specific work must start during the event; continuity differs; meaningful history and AI disclosure matter. These rules do not establish this project's eligibility. |

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

Other unpaid observations: the `www.x402.org` URL redirects to `x402.org` (301); the first strict-redirect probe rejected it in 340 ms. A second candidate, `https://x402-dotnet.azurewebsites.net/api/minimal/protected`, timed out after 20,002 ms. [http-1.json](spike-7c/evidence/http-1.json) and [http-2.json](spike-7c/evidence/http-2.json) preserve these initial failures. An exploratory public facilitator discovery path returned 404; it is not used.

## Experiment 1 — Pre-sign enforcement

**BLOCKED as a full experiment; PASS for SDK ordering and the limited in-process gate.**

Observed 2.27.0 call path (paths relative to `spike-7c/node_modules`):

1. `@x402/fetch/dist/esm/index.mjs:5`: wrapper sends the initial request and decodes 402. At line 45 it calls `createPaymentPayload` **before** sending the paid retry. Its existing-payment-header rejection occurs later, at line 53; that rejection alone is not a pre-sign guard. A recovery branch at line 69 can create another payload.
2. `@x402/core/dist/esm/client/index.mjs:254`: selects requirements, runs before-creation hooks, then invokes the registered scheme at line 280. The abort-hook test confirms zero downstream calls.
3. `@x402/evm/dist/esm/chunk-3CXVARP6.mjs:107`: defaults to EIP-3009 unless Permit2 is selected. Lines 27–74 construct authorization, domain and typed message, then call `signer.signTypedData` at line 69. Recipient, amount, asset and chain come from the selected requirement.

The experimental [guard.mjs](spike-7c/guard.mjs) clones and freezes selected terms and trusted test policy, checks endpoint/resource, scheme/network, token, recipient, amount, validity and budget, reserves budget, then awaits screening for **that payTo**. Missing/held/unknown responses never enter the SDK. Only an allow decision for the matching subject installs a one-use approval context. At `protectedSigner.signTypedData`, it checks the exact EIP-712 type definition, domain, sender, recipient, amount, validity and nonce before calling the downstream backend. There is no asynchronous gap between that final check and backend invocation.

An outside wrapper with even the protected signer object cannot find the approval context. A concurrent purchase is held. A reached backend consumes the reservation even if it throws, preventing an ambiguous retry. No settlement reconciliation is implemented. The SDK receives only the selected offer and no extensions. Token signatures bind transfer terms, **not** the HTTP resource body or merchant identity.

**Security limit:** this is an in-process seam, not a deployed key boundary. The factory, policy, scanner and payload-builder test seam are trusted host inputs. The test exposes instrumentation to the harness; a buyer agent would receive only `tool.purchase`. No OS account/container, remote signing policy, restricted tool list, or funded signer has been configured. An agent with this development shell could rewrite code or inspect a key placed in its environment. Do not place a funded payer key here and claim isolation. The absence of a funded key now is not proof that a future funded deployment cannot be bypassed.

## Experiment 2 — Live risk semantics

**BLOCKED: LIVE KEY REQUIRED.** [intercepta.json](spike-7c/evidence/intercepta.json) records `liveRequestMade: false`, decision `unknown`, and the actual selected payTo. **Live response fields observed: none. Live API latency: not measured.** No request without credentials was represented as a risk verdict.

Observed **documentation**: `GET https://api.web3antivirus.io/api/public/v2/extension/account/{address}/quick-scan`, authenticated by `X-API-KEY`. The documented JSON requires numeric `toxicScore` and array `traits`; each trait requires numeric `risk`, string `name`, numeric `txsCount`, string `description`. Names include `known_scammer` and `sanction_address`. The retrieved schema does not specify numeric score bounds, a freshness/coverage field, or an unknown-address example. These are schema facts, not live observations or thresholds.

[scan.mjs](spike-7c/scan.mjs) reads `INTERCEPTA_API_KEY` locally, sends it only to the fixed official host, rejects redirects and limits a request to ten seconds. It retains only selected response fields, not request credentials or arbitrary error bodies. HTTP errors, malformed/missing responses and unavailable credentials map to **unknown hold**. Even valid JSON currently maps to **unknown pending review**: no unobserved score-to-allow mapping has been invented. A documented live flagged response is needed to establish **risk hold**, distinct from availability hold.

The intended mainnet-address subject is the same actual EVM payTo printed above. No mainnet activity, identity, risk classification or coverage was verified for it. The address appearing on testnet does not establish mainnet risk. No sponsor-documented known-risk subject or controlled negative seller quote was obtained.

## Experiment 3 — Same-quote comparison

**BLOCKED for incremental live sponsor value.** The identical captured EVM quote passes a deliberately explicit **unit-test policy**: fixed endpoint and resource alias, Base Sepolia, exact asset and recipient, per-call/task amount `10000`, timeout at most 300 seconds, expected domain. These limits were selected for an unpaid test and are not owner consent to payment.

| Comparison using identical selected terms | Observed result |
| --- | --- |
| A: local test policy alone | ALLOW under that test policy. |
| B: same test policy plus actual adapter without key | UNKNOWN HOLD; zero backend calls. This establishes missing-evidence behavior only. |
| Injected allow/hold controls | Exercise gate mechanics; no sponsor-value evidence. |
| B: live risk justifies holding an A-allowed quote | Not run. **Negative demo unproven.** |

No real malicious seller was identified. No controlled sponsor fixture was substituted into the captured quote. A future fixture scenario must be labeled controlled and use an actually captured locally permitted quote.

## Experiment 4 — Allowed payment

**BLOCKED.** Real challenge: observed. Live scan before signing: unavailable. Protected funded payer and owner-selected budget: unavailable. Authorization: **none**. Paid retry: **none**. Settlement reference/transaction: **none**. Paid response and usable task result: **none**. Funds spent by this spike: **zero**. Neither the `{}` challenge body nor a sentinel invocation counts as delivered paid content.

## Experiment 5 — Negative and bypass cases

**BLOCKED for the complete live/isolated-signer gate; PASS for 21 offline checks.** Run: `npm.cmd test`, Node test runner, **21 passed / 0 failed**, evidence timestamp **2026-09-25T21:11:28.552Z**. Full counts: [signer-counts.json](spike-7c/evidence/signer-counts.json). Tests use the captured challenge in a replayed `Response`; that replay is not a new live seller interaction.

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
| Real live-risk-held quote | Not run | Not measured | Not generated |

Synthetic decisions only test the mechanism. They do not satisfy the requirement for a live risk response changing the payment decision. The positive sentinel test checks exact recipient/value/token/chain, not a valid cryptographic authorization. No alternate funded signer was present among inspected inputs; deployment isolation remains untested.

## Eligibility, history and product gate

The initial repository had no code to classify as pre-event. Prior project-specific documents existed in Downloads, and the freeze mentions earlier experimentation elsewhere; those assets' creation dates and reuse eligibility were not established. None of that experimental code was copied. Exact official start time and owner-selected track remain unverified. Being on the event date or having an empty repository does not prove Start Fresh eligibility.

This work uses real local commits for evidence capture, boundary checks and the report; nothing was pushed or submitted. AI assistance is disclosed in [README.md](README.md). Public visibility of the remote, account participation, submission materials and prize qualification are not established. The official rules' prompt/artifact disclosure requirements still need a submission review.

Product HOLD remains. Missing operator evidence includes an actual unattended paid workflow, frequency/cost of locally allowed risky counterparties, acceptable screening latency and false positives, and why existing limits/manual hold are insufficient. No operator interview, incident-frequency evidence, willingness to adopt, unique novelty, safety guarantee, merchant identity or delivery assurance was established here.

## Blockers and disposition

1. Live sponsor credential and an observed response-to-decision mapping, including a known-risk fixture.
2. Protected testnet signer outside agent access, funded balance and owner-selected exact spend policy.
3. A locally permitted captured negative quote and a settled positive purchase with usable output.
4. Completed controlling 07B report, intended repository confirmation and event-track eligibility evidence.

These are missing prerequisites, not successful gates. No inspected SDK ordering defect forces a stop: the supported pre-sign control exists. If live semantics cannot govern it, a funded deployment is bypassable, or the only negative remains synthetic/local-policy rejection after access is supplied, stop the Intercepta prize build. Do not expand into architecture or UI to compensate.

**TECHNICAL HOLD**

**One next action:** make the owner's Intercepta sandbox key available as `INTERCEPTA_API_KEY` in the authorized local environment, then run `node scan.mjs` to obtain and review the first live response for the captured actual payTo before attempting any funded work.
