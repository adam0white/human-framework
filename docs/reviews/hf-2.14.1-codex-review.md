# HF 2.14.1 independent review

Verdict: **fix first**. Three P2 findings and one P3 finding. No P0 or P1 found.

Reviewed candidate `45b557b52e9eb7ef4fc3b6788240a67e7efe5dfd` against `5837185`, plus `8da7aff` and `54408c7`. Read AGENTS.md, the 2.14.1 changelog, and the worker report. The worker report's clean-review conclusion is not supported by the probes below.

Read-only review. No repository edits, installs, commits or pushes. The pre-existing published 2.14.0 install was used. All new probes and logs are in `/Users/abdul/code/.lab-scratch/hf-2141/review/`. Git status remained clean. Source paths and line numbers below refer to the reviewed candidate.

## P2 — An old high still earns `onFinished.advanced` credit

**Location:** `packages/human/src/agenda/agenda.ts:761`.

The condition `g.progress >= g.project.peak` accepts equality. After perception restores the previous high, a completed contribution is returned as advancement. Repeated contributions at that same reading earn the same return value without further progress.

**Reproduction run:**

```sh
PATH=/opt/homebrew/bin:$PATH node /Users/abdul/code/.lab-scratch/hf-2141/review/net-probe.ts
```

A behaviour-2 perceived project starts at 0.3, falls to 0.2, and returns to 0.3. The probe perceives the resulting reading before reporting the contribution:

```text
replace-after-perception {"advanced":["g1"],"lastAdvancedAt":600,"importance":0.1,"pull":0.2341}
repeat-without-progress {"advanced":["g1"]}
```

**Impact:** Public `onFinished` consumers can still reward or narrate restoration as advancement. This does not refresh staleness, importance or persistence in this path. The composite `finish` currently consumes only `kept` and `broken` from this return value, so this finding does not establish an additional composite reward.

**Fix:** Associate contribution credit with a genuine new perceived high and consume it once. Preserve the unmarked legacy path. Merely replacing `>=` with `>` would suppress credit after genuine progress too, because perception has already raised `peak`.

## P2 — Public goal adoption can omit the peak under behaviour 2

**Locations:** `packages/human/src/agenda/agenda.ts:794`, `packages/human/src/projects/projects.ts:83`, `packages/human/src/agenda/agenda.ts:804`.

Exported `adoptGoal` accepts a perceived-progress project without `peak` and does not initialize it when projects already have `behaviour: 2`. The progress reader then falls back to the current reading, retaining the old reversal-credit rule. Re-enabling projects does not repair the missing peak because initialization is skipped for an already-marked slice.

**Reproduction run:** the same `net-probe.ts` command. It enables projects, calls public `adoptGoal` with `project: { prospectId: 'work', perceivedProgress: true }`, and perceives 0.3 → 0.2 → 0.3:

```text
public-adoptGoal {"behaviour":2,"project":{"prospectId":"work","perceivedProgress":true},"lastAdvancedAt":602,"progress":0.3}
restored-missing-peak-reenable {"behaviour":2,"project":{"prospectId":"work","perceivedProgress":true}}
```

**Impact:** A valid public adoption path bypasses net credit. Replacing material refreshes staleness, restores importance and resets pursuit decay. A snapshot of this state retains the missing peak through restore. The ordinary `considerProjects` adoption path does initialize the peak correctly.

**Fix:** Initialize peaks for newly adopted perceived projects when the projects slice uses behaviour 2. Reconcile missing peaks on behaviour-2 restore/re-enable without resetting an existing high or changing unmarked legacy saves.

## P2 — A second release erases an unexpired rest interval

**Locations:** `packages/human/src/persistence/persistence.ts:95` and `:105`.

Maximum-duration release replaces the single `rested` entry. If another goal releases before the first interval ends, the first goal is immediately eligible again. This contradicts the guarantee in `docs/framework.md:69` that the released goal cannot form a pursuit during its interval.

**Reproduction run using public APIs:**

```sh
PATH=/opt/homebrew/bin:$PATH node /Users/abdul/code/.lab-scratch/hf-2141/review/rest-public.ts
```

Two active goals each have a matching action with `advancedBy: 0.01`. Persistence uses supported settings `maxMinutes: 2, restMinutes: 20`. Two completed actions serve A, then two serve B:

```text
A release 602 ... "rested":{"goalId":"a","until":622}
B release 604 ... "rested":{"goalId":"b","until":624}
A premature restart 604 ... "current":{"goalId":"a","since":604,...}
```

**Impact:** Alternating goals defeats their promised refractory intervals. Behaviour-2 decay does not repair the interval, especially when those goals keep making progress. Default maximum duration exceeds default rest, but valid shorter maximum durations expose the issue directly.

**Fix:** Retain a bounded set of unexpired intervals keyed by goal, pruning expired or ended entries. Preserve exact unmarked continuation. If the single-entry limitation is intentional, narrow the advertised guarantee explicitly; the current per-goal promise is stronger than the implementation.

## P3 — A positive event credit can reset decay without changing numeric progress

**Locations:** `packages/human/src/agenda/agenda.ts:764`–`:765`, consumed by `packages/human/src/persistence/persistence.ts:145`.

The event-credit path refreshes `lastAdvancedAt` even when floating-point addition leaves progress unchanged. This agenda rule predates 2.14.1, but the new decay now treats it as fresh progress.

**Reproduction run:**

```sh
PATH=/opt/homebrew/bin:$PATH node /Users/abdul/code/.lab-scratch/hf-2141/review/decay-probe.ts
```

A host goal has progress 0.5 and positive `advancedBy` amount `1e-20`. After 60 stalled minutes:

```json
{"initial":0.336,"decayed":0.084,"clock":660,"before":0.5,"after":0.5,"advanced":["task"],"afterUnchangedProgress":0.336}
```

**Impact:** Repeating such credited completions prevents decay despite unchanged represented progress. This needs extremely small configured credits; ordinary positive increments advance correctly. Event-only projects also cannot detect world reversals, as the changelog already acknowledges.

**Fix:** For behaviour-2 net-progress timing, refresh the relevant clock only when represented progress increases, or keep a separate net-progress timestamp. Preserve legacy event-credit timing for unmarked slices.

## Other probe results

| Question | Observed result |
|---|---|
| Normal take/replace clocks and importance | A reversal and recovery to the old high preserve `lastAdvancedAt`, reduced importance and decayed pull. Stale abandonment still occurs. The `advanced` exception is above. |
| Genuine new high | 0.4 after an initial 0.3 raises peak, sets `lastAdvancedAt` to 632, restores importance to 0.5989 and pull to 0.4791. |
| Peak lifecycle | Ordinary adoption and progress perceived before adoption initialize the correct peak. Ordinary snapshot restore and repeated enable preserve it. Adoption without a progress reading creates an event-only goal with unused `peak: 0`; this is unnecessary but causes no observed credit change. Public adoption is the failing path above. |
| Release/re-formation and re-enable | At 60 stalled minutes, pull stays 0.084 through release/re-formation and default `enablePersistence`. A real 0.1 progress increment restores full pull. |
| Reconfiguration | Changing half-life from 30 to 1440 raises the 60-minute pull from 0.084 to 0.3264. This is explicit coefficient reconfiguration, not a hidden clock reset. Re-enabling with defaults preserves the elapsed goal time. |
| Rest versus project identity | Rest binds the goal ID. With stale=3, cooldown=1, max=2 and rest=20, the same prospect is adopted as a new goal at minute 604 while the old ID rests until 622. The new adoption also gets a new decay clock. This follows the current goal-based design. Default project cooldown 60 exceeds default rest 20. |
| Restore ownership | Two active projects and a dangling pointer restore to the newest active project, abandon the older project, record cooldown, and round-trip idempotently. Stale abandonment records cooldown even without the pointer. |
| Missing pointer with explicit abandonment | Manually deleting the ownership pointer, then calling `abandonGoal`, bypasses history/cooldown and permits adoption at 630. This requires damaged/manually changed ownership state; ordinary restore reconciles the pointer first. |
| Ninth-or-later material | Twelve IDs retain only m0…m7. A subsequent host reading of 1/12 still updates progress, peak and advancement time. Progress does not derive from the retained material IDs. Other changes in `54408c7` are documentation/type-comment/test changes. |

These probes are `net-probe.ts`, `restore-probe.ts`, `rest-public.ts` and `decay-probe.ts` in the review scratch directory.

## Published-package continuation and fixture sensitivity

Independently regenerated the frozen minute-602 save using the installed published 2.14.0 package. It is deeply equal to `LEGACY_PROJECT_LOOP_SAVE`, including absent behaviour markers and absent peak. Published, candidate and fixture continuation hashes all equal:

```text
5f0258b74bfeb66a0176036059ed01b48398cfee9af7500f9049dc9b78091290
```

Only snapshot engine metadata is removed. Decisions, full remaining snapshots and carrying state are included. Sensitivity is behavioral: opting projects into the new behavior changes final advancement time from 692 to 602; opting persistence in changes second-decision continuation/switch magnitude from 0.4783 to 0.4674. Each changes the fixture hash. Thus the fixture would fail on the relevant behavior leakage, beyond differing marker bytes.

Three never-enabled hosts, seeds 1, 19 and 42, produced 270 matching snapshots across 90-minute loops with prospect-bearing percepts, removing only engine metadata. The migration is stamp-only. These results support the tested continuation claim, not every possible host trace.

Runnable evidence: `review/legacy-probe.ts`, `review/legacy-sensitivity.ts`; output `review/legacy-output.txt`.

## Controls, determinism and release checks

Ran the current control scenarios against both published 2.14.0 and candidate source using the same host code. Existing displayed results match: short arms place 5/0/0; longer arms complete 59/2/0/0/59 chains; hunger leads to food within one minute and 40 placements afterward. Default decay did not harm these control arms. Candidate stalled control reproduces 60 legacy rounds versus 14 net rounds, unchanged final pile, and net pursuit release at minute 47. Evidence: `review/control-compare.ts` and `review/control-output.json`.

Focused command executed, with scratch config and cache:

```sh
PATH=/opt/homebrew/bin:$PATH npx vitest run --config /Users/abdul/code/.lab-scratch/hf-2141/review/focused.config.mts --configLoader runner packages/human/test/projects.test.ts packages/human/test/persistence.test.ts packages/human/test/legacy-projects-loop.test.ts packages/human/test/libm.test.ts packages/human/test/migrate.test.ts packages/human/test/examples.test.ts
```

**6 files, 55 tests passed.** No full suite run. The preinstalled runner reported Vitest 5.0.3; no dependencies were changed.

The deterministic math guard passes. New decay uses core `dpow`; reviewed runtime additions introduce no RNG, platform transcendental or game-specific vocabulary. New peak values are finite bounded units on restore; markers accept only absent/2; settings are bounded; no new unbounded JSON collection was added.

Release stamps agree on 2.14.1: `packages/human/src/index.ts:2`, `packages/human/src/types.ts:971`, `packages/human/package.json:3`, `package-lock.json:3433`, and `CHANGELOG.md:15`/`:17`. The private monorepo's root version is not the published package version.
