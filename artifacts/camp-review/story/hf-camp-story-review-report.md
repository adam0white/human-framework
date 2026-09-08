# Independent camp-story wrapper review

Reviewed worktree: `/Users/abdul/code/human-framework/.worktrees/camp-story`.
Reviewed HEAD: `a0fece81466a94e1ef65ab96c10ae99d13095c84`.
Review scope: authoritative entry/migration, finite journal, literal checkpoint ties, ownership, ending/Return, admission reserves, immutable validation cache, hostile object/JSON traversal. This is an independently authored and executed review of the actual source. No repository source files were edited. No prior review verdict or private player feedback was used to choose findings.

## Scoped verdict

Changes are required for two input-validation defects. Ordinary exercised game flows, finite-window replay, legitimate migrations, timing and allocation behavior otherwise passed the independent probes. This is not complete historical replay/authentication of authoritative source snapshots, a human evaluation, or scientific/theological validation.

### P2 — Returned snapshot can regress settled lifetime counters and redistribute paid practice

Location: `src/games/camp-story.js:132-138`, `continuationExtends`.

The function preserves clock time, caches, structures, person id/minutes, options/origin and aggregate `world.stats`. It does not compare settled `world.clock.nextEvent`, each `person.nextAttempt`, or per-person `world.paid` values. Kernel validation is relative to the original Common Ground migration (or initial camp), so it cannot fill this finite-window continuation gap.

Executed reproductions from the actual archived minute-1,312 source:

- Advance through ferry/rain, finish and Return; decrease player `nextAttempt` from 1,072 to original-source 892. `restoreGame` accepts.
- Perform forage during the window; decrease returned `clock.nextEvent` from 96 to original-source 95. `restoreGame` accepts.
- The player actually pays 11 forage/gathering minutes during the window. After Return, transfer those 11 paid work/gathering minutes from player to neighbor, exchange recovery minutes, and recompute each person's gathering skill from the preserved source with the source `practice` function. Aggregate world receipts remain unchanged. `restoreGame` accepts the reassigned practice and the player's regressed skill, contradicting the retained settled journal.

This can be detected without reconstructing any unrecorded post-window history: these values are lifetime counters and cannot go backwards after the already retained settled state. Preserve `nextEvent`, each `nextAttempt`, per-person paid counters, and resulting skill floors against the settled world. Keep normal snapshot-authority limits explicit.

Artifacts:

- `/tmp/hf-camp-story-review-regressed-attempt.json`
- `/tmp/hf-camp-story-review-regressed-paid.json`
- `/tmp/hf-camp-story-review-edge-probes.mjs`

### P2 — Custom array prototypes bypass data-only traversal and execute inherited accessors

Location: `src/games/camp-story.js:20-21` and `:149`.

`inspect` checks an object's prototype only when it is not an Array. Setting `record.commands` to an Array subclass with an inherited custom iterator passes inspection and the save is accepted. Setting an inherited getter for `Symbol.iterator` also passes inspection, and the journal replay's `for...of` executes that getter (`invoked === 1`, throw message `INHERITED_GETTER_EXECUTED`). This violates the stated accessor-free, pure input-validation contract. The kernel's corresponding traversal already requires `Array.prototype` and does not have this specific gap.

Require the ordinary array prototype (and dense indexed own data properties) before anything iterates or clones such arrays. This is a direct JavaScript-object API issue; an ordinary `JSON.parse` file does not encode prototypes or functions, so it is not evidence of remote code execution through an ordinary uploaded JSON file.

Artifact: `/tmp/hf-camp-story-review-edge-probes.mjs`.

## Executed coverage

Independent suite: `/tmp/hf-camp-story-review-probes.mjs`.

