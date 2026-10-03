# Independently authored maintenance/watch consumer

This is a headless lifecycle example, not another delivered public game. It was authored on a separate branch from main commit 9bd93c6 using the installed human-framework-runtime package. The author had previously reviewed the runtime; this is independent authorship, not blind onboarding. No human/core/runtime implementation source was inspected to author this consumer, and no existing game logic was copied.

## Design and predeclared checks

A single authored water arrival occurs at minute 18. A keeper may repair a gate for 12 paid minutes while another person performs an 8-minute lookout. Two parts are reserved once, consumed as work proceeds, and only unused reserved parts return on interruption. Already completed repair progress remains real; incomplete lookout does not manufacture a warning. Requests can be refused because the recipient is busy, absent, unwilling to do that role, or unable to sustain the full interval. These are explicit host rules, without a trust model or threat cognition.

The solo variant has one actual person. Every person has an idle or working attempt so moving world time always advances their maintenance through the public component. Event and minute drivers must preserve integer world facts exactly; person floating-point values use a predeclared absolute tolerance of 1e-10. A JSON save resumed under the same subsequent driver must match exactly. Active state retains only two current jobs, a single approaching event until it settles, one last outcome receipt, one response and 12 recent messages.

Before measurement, the desktop CPU budget was set at p95 no greater than 8 ms separately for 1,000 normal two-person event boundaries and 1,000 requests, after 100 warmups per workload. Packaging, installation and rendering are excluded. Hardware, actual Node executable, sample counts and maximum serialized state are recorded with the measurements. This is not a general runtime or physical-mobile performance claim.

## Build and use

From the repository root:

~~~sh
npm run package:runtime
cp runtime-dist/human-framework-runtime-0.1.1.tgz examples/maintenance-watch/runtime.tgz
npm --prefix examples/maintenance-watch install --offline --ignore-scripts --no-audit --no-fund
npm --prefix examples/maintenance-watch test
npm --prefix examples/maintenance-watch start
npm --prefix examples/maintenance-watch run measure
~~~

The example's JavaScript imports only human-framework-runtime, its own local files and Node standard modules. Its package.json already refers to the copied runtime.tgz, so no code or import substitution is needed. The repository integration test packs a fresh artifact, copies these unchanged example files to a new external consumer, installs offline, runs all host tests under Node filesystem restrictions, and explicitly checks repository reads are denied.

## Integration boundary and authoring record

The original packed artifact was built before host implementation: SHA-256 c6cdfe06a8ce4345c96c13c69be86f748c4d148c817343a8aceea4073c808750. A public-API probe found a fatigue difference of about 1.11e-16 between a single 12-minute advance and twelve one-minute advances. The declared 1e-10 tolerance was retained; the host does not keep a second person baseline just to force bitwise equality.

The original README named the lifecycle functions but did not fully specify action defaults, all completion statuses, meal/interval rules, or the person/snapshot fields. A public probe confirmed that an interrupted five-minute attempt settles, while completed/failed results reject an unpaid full interval. These were public API experiments, not implementation reads.

One clarification from the integrator was needed: the exported snapshot's person.pending.action is supported versioned wire data for read-only host reconciliation. The perceived view intentionally omits effort, exertion and practice skill. The first host validator, using only that view plus component restore, accepted a component-valid save with a lower repair effort than the host promised. A failing regression demonstrated it; comparing the full read-only action contract now rejects it. The integrator's subsequent documentation expansion is new assistance during authorship, not documentation that was present at the start.

The host owns task durations, role refusals, job/event correspondence, resource accounting, partial repair progress, the arrival outcome, save reconciliation and bounded messages. It duplicates no body, capacity or practice formula. The only shared mechanics are package calls. Idle attempts and job/event bookkeeping are integration code a host must currently supply; no cancellation coordinator or structured error taxonomy is provided by the runtime. The example gives its own errors stable codes and never parses a runtime error message to decide a world effect.

The arrival notification was scheduled first. At an exact tie it precedes an attempt's completion receipt: paid repair progress already exists at that time, while a lookout finishing exactly at arrival supplies no advance warning. This ordering is an explicit host convention. Saves validate current component and host consistency; they do not authenticate historical work against a malicious author of an entirely rewritten, internally consistent save.

Evidence files in artifacts/maintenance-integration record executable tests, package/source hashes, demonstration states and the declared CPU checks. Human usefulness, another programmer's unaided onboarding and physical-mobile latency remain open.

## Completed checks and review corrections

The final original-runtime consumer passes 15 checks inside the installed, repository-denied consumer on both actual Node 26.8.1 and official Node 22.0.0. This is 14 host checks plus the package/source isolation check. The existing repository suite passes 230 tests on explicit Node 26.8.1. Consumer imports were rewritten zero times; runtime, live-game and package-version source changes were zero. The host has 241 lines, with 203 lines of host tests and a 77-line installation harness. These counts include formatting and comments; they describe actual authoring surface, not measured developer minutes.

An independent peer found two current-state contradictions beyond the documented inability to authenticate history: a component-valid blocked attempt was accepted as an executable repair, and a warning timestamp later than the current clock could suppress a present request. Both were reproduced with failing regressions, then fixed by requiring the pending capacity to allow execution and bounding warning time by the current clock. Self-review also found that a second completed lookout overwrote the first warning time; its regression now preserves the first observation. A reduced-effort import had already been caught after the snapshot-schema clarification. These fixes changed host validation and a host observation rule, not the human component.

| Final workload on Apple M4, 10 logical CPUs, 16 GiB RAM | Node 26.8.1 p95 | Node 22.0.0 p95 | Declared budget |
|---|---:|---:|---:|
| Two-person event boundary | 0.146 ms | 0.153 ms | 8 ms |
| Request, including acceptance and refusal | 0.102 ms | 0.110 ms | 8 ms |

Each row uses 1,000 samples after 100 warmups. The largest measured serialized state was 2,822 UTF-8 bytes, including continuation to minute 100,000 with two pending idle events and seven recent messages. The separate long-session test adds 1,000 further requests and checks the state remains bounded. No optimization was performed between declaring the budget and these measurements. Initial measurements and their precise scope are retained separately; before/after differences are not evidence of a speed improvement.

The first shell-resolved executable was Node 23.7.0, despite an earlier session using the Homebrew executable. The initial measurement retains that actual identity. Final verification selected the Homebrew Node 26.8.1 and official Node 22.0.0 binaries explicitly. The harness also had to remove inherited NODE_TEST_CONTEXT so its child Node test runner emitted readable output instead of the parent's private binary reporting protocol; this was a harness issue, not runtime behavior.

Additional installed-public-API probes verified two existing human 0.1.0 limits. Reordering the pending capacity object's keys can reject otherwise identical data; ascending sorting happened to preserve this version's existing order, so the reproducer reverses it. At an accumulated origin of 100,000,000 minutes, two 0.1-minute advances can return a state its own exporter rejects for elapsed-time inconsistency. The consumer uses integer minutes at or below 1,000,000 and preserves component snapshot order. The original package bytes and these negative probes remain recorded while any compatible runtime patch is evaluated separately.

The original authoring and measurement artifacts retain runtime/Human 0.1.0. The current build commands install 0.1.1; integrated patch checks are recorded separately in the evidence milestone. The example code requires no import or host-rule changes for that package update.
