# Three parallel small games: app 0.4

2026-09-07. Delivered and verified at [human.adamwhite.work/games/](https://human.adamwhite.work/games/). Laboratory engine 0.3.0, human component 0.1.0 and the original workshop runtime/save version remain unchanged.

## Delivered scope

The previous workshop established one object-world integration. This milestone gives three separate GPT-6 Astra agents at ultra reasoning effort complete game lanes on isolated branches. Each owns its design, host rules, interface, tests, benchmark and integration record. Root owns public routing, the game chooser, common packaging, cross-review and release. Authorship is parallel; these are not three independent human playtests.

| Game | Branch / initial lane commit | Material choices | Record |
|---|---|---|---|
| Pump Yard | `codex/pump-shift` / `f06d68f` | Three related repairs; job order; one shared spare; a full shift; recovery and practice; verified service and partial scores | [Pump Yard](shift-game.md) |
| Courier Round | `codex/courier-route` / `17ac5ce` | Six individual parcels, three bag slots, seven places, reliable and uncertain routes, distinct due times and late deliveries | [Courier Round](courier-game.md) |
| The last water | `codex/water-courtyard` / `6e9848d` | Two household goals, carried water and storage, a shared finite supply, gifts and loans with independent responses | [Courtyard](courtyard-game.md) |

The game chooser is `/games/`. Routes `/shift/`, `/courier/` and `/courtyard/` are additive; `/workshop/` remains the short introduction and `/` remains the laboratory. Each new game has its own save and replay format, title and local storage key. Model notes and controller hints remain collapsed. Ordinary play needs no LLM or network inference.

The shared component owns body, capacity, timed attempts, observation and task practice. Hosts own their clocks, objects, resources, target conditions, random outcomes, response rules and completion accounting. Courier and Pump Yard are solo. Courtyard's response mechanism belongs to that host, not an extracted general social model. These controllers are not laboratory Full.

## What the current comparisons show

Different objectives stay separate. Do not compare the score of one game to another or label a host controller as the lab baseline.

- **Pump Yard, seeds 101–200:** value-first with a spare on the intake restored all three pumps in 84 runs; easy-first with that same spare rule in 83; all-patch in 83. Their mean scores were 297.03, 284.44 and 281.64. All-patch beat value-first on 56 paired seeds but lost more heavily in some failures. Across 2,400 route/allocation cases, another order can do better. Recovery occurs repeatedly; this is longer work with meaningful partial outcomes.
- **Courier, final seeds 301–400:** reliable-nearest completed all deliveries in 100 runs, shortest in 94 and inspect-then-route in 100. Reliable averaged 5 on-time deliveries; shortest 5.38 and inspection 4.95. Inspecting reduced failed crossings but often cost an on-time delivery. A known safe first medicine route meets its due time; the safe nearest-parcel heuristic misses that opportunity. This is evidence against treating the simple controller's output as the game's ceiling.
- **Courtyard, seeds 101–150:** 900 runs span three supply profiles, three player heuristics and memory on/off. Standard self-sufficient and reciprocal play finish both households in 50/50 runs each; scarce conditions yield 44/50 each. Generous play does not finish its own household goal in these rows. Memory changes exchanges and produces a tiny mixed-sign partial-water difference (+0.02 bucket on average in the generous-policy pairs), with zero household-completion benefit. All 324 non-both-ready runs and the full pre-fix benchmark remain available.

The [learning memo and executable probe](../research/learning-through-work.md) separates time-based practice from labels such as failure or success. After the same exposure and at an equal body state, the implemented practice curve changes the later predicted success probability by 8.834 percentage points. Paired retest quantiles yield 902/1,000 versus 817/1,000 successes. Merely labeling earlier work unsuccessful adds no benefit. This checks the authored computation; no empirical coefficient or human learning claim follows.

## Review and verification

Three independent design/evidence lenses informed the first shift specification. After implementing their own games, the authors review a different lane: pump author reviews courtyard, courier author reviews pump, and courtyard author reviews courier. Root independently integrates and exercises the public routes. Two further separate Claude CLI processes requested with `--model fable` completed reviews of a frozen, allowlisted working-source snapshot through correctness and product/framework lenses. The [review synthesis](reviews/2026-09-07-games-review-synthesis.md) records verified corrections and remaining status; the earlier Fable reports did not inspect these games.

All **186 automated tests pass** after the final fixes. The build produces **46 public files** (44 served page/module/style payloads, plus the release manifest and header configuration); the pinned Wrangler deployment dry run passes. Root verified unchanged bytes for the older laboratory/core, human component, historical kernels, scenarios and workshop runtime/UI against the preceding live source.

Each author ran isolated desktop-browser QA, including small viewports, pending save/reload/import where supported, terminal results and replay. Root independently checked all three integrated game pages at 390 px, verified a pump repair/flow test persisted after reload, resumed a half-loaded courier parcel, and borrowed/returned water across reload. The game chooser was checked at desktop, 390 px and 320 px. These are desktop browser viewport checks, not measurements on physical mobile hardware.

The new `verify:live` command checks current Git cleanliness, pushed/current/build identity, the complete local payload digest, the exact live manifest, every served payload byte, response headers and 11 private/missing 404s. Regression fixtures reject a removed asset, changed header file and dirty source tree; a valid independent fixture passes. Production verification passed: all 44 served payloads match the release exactly, required headers are present, and all 11 private/missing paths return 404. The [machine-readable verification record](../artifacts/release-0.4-verification.json) preserves the first publication's source `ca00695b6e6ae243741609969f7ad354216013c9`, Worker version `5762393b-04e2-4d57-876a-e7e20cbbf260`, payload digest `313852638bc1323533ee3ec8ff4406b923fd4bb47a5cfdc602c1da168de17247`, exact route hashes and browser results. Later documentation-only commits retain these payload bytes; [live release metadata](https://human.adamwhite.work/release.json) supplies the current source identity.

A fresh isolated Chrome 152 session exercised the production chooser, pump tool/travel/repair/verification and reload, courier one-click delivery plus partial interval/reload/early ending, and accepted water loan/reload/on-time repayment. Every flow passed at 390 px with no horizontal overflow or page JavaScript errors; the chooser also passed at 1280 px. Saves stayed separate between games. The isolated browser was closed afterward, so these checks did not alter the user's saved production runs.

## What this earns, and the next decision

Three complete consumers have used the unchanged narrow component with different world rules. That is useful integration evidence. It does not establish a universal game-engine SDK, a complete human model, improved human-behavior prediction, or player enjoyment.

Next, stabilize these experiences from ordinary play and quantify authoring friction. Preserve the five-person objective/tradeoff/failure explanation check and physical-mobile timing as open gates. Choose the next shared helper only from concrete duplication in these hosts, and compare it to keeping a small host-native implementation. A transferable social-response contract is a possible experiment, not a foregone abstraction. Broader cognition, physiology and campaigns remain logged candidates rather than dependencies for the next playable release.
