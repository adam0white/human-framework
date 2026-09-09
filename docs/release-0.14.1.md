# App 0.14.1: explain useful practice and light work

Delivered and verified 2026-09-08. [Play Camp](https://human.adamwhite.work/camp/).

Camp's food-gathering card now identifies light work beside its current two- or three-food yield. Its existing Work disclosure explains that paid gathering/building practice can shorten later jobs, including after an interruption. Current quoted minutes, output/cancellation costs, disabled reasons, compact tabs/HUD and one-save behavior remain. No new meter, example, faculty, practice coefficient or actor-policy change is part of this release.

The [practice comparison](practice-incentive-results.md) supplies the reason for this narrow presentation change: two default-origin opportunities/eight frozen routes preserve useful later-time effects alongside strong productive controls, recovery costs and another worker's changed timing. The [UI source inspection](practice-ui-preflight.md) identified these two existing facts missing from ordinary explanatory text. This is not evidence that a person understood the new copy better.

Camp remains 0.3.0, runtime/Human 0.1.1 and clock 0.1.0. All physical source files and save formats are unchanged. The only delivered changes are `web/camp-current.js`, `web/camp.html` and app-version metadata in the package/manifest. The public allowlist stays at 72 files, 43 JavaScript modules and 59 static import edges.

## Validation

- **864 repository tests pass** on Node 26.8.1. [Log](../artifacts/release-0.14.1/tests.log). No new text-mirroring unit tests were added for these two small copy changes.
- The private comparisons independently replay **434 states/views and 28 marks**, including the preserved administrative failure, on minimum Node 22.0.0. [Evidence](../artifacts/practice-incentive/replay-node22.json). This is separate from browser validation and does not change the frozen physics.
- The deployment dry run passes with pinned Wrangler 4.129.0 and the existing Static Assets configuration. [Log](../artifacts/release-0.14.1/deploy-check.log). Command flags were checked against installed help and the [official Static Assets documentation](https://developers.cloudflare.com/workers/static-assets/); no account, route, configuration, binding or dependency upgrade was made.
- All **nine local browser groups** pass across 390×844, 1280×800 and 375×667: default actions, keyboard disclosure/tabs/HUD, the exact minute-30→51 G1 sequence, busy reasons, changed next-job quote, save/reload and dynamic three-food garden yield. No page/console/network errors occur. [Results](../artifacts/release-0.14.1/local-browser-final/results.json). Root inspected the small-phone default screenshot.
- A stricter first harness incorrectly required every action in the later C1 375×667 fixture to fit without internal scrolling. An exact prechange/current comparison shows identical geometry and scrollHeight 391/clientHeight 258. The existing Work-panel fallback remains keyboard-reachable with the document/HUD contained. Original failures and the [baseline comparison](../artifacts/release-0.14.1/short-phone-baseline/results.json) remain; the final harness retains strict default/G1 visibility and tests all C1 actions by keyboard. The original harness file was not separately archived, so no exact old-harness-source identity is claimed. This is not physical-device, Safari or human-comprehension validation.
- All **nine production browser groups** pass against exact served source at the same three viewport sizes, including the G1 minute-51 completion/reload and garden food yield. No browser errors or failed requests occur. [Production results](../artifacts/release-0.14.1/production-browser/results.json). The scoped short-phone fallback remains as documented above.

## Delivery

Private main was pushed before deployment at **`235d2e6c077df1a68c508091f54c673391e3a88f`**. `npm run deploy` repeats all 864 passing tests, builds the allowlist and verifies clean/pushed source. Only Camp HTML, browser JavaScript and the release manifest are newly uploaded. Worker version is **`6b8f44c1-a03d-48c6-8a44-a62b63190cbc`**, public digest **`671311ad92bedce24376e84ebe8264cf7fddb8cc70af9fb024a61b86a8bce48b`**. [Deployment log](../artifacts/release-0.14.1/deploy.log).

Strict live verification matches that commit and every one of the **70 public payloads**, required headers and **83 private/missing 404s**. [Exact live evidence](../artifacts/release-0.14.1/live.json). Production browser checks then verify the actual interactions. Later private handoff/evidence commits are distinct from the delivered app source; do not redeploy solely to align documentation HEAD.