- 18 broad probe groups, 17 passed and 1 failed on the real counter-regression assertion on both actual Node 26.8.1 and minimum Node 22.0.0.
- Two newly earned paths enter at their own actual milestones (232 and 288), preserving the complete authoritative kernel world and pausing without paid time on Continue.
- Coarse, minute and Next Event drivers produce equal canonical saves across both supply checkpoints, including a migrated busy old-Rain source.
- All 191 exercised valid old-Rain prefixes preserve their source world, original window, production, allocations, departure and finished state; generated allocations cover both households and camp.
- 80 old Common Ground build-first/stock-first prefixes migrate correctly, including active shelter/workbench/garden assembly, timber/salvage gathering, forage, eat and rest.
- The actual archived 1,312-minute/12-cache source retains its world and ownership without invented cache-completion times.
- Cache completion exactly at ferry 322 can be allocated before dispatch; cache completion exactly at rain 412 can be allocated before finishing.
- A genuinely missed zero-cache ferry followed by later paid cache production at 377 yields two camp nights while households remain unprovided.
- Full provision cannot finish early before actual ferry dispatch; full provision after dispatch can. Ordinary Return never reopens the window or restores spent ownership.
- Forage active at rain 1,492 is unchanged by finish/Return and actually completes at 1,502 afterward.
- At 1,024 ordinary records, admission agrees with the view; unilateral stop/release and minute-driven progression, dispatch, finish, Return and save remain available (1,031 final records).
- Forged finite receipts, allocations, deadlines, journal time, actor condition and return flag are rejected. Detached view/export changes do not contaminate immutable trusted snapshots. Ordinary own accessors, shared/cyclic structures, sparse arrays, symbols, oversize strings and nonfinite values reject.
- Extra edge probes reproduce lifetime-event/per-person-practice regression and inherited-array-iterator invocation on both runtimes.

Logs/results:

- `/tmp/hf-camp-story-review-node26-results.json`
- `/tmp/hf-camp-story-review-node22-results.json`
- `/tmp/hf-camp-story-review-output.log`
- `/tmp/hf-camp-story-review-node22-output.log`
- `/tmp/hf-camp-story-review-edge-results.json`
- `/tmp/hf-camp-story-review-node22-edge-results.json`

## Source identity

- `src/games/camp-story.js`: SHA256 `892157d79398612dcec0b635be35ee09bda322a669aeb36cb9f54b6826b30e82`
- `src/games/camp.js`: SHA256 `ccb71f95881382cb7a2e90ad03da994bc92e191526f695ac746db02d9cbabb47`
- `src/games/commons-next.js`: SHA256 `cd7db395f2498ff52230fa799d3d40f254d03b36403a144f619c2b16daee2bd0`
- `src/games/commons.js`: SHA256 `b2c6f5e8bd38e84b729d73182170c88034edc3767e00c71cd65784233283aedb`

Counter/prototype corrections require a focused rerun of these retained independent probes before this scoped verdict can pass.

## Corrected-source recheck — scoped PASS

Rechecked root `/Users/abdul/code/human-framework`, current HEAD `9d25ace2dfd42bca2f6350b9a3740b8205bab3ea`. The inspected `camp-story.js` and `camp.js` bytes exactly match correction commit `01afcab4fdf87dc7fe9fceb3891d046339289db6`; later HEAD work did not change these two files. Original worktree, scripts, pre-fix reports and failing logs above are preserved. No repository edits were made by this reviewer.

The corrections address both findings:

- Returned validation now preserves settled clock/event and per-person attempt identities, each paid counter, and skill floors. The original 1,072-to-892 attempt regression rejects; 96-to-95 event regression rejects; the original source-derived 11-minute paid-practice reassignment rejects.
- Data-only traversal now requires the ordinary Array prototype. Both the custom iterator and inherited `Symbol.iterator` getter reject before invocation (`invoked = 0`).

All **18 retained independent broad probe groups pass on Node 26.8.1 and minimum Node 22.0.0**. All four retained edge cases now reject the invalid input as expected. The original scripts were copied with only the target repository/output paths adjusted; their assertions and legal historical sources were retained. The complete old-Rain/Common Ground prefix cases consequently ran again as part of this short retained suite.

