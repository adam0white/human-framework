# App 0.16 — Small situations

The user authorized building and polishing three small games after the experienced-person milestone. The public review route is [human.adamwhite.work/situations/](https://human.adamwhite.work/situations/), with Shared workshop, The shared doorstep and Repair dispatch in one accessible browser shell. This record describes the intended 0.16 release; production status must be filled from the deployment checks below.

## Behavior and source boundary

The three independent hosts use the existing unchanged framework components through a small shared actor/action adapter. Workshop uses remembered failure, paid reading and actual shared-tool allocation; doorstep separates care, promise timing, actual return and recipient reply; dispatch separates original and corrected reports, inspection, inference and actual repair outcome. Each has three authored variations, multiple decision orders, bounded deadlines and JSON save/replay. Choices display minutes, prerequisites and resulting events. Unread message content and recipient-private state stay out of the player view.

App **0.16.0** adds `/situations/` and features its three situations from the chooser. The new experiment facade is **0.1.0**. The explicit public allowlist includes only the selected browser/host dependencies; private documents, tests, comparison tools and package builders are excluded. Existing experiments remain separate and their saves need no migration. [Delivery detail and limitations](maintenance-2026-09-22.md).

Maintenance in this release pins Wrangler **4.136.2**, removes the now-unneeded Sharp override because the resolved upstream version is **0.35.4**, and consolidates five private package builders behind a shared helper while preserving their tarball bytes and source/export identities.

## Verification to record before completion

Pre-deployment checks pass: 1,128 repository tests; all nine host/variation save continuations; paid-action clock and terminal guards; 101 selected build files with 68 static modules and 108 imports; `npm run deploy:check`; npm audit reports zero vulnerabilities and npm outdated reports no outdated direct packages. Local desktop (1280px) and mobile (390px) checks cover completed runs, reload, export/import, rejected invalid import, variation changes and no horizontal overflow. Independent host and shared-shell review found and fixed invalid stock correction, premature recipient-state disclosure, late-session dead ends, misleading on-time reply text and corrupt browser-save recovery. Commit and push the reviewed source before `npm run deploy`. Then compare live `/release.json` with the pushed commit and local release manifest; run the complete public-payload and private/retired-path 404 verification. Production deployment, browser behavior and source identity are **pending verification** in this draft; no release success is claimed here.

The tests can support correct software behavior in these bounded scenarios. They do not validate human psychology, theological interpretation, better outcomes than an equally informed direct baseline, or measured authoring savings.
