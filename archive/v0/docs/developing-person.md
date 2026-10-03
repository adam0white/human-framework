# Relationships, duty and adult course, followed by appraisal

The user requested substantial autonomous framework progress across the remaining gaps before any further game. This private candidate adds relationships, positive understood duty and repair, and a sparse adult role trajectory, followed by a separate appraisal and voluntary regulation increment and a unified person lifecycle for actual reuse. Each is an authored software candidate; none establishes a complete or validated human model.

## Relationships beyond agreements

`src/social/relationships.js` carries an actor's authored continuing care ties and contextual expectations from delivered support/failure/repair events. A care tie can motivate costly aid without a promise. An unresolved observed failure leaves its context guarded; unrelated successes do not erase it. Actual repair only reopens the context after the recipient's own acknowledgment. The same outward restitution permits acceptance, deferral or refusal.

The actor owns this received record. The host owns actual outcomes and message delivery. `originId` identifies a semantic directed event, not an actor; `sourceId` names the reporting actor. `outcomeId` identifies one directed partner/context proposition. Repair links use the retained local event ID, which hosts must resolve after deduplicating a relay. Forwarded copies do not create new evidence. Acknowledgment must be recorded directly by the recipient owner; forwarding an acknowledgment is outside this interface. These are contextual expectations, not measured trust, attachment or inferred intent.

## Positive duty and repair

`src/meaning/duties.js` distinguishes a source locator and translation attribution, an explicitly unreviewed case interpretation, the actor's accepted/uncertain/rejected application, private stated intention, delivered restitution receipts and communicated recipient responses. The [source memo](../research/duty-repair-sources.md) identifies the textual anchors and engineering choices. Qur'an 4:58 is the source anchor for the authored entrusted-item example; the runtime does not issue a fiqh ruling.

An accepted understood case can motivate returning property despite money/time cost. Uncertain or rejected application does not activate that host policy. Arbitrary prose is never parsed as understanding. The host supplies the learner's perspective and application stance with a delivered notice; the named notice source does not authenticate the learner's inward state. Partial/failed restitution stays incomplete, intention produces no property, recipient response cannot force physical completion, and an original breached commitment remains breached after repair. Public views disclose only explicitly addressed records. A source entry or a review-status label cannot itself establish qualified scholarly review.

## Adult development through roles and opportunities

`src/lifecourse/adult.js` separates descriptive adult age, role receipts, assessed qualifications and candidate opportunity access. Paid assessment plus a role enables mentoring; later role exit removes that opportunity without erasing competence. Age alone grants no skill or credential and imposes no decline. Actual offers and institutional authority remain host-owned.

The reference follows days 0, 365 and 730. The 730 intervening calendar days are explicitly **unmodeled**. All sustained-person minutes count modeled episodes only; no sleep, work or physiology is inferred across calendar gaps. Person state remains persistent, including paid skill. Each adult task begins with an explicit paid recovery interval. The body values support the local episode exercise and are not estimates of bodily state after a year. This is a sparse adult role/competence trajectory, not biological aging, continuous two-year life, childhood or a validated developmental curve.

## Appraisal and voluntarily selected regulation

`src/affect/appraisal.js` consumes synchronized actor-bound belief and purpose views. A relevant unresolved proposition can create a time-bounded checking tendency; an actual voluntarily chosen reflection attempt can change that tendency toward deliberate consideration. The record changes neither belief truth, bodily condition, purpose status nor the selected action. The reference exercises the suggestion, while a supplied risky choice can override it and fail after paying actual time.

Concern signatures use semantic status and origin support, not relay count or receipt IDs. Identical repeated evidence cannot renew an expired concern. A genuine semantic transition can begin a new uncertainty episode. Lifetime, minimum reflection duration and suggested actions are authored conventions, not measured emotions or a theory of mental health. Missing information and conflicting reports can both suggest checking; a resolved delivered report removes the checking step under identical world physics. A direct concern/timer rule matches the authored cases.

The actual check yields the traveler's own observation. It does not impersonate a correction by another source; unresolved disagreement can persist. Installed reuse checks five paid minutes of reflection, changed tendency, unchanged belief/world and exact continuation after restoration.

## Unified person lifecycle

The `createDevelopingPerson` composite owns one actor identity and synchronizes observed time across sustained person, beliefs, relationships, duties and appraisal. Its adult calendar remains explicitly separate. `beginDevelopingAttempt`, `advanceDevelopingAttempt` and `finishDevelopingAttempt` keep the existing sustained-person component as the sole body/action owner. `advanceDevelopingPerson` handles modeled daily intervals; `advanceDevelopingCalendar` only records the separately declared calendar interval.

The explicit `updateDevelopingComponent` dispatcher delivers evidence, relationship events, duty notices, intentions, repair outcomes, appraisal, care changes, qualifications and roles. Appraisal and qualification use internal synchronized views. Regulation takes only the actor's context, receipt ID and selected choice; the composite derives payment from the actual last completed Human attempt. Failed, interrupted, unrelated or stale attempts cannot supply that payment. Hosts still attest external outcomes and recipient decisions.

