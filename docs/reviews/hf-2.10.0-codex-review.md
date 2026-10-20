# HF 2.10.0 / engine 2.10.0 adversarial review

Verdict: **fix first**.

Reviewed candidate `1f13d178115d709c8d8590f2b2a4ebcf9de243a9` against tag `v2.9.1` (commit `5338a971f8233425ffa753d0340085df31fd804c`) on 2026-10-20. Scope: the requested `git diff v2.9.1 -- packages/human docs CHANGELOG.md`, AGENTS.md, the approved `briefs/design-2.10.md`, the two framework sections and CHANGELOG 2.10.0. Three delegated reviewers covered correctness, restore and control validity. The findings below were independently reproduced against the built candidate. Source is unchanged.

## Findings

### P2 — Report order changes trust inside one attended percept

Locations: `packages/human/src/beliefs/beliefs.ts:386`, `packages/human/src/beliefs/beliefs.ts:387`, `packages/human/src/person.ts:748`.

The approved design requires order-independent contradiction losses. Each call instead reads the reporter's current trust immediately before changing source trust. If the reporter is also a source named in that percept's reports, one report changes the weight of the next report. Reordering the same simultaneous evidence changes the result. This is a numerical difference, not merely record ordering or floating-point noise.

Reproduction, from the candidate root after `npm run build -w packages/human`:

```js
import * as hf from './packages/human/dist/index.js';

const make = () => hf.createPerson({
  id: 'p', name: 'P', seed: 17, now: 10,
  bornAt: -30 * 365 * 1440, sex: 'female', norms: [],
});

for (const reverse of [false, true]) {
  const p = make();
  for (const [source, prop] of [['a', 'qa'], ['b', 'qb']]) {
    hf.seedSourceTrust(p, source, 0.8);
    hf.seedBelief(p, prop, { value: true, credence: 0.9, source });
  }
  const reports = [
    { sourceId: 'a', prop: 'qa', value: false },
    { sourceId: 'b', prop: 'qb', value: false },
  ];
  if (reverse) reports.reverse();
  hf.perceive(p, [{
    at: 10, channel: 'told', actorId: 'a', kind: 'fact',
    salience: 1, summary: 'Both accounts', reports,
  }]);
  console.log(reverse, p.memory.sourceTrust);
}
```

Observed:

| Report order | Trust in a | Trust in b |
|---|---:|---:|
| a, then b | 0.6700961894323342 | 0.7099103060730969 |
| b, then a | 0.6700961894323342 | 0.6700961894323342 |

Both percepts were attended. A can report its own earlier account; the API and design do not exclude this. Two same-minute calls with mutually reporting sources also produce different final trust when reversed. The permutation test at `packages/human/test/contradiction.test.ts:145` keeps reporter trust fixed, so it misses both cases. `docs/framework.md:297` qualifies commutativity with fixed reporter weights, but the approved design and this review's acceptance requirement contain no such restriction. Preserve the promised order behavior, or obtain acceptance for the narrower contract. At minimum, reports within one percept need a common trust basis.

### P2 — Prototype-named source IDs throw; reporter IDs silently suppress a loss

Locations: `packages/human/src/beliefs/beliefs.ts:371`, `packages/human/src/beliefs/beliefs.ts:386`, `packages/human/src/beliefs/beliefs.ts:387`. Root lookup: `packages/human/src/beliefs/beliefs.ts:151`.

The new API calls `trustOf`, which reads inherited object properties when no authored trust entry exists. For `constructor`, `toString` and `__proto__`, that returns a function or object rather than the default numeric trust. An eligible contradiction then throws `human: source trust must be finite`. Through `perceive`, this aborts delivery of an otherwise valid attended report.

Using `hf` and `make` from the reproduction above:

```js
for (const source of ['constructor', 'toString', '__proto__']) {
  const p = make();
  hf.seedBelief(p, 'q', { value: true, credence: 0.9, source });
  try {
    hf.contradicted(p, { sourceId: source, prop: 'q', value: false });
  } catch (error) {
    console.log(source, error.message);
  }
}
```

All three throw the stated error. A normal, unseeded source starts at trust 0.5 and falls to 0.375 on the same direct evidence.

The reporter variant is silent:

```js
for (const reporterId of ['ordinary', 'constructor', '__proto__']) {
  const p = make();
  hf.seedBelief(p, 'q', { value: true, credence: 0.9, source: 's' });
  console.log(reporterId, hf.contradicted(p, {
    sourceId: 's', prop: 'q', value: false, reporterId,
  }));
}
```

`ordinary` lowers source trust from 0.5 to 0.47129504207675965. The prototype-named reporters leave it at 0.5 while returning `applied: true` and recording the pair as already noted. That suppresses a later legitimate report for the retained pair. `trustOf` predates this release; these are new failure paths through `contradicted`. Use an own-property numeric lookup, or consistently reject these IDs at admission. Add source and reporter cases without pre-seeding trust; explicit `seedSourceTrust` currently hides the defect by creating an own property.

