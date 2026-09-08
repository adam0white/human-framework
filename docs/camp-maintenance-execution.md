# Current Camp implementation boundary

Declared 2026-09-08 from source 91697f2 and delivered app 0.12/source 7dbf9ae, before changing the active implementation. This executes the [maintenance proposal](camp-maintenance-proposal.md). User authorization allows breaking old saves and retiring experiments. No broad compatibility or generic work API is required.

## Selected scope

Replace the active /camp/ host with a new explicit Camp 0.3.0 current-state contract in src/games/camp-current.js. Preserve src/games/camp.js and camp-story.js as historical source; the new host must not import them, Common Ground/rain hosts, Human 0.1.0, private work candidates, or historical replay code. Use released Human/runtime 0.1.1 and clock 0.1.0 as needed, without changing their frozen sources.

Retain existing fresh shared-camp coefficients, initial people/resources, project/gathering effects, prospective workbench benefit, per-worker latched work basis, paid practice, owned meals, automatic available recovery, independently accepted projects and consent-based handover. Retain the earned supply-window conditions and actual allocations/dispatch/return rules, including pause-at-checkpoint and early-close prerequisites. No extra scene, quota, faculty, weather simulation or food from timber/salvage is added.

Fresh current worlds only. Remove legacy migration, alternative research presets, historical origin snapshots, command journals/replay admission budgets, multiple-save books and cross-slot validation. The active game keeps one current snapshot. A small recent player-facing activity log is allowed; it is not an authenticated historical transcript.

Current-snapshot assurance must name what it verifies: finite/schema/version bounds, person/clock/pending-job consistency, current material/assignment/work/consent and completion facts. Use necessary paid/rate/time constraints from the corrected direct work reference where relevant. Do not recreate an authenticity journal or try to prove arbitrary missing body/skill history. Reject unsupported old files clearly.

## Shared core/UI facade

The new core exports CAMP_VERSION, PROJECTS, createGame(), getGameView(game), applyCommand(game, command), advanceGame(game, minutes), advanceToNextEvent(game), exportGame(game), restoreGame(snapshot).

Commands retain the existing active UI spelling:
- {type:'start',job}; {type:'cancel'}; {type:'request',project}; {type:'release'}
- {type:'handover',from:'player'|'neighbor',to:'player'|'neighbor'}
- {type:'continue'}; {type:'allocate',destination:'households'|'camp'}; {type:'dispatch'}; {type:'finish'}; {type:'return'}

All calls are deterministic and immutable; assignment/phase commands pay zero time, while actual Human activity is paid through advancing. Jobs, resources and physical effects commit atomically. Model forecasts remain estimates. Invalid requests leave input unchanged.

The view preserves the ordinary renderer's useful field structure: now/phase, stock/structures/work, availableCaches, people.player/neighbor (body, skills, job label/remaining/project and availableActivity), choices (id/label/detail/project/stage/duration/cost/output/unavailable), commitment/lastResponse, recent/stats, canAssign/canAdvance/pauseReason, plus earned-window allocation/dispatch/deadline counts. Phase names remain camp, introduction, packing, ferry, rain, ended, camp-return. The core owner may prune research-only view fields; signal such changes to UI owner. Do not retain whole legacy world/view objects just for renderer compatibility.

Core owner documents the exact new envelope and view contract in docs/camp-current-contract.md. New session/controller adapters use this facade, never old story/session/slot modules.

## Single active save and compact UI

Use a new version-specific localStorage key and current export format. Do not read or overwrite old story-book keys; old formats are unsupported by the new importer. The user has authorized save breaks, so no agent approval or migration implementation is needed. Ordinary play should not surface developer migration diagnostics.

Retain the existing compact Camp visual system, HUD/time/stop controls and keyboard tabs. Save panel supports current export/import and an explicit secondary new-camp action. An import preview must show concrete current state before replacing the active save. Invalid/stale asynchronous imports, storage corruption/quota failures and save-leave failures must preserve current in-memory play and give an actionable download path. Keep controls accessible when content is long or viewport short. Model limitations remain in one collapsed section.

## Evidence and delivery

An independent evidence lane freezes a few fresh synthetic traces using the original host before executing new-host comparisons. Cover useful work/agency/recovery/meal/partial/tool/handover and supply-window outcomes without repeating the old full matrices. Identify retained physical fields and intentionally removed metadata; do not call a weaker current-state snapshot equally strong historical validation.

Measure the active Camp import closure, cold restoration and snapshot size before/after using source-bound synthetic states. Overall site asset count may retain older examples' dependencies; report active Camp dependency savings separately. The root owns public asset selection, full build/privacy checks, integrated tests, commit/push, deploy and exact live validation. Public app changes must follow the existing authorized deployment workflow.

Independent code/UI reviews should be bounded to the changed surface and demonstrated edge cases. The completed work-helper comparison is provenance; it is not another active implementation lane or a dependency to promote.
