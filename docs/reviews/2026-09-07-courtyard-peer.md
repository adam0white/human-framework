# Courtyard adversarial peer review

2026-09-07. Reviewer: pump-shift lane. Read-only review of `/Users/abdul/code/human-framework/.worktrees/water-courtyard`; no courtyard source, test, UI or documentation edits. Source identities and machine-readable final checks: `/tmp/courtyard-peer-review-evidence.json`.

## Verified findings, now fixed by the author

1. **P2 — Saving conserved water could bypass paid-action and ownership limits.** `src/games/courtyard.js` importer originally bounded each quantity and total supply but did not require enough actor actions to account for household water or bilateral gifts. Reproducer A: export the first `rest` turn, set homes to `{player:6,neighbor:0}` and carried to `{player:0,neighbor:0}`. The save originally imported, although the player can pour at most three in a turn. Reproducer B: export the first `offer` turn and set `social.given.neighbor=2`. It originally imported two opposite two-bucket gifts in the same turn, although only one actual social transfer can settle. The author added necessary per-person action and net-source ownership bounds. I independently reran both exact reproducers after the fix; both reject. These are attainable-state bounds, not claims that a local save is authenticated.

2. **P2 — Final-move collection could discard achievable partial household service.** From seed 34, play `draw-careful,eat,rest,draw-quick,ask,pour,accept,pour,draw-quick,refuse,draw-careful,rest,ask,pour,rest,rest,borrow`. At round 17 the player carries two, has seven stored, and source water remains. The reciprocal controller originally selected `draw-quick`, closing with seven stored even though `pour` closes with nine; the neighbor finishes with twelve either way. The author added a last-move allowed-pour preference, while preserving explicit competing repayment/generous-response priorities. I independently reran the exact prefix after the fix: the recommendation is now `pour`, final own barrel nine. A regression test preserves this case.

No unresolved P1/P2 finding remains from this review after those checks.

## Interpretation of the memory comparison

The regenerated artifact contains 900 runs and 450 on/off paired comparisons across three profiles, three player heuristics and fifty seeds. Memory changes the action sequence in 150 pairs (the generous-policy conditions); the other 300 sequences are identical. After the final-move bug fix, 39 pairs have a nonzero player stored-water difference: in each profile, seven seeds gain one bucket and six lose one, for a mean gain of 0.02 bucket. Neighbor stored water and both-household completion remain exactly unchanged in all 450 pairs. Generous-policy mean own water is 12.88 with memory and 12.86 without it; neither reaches the own-household target in these rows. The setting therefore changes some exchange behavior and partial quantities without improving measured household completion in this sweep. Before the horizon fix, the exploratory artifact had exact stored-water nulls as well; the current numbers supersede that earlier result.

Self-sufficient and reciprocal currently converge on the same collection/recovery/refusal route in the benchmark. Automatic policies do not borrow, so the main sweep cannot establish the effect of late-loan memory. Prescribed borrowing/return and gift-first fixtures test those branches; the author also added full-completion examples of both routes. These fixtures demonstrate feasibility, not universal social-policy superiority or empirical reciprocity.

The game makes meaningful requests and refusals possible: a proposal does not seize the recipient's water; a neighbor may decline due to her own goal, carrying room, remaining time, or recorded loan history. Independent requests/offers can consume moves and be accepted, refused or ignored. The implementation explicitly settles the player's move before the neighbor chooses. This is an authored sequential two-actor game, not simultaneous action or an experimentally validated model of human social behavior.

A generosity heuristic losing its own goal is not itself an implementation error: its stated policy spends turns helping the other household before its own barrel is full. The null completion result, tiny mixed-sign partial-water result and negative cases must remain visible rather than being reframed as evidence that richer social memory improves coordination.

## Executed checks

- Initially all 18 courtyard tests passed; after the author’s fixes and added route fixtures, all 22 pass.
- Executed 18,000 legal randomized turn/export/import roundtrips before the validation tightening across scarce/standard/plentiful and memory on/off; no conservation or restore failure. The author separately reported another 18,000 after the fix. My post-fix verification directly reran the two exploit reproducers and the current 22 tests rather than claiming my earlier sweep covered the changed validator.
- Verified repayment on the exact due move is on-time; an unpaid balance becomes late when that allowed move ends. The next move’s return remains late. No late deadline ordering defect reproduced.
- Verified own/neighbor water conservation and terminal boundedness through the tests and randomized runs. Both goals are feasible in standard play; scarce total water equals the two household targets before any spill, so spill losses legitimately make both completion impossible.
- Verified all benchmark source SHA-256 entries match the reviewed final source.
- Inspected the host, session parser, benchmark, tests, design specification and browser module. Browser visual/physical mobile QA was performed by the author, not duplicated in this peer review.

## Limits

This is a bounded implementation review, not an exhaustive state-space proof, security authentication audit, human playtest or empirical social validation. It does not show that every legal player strategy avoids a dead end. Current neighbor/player heuristics are deliberately simple and source-visible. No need for a new faculty or mechanic was established by this review.
