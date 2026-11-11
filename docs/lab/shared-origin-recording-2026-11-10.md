# Shared-origin recording queue — 2026-11-10

Confirmed in released lab-client 0.5.16: pending compressed recordings share the IndexedDB database `hf-lab-pending`. On initialization, the client reads all pieces. Delivery eligibility checks the player and record age but not the game. On play's shared origin, an enabled game can therefore retry a different game's queued recording under its own preference. The compressed envelope keeps its original game; the defect is the preference used to authorize retry.

Two deterministic reproductions used synthetic players, gzip records, fake IndexedDB and stubbed exact-ID stored receipts. No live telemetry was sent. The new regression seeds both current-format and pre-metadata records for two games with one player. The unfixed transport sends all four records; the expected behavior sends only its own two and retains the other two with byte-identical compressed bodies.

Client0.5.17 records each new piece's game, recovers missing game metadata from older original compressed envelopes, and restricts eligibility to the active client's game. All valid pending records still count toward the existing shared admission count and byte limits. Unknown unreadable records preserve existing fail-closed behavior: they stay stored and block new additions. Only an exact stored receipt retires a delivered record. Kit0.5.34 extends its client peer range; its UI behavior is unchanged.

Existing capacity/reset/backoff controls remain. A second regression fills the shared journal with another game's256 records and verifies a new note is refused without eviction or delivery. The limits retain their existing per-instance snapshot semantics; this change does not add atomic admission across concurrently open tabs.

Rollout limitation: tabs still executing an older client retain the defect until they load the new version. Updating one game does not fix other old clients on the same origin. Adopt the new immutable client in the complete games bundle before new cutovers. Do not claim all existing tabs or separate central-host games updated merely because artifacts were published.

Earlier bounded pilot off/reload checks are not evidence against this counterexample; they did not seed and test a foreign game's retained pending piece under the same player. Native replay and source history remain separate from telemetry preference isolation.

Publication and actual game adoption are pending at preparation. No engine behavior or HF package version changes in this repair.
