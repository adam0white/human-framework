# Last Light implementation plan

**Goal:** Deliver the short changing-report game and a private matched-access comparison described in `docs/superpowers/specs/2026-09-08-signals-design.md`.

**Architecture:** A new deterministic game host imports frozen runtime 0.1.1; a presentation-only session and three browser assets consume its filtered view. A private script compares the existing memory candidate with the actual host notebook and no retention.

1. Write `tests/signals.test.js` for the missing host API; observe failure. Implement `createSignals`, `requestTask`, `interruptTask`, `advanceTo`, `nextVisibleEvent`, `getSignalsView`, `exportSignals`, `restoreSignals`, `receiveReceipt` and `retainReport` in `src/games/signals.js`. Test hidden-state invariance and time/resource/import boundaries before tuning presentation.
2. Write `tests/signals-session.test.js`; observe failure. Implement `web/signals-session.js` pause, command, stop, step and tick functions, all calling host transitions. Add the page/controller/style with objective and travel buttons at the top and a provenance notebook below.
3. Write `tests/signals-comparison.test.js`; observe failure. Implement `scripts/signals-comparison.js` with explicit fresh-path CLI, source hashes, delivery parity, stale/hidden-change cases and JSON resume evidence. Generate one dated immutable artifact and a scoped `docs/signals-game.md` report.
4. Run focused and complete Node tests, inspect mobile browser rendering and execute both route buttons. Commit only new scoped files. Send parent the registration entry, tests, exact commits, comparison outcomes and remaining limitations. Parent handles independent review, shared registry and deployment.
