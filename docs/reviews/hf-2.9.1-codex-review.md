# HF 2.9.1 adversarial review

Verdict: **fix first**. `seedBelief` can record an observation source, contrary to the review requirement and its public contract. No behavior drift was reproduced in the three refactors.

Reviewed `v2.9.0..94643499803a860d79b9f4acd8e1fa0b8454679a` on 2026-10-20. Scope: `packages/human`, CHANGELOG, host recipes, architecture, workflows, API generator, dependency override and Worker configuration. Two independent read-only reviewers checked APIs and documentation/CI. No implementation or fixtures were changed.

1. **Should-fix — Authored beliefs accept the reserved observation sources.** `packages/human/src/beliefs/beliefs.ts:204` stores `spec.source` without rejecting `'self'` or `p.id`. Both are the direct-observation markers read at `packages/human/src/beliefs/beliefs.ts:223`. This contradicts “without ... recording an observation” at line 185, CHANGELOG.md:21, and the explicit requirement that `seedBelief` record no self source. It changes subsequent belief revision, rather than merely labeling provenance.

   Reproduced against the built package with a fresh person (`id: 'p'`, seed 1, minute 90):

   ```ts
   seedBelief(p, 'door:open', { value: true, credence: 0.9, source: 'self' });
   // sources: [{ id: 'self', value: true }]
   const before = p.memory.beliefs[0].logOdds;
   believe(p, 'door:open', false, 0.9, 'speaker', 90);
   // before - logOdds: 0.0919205333749118
   ```

   Omitting `source` gives an empty source list and a log-odds change of `0.37164275134616087`. Naming `source: p.id` reproduces the observation discount. `packages/human/test/belief-seeding.test.ts:122` explicitly seeds `'self'` and expects that discount, so the green suite does not prove this requirement. Reject both reserved IDs before creating or replacing a belief, as `seedSourceTrust` already does. Replace that test's self-seeded comparison with a genuine `confirm` observation and add rejection/no-mutation cases for both reserved IDs. No fix was made in this review.

2. **Note — No behavior difference found in the refactors.** Reviewed `packages/human/src/person.ts:1480`, `packages/human/src/will/will.ts:677` and `packages/human/src/sim/sim.ts:963`, including helper arguments, side-effect order, command/break early returns, selection closure capture, defaults, summation and object construction. Engine remains `2.9.0` (`packages/human/src/types.ts:911`). Conscience still precedes agenda and voice learning; community time advancement still precedes day bookkeeping and death handling.

   Built a `git archive v2.9.0` extraction in a temporary directory with the same compiler/dependencies. Compared `JSON.stringify` output directly, without sorting keys, rounding values or normalizing person fields:

   - Ten example groups matched byte for byte: minimal, suggestions, community, methods, method alternatives, body forecast, 2.8 game requests, 2.9 game requests, all five 60-day prompting arms and all four 30-day review arms. Method controls used seeds 1, 19 and 827.
   - Twenty runs of the unchanged optional-continuation fixture (seeds 1–20) matched on captured full snapshots **before** its engine/ref normalization.
   - Thirty-six three-day village runs matched on events, full person snapshots, community bookkeeping and world state. Seeds 1–12 crossed ordinary advice, repeated commands/release and enabled optional faculties; odd seeds used softmax temperature 0.2, even seeds argmax. Runs included two insisting voices, scarcity, day crossings, chronic-onset and mortality rolls.
   - The two received-consequence domains differed only in their `framework` banner (`2.9.0` → `2.9.1`); removing that output metadata yielded byte-identical results. No person-state normalization was needed.

   These are 66 exact comparison groups plus two version-banner-only groups. They support behavioral equivalence within the exercised cases; they do not exhaust all host adapters. The legacy fixture files, legacy-received test and opt-in continuation fixture have no changes in the reviewed diff. Temporary probes: `/tmp/hf291-differential.mjs` and `/tmp/hf291-received-diff.mjs`.

3. **Note — Other new APIs and host recipes passed the checked cases.** `packages/human/src/restore.ts:45` uses restore-based canonicalization, recursive key sorting and a deterministic 64-bit hash with no crypto/platform imports. The fingerprint tests cover historical saves, key order, meaningful state changes and a 30-day run with optional faculties; both snapshot/restore round trips agree. Special-key source trust (`__proto__`, `constructor`, `toString`, `hasOwnProperty`, empty string) also survived restore and fingerprint comparison. A browser-targeted esbuild bundle passed; no browser runtime was exercised.

   `packages/human/src/sim/sim.ts:415` preflights strict late-death delivery before mutation. The default and explicit tolerant paths match, preserving the existing default. `packages/human/test/host-kit.test.ts:69` tests all five recipes in `docs/host-kit.md`: equal undeclared travel utility, effort independent of duration, the published food/work term values, copied community bookkeeping and explicit provisioning. The text correctly warns that scaling effort also scales physical intensity and that the week-long control is not a survival prediction. Targeted API suites passed 22 tests; host-kit plus belief-seeding passed 16 tests (overlapping runs).

4. **Note — Public compatibility, CI and engineering checks found no additional defect.** Runtime export comparison removed no names and added only `fingerprint`, `seedBelief` and `seedSourceTrust`. The three removed module exports were absent from the package entry. `expit` remains the same function as `sigmoid`; the unused conscience time arguments remain accepted. Deprecation targets remain 3.0.

   `scripts/api-doc.ts:237` checks without calling its write branch. The current reference check passed (684 exports), preserving file bytes and mtime. Isolated stale and missing reference cases each returned 1 without changing/creating the reference. `node scripts/pack-smoke.ts` passed using the tarball installed outside workspace resolution. Changed workflows retain SHA-pinned checkout/setup actions and disabled checkout credential persistence; no new secret disclosure was found. The Vite override installed successfully and `npm ci` reported zero vulnerabilities. Worker telemetry configuration is within the recorded owner exception; this review did not re-audit the telemetry implementation or verify live Cloudflare settings. No new unseeded randomness, game-specific framework branch, spiritual scalar, divine-acceptance computation or invented ruling was found.

Validation: package builds passed for current and v2.9.0 source; packed consumer and API freshness passed. Full `npm run check` passed: 176 test files passed, one skipped; 1,622 tests passed, four skipped. Lint and typecheck passed. Lint emitted 61 existing warnings and one informational notice. No unresolved check failure remains; finding 1 remains unresolved.
