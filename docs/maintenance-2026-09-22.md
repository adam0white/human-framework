# Maintenance and small application experiments

On 2026-09-22 the user authorized autonomous maintenance, simplification, dependency upgrades, and building and polishing the [shortlisted games](game-ideas-2026-09-15.md). This delivery turns the shortlist into three small, authored applications of the existing framework. The framework remains the product; the scheduled framework task remains paused.

## Delivered scope

| Situation | Player decisions and canonical consequence | Reused capability |
|---|---|---|
| Shared workshop | Prepare, request a shared tool, wait, read a peer notice, and choose a hand, standard-tool, or adjusted-tool method. The peer's hold and the player's queued reservation advance with actual paid time. Fit and reservation expiry determine output; a failed attempt consumes time without completing the piece. | Historical episode retrieval, paid selected attention, actual Human attempts, and institution grants, queue, and expiry. |
| The shared doorstep | Read the access note or ask the neighbor, return a borrowed object, help a sibling, explain a delay, and listen for a reply. A missed return, actual return, and the neighbor's response remain separate events. | Paid attention, actor-local information, contextual relationship events, and an independently supplied recipient response. |
| Repair dispatch | Read an original stock report and its correction, inspect either job, and choose when to attempt each repair. The host's actual stock and fault determine success even when a report or inference suggests another method. | Paid selected attention, corrected evidence, traceable bounded inference, and observed episodes. |

All three run in one browser shell at `/situations/`. Each has three deterministic variations, repeated choices within a short modeled deadline, visible action costs and consequences, and replay and JSON save/restore. Shared actor construction and paid-action handling remove duplicated integration code. Each host owns its actual world, deadline and results; the framework source modules remain unchanged. Snapshots use bounded canonical command replay or consistency checks and do not trust caller-written output counters. The browser saves contain scenario state for continuation; they are not a secrecy boundary against someone inspecting the client.

The public asset allowlist selects the new host and browser sources explicitly. Private research, tests, package tooling and evaluation records stay outside the served asset set. Earlier game saves do not migrate to this session format. The shared experiments API is version **0.1.0**; the browser app is **0.16.0**.

## Maintenance

Wrangler moves to pinned **4.136.2**. Its current dependency graph selects Sharp **0.35.4** upstream, so the earlier local Sharp override was removed. The five private candidate package scripts now call one shared packaging helper. Their declared source lists, package metadata, exports and copied source bytes are preserved; the package comparison checks byte-identical tarballs. The release still requires the normal installed-tooling, audit, full-test and deploy checks before a production success claim.

## Evidence boundary and next work

These are authored situations that test whether the existing components compose across distinct host rules. Passing software checks can establish paid time, save continuation, information boundaries and canonical consequences in these examples. They do not establish a calibrated account of human behavior, a predictive advantage over an equally informed direct controller, or measured authoring savings. No general LLM, generated world, new physiology, moral score or religious interpretation was added.

The [roadmap](roadmap.md) still names broader developmental trajectories, positive moral and spiritual practice, general perception and attention, probabilistic inference, long-horizon cognition, and empirical and interpretive validation as unfinished work. Biological aging and childhood each need their own evidence and model; the sparse adult calendar does not close them. A later framework round should select one causal capability and a discriminating comparison before implementation, while keeping the scheduled task paused until the user directs otherwise.

Release test totals, independent review disposition, browser results and production identity belong in [the 0.16 release record](release-0.16.md) with completed checks and deployed identity.