All state-changing commands are rejected during a pending attempt; a host must deliver queued observations after completion at their actual delivery time in this bounded protocol. This does not implement conversation or belief updates in the middle of a task. Export/restore validates each component and its identity/time agreement. Saved provenance remains host-trusted data: structural checks cannot authenticate a coherently rewritten action record. In live execution, payment metadata is derived from the actual pending attempt rather than accepted as a command argument. Calendar advancement clears the last-attempt receipt so an earlier episode cannot supply a fresh regulation payment. The reference appraisal host and independent consumer now use this lifecycle, removing their separate synchronization and paid-receipt construction. This is a concrete integration reduction, not measured human developer productivity.

## Composition and controls

The reference sequence traces delivered failure -> guarded coordination; accepted duty -> paid return -> actual restitution -> independently supplied recipient acknowledgment; care -> aid without contract; and assessed qualification/role -> later task availability. A separate installed shared-tool consumer uses the same exports with repository access denied. Every actual task pays Human time and body/practice costs; social and duty events cannot manufacture world effects.

A direct notebook policy receives the same delivered events, care designation and role/qualification receipts. It matches the reference interventions. It runs beside candidate state for behavioral comparison, so this is not a measurement of independent architecture cost or human authoring effort. Preserve parity rather than treating a larger record model as superior cognition.

[Verification](../artifacts/developing-person/verification.json) records **1,027 passing tests**, including 61 new checks, and exact hashes for the 16 selected package sources. [Eighteen developing-person runs](../artifacts/developing-person/comparison.json) and [twelve appraisal runs](../artifacts/developing-person/appraisal.json) preserve direct-rule parity. The [installed consumer](../artifacts/developing-person/consumer.json) verifies whole-composite restoration and synchronized clocks. [Review disposition](reviews/2026-09-15-developing-person.md) records fixes and remaining limits. The public app remains on its separately verified app 0.15 identity.

## Interfaces and limits

The new `developing-person` private 0.1.0 package uses an exact source allowlist. Its root exports the new candidate modules; `/cognition`, `/sustained`, `/situated`, `/human`, `/learning` and `/commitments` select unchanged components. No public asset or inference service is added. Composite `getDevelopingView` is an actor-private view; it must not be treated as a public observer view. Use explicit disclosure views for other actors.

- Relationships: `createRelationships`, `advanceRelationships`, `setCareTie`, `receiveRelationshipEvent`, `getRelationshipView`, `exportRelationships`, `restoreRelationships`. At most 256 relationship events; exhaustion is explicit rejection, not silent loss. New receipts arrive at current actor time; old occurrence times remain distinct.
- Duties: `createDuties`, `advanceDuties`, `receiveDutyNotice`, `recordStatedIntention`, `receiveRepairOutcome`, `getDutyView`, `getDutyPublicView`, `exportDuties`, `restoreDuties`. At most 16 cases, 8 requirements each and 128 total events. Outcome `at` is delivery time; canonical event occurrence belongs to the host. Summed amounts use authored integer units and cannot exceed case requirements.
- Appraisal: `createAppraisal`, `advanceAppraisal`, `appraiseBeliefs`, `getAppraisalChoiceView`, `recordPaidRegulation`, `exportAppraisal`, `restoreAppraisal`. At most 16 contexts and 128 paid regulation receipts. Concern/reflection durations are configured in modeled minutes, at most 1,440. Regulation uses the actual Human attempt ID and paid interval, with owner binding and deduplication; the host attests completion.
- Adult course: `createAdultCourse`, `advanceAdultCourse`, `recordQualification`, `transitionAdultRole`, `availableAdultOpportunities`, `getAdultCourseView`, `exportAdultCourse`, `restoreAdultCourse`. Adult start age 18–120, maximum 730 calendar days, 128 intervals and 256 receipts. Every interval is explicitly observed or unmodeled. Receipt delivery and actor skill views bind to the owner; a host still attests source identity and assessment truth.

Split and whole action advancement preserve nonnumeric state exactly and body values within 1e-12, carrying the frozen Human floating-point behavior. Identical command/save-resume paths remain exactly reproducible.

## Remaining work

These additions close bounded executable gaps; general relationships, emotion, habits, changing life purposes, biological aging, childhood, institutions and empirically supported general human prediction remain open. Qualified interpretive review and observed developer usefulness also remain unestablished. The next game remains deferred. [Roadmap](roadmap.md) remains the complete work inventory.

## Reproduce

Use Node >=22 with `/opt/homebrew/bin` first on this machine.

```sh
node --test tests/developing-person.test.js tests/affect-appraisal.test.js tests/developing-appraisal.test.js tests/social-relationships.test.js tests/meaning-duties.test.js tests/lifecourse-adult.test.js tests/developing-sequence.test.js tests/developing-consumer.test.js
node scripts/run-developing-person.js /tmp/developing-review
node scripts/package-developing-person.js /tmp/developing-package
npm test
```
