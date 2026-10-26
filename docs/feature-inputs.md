# Explicit feature-input diagnostics

Call `validateFeatureInputs(kind, input)` before applying a host input batch. It returns issues; the host chooses whether to reject or display them. Validate the entire batch before any mutator if rejection must prevent partial application. No existing API invokes diagnostics automatically. There is no global strict mode.

`person-spec` checks `enable` configuration and the lexicon booleans `plainEnglish`, `variety` and `nounActions`, and the explicit `wording: 'literal-v1'` selector. It accepts the other supported lexicon fields without validating their contents. `observation` checks the sixth `observeSkill` argument. `percept` checks `demonstrates.inheritedAptitude`, accepts supported demonstration siblings, and ignores unrelated percept fields. This is not a full PersonSpec, Percept or host-world validator. Unknown-key checks apply only within these feature objects, using the owning baseline shape. The wording selector is owned by the narration API; diagnostics only inspect it.

Undefined means omitted, including an own undefined property. Configuration must be plain JSON objects with own properties. Null, arrays and class instances are diagnosed. Existing execution still accepts, ignores, clamps or throws on malformed inputs exactly as before when the host calls it. For example, creation's boolean enables use truthiness; observation aptitude applies only for literal `true`. Diagnostics do not coerce either route or reorder an idempotent enable call.

Issues contain a path, a code and a fixed expectation. They never echo input values. Paths can contain host property names; do not treat diagnostics as automatically safe public telemetry. Supported fields have fixed inspection order. Unknown own enumerable keys follow lexical order within the inspected budget. Each feature object visits at most 64 keys; paths are at most 256 code units; response inspection uses the promptings module's response bound. At most 63 ordinary issues are returned. Slot 64 is reserved for an explicit `bound` issue when budget exhaustion makes the list incomplete. Getters and proxies are outside this JSON-data contract.

## Engine-stamp contract (3.2)

A newly supported input that changes simulated results requires a new engine stamp even when explicit opt-in. Changed persisted generated text also requires a new engine stamp. Pure read-only diagnostics do not. Package versions, engine capability stamps and adapter formats are separate contracts. This diagnostics helper changes none of them. The companion changes in HF 3.2 receive engine 3.2.0, including persisted wording.

An engine stamp identifies supported rules; it does not prove which options were used. Hosts must pin the exact package, effective mutable tuning, initial snapshot and ordered input log, including observation flags. Replay envelopes must admit both package and engine before replay. Historical HF 2.22 added observation aptitude while retaining engine 2.21; an older runtime can silently ignore that flag if the host fails admission. This policy does not rewrite that artifact or HF 3.0. A future engine migration must not enable options, recompute old skills, rewrite saved prose or invent an option-use marker. Compare exact state and RNG against the immutable old package; only explicit engine metadata may differ when comparing migrations.

## Observation rates

Direct `observeSkill` and attended, non-self `Percept.demonstrates` use `learningFor(person, domain)`. Without a domain this is the age-dependent `lifeModifiers.learning`; a domain selects the existing domain rate. Literal `inheritedAptitude: true` multiplies that rate by the same inherited skill aptitude factor on either route. Absent, false and malformed non-booleans retain earlier learning. This promises the same aptitude multiplier, not identical observation and direct-practice rates: direct practice can use its own affect-adjusted rate. No new observation state field or RNG draw is introduced. Attention and delivery remain percept prerequisites.

Executable host control: `node packages/human/examples/feature-inputs-control.ts`.