The added kernel player-readiness boundary changes the timing at which the probe's event-driven opening policy gets to choose. Its first earned entry now occurs at 202; the exact ferry/rain ties in that newly earned world consequently occur at 292/382. Within each authoritative world, coarse/minute/Next Event canonical-save parity remains exact. The old-Rain source still retains its own original absolute clock, and the archived 1,312-minute camp's unfinished forage still survives rain 1,492 and completes at 1,502. These remain source-defined software checks, not generalized human or historical-authentication claims.

Corrected artifacts:

- `/tmp/hf-camp-story-review-corrected-node26-probes.mjs`
- `/tmp/hf-camp-story-review-corrected-node22-probes.mjs`
- `/tmp/hf-camp-story-review-corrected-node26-results.json`
- `/tmp/hf-camp-story-review-corrected-node22-results.json`
- `/tmp/hf-camp-story-review-corrected-node26-edge-results.json`
- `/tmp/hf-camp-story-review-corrected-node22-edge-results.json`
- `/tmp/hf-camp-story-review-corrected-node26-output.log`
- `/tmp/hf-camp-story-review-corrected-node22-output.log`

Corrected source hashes:

- `src/games/camp-story.js`: SHA256 `c0070e54620e3e54bf363bd1dcbb0a7ab24f804e119ec35aca7daa028a2e0388`
- `src/games/camp.js`: SHA256 `5852de534435378394b0438d69101307d0387198a31e5b6b84d75c092b76ef7c`
- `src/games/commons-next.js`: unchanged SHA256 `cd7db395f2498ff52230fa799d3d40f254d03b36403a144f619c2b16daee2bd0`
- `src/games/commons.js`: unchanged SHA256 `b2c6f5e8bd38e84b729d73182170c88034edc3767e00c71cd65784233283aedb`

No remaining finding in the independently exercised wrapper scope. UI/session/deployment integration and broader kernel semantics belong to the other review scopes.

## Final view-only delta confirmation — scoped PASS

Inspected the exact `camp-story.js` delta from passed correction `01afcab` to `11f5420`: one `openWindow` local guards the two choice deadline booleans; all other wrapper source remains unchanged. Current root HEAD at inspection was `02af6d230fc36fb160ab333d1965e0284072b646`, whose wrapper bytes match `11f5420`.

A narrow independently authored probe compared the prior passed wrapper and current wrapper using the same current kernel and actual 1,312-minute archived camp. No broad prefix or full-suite rerun was performed.

- Active packing at 1,312: eligible ferry/rain flags remain true and the whole view equals the prior wrapper.
- After actual ferry dispatch at 1,402: ferry flags are false; eligible rain flags remain true and the whole view equals the prior wrapper.
- Four-cache early finish and Return at 1,402, while rain remains in the future at 1,492: both deadline flags are false for every choice.
- Exported save bytes match the prior wrapper exactly at all four stages. `getGameView` leaves those bytes unchanged. Every other view field matches after normalizing the two intentionally changed flags.

This four-stage check passes on actual Node 26.8.1 and minimum Node 22.0.0. No additional finding.

Final reviewed wrapper SHA256: `99300ffb03feb6d45a0dcd1313e71c7f8e20c7857f35701d6931dcc66c74e538`.

Artifacts: `/tmp/hf-camp-story-review-final-flags.mjs`, `/tmp/hf-camp-story-review-final-flags-26.8.1.json`, `/tmp/hf-camp-story-review-final-flags-22.0.0.json`. The prior wrapper used only for comparison is retained at `/tmp/hf-camp-story-review-final-prior-wrapper.mjs` with its two import paths redirected to the same current kernel/old-Rain module. The separately reviewed default-rest kernel change is outside this narrow wrapper confirmation.
