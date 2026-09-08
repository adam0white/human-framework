# Shared Promise: direct clinic plan contract

2026-09-08. Design/API freeze before new-host outcomes. New file `src/games/service-plan.js`; host `SERVICE_PLAN_VERSION = '0.1.0'`, save `human-service-plan` version 1. The existing `src/games/service.js`, `/service/`, its saves, Human/runtime 0.1.1, model, integer clock and release lock stay byte-identical. No ledger, planner, social package or actor reset is introduced. The host may copy the old physical service loop so the new policy never requires old-source hooks.

## Public API

All commands are immutable functions returning a new validated state. Refusals return `lastResponse` rather than pretending to change jobs. Malformed commands/saves and invalid receipts throw with `error.code`. Exports:

- `SERVICE_PLAN_VERSION`, `SERVICE_SCENARIOS`, `SERVICE_TASKS` (ordinary physical tasks, unchanged durations/costs).
- `createServicePlan({scenario:'standard'} = {})`, `getServicePlanView(state)`, `exportServicePlan(state)`, `restoreServicePlan(save)`.
- `requestTask(state, actor, task)`, `interruptTask(state, actor)`, `advanceTo(state, integerMinute)`, `nextVisibleEvent(state)`, `receiveReceipt(state, exactWorkEnvelope)`.
- `proposePlan(state, terms)`: invite both idle people to discuss exact initial/revised terms. Keeper submission consents to participate. Deniz independently decides whether to listen; listening is not consent to the terms.
- `interruptDiscussion(state, actor = 'keeper')`: either participant may stop their own participation. Both discussion attempts stop; only actually paid active minutes remain. Previous terms remain binding until their own deadline.
- `withdrawContribution(state)`: keeper retracts their promised readiness contribution. Stops neither person's job, releases no resource or clinic slot, erases no clinic obligation. The active hold ends; Deniz resumes independent feasible clinic choices. An existing pending discussion is interrupted, retaining its paid time. No bilateral permission is required to stop promising one's own work.
- `receivePlanResponse(state, envelope)`: defensive boundary matching the one current discussion receipt. Early, stale, duplicate and forged responses throw; this cannot bypass two paid attempts or inject an external accept decision.

Exact terms: `{pumpStartAt, readyBy, waitUntil, fallback}`. All times are integer day minutes; `fallback` is `'cart'` or `'none'`. Fixed named contribution is readiness of both pump sections plus inlet supply. `pumpStartAt` promises the keeper will rest after discussion until that minute, then do all remaining pump work; player commands still execute it. `readyBy <= waitUntil <= 57`, `pumpStartAt >= discussion end`, and schedule duration must fit readiness. Short terms use `waitUntil <= 45, fallback:'cart'`. Risk-bearing terms use `waitUntil > 45, fallback:'none'`; the UI must say that one-unit fallback is lost. Terms reserve no parts and compel no future action.

## Direct state and public view

The old public view fields (people/jobs/choices/resources/work/supply/morning/delivery/paid/paidByActor/partnerIntent/recent/lastResponse/outcome/remainingCommands) remain available with the new title and version. Additional view field `coordination` has:

- `current`: latest accepted record or null, with `id`, `revisionOf`, `createdAt`, `respondedAt`, fixed `proposer:'keeper'`, `recipient:'partner'`, `terms`, `status` (`active`, `delivering`, `fulfilled`, `expired`, `withdrawn`), `contribution` (`status`, `fulfilledAt`), `actualReadyAt`, `closedAt`, `closeReason`.
- `pending`: invitation-consented discussion or null, with `id`, `revisionOf`, `createdAt`, `endsAt`, `terms`, `receipt` (exact ID/end/participants), and `invitationAccepted:true`. Terms are immutable. No term acceptance exists until two paid discussion minutes per actor finish.
- `lastResponse`: most recent plan-specific response `{at, id, stage, accepted, code, reason}`; `stage` is invitation, terms, interruption or withdrawal. Invitation rejection creates no proposal identity. A response about rejected newer terms cannot rewrite `current`.
- `readiness`: `{ready, pumpWork, pumpRequired:12, supplyAvailable, keeperOwnedParts, keeperReservedParts}`. It reports physical facts separately from the promise.
- `slot`: null or `{actor, route, departedAt, arrivedAt, status}`. A departure commits the day's single clinic receiving slot. Interruption may abandon it; it cannot be reclaimed by a new agreement or request.
- `discussionAvailable`, `discussionReason`, `canWithdraw`, `canInterrupt`, `safeWaitUntil:45`, `latestFullStart:57`, `discussionMinutes:2`, and `acceptanceRule` readable authored-policy text.