## Exact legacy continuation

No legacy divergence was found in the measured cases. Both packages were built independently. Final comparisons used the same `/opt/homebrew/bin/node` v26.12.0. Only person engine stamps `2.9.0` and `2.10.0` were normalized. State fields, decision traces, RNG, key insertion order and arrays were retained. Framework version labels printed by examples were not treated as person state.

**Differential comparison count: 173 matching SHA-256 records:** 92 streamed full-person state digests, 21 complete game-state digests, and 60 direct conversation comparison digests. The first two groups cover **19,135 full-state serializations**. The conversation group additionally compares both complete people and both conversation outputs in every case.

| Coverage | Cases / invocations | Compared state |
|---|---:|---|
| Existing examples and controls | 22 | 19,114 full-person captures, grouped into 92 labelled function-exit digest streams |
| Game replay regressions | 15 | 21 full-game state digests, including six mid-run checkpoints and their actual continuations |
| Direct legacy conversation probes | 60 | 20 seeds × facts, temptation and advice; full speaker/listener state and first/repeated conversation outputs |

The 22 example/control invocations cover all eleven pre-existing example files: minimal, suggestions, community, body forecast in both renamed domains, methods, method alternatives, received consequences in both domains, promptings, review, game requests and game requests 2.9. The state tracer wraps exported composite functions and `snapshot`/`restore` in memory; it does not edit the checked-out source. It hashes full JSON after calls that receive a person. The control functions exercise their own internal arms.

Game coverage: five Colony fixtures (`playtest-colony.json`, v4, v5, v6, v6-early), the Voice playtest fixture, all six `voice-before-scene-speech.json` controls under rules 1 and 2, and Watch scenario 9, 11 and 12 fixtures. Each Voice control was replayed to its saved checkpoint and then continued through the remaining recorded inputs. Game digests use `colonyState`, `voiceState` and the complete returned Watch state, rather than display snapshots or rule-only hashes.

Scratch runners and manifests remain in `~/code/.lab-scratch/hf-2.10/codex-review-tools/`; the baseline checkout is `../codex-baseline291`. Matching manifest SHA-256 values:

- Example traces: `fbd24a75f7866a467bbf5a1e94907917856adaf18907d07b4cb3966c5e519051`.
- Game digest manifest: `dd7e175228d00ddcff0917fff2a20149bf7b3c5f6a2dd05af71ba8c439eb023a`.

These are bounded differential results, not proof over every valid host input.

## Other reviewed requirements

No additional defect was established in first provenance acquisition, preservation through confirmation, relay origin/lineage, repetition suppression, opposite same-source eligibility, per-pair idempotence, fixed-reporter multiplicative losses, the four-report limit, separation of trust stores, witnessed/told regard evidence, absent-cue behavior, deceased-target exclusion or the 0.3 repair-term bound.

Restore checks covered malformed provenance, non-finite and out-of-range times, dropping overlong lineage without truncation, the 32-record bound, JSON round trips and the 2.9.0 → 2.10.0 stamp migration. Keeping the first occurrence of malformed duplicate contradiction records is consistent with live idempotence; it is not reported as a defect. Apart from the prototype-ID paths above, no further restore defect was established.

The changed faculties remain deterministic and plain JSON. Beliefs owns provenance, source trust and contradiction records; impressions owns regard. The composite routes evidence to those owners. The new coefficients are labelled engineering assumptions. No new religious ruling, scalar for the ruh or divine-acceptance computation was found.

## Control assessment and verification

The headless Word and witness example produced all ten domain/arm verdicts. The daily choice is intentionally close, with no promise-linked conscience norm, so the regard ablation isolates the new term. That is a disclosed control premise, not evidence of a calibrated behavioral effect. The tests check attended evidence, expected trust loss, all twenty lived days, disabled arms, domain renaming, repeatability and JSON output.

One measurement limit: the control's no-provenance arm compares A's choices while B/C hold the provenance. Alone, that is a weak independence check. The receiver-level test at `packages/human/test/provenance.test.ts:129` supplies the relevant proof: it compares complete decision records at zero and nonzero temperature, then compares complete receiver state after removing provenance.

Both independently built packages passed the framework suite and selected game replay regressions:

```sh
PATH=/opt/homebrew/bin:$PATH npm test -- packages/human/test \
  apps/site/src/colony/sim/playtest.test.ts \
  apps/site/src/voice/sim/playtest.test.ts \
  apps/site/src/watch/sim/run.test.ts \
  apps/site/src/watch/sim/night-input-replay.test.ts
```

| Checkout | Files passed | Tests passed | Skipped |
|---|---:|---:|---:|
| Candidate | 79 | 866 | 2 |
| v2.9.1 | 75 | 793 | 2 |

The 73 added tests account for the difference; the two skips are the opt-in Colony/Voice fixture-regeneration tests. Both runs used the machine-wide suite lock. The candidate run includes the four focused feature files. The headless example was also run directly. No source fixes, fixture regeneration, push or release occurred.
