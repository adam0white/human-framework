# New-game reviews and disposition

2026-09-07. Review notes for the app 0.4 candidate. The reviews completed and their verified fixes are being integrated. Live verification is recorded separately in the release record.

## Scope and independence

Each whole-game author used an isolated Git worktree with GPT-6 Astra at ultra effort. The pump author reviewed courtyard; the courier author reviewed pump; the courtyard author reviews courier after finishing its own lane. Root performed additional source checks, public integration and browser paths. These are independent inspections of another author's implementation, not human playtest data.

Two additional concurrent Claude CLI processes explicitly requested `--model fable`, with separate working directories and session identities, read-only tools and no session persistence. Their frozen working-source snapshot combines the three in-progress game lanes with `src/human`, the older workshop, the current roadmap and learning memo. Prior review verdicts, private exports, deployment configuration and credentials were excluded. Both processes exited 0 with substantive final text, distinct session IDs, unchanged 31-file snapshots and no permission denials. Their primary reported model was `claude-fable-5-1`; both also report small auxiliary `claude-haiku-4-5-20251001` usage, not an additional independent review. Final text is preserved verbatim and its hashes were checked. Exact prompts, source-file SHA-256 identities, model reports and outputs are in [provenance](../../research/reviews/2026-09-07-games-fable-provenance.json).

**Scope error retained:** the frozen snapshot omitted `src/core/model.js` and `src/core/random.js`, which the component imports, and numerical benchmark artifacts. The external reviewers could inspect the host/component call sites, but could not establish exact imported equations or reproduce reported runs. Their reviews state that limit. Root checks the actual model and artifacts before accepting those claims. Later fixes are outside the frozen review snapshot; targeted tests and peer/root verification cover them.

## Verified defects and improvements

| Finding | Evidence | Disposition |
|---|---|---|
| Courtyard imported impossible paid pours and bilateral gifts despite total conservation | Two peer reproducers modified first-turn saves; original importer accepted six poured buckets or two opposite gifts | Author added necessary actor/action and ownership bounds with regression tests. Peer reran both and confirmed rejection. |
| Courtyard last-turn controller collected water that could no longer be stored | Seed 34 prescribed prefix yielded seven stored with collection versus nine with an allowed pour | Author added a terminal-service rule and regression. Neighbor terminal choices are checked separately. Explicit repayment or a chosen generosity policy can still be competing reasons. |
| Pump depot instructions asked for already-carried equipment | Root and peer independently reproduced in the browser | Inventory-aware guidance now directs the next available choice. |
| Pump collapsed controls were 13–15 px high on mobile | Actual 390 px browser geometry | Summaries and save/help controls now have 44 px targets; geometry rechecked. |
| Rounded body forecasts can allow an action that actual capacity blocks | Root/source inspection and author regression with observed .55/.85 versus actual .56/.86 for intake patching | Preserve estimated observation; blocked feedback now names fatigue/hunger causes. No changed limit, penalty or coefficient. |
| Courier required a second routine Finish click for every action | Root mobile loading path | One-click start/finish becomes default. Optional interval mode retains interruption and exact pending saves. |
| Courtyard described an accepted loan as no water changing hands | Root borrow/reload path | Empty gift summary now explicitly names gifts; outstanding and repaid loans keep their separate feedback. |
| Courier saves could claim travel or a delivery before the earliest possible arrival | Courtyard author reproduced minute-zero mill location and minute-five medicine delivery | Shortest-route and earliest-effect bounds now reject both exploits. The independent reviewer reran both plus five focused save tests after commit `6195e99`; legal earliest deliveries and pending saves pass. |
| Live verification trusted a stale clean flag and an unrecomputed local digest | Independent root-integration reviewer reproduced acceptance with missing assets or edited source | Verifier now checks current Git status and recomputes the complete local payload digest including headers. Three observed failing regressions now pass. |
| Courier cards did not warn about insufficient remaining time | External correctness review and a legal minute-239 browser regression | Cards now warn while leaving the attempted action available; a truncated load still grants no parcel. |
| Courier had no deliberate partial ending | External product inspection confirmed missing command/API/UI | Add an end-round command preserving delivered/on-time/late totals and elapsed partial costs, with terminal save/replay checks. |

