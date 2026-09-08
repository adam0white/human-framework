# App 0.14 — first-hand reports during paid work

Delivered 2026-09-08 at [Across the cut](https://human.adamwhite.work/across/).

## Delivered change

Across the cut replaces Last Light's public slot, route and assets. Four current examples and seven earlier experiments remain; no chapter order or larger game count is required. Last Light's source, profiles, tests and comparisons remain private evidence. The laboratory stays retired.

A keeper and Deniz operate separated valve/inlet stations with their own paid work, supplies, observations and radio reports. Ordinary play renders only the keeper's information. A report can arrive during an unfinished release: time pauses for reconsideration while the job and reserved water remain. Stop and Continue are explicit choices. First-hand observations, received reports, original observation times and send/receipt times remain distinct. Current local observation after visiting a station is not suppressed by an earlier equal-valued report.

Available time recovers people automatically. Owned meals require their paid duration; receiver 0.1.1 fixes a reviewed interruption loop that otherwise prevented a feasible cart trip. The compact Work/Notebook/Brief/Save interface keeps the keeper's HUD and time/Stop controls visible at the tested normal phone/desktop sizes. A newly received report opens at the top, including after save restoration/import. After public minute 30, the keeper's account comes first; hidden actual outcomes appear only after explicit Reveal and are labeled researcher view.

Host 0.2.0, player 0.1.0, receiver 0.1.1 and a compact versioned player recipe are new boundaries. Existing Human/runtime 0.1.1, clock 0.1.0, Camp and historical sources remain unchanged. The finite recipe reconstructs actor-owned report and policy provenance without storing duplicate world snapshots; it is not proof that all saves need histories. [Core contract](across-player-core-contract.md) · [Driver contract](across-player-driver-contract.md) · [Interface/persistence](across-player-interface.md).

## What the comparison establishes

The committed protocol uses six exact authored worlds, five keeper controls with one shared receiver, three explicitly different joint no-radio alternatives, and four receipt interventions: **52 records**. Original and reviewed results, full actor inputs/commands and exact minimum-Node-22 reproductions remain preserved. All physical outcomes/costs are equal after the receiver patch; all 48 headless final host saves remain byte-identical. The high-hunger meal bug came from independent review outside these default-body worlds.

At the required actual minute-eight receipt, Stop retains **two water units and one paid release minute**; Continue consumes and loses the two units with two paid release minutes. Both cases deliver one cart unit, including restored receipt variants. Reports create this concrete choice, not a guarantee of better service.

Specific timing/work gains coexist with cheaper alternatives. In the long-inlet late case, adaptive reporting serves two at 17 with one receiver attendance minute; joint conservative serves two at 18 with three attendance minutes and no radio. Under lost reports, a joint cart-first control serves two at 18 with five attendance minutes and no radio; adaptive serves two at 19 with fifteen attendance minutes and two charges. Easy communication overhead and immediate-cart dominance in impossible early cases remain explicit.

The cases are representative authored examples, not balanced or withheld human samples. Public channel mode correlates with hidden configurations in this small set, so it cannot establish that reports are necessary or broadly superior. No general memory, attention, negotiation or cognition component is promoted. [Complete comparison and costs](across-player-comparison.md) · [Reviewed summary](../artifacts/across-player/reviewed/summary.json) · [Paired revalidation](../artifacts/across-player/reviewed/initial-to-reviewed.json).

## Exact delivery identity

| Field | Value |
|---|---|
| Application | 0.14.0 |
| Committed and pushed app source | 2ebdb8841215a26f69da1c394ab438b7a1f4d15d |
| Cloudflare Worker version | fc879d1a-82cc-4582-8210-40c2aacc26bd |
| Public payload digest | 4f9cccf8602c04a2fb7d7f8dd4aec3ba45950d9791791ed37c8eb5ae3f753c20 |
| Public build | 72 files: 57 assets, 13 HTML entries, headers and manifest |
| Static JavaScript graph | 43 modules, 59 import/export edges |

[Source attribution](../artifacts/release-0.14/source-attribution.json) matches the frozen executable graph and inputs to the deployed app. The private comparison document was extended with outcomes after its freeze; that expected documentation difference is recorded rather than falsely called byte-equal. Later private evidence/docs/development-tooling commits are distinct from this deployed source.

## Executed verification

- **844 tests pass** on Node 26.8.1, repeated during deployment. All **60 new tests pass on minimum Node 22.0.0**. [Suite](../artifacts/release-0.14/reviews/validation/across-integrated-tests.log) · [Minimum runtime](../artifacts/release-0.14/reviews/validation/across-node22-tests.log) · [Deployment](../artifacts/release-0.14/deploy.log).
- Three independent core, driver and browser reviews found and verified six corrected issues. Original counterexamples, review source identities, harness failures and narrow corrections remain. [Dispositions](reviews/2026-09-08-across-player.md).
- Strict live verification matches clean pushed source, manifest, digest, **70 public payloads**, expected headers and **83 private/retired 404s**, including Last Light and laboratory endpoints. [Record](../artifacts/release-0.14/live.json).
- Final-source production browser checks pass **13 broad and seven corrective groups**: real report/Stop/Continue, source-time labels, hidden-world equal DOM, paid travel/meals, actual downloads/imports, stale reads, protected storage, keyboard focus, capacity-gated sending and end-only revealed truth. Phone/desktop chooser navigation and one paid inspection also pass; no-JavaScript links remain. [Player](../artifacts/release-0.14/production-player/results.json) · [Corrections](../artifacts/release-0.14/production-player/corrective-results.json) · [Chooser](../artifacts/release-0.14/production-chooser/results.json).

Browser tests use desktop Chrome at 375×667, 1280×900 and short 375×500 viewports. They do not establish physical-device, Safari, assistive-technology or human-usefulness results. The first chooser harness incorrectly selected a mobile-only control at desktop width; its failure and corrected control selection are retained, without an application change.

## Development dependency follow-up and next work

The push surfaced a development-only Sharp advisory. A scoped Miniflare override updates Sharp 0.35.2 to the maintainer's patched 0.35.4 while keeping Wrangler/Miniflare pins unchanged. Independent metadata review, native synthetic AVIF checks on Node 22/26 and a deployment dry run pass; npm audit reports zero known vulnerabilities. GitHub marks alert 1 fixed after private tooling commit `037724e86de60197cf75b181d910b73d3c1b2522`. Browser payloads did not change. [Tooling evidence](../artifacts/release-0.14/tooling/README.md) · [Maintainer advisory](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c).

Next, test what an offered action promises: Across's conservative estimate can hide a legal inspection, while Camp already uses authoritative own-body admission. Compare an explicitly uncertain try control before considering shared code. Preserve costs/refusals and stop if no meaningful benefit appears. [Bounded proposal](action-offer-proposal.md). The hourly continuation stays active; completed work/helper, memory and body matrices remain provenance, not automatic reruns.
