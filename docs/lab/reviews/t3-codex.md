No Blocker established. Five Should-fix findings, ranked below. All were reproduced locally using browser/R2 stubs; none was tested against production.

1. **Should-fix — Event labels can publish personal text.** `apps/site/src/lab/core.ts:108`, `apps/site/worker/lab.ts:368`  
   Labels such as `"My name is Jane Doe at 123 Main Street"` survive validation and aggregation unchanged, then appear in public quit/milestone counts. This contradicts the privacy page’s address-filter promise.  
   **Fix:** accept declared per-game event identifiers and map them to reviewed display labels. Add tests for personal prose, postal addresses and IP literals.

2. **Should-fix — Opt-out leaves other open tabs collecting.** `packages/lab-client/src/index.ts:132`, `:243`  
   The preference is read once into each client’s closure. After client A disables events, client B still reports `eventsOn: true` and sends events.  
   **Fix:** synchronize the preference through `storage` events or reread it before collection and flushing. Clear queued events when opt-out arrives. Add a two-tab regression test.

3. **Should-fix — The daily run ceiling has no bounded overshoot.** `apps/site/worker/lab.ts:151`, `:159`  
   All concurrent requests can pass the list check before any stores its run. A 250-request probe accepted and stored all 250. Per-address limits do not bound concurrency across addresses. The documented acceptance of “a few” extra uploads understates this behavior and its storage/decompression cost.  
   **Fix:** reserve daily capacity atomically before processing uploads. Add a concurrent-upload test; a shared ingress limiter can mitigate abuse but cannot enforce the daily ceiling.

4. **Should-fix — Midnight aggregation can permanently omit accepted events.** `apps/site/worker/lab.ts:142`, `:274`  
   An event receives yesterday’s storage key, then pauses in `R2.put`. A post-midnight dashboard request saves yesterday’s aggregate before that write completes. The upload subsequently returns 204, but every later aggregation reuses the incomplete aggregate; cleanup eventually deletes the omitted raw batch.  
   **Fix:** recompute recent completed days and finalize aggregates only after the retention grace period. Add a delayed-write test crossing midnight.

5. **Should-fix — Index rebuilding drops newer runs at the 5,000-entry boundary.** `apps/site/worker/lab.ts:249`  
   The rebuild truncates lexical key order before sorting by time. Because IDs are random, it retains arbitrary runs from the cutoff day. With 4,999 later-day runs, a cutoff-day 23:00 run disappeared while its 01:00 counterpart remained. The probe used pagination and stayed within 200 runs per day.  
   **Fix:** retain the newest 5,000 by `uploaded` timestamp while walking pages. Add a pagination-boundary test.

Checked and fine:

- Compressed and inflated body caps, malformed-gzip rejection, and unknown top-level field removal.
- Server-side DNT/GPC handling for regular events.
- Origin matching rejects lookalike domains.
- Public run counts exclude private run bodies, notes and sender labels.
- Prototype-safe aggregate dictionaries.

All **18 existing lab tests passed**. Miniflare verification was blocked by the sandbox’s socket-listening restriction. Tracked files remain unchanged; probes are under `scratch/lab-review/`. No commits, pushes or deployments.