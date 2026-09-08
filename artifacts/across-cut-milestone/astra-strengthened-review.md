# Across Cut strengthened-comparison scoped recheck

2026-09-08. This follow-up preserves `/tmp/hf-across-cut-evidence-review.md`; its earlier 81-run verdict does not automatically cover changed policies or replay machinery. Recheck requested by the integration owner through the policy author. Reviewed implementation starts at `d88f3725517932db39afe2ce9d04b7df715e1395`, after explicit amendment commits `c96ed2b`, `eb2754c`, and `bb9ae99`. No prior reviewer verdict was read. No reserved case was executed or selected; no source file was edited by this reviewer.

Final verdict: no remaining blocker in this scoped recheck at clean `dc87a06e298371c4c6f3a68e52e4ea0ee08fa60a`. The strengthened factual/rival/negative-response behavior is consistent with the registered bounded change. Both replay defects found during this follow-up are corrected and independently rechecked. This supports proceeding to the integration owner's source freeze and sealed evaluation, not public-game admission.

## Concrete findings, resolved

**Resolved P2: mutable controller attribution could disable policy verification.** At `d88f372`, `experiment.js:62–63` trusts `event.controllers[actor]` to decide whether to recompute a policy output. Changing the keeper controller to `prescribed` and replacing its decision reason makes `replayTrial` accept the forged output, both for ordinary `D1/notebook` and the real-policy continuation in `S9-withdrawal-received`. This regresses the original unconditional verification of ordinary policy trials and undermines the specific new partial-policy attribution claim. The author preserved the failing test/output at `47781fe`; correction `ef8f2ca` derives controllers/actions from trusted source definitions, validates case identity/kind/arm/family/partition/setup, and recomputes both prescribed and policy outputs. My exact autonomous and partial-policy attribution mutations now reject. Adjacent kind, arm, case, setup and header mutations are covered by the passing source tests. A source-defined no-reply diagnostic remains outside the155-trial matrix; arbitrary custom cases cannot claim registered replay.

Independent executable reproduction: `/tmp/hf-across-cut-strengthened-attribution-repro.mjs`; original failure: `/tmp/hf-across-cut-strengthened-attribution-original.txt`. This finding concerns replay claims, not evidence that the retained runs were actually forged.

**Resolved P3: valid no-op decisions could extend the driver past closure.** After `ef8f2ca`, appending a genuine ended-view policy round at30 and a host-clamped advance31 still passed replay although the source driver stops at30. The author retained the failing test at `710e691`; `dc87a06` now rejects every event whose replayed clock has already reached30. The exact regression passes on both Node versions. These two corrections alter evidence validation only.

## Behavioral and experiment checks

The reliable development grid is complete: valve6/12 × inlet2/14 × launch15/27 appears in D1/D4/D6/D7/D9/D10/D11/D12. D2/D3/D5/D8 retain the original bounded/lossy interventions. All12 arms run in all12 configurations:144 policy runs. The nine earlier scripts plus two explicitly partial-policy controls make155 trials.

All informed keepers apply the received inlet fact through the shared ordinary release formula; all keepers use a received launch notice when available and the same latest-possible27 physical fallback otherwise. The unknown-earliest15 check limits optional proposal delay; it does not impose a different physical release deadline. Receiver-derived schedules use own inlet work, received keeper work and known one-way channel bounds. These formulae match the declared default-body uninterrupted timing grid; they do not establish policy optimality under every legal recovery/interruption history.

A proposal no longer waits for a complete round trip. An actually received, source-ordered current negative response can interrupt an unfinished release, withdraw the keeper's own promise and preserve remaining water. Positive or absent responses do not gate release, and optional confirmation cannot delay a due release. The scheduled received/lost controls genuinely call the notebook policy at8 and10 from complete actor-local inputs. They remain scripted prefixes with two policy decisions, not autonomous negotiation or equal-exposure trials.

