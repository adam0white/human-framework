# Independent shared-clinic core review

Reviewed 2026-09-08. Verdict: favorable within the scope below; no actionable correctness finding identified.

## Exact scope

Read-only review of `/Users/abdul/code/human-framework/.worktrees/service-plan-core` at HEAD `52cecfa3309813f0f21376d1104e24c448f31478`. Verified that `src/games/service-plan.js`, `docs/service-plan-design.md`, and `tests/service-plan.test.js` are byte-unchanged from final implementation commit `09c8460e3e4ec25ba5b06cea8f759304d726aedb`; the later commit only adds execution evidence. Inspected those three files, the frozen `src/games/service.js` control, runtime exports/model behavior, release locks, and relevant current project contracts. Did not read any prior reviewer verdicts.

The review covers paid consent, terms rejection, revisions and factual readiness, withdrawal, clinic-slot conservation, exact event ties, strict import/replay and bounded continuation. It does not assess browser/UI integration, comparison fairness or results, deployment, human realism, or theology. No repository edits, commits, or deployments were made; probe files and this report are under `/tmp`.

## Executed evidence

- Node `v26.8.1`: `/opt/homebrew/bin/node --test tests/service-plan.test.js tests/service.test.js tests/runtime*.test.js` passed all **71 tests**. This includes 30 plan-host tests, the original service-host regression tests, the clock tests and executable runtime packaging/release-lock tests.
- Minimum Node `v22.0.0`: `node --test tests/service-plan.test.js` passed all **30 tests**.
- `git diff 2822179..HEAD -- src/games/service.js src/runtime src/human src/core/model.js scripts/runtime-release-lock.json` was empty. The previous host, models, runtime and release locks remain unchanged.
- Independent probe `/tmp/hf-plans-independent-probes.mjs` passed **683 state/accounting/replay checks** on Node 26. Its 336-schedule matrix varied invitation minute, declared rest, readiness deadline, hold deadline and fallback. It observed **59 accepted terms, 221 refusals after two paid discussion minutes per person, and 56 invitation refusals**. Each resulting state continued identically through lump advancement and visible-event advancement, including save/restore. Raw summary: `/tmp/hf-plans-independent-probes.json`.
- Additional independent cases covered interruption by each participant after zero or one paid discussion minute, both initial proposals and revisions; withdrawal during a pending revision; incomplete term objects; malformed or augmented response envelopes; forged response, body, accounting and pending-plan save fields; and exhaustion followed by paid closure and exact replay. The exhausted valid save used 249 commands and 21,096 JSON characters, below the declared bounds.

## Findings by boundary

No actionable findings were found in these boundaries:

- Invitation does not grant term consent. Both independently owned discussion attempts must finish before terms can take effect. Busy invitations preserve owned work, and either participant can stop the discussion while retaining only paid active exposure. No recovery or practice is credited by discussion.
- Schedule incompatibility and the owned-part/inlet prerequisites are checked after paid listening. A declined or interrupted revision preserves the predecessor. The exact predecessor deadline wins over tied revised acceptance; partial discussion is interrupted if that boundary arrives earlier.
- Physical readiness has its own retained timestamp. A contribution receipt and actual clinic arrival remain separate; already fulfilled readiness cannot be erased by withdrawal. Withdrawal cancels the pending meeting and the unfulfilled promise without resetting carried bodies, installed work, resource ownership or the underlying clinic obligation.
- A departure permanently commits the clinic receiving slot. Interrupted travel cannot be replaced by another agreement or route; closure wins over a tied arrival. The new policy differences are explicitly documented and the frozen old host is preserved.
- Save import reconstructs from bounded commands and compares the complete resulting state, preventing supplied agreement/accounting fields from inventing paid work or consent. Early, stale and duplicate response/receipt envelopes cannot grant completion. Refusal coalescing retains both response channels, and exhausted legal histories retain a valid paid path through closure.

The completed examples and matrix establish these authored software transitions only. The favorable verdict is scoped to the inspected core snapshot and executed cases; it does not replace the independent integration, UI or comparison reviews.
