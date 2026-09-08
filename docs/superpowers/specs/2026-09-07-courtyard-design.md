# The last water — courtyard game design

This is a new host-owned game, authorized for autonomous design and implementation alongside the other game lanes. It graduates the Water Commons question in the roadmap into explicit ownership and independent consent. It does not claim a better or more complete human model.

## Alternatives considered

1. **A common tank with two contribution counters.** Simple to author, but a player can donate without the other person's consent and everyone still advances one counter. Rejected because it repeats the laboratory's limitation.
2. **A water market with prices and hidden household valuations.** Interesting negotiation, but requires price formation, opaque partner priorities, and more interface explanation. Deferred.
3. **Two household barrels, finite source, short exchanges.** Selected. Water belongs to the person carrying it until a completed transfer. Work, giving, asking, borrowing and returning water cost a turn. A neighbor can independently propose an exchange and reject one.

## Play

Title: **The last water**. Route: `/courtyard/`. Eighteen turns of ten fictional minutes, approximately 4–7 minutes to play. Fill your household barrel with 14 buckets before the tap closes. Meryem has a separate 14-bucket goal. Her starting four carried buckets and your two, plus the cistern, are the complete water supply; no action creates water. The standard cistern contains 28 buckets; scarce and plentiful diagnostic profiles contain 22 and 36. Six-bucket carry capacity and three-bucket pours create batching choices.

Quick collection takes up to three buckets but can spill one; careful collection takes two without spillage. Exertion, fatigue, hunger, recovery and collection practice use the unchanged public human component. A rest is ten minutes; each person has one meal. Every turn advances both people. Player effects settle first; Meryem sees those observable effects before deciding. This explicit first-mover rule is shared by all comparisons.

Offer two buckets as a gift, ask for two as a gift, or ask to borrow two and promise a return within three turns. Meryem accepts/refuses using visible water, remaining household work, remaining turns, and recorded exchanges. An accepted loan is a concrete debt with a deadline; returning it late does not erase its lateness. Meryem may independently offer surplus water or request help. Her proposal can be accepted, refused or ignored for one turn. There is no numerical relationship, moral-worth or divine-approval score: the interface reports gifts, refusals, and on-time/late returns separately from both barrels.

## Boundaries and evidence

All ownership, water conservation, household targets, consent, debt and scheduling live in `src/games/courtyard.js`. Decisions receive a detached public projection with felt body estimates; no seed, exact body state, future outcome draw or private inference. Stateless random keys separate setup and collection, and actor-specific collection attempts separate the two actors' outcome streams. No laboratory, workshop, historical engine, shared human file or public scenario is edited.

Turns are atomic. Active state retains only current objects, people, a bounded exchange summary and the last turn. A separate opt-in session replay records at most 18 actions. Saves strictly validate versions, quantities, ownership conservation, clocks, pending proposals/debts and terminal status. A valid partial run resumes exactly.

Player controllers are authored host policies: self-sufficient (collect/pour/recover, refuses requests), reciprocal (handles exchanges and repays before own work), and generous (gives when asked). The neighbor uses a visible-state rule, compared with the same rule ignoring exchange history. Comparisons preserve scarce-profile failures, spill losses, cases where conversation hurts completion, and exact seed/source identities. These are rule comparisons, not human or theological validation.

## Delivery and verification sequence

1. Failing tests for conservation, consent, independent proposal, borrowing/late return, public information, atomic turn time, versioned save/resume and bounded state; then implement host and policies.
2. Failing replay/benchmark contracts; then source-identified paired comparisons over the three supply profiles. Publish all seed rows and negative cases.
3. Build responsive SVG courtyard UI with separate household barrels, resource count, readable partner speech, visible costs, immediate outcomes, keyboard controls, device/download saves and collapsed hints, researcher view and model notes. Include `/games/` navigation.
4. Run full tests and browser QA at desktop and narrow mobile sizes, including new run, meaningful social exchange, recovery, terminal result and reload/resume. Root performs integration review and owns route/build/deployment changes.

The existing project starts from an Islamic premise, with Sunni Hanafi–Maturidi interpretation requiring qualified review. This game adds no religious mapping. Its ordinary language describes ownership, agreements and consequences without turning either production or compliance into moral worth.