An additional independent legal host check made withdrawal arrive at11 during release10–12: the actual policy interrupted after one paid release minute, restored two owned water units, then withdrew its own contribution. The save replayed. This checks the new stop branch rather than merely its pre-release hold variant.

The strengthened artifact's observed policy service totals over12 cases are: cart-only12; earliest no-radio18; adaptive no-radio19; cart-first no-radio20; fixed-early14; fixed-conservative19; contact19; one-way report20; two-way report21; retained last-report21; notebook21; notebook-no-confirm21. In D11, one-way report supplies0 whereas cart-first no-radio supplies1. The revised main report at `92d2294` correctly replaces the old claim that one-way attains every observed maximum, preserves the historical80 table under an explicit heading, and distinguishes factual-report value from the unearned confirmation-centered premise. Two-way factual reporting remains sufficient for the best observed service in this expanded comparison.

Two-way/retained-last-report use24 radio charges across these cases, notebook45 and no-confirm38. No retry action occurs. The notebook's earlier full-round-trip limitation has changed, but its retry and confirmation-usefulness claims remain limited to unhelpful/dormant behavior in these executed policies. S9 preserves2 keeper water while S10 releases and loses2 after a lost withdrawal; neither supplies service because attendance is deliberately omitted. This is a useful negative-response consequence, not a confirmation benefit or a general cognitive-faculty result.

## Final execution evidence

- All40 scoped tests (17 comparison plus23 host) pass on Node26.8.1 and minimum Node22.0.0 at `dc87a06`. Logs: `/tmp/hf-across-cut-strengthened-final-node26-tests.txt` and `/tmp/hf-across-cut-strengthened-final-node22-tests.txt`.
- Fresh complete155 development execution binds exact source `dc87a06e298371c4c6f3a68e52e4ea0ee08fa60a`; all155 entire trial objects, including decisions, full input dictionaries, journals, errors and final saves, are structurally identical to the retained `d88f372` artifact. There are zero refusals; all3 water units reconcile; each actor pays30 Human minutes; peak save19,316 bytes and maximum journal57 entries. Artifact: `/tmp/hf-across-cut-strengthened-final-node26.json.gz`.
- Exact-original-source Node22 replay validates all155 final-source trials: `/tmp/hf-across-cut-strengthened-final-node22-replay.json`. Full source SHA-256 binding and equality audit: `/tmp/hf-across-cut-strengthened-final-audit.json`.
- Final policy hash: `f295ad1db1f91191c1caf18a6f44aeb782b247c625b1f0682773aa85a90a35b3`; replay runner hash: `060ddec970bf32ea2e62f376c64847bb84e8dba022c436ae96600186f26dba60`; source cases hash: `85b0ce6ea9a55ecde7a95ef61d0d6220d8327e49caa025362773af91633ec1ae`. Host hash remains `13200cf52557d5c7c45319548e79512998c020e4c73eb6e8f35f17e5800080db`, matching original `b3ec694`.

## Earlier execution evidence retained

- 38 scoped tests (15 comparison plus23 host) passed Node26.8.1 at the strengthened source.
- Exact-original-source Node22.0.0 replay validated all155 retained `d88f372` trials: `/tmp/hf-across-cut-strengthened-d88-node22-replay.json`.
- Artifact audit:155 trials, zero refusals,19,316-byte peak active save,57 maximum journal entries, zero retry decisions. Source and disaggregated outcomes/negative-response actions: `/tmp/hf-across-cut-strengthened-d88-audit.json`.
- The expanded artifact is `artifacts/across-cut/development-strengthened.json.gz`; its execution source is explicitly `d88f372`. Later correctness sources require their own fresh evidence/freeze; retain this original strengthened artifact.
- Source-only accounting: expanding the arm list also expands the future R2 reserved matrix. The reserved partition now implies15 eventual trials (12 R2 policy plus3 prescribed scripts), rather than the earlier12. It remains unexecuted by this reviewer.