The pump peer also exercised 3,045 fractional pending resumes across 150 legal-action seeds and 231 rests after earning service. No score growth, outcome reroll or free practice defect reproduced. The courtyard peer ran 18,000 legal turn/save roundtrips before validator tightening; the author ran a separate 18,000 after it. The courtyard author additionally checked 5,735 legal courier interval/early-end restores and the current 25 courier tests. The root integration reviewer checked public routing, packaging, versions and chooser geometry. These are bounded probes, not exhaustive proofs.

## Product critique: adopted, qualified, or deferred

The [external product review](../../research/reviews/2026-09-07-games-fable-product.md) recommends moving reusable scheduling/serialization into a shared host scaffold and comparing the human lifecycle with a much smaller stamina implementation. This is a serious next experiment. The three solo hosts repeat interval/deadline/settlement code, while courtyard has a different atomic-turn structure. We should quantify that duplication and authoring cost before abstracting it. Passing old tests after extraction alone would prove compatibility, not improved usefulness.

Calling the three solo hosts merely different nouns is too broad. Courier owns a route graph, parcel carrying and separate delivery deadlines; Pump Yard owns several targets competing for a part and timestamp-derived score. Their world rules differ materially even though their scheduling scaffold is similar. This establishes distinct consumers of the narrow component, not broad genre independence or a superior full human model.

On-time delivery **is** an explicit courier outcome metric and appears in its terminal account. The review's claim that deadlines have no consequence discounts that metric. We will keep delivery count and punctuality separate instead of inventing an additional scalar reward merely to make the latter count. The genuine missing partial-end control is fixed.

Pump inspection has no demonstrated strategic advantage in the current benchmarks. Courier inspection changes route decisions but can lose punctuality through its time cost. Courtyard history changes some exchanges but has no household-completion benefit in the current sweep; automatic controllers do not borrow, so that sweep does not test late-loan memory. Unused refusal/ignore counters describe a trace rather than a promised behavioral effect. These negatives remain in the game records. No mechanic is promoted simply because a meter changes or a branch executes.

The review correctly identifies the open body-versus-stamina and player-usefulness comparisons. The user explicitly expanded this milestone to parallel complete games while the earlier player gate was open. The roadmap now records that change in sequence; the gate has not been relabeled complete. After this release, favor refinement, a simple rival and ordinary play over more hosts or faculties.

A different fallback cost across hosts is a deliberate host rule, not an inconsistency in the body component. Its usefulness is unvalidated. A zero-cost or shorter-cost comparison and player explanation check remain appropriate before defending the two-minute cost. Likewise, different interrupt-command shapes are a candidate authoring friction, not a promise that game-specific replays should cross-import.

Scientific sources in the roadmap support representation distinctions, not calibrated coefficients. Its table already labels this scope. Religious sources and interpretation guide source fidelity and architectural boundaries; they are not numerical test results. Stronger positive religious representation remains separate research and qualified-review work. Neither a trivial absence of forbidden variables nor better repair scores completes that aim.

## Correctness review: verified limits and remaining hardening

The [external correctness review](../../research/reviews/2026-09-07-games-fable-implementation.md) reported no major defect in its frozen source inspection. Its missing-core hypotheses were checked against actual source: `finite` defaults to [0,1], so negative body values and out-of-range skills are rejected; `assessCapacity` only blocks exertive actions, so its proposed swallowed blocked social reply is unreachable under these rules. No redundant body-range or social-block implementation was added.

The review correctly found that Pump Yard and courtyard imports accepted a nonzero observation bias despite creating every actor with zero bias. Those import contracts now pin bias to zero, with observed failing regressions now passing. Numeric shift inspection/action identifiers are rejected before string parsing to replace incidental TypeErrors with validation errors. These are malformed-input fixes, not changes to the practice or body model. Its courier deadline-card warning was reproduced in a browser and fixed.

Several coverage concerns refer to the older snapshot: the later courier voluntary-end and chronology regressions, courtyard accepted-request/terminal fixtures, and current browser checks are outside that review. The proposed direct replacement of all keyed hashes with the current core helper is not adopted: old replay bytes and game-specific random domains must remain stable. A future shared helper needs a versioned compatibility design, not a blind replacement. Reloading an earlier save and choosing a different recovery path can legitimately change success against the same draw; replay only guarantees the same result for the same initial state and commands.

## Remaining decisions

The verified fixes are complete; finish exact production verification. Then compare a small shared host helper and a host-native stamina implementation against the current boundary, preserving the same relevant world behavior. Choose what to retain from recorded authoring effort and a small ordinary-play explanation test. Keep the single-person controls, older replay bytes and negative outcomes. No broad rewrite is authorized by a reviewer's confident wording alone.
