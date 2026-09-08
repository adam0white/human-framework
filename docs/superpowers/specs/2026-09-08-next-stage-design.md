# After app 0.6: authoring obligations and changing evidence

Started by the authorized hourly continuation at source `2ddc21e` on 2026-09-08. Current public app remains the verified 0.6 release at `ac4e544` until a reviewed app change is pushed and deployed. The baseline is clean and 347 tests pass.

## Independent deliverables

1. **Coordination-helper experiment:** a private stateless helper tested in two actual host adaptations, compared against unchanged direct wiring. Predeclare removed caller obligations, exceptions, inclusive/caller source costs, state and event budget before outcome runs. Host resources, consent, arrival policy, effects and import validation stay host-owned. Keep it private if it only relocates code or increases total obligations.
2. **Last Light:** a bounded game around paid radio requests, delayed reports, direct lookout and a fast uncertain crossing versus a slower reliable route. Timestamped reports are actor information, not world truth. Use frozen Human/runtime 0.1.1. Compare notebook, existing private memory candidate and no retention under equal access/cost. No memory promotion is presumed.
3. **Body isolation:** a new preregistered comparison pairs pooled stamina with the identical saturating skill update used by Human, isolating body structure from the earlier rival's different learning curve. Preserve all earlier frozen sources/results; report analytically expected differences, actual admissions/resources/exposure and smaller-model cases without human-validity claims.
4. **Optional play notes:** a shared presentation-only module lets a player type a short note about objective, tradeoff, an unexpected outcome and another person's response where applicable. Download their words with a bounded public game summary and timestamp. The form is collapsed, performs no scoring or network submission, and does not gather hidden game truth or the full save. It helps collect future evidence; completion or content of a form cannot automatically pass the human explanation gate.

Each lane uses an isolated `codex/*` worktree and writes its specific protocol/design before implementation/results. Parent owns shared routes, app version, gallery, note integration, reviews, handoff and deployment. Do not alter Human 0.1.0/0.1.1, clock 0.1.0, runtime locks, original games or private player exports. New presentation keeps simulation versions unchanged. New game receives its own host/save version.

## Play-note details

The optional form is attached to Watch, Before the rain, and Last Light when integrated. Four text fields use ordinary language; the other-person field is omitted for solo games. Blank notes do not download. Values are bounded strings, rendered as text, and never interpreted as commands. The exported schema has a format/version, game identity/version, capture timestamp, elapsed time, a small allowlisted visible summary, and the entered answers. It makes no claim about participant identity, truthful authorship, comprehension or grading.

The form pauses playback when opened. A draft remains while the page is open; only clicking Download creates a file. Show the public time attached to the downloaded note. Existing save/export controls remain separate so a player can deliberately share a replayable save if wanted. Tests exercise bounded export data, blank/invalid input rejection, no state mutation and actual browser download. No human responses are fabricated for evidence; browser fixtures are explicitly synthetic.

## Review and release gates

Obtain overlapping independent Astra Ultra and scoped Claude Fable reviews with actual source/model/scope recorded, preserving negative findings. Verify findings against code and fix concrete defects. Run focused and integrated tests, minimum Node compatibility for new code, runtime source locks, build/deployment checks and real browser flows at mobile/desktop widths. Push reviewed source, deploy, verify exact live payloads/private exclusions and production interaction, then save private release/handoff evidence separately. Human usefulness and physical-device gates remain open.
