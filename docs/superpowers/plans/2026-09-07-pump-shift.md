# Pump Yard Implementation Plan

**Goal:** Deliver a longer solo game where job order, a scarce seal, recovery and accumulated practice have consequences.

**Architecture:** Add a separate host through the frozen human0.1 boundary. Preserve original laboratory/workshop modules and saves. The host owns all world, scoring, clock and random-outcome decisions; the browser owns presentation and optional replay logs.

**Tech Stack:** ES modules, built-in Node tests, browser DOM/CSS, current Cloudflare static deployment.

**Spec:** [Pump shift design](../specs/2026-09-07-pump-shift-design.md).

## Global constraints

No runtime LLM. Single worker/no social effects. No shared-human or old-host behavior change. No XP/failure points. One-time verified-job scoring. Per-target repair random counters. Strict pending snapshots. Publish only allowlisted assets. Existing user authorization covers implementation, commits, pushes and deployment.

- [x] Pump Yard author: write failing `tests/shift.test.js` contract tests; implement `src/games/shift.js` and scoped data/helpers as needed; test hidden state, ownership, partial time and score/resource ledgers. Freeze the API before UI hookup.
- [x] Same whole-game author: implement `web/shift.html`, `.js`, `.css` against the documented projected view; retain optional controller help, local saves, download/upload and separate command replay. No direct authoritative state edits.
- [x] Root: integrate public `/shift/` entry, local server and navigation with meaningful packaging tests; keep existing module bytes and benchmark identities intact.
- [x] Root/critic: run strategy and learning comparisons, probe terminal/interrupt/farming issues, preserve unfavorable findings and exact source hashes. Review design and implementation through overlapping fresh lenses; fix reproduced defects.
- [ ] Root: browser QA at desktop and narrow viewport, full tests/build/dry-run, docs/roadmap update, commit/push/deploy, exact production verification and concise user handoff.

Each substantive behavior starts with an observed failing test and ends with its focused passing checks. Full test suite and deployment guards run once the integrated files are stable. The independent scientific memo informs interpretation without promoting a game curve into an empirical law.

## Parallel expansion and integration status

The user expanded the accepted plan to whole-game lanes. Three GPT-6 Astra agents at ultra effort implemented Pump Yard, Courier Round and The last water on isolated `codex/*` branches, then reviewed another author's game. All lane commits and verified fixes are merged. Root added a game chooser, six explicit public entries, app-version metadata and exact live verification. The integrated 186-test suite and deployment dry run pass. The final push/deploy/live verification box stays open until production is actually checked.
