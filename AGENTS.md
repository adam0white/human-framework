# Project workflow

- Start a resumed task with [HANDOFF.md](HANDOFF.md), then [the MVP contract](docs/mvp-contract.md) and [the roadmap](docs/roadmap.md). Historical lane branches and dated release records are provenance, not the current work queue.

The user's public review site is **https://human.adamwhite.work**. Use this for mobile review and future deliveries; localhost is optional development tooling.

- Repository: `adam0white/human-framework` (private). Preserve the source research and its attribution here. Publish only the asset allowlist built by `scripts/build.js`.
- For user-authorized changes to the delivered app: inspect current state, implement and test, commit and push to the remote, then deploy with `npm run deploy`. Verify the live site and `/release.json` against that commit before reporting completion. The user explicitly requested remote pushes and deployment as the ongoing workflow on 2026-09-07.
- Read `docs/deployment.md` for deployment and rollback details. Do not deploy an unrelated user's unreviewed changes or place credentials in source, logs or the asset directory.
- Keep the actor loop independent of LLMs and UI. Preserve the replay engine version when changing only presentation; version incompatible simulation changes explicitly.
- Keep general scientific/theological limitations in the single collapsed model-notes section. Ordinary play should explain objectives, choices, costs and consequences. Keep useful estimate labels and explicit researcher-view labeling.
- Preserve negative benchmark findings. New mechanisms should earn their place through discriminating experiments in `docs/roadmap.md`.
- Keep Solo Repair as a single-person control without social effects. The user requested this on 2026-09-07; add social experiments alongside it, and test that social switches do not alter its behavior.

- The current package selects Human/runtime 0.1.1; existing games retain Human 0.1.0. Preserve historical sources and `scripts/runtime-release-lock.json` entries; use an explicit reviewed version/migration for changes to frozen code or its transitive model dependency.
- For a documentation-only handoff, record and verify the deployed app commit separately from newer private-source commits. Do not redeploy merely to keep a historical evidence document at HEAD.