`jobs` reports task `discuss` during conversation; it is absent from task choices. `paid.discuss` and each `paidByActor[actor].discuss` account for active exposure. No rest/meal recovery or practice is credited. `remainingCommands` reserves stop/interruption/withdrawal and closing room. Monotonic proposal identities, one accepted record and one pending revision bound state; old chronology survives only in bounded recent messages and replay commands.

## Consent and deadlines

Invitation requires both people idle, clinic work open, no claimed receiving slot, no pending conversation, and enough time to finish discussion before clinic closure and without newly consuming the final safe cart window. An already accepted risky hold permits later discussion within its existing risk window. Busy Deniz refuses; invitation never stops an unwilling actor. Invalid/incompatible schedule terms are evaluated only after listening, so refusal can cost both people two active minutes.

Term acceptance uses only directly visible physical facts and rounded public body estimates. It requires ready inlet supply, one or fewer unfinished pump sections, keeper ownership of the necessary part, and declared rest/pump timing that forecasts readiness by the promise and full delivery before 64. The recovery forecast is advisory, uses the same documented model rates and assumes the declared rest is actually performed; actual execution always assesses the carried authoritative body. Deniz also checks forecast delivery capacity after active waiting. These authored thresholds are exposed; neither acceptance nor a forecast guarantees execution.

An accepted initial/revised record takes effect at its response minute. A revision must still name the same active predecessor; old terms remain active while pending, declined, interrupted or stale. At or after the predecessor's `waitUntil`, a late revision cannot revive it. The old plan can trigger delivery or fallback and interrupt an unfinished discussion when its boundary arrives. Acceptance supersedes only the single old record, by recording `revisionOf`; it does not discard paid work.

Each elapsed minute: install paid physical work; process morning/closing events; settle completed work receipts; settle completed discussion only if its predecessor still precedes its deadline; record actual readiness, contribution miss and hold expiry; then each actor chooses. Readiness at 45 permits full delivery before cart fallback. Closure at 64 defeats all tied arrivals or discussions. A held partner may choose paid recovery when necessary only if the recovery can finish within the hold; accepted terms do not compel stopping existing owned work. Ordinary active waiting has no recovery benefit.

Readiness by `readyBy` fulfills the named contribution as a physical fact, with timestamp; full clinic service is separately recorded only on actual arrival. Missing `readyBy` marks contribution missed but does not erase a longer accepted wait. At `waitUntil`, if ready and actual full-delivery capacity permits, Deniz departs for two units; otherwise a feasible promised cart departs by 45 or the hold expires without a late cart. Independent clinic commitment continues after expiry/withdrawal; if readiness later arrives in a feasible full-delivery window Deniz can still act. No late cart is granted when an 18-minute trip cannot arrive before 64.

## Evidence and constraints

Meaningful lifecycle tests precede implementation: paid listening versus terms, busy invitation, refusal/interrupt retaining old plan, exact expiry/closing ties, stale/duplicate responses, owned parts, permanent slot commitment, actual readiness versus arrival, missed/withdrawn work, advisory-capacity refusal, immutable inputs, capped journals and exact save continuation. Run current Node26 and minimum Node22.

Execute legal paid prefixes for a full-service short hold, short-hold fallback, useful revision and risky later wait. Preserve failed-promise/communication-overhead routes, the frozen original service host and the existing timed-request control at 59 with 12 paid Deniz rest minutes. Do not edit stored evidence; fresh artifacts belong in `artifacts/service-plan-core/`. The comparison lane freezes its own policies/cases and keeps differing action sets separate. Synthetic routes prove authored mechanics and conservation only; no human validation, general-planning necessity or portable abstraction follows.
