**Verdict.** The portable runtime document describes the supplied code accurately. Every code example traces correctly on source inspection, and the purity, validation, export-map and no-Node-imports claims hold. The real problems are omissions that would stop an independent host at its first save or first concurrent job. Nothing in this review is executed evidence. The `tests/` directory is absent, so every test claim in the document is unverified here.

Claims I confirmed against source:

- **Main example** at docs/portable-runtime.md:137-160 runs as written: capacity allowed, clock stops at minute 10, advance by 10, receipt matches the pending ID.
- **Clock purity** holds. Every function that accepts a clock goes through `detach` at src/runtime/clock.js:87, which validates then JSON round-trips.
- **Data rules** at line 130 match `jsonText` case by case, including explicit undefined and negative zero.
- **No Node imports** in the four runtime modules, as line 26 states. `structuredClone` is a platform global.
- **Packer** allowlist, exports map, version-literal check and no-publish claim match lines 16 and 24 against scripts/package-runtime.js:27-63.

## Concrete defects

**Key-order-sensitive restore.** `restorePerson` checks the pending capacity baseline by `JSON.stringify` equality at src/human/index.js:71. The document at docs/portable-runtime.md:107 lists "capacity baseline" as validated and tells hosts to save JSON snapshots. Any store that canonicalizes key order, such as PostgreSQL jsonb or a sorted-keys serializer, reorders the six capacity fields. Every person with a pending attempt then fails restore with "Inconsistent pending capacity". The document should state that snapshots must be stored byte-faithfully, or the check should compare fields.

**Multi-person advance throws.** The example at docs/portable-runtime.md:154 advances a person by the clock delta. That works only because the due event sits exactly at the attempt's end. The multi-person paragraph at line 162 repeats "actual elapsed interval" without saying the delta must be capped per person. `advanceAttempt` throws at src/human/index.js:119 when the delta exceeds the remaining duration and at line 116 when the person is idle. An author copying the example gets exceptions as soon as two people have different end times. The unstated obligation is to schedule a due event at every attempt end and never advance a person past it.

**Fractional minutes conflict with the time ceiling.** Line 36 accepts fractional minutes and line 107 says accumulated-time limits fail explicitly. The ceiling is 1e12 minutes at src/human/index.js:57. But every call revalidates that minutes equal start plus elapsed within 1e-8 at line 69, while minutes accumulate by repeated addition at line 130. Hand check at the ceiling with two 0.45-minute advances:

| Quantity | Value |
|---|---|
| Accumulated minutes after two adds | 1e12 + 0.89990234375 |
| Start plus elapsed | 1e12 + 0.9000244140625 |
| Tolerance | 1e-8 |

The next API call throws "Inconsistent elapsed person time" on state the component produced itself, with no recovery path. The realistic onset, likely millions of accumulated minutes with fine steps, needs execution to pin down. The document should bound fractional use, or the tolerance should scale.

**ESM-only is undocumented.** The generated package sets `type: module` with no CommonJS entry at scripts/package-runtime.js:38-41. The install section at docs/portable-runtime.md:24 never says so. A CommonJS host on Node releases before 22.12 cannot load it without a flag, yet line 9 promises Node 22.

## Omissions and open questions

- **Unnamed exports.** `CLOCK_LIMITS`, `CLOCK_VERSION` and `RUNTIME_VERSION` are exported but never named. The limits object at src/runtime/clock.js:3 is the only programmatic way to read the caps described at line 132.
- **Person shape.** The document references `person.body`, `person.pending.id` and `person.pending.capacity.allowed` but never lists the person's fields. Hosts will end up reading undocumented ones such as `pending.action`.
- **Idle costs fatigue.** Line 71 suggests modeling idle as an active nonexertive attempt. That accrues maintenance fatigue at src/human/index.js:121. There is no fatigue-neutral idle.
- **Combined clock budget.** 1,024 events times 16,384 characters exceeds the 1,048,576 snapshot cap. A full queue leaves about 1,000 characters per event, which line 132 does not spell out.
- **Unverifiable claims.** The `package:runtime` script, the permission-flag detection at line 9, and the test results at lines 26, 28 and 166 depend on files outside the snapshot.
- **Platform.** The packer spawns `npm` without a shell at scripts/package-runtime.js:58, which fails on Windows. Only a Node version is stated.

## Strongest counterargument

The document is deliberately scoped as a small kit that leaves integration to the host, and it says so repeatedly. The restore defect needs a canonicalizing store. The drift defect needs very long sessions with fine steps. The multi-person trap is arguably covered by "no greater than its remaining duration" at line 71. On that reading the document is correct and merely terse, and a favorable conclusion is defensible. I still rate the first two defects as blocking for the independent consumer lane in the evidence-lanes plan, because both surface at the first save/resume and the first concurrent job.
