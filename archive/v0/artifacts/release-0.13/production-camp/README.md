# Production Camp checks

Executed against https://human.adamwhite.work after app 0.13 source `a07c2b3f2d06160239b4faa2e889ac7cf1cc121a` was pushed and deployed. All six fetched UI/core source files match local source. The separate strict live verification in `../live.json` checks the complete public payload set and retired/private routes.

`run.mjs` is a parameterized copy of the independent review harness, with a required fresh UI_OUTPUT directory, UI_BASE origin and a final failure assertion. `corrections.mjs` adapts its narrow corrective recheck without changing the review report. Original independent scripts/results remain in `../reviews/ui/`; these production results do not overwrite them.

From the repository root, set UI_BASE to the review site and UI_OUTPUT to a fresh temporary directory; run `run.mjs` then `corrections.mjs` with Node >=22 and the installed Playwright/Chrome path declared in each script. All saved/imported/downloaded states and storage canaries are synthetic. The runs use fresh browser contexts and do not read the player's actual browser storage.

Ten main groups and four corrective observations pass. Phone 375x667, desktop 1280x900 and short 375x500 controls were checked; root viewed phone and desktop screenshots. No browser warning/error or external network request was observed. This is desktop Chrome at configured viewport sizes, not physical-phone, Safari or human-comprehension validation.
