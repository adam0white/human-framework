# Remembered experience, attention and inference

The private **experienced-person 0.1.0** candidate delivers three rounds of progress: attributed episodic retrieval; paid selective attention and traceable inference; then reusable application integration. It adds optional components over frozen adaptive-person. The user requested these framework rounds before a fresh round of small-game proposals; game implementation is not part of this delivery.

## Round 1: prior experience changes later action

`episodes.js` preserves an actor's host-attested episodes: original occurrence and delivery times, context, source/origin, action/outcome and attributed boolean facts. Queries return a bounded recent set for a context. Duplicate relay copies do not become independent experiences or renew validity. An origin can correct or retract its event; original records remain inspectable. An old relay cannot undo a correction.

The route reference begins with an actual five-minute failed trip. Recording its outcome permits a later context query to select the detour. With no recorded event, a different context or expired validity, the same controller selects the direct route and fails again. Recall returns historical observations; it never inserts them as fresh belief receipts. The host supplies context labels and validity windows. This is a bounded retrieval candidate, not autobiographical memory or an empirically calibrated forgetting curve.

## Round 2: receipt, processing and inference are distinct

`attention.js` separates a delivered message from its processed content. The inbox view exposes identifying metadata and availability, not the proposition/value. The standalone component requires explicit selection and a completed review receipt of sufficient duration. The workspace derives and verifies that receipt against actual Human work; a standalone host must attest the real completion and lock the selected message before work begins. The original observation time and expiry survive processing. Expired, interrupted or failed reading cannot add a belief. Repeated claims cannot buy repeated processing.

`inference.js` evaluates finite authored conjunction rules over the current actor belief view. Each conclusion is true, false, conflicted or unknown. Signed premises require unambiguous matching support; a conflict blocks downstream rules rather than licensing arbitrary conclusions. Acyclic dependencies keep evaluation ordered. Supporting proposition, origin, evidence and rule IDs remain visible, while derived conclusions stay separate from original evidence. Recomputing after expiry, correction or retraction removes unsupported conclusions.

In the reference, reading both a gate report and a permit report supports a direct-route conclusion. One unread premise, expired support or contradictory reports sends the controller to the detour. When the gate closes, processing the correction changes the route and preserves delivery; ignoring it can produce a paid failed trip. The inferred permission never overrides the host's gate and permit state. Reading duration, rule content and controller priorities are authored conventions, not measured attention or general reasoning.

## Round 3: one lifecycle across different applications

`workspace.js` is an optional adapter pairing these components with an existing adaptive actor. Its operation names describe the boundary rather than creating a replacement body model:

| Operation | Responsibility |
|---|---|
| `createExperienceWorkspace` | Bind actor, episode store, attention inbox and inference configuration to one identity and clock |
| `deliverExperienceMessage` | Accept a host-delivered message into the inbox; do not create a belief |
| `receiveExperienceEpisode` / `retractExperienceEpisode` | Record host-attested historical experience or an attributed retraction |
| `beginExperienceAttempt` | Begin existing Human work; optionally lock one available attention message as the selected target |
| `advanceExperienceAttempt` | Advance the existing actor and synchronize the workspace clocks |
| `finishExperienceAttempt` | Settle paid work and, for completed unexpired selected reading, atomically deliver its original evidence |
| `advanceExperience` / `advanceExperienceCalendar` | Advance observed time or an explicitly unmodeled calendar interval using the existing owners |
| `updateExperienceActor` / `reviseExperiencePurpose` | Delegate existing component commands and voluntary purpose revision |
| `getExperienceView` | Return an actor-private view with separate memory, inbox metadata, beliefs and derived conclusions |
| `exportExperienceWorkspace` / `restoreExperienceWorkspace` | Save and validate the complete workspace, including a pending selected attempt |

The adapter derives payment from the actual attempt, not caller-supplied elapsed time. Selection is bound before work starts; a later message cannot consume an older review. Invalid corrections are checked before starting paid reading. Reading that expires midway still completes with its actual paid time and no belief update. Pending work survives JSON save/resume. Processed messages must match both the actual completed attempt receipt and every projected belief field. Unread message IDs are reserved against direct belief injection.

All commands return detached data; rejected commands leave the supplied state unchanged. The existing actor remains the only body/time owner. Original beliefs own evidence and its corrections; inference only projects. Hosts own canonical resources, opportunities and results. A host must not turn private snapshots or developer validation errors into an actor's observation: correction preflight can inspect unread content for protocol validity, and snapshots intentionally contain full host-held component state.

## Cross-application reuse and verification

The package contains an exact **26-source allowlist**, no runtime dependencies and explicit exports. A consumer can import `/episodes`, `/attention` or `/inference` alone, or use the root workspace with `/adaptive` and the earlier component exports. No example, browser code or research document is needed at runtime. Every earlier candidate, Human/runtime release lock and public asset remains unchanged.

The separately authored facility-maintenance consumer installs the tarball offline and runs with repository reads denied. Its own IDs, rules and actions use experience to choose a visit method, paid dispatch reading to derive authorization, and canonical facility state to settle actual tickets. A hidden-closure control produces a failed paid visit and zero completed tickets despite the actor's positive inference. Mid-action restoration and no-message, expired and conflicting-message controls pass. This is a second authored application, not an independent human developer study.

[Comparison evidence](../artifacts/experienced-person/comparison.json) records eleven cases, each run as candidate, direct controller and restored execution. The simpler direct controllers match these authored cases. Both policy arms carry candidate execution state; they are not full component-absent ablations or authoring-cost measurements. Host checkpoints include world, inbox/history and trace as applicable, but the surrounding scenario program remains supplied by the host. [Verification](../artifacts/experienced-person/verification.json) records **1,102 passing tests** (38 added), exact source hashes and preserved public identity. [Review disposition](reviews/2026-09-15-experienced-person.md) records the fixes.

Histories and support expansion are finite with explicit rejection on exhaustion. Episodes and messages allow at most 128 records; inference allows at most 32 rules, 64 propositions, eight premises per rule and 256 support paths per conclusion. Existing actor history limits still apply. This is suitable for bounded applications and experiments, with no unbounded-scale claim. Snapshots are structurally checked, not cryptographically authenticated histories.

## What this makes ready

The delivered components can now support a small experiment about remembering, choosing what to read, reasoning from available evidence and acting under real constraints. [The subsequent game-idea round](game-ideas-2026-09-15.md) uses that tested scope. No game is built or deployed by this milestone.

The complete human framework remains unfinished. General attention/perception, probabilistic inference, spontaneous purposes, broad emotion, biological aging, childhood/family development, positive worship and moral/spiritual practice, qualified interpretive evaluation, empirical validity and observed developer usefulness remain open. These bounded mechanisms do not replace that work.

## Reproduce

```sh
node --test tests/experience-*.test.js tests/experienced-*.test.js
node scripts/run-experienced-person.js /tmp/experienced-review
node scripts/package-experienced-person.js /tmp/experienced-package
npm test
```

The package declares Node >=22. Verification records the runtime actually tested. [Integration guide](experienced-person-integration.md) gives the application contract.
