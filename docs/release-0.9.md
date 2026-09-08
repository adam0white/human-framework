# App 0.9: A Shared Promise

Delivered 2026-09-08 at **[A Shared Promise](https://human.adamwhite.work/service-plan/)**. The [collection](https://human.adamwhite.work/games/) now contains ten games/variations plus the laboratory. Three parallel Astra Ultra implementation lanes completed the host, UI and comparison; fresh independent reviews and exact production checks followed.

## What changed

The new Service Day variation lets two people discuss a concrete clinic plan, accept or refuse its terms, revise an existing agreement and withdraw an unfulfilled contribution. Both consenting participants pay two active minutes for a completed discussion. Listening is separate from accepting; a promise is separate from physical readiness and actual water arrival. A declined, interrupted or stale revision preserves the earlier agreement. Ownership, fatigue, recovery and real work continue throughout. [Host contract](service-plan-design.md) · [UI contract](service-plan-ui.md).

Play begins at minute 37 after a real paid morning, preserved in the save: meal, two gate sections, shed retrieval and rest, alongside Deniz's independent pump work. The whole-day start remains available. Promised start/readiness times are visible pause points; the player must stop recovery and choose pump work explicitly. A short hold preserves the cart option through 45; a later hold risks losing it. Plans may fail without resetting bodies, inventing parts or granting a late delivery.

The new host deliberately makes a departed trip permanently consume the sole clinic receiving slot. Stopping even a just-started requested trip forfeits delivery. This differs from the original control and is explained before departure and before a permitted stop. Other corrections keep note editing/submission paused, preview impossible draft timing and show actual agreement state in ordinary language. Original Service Day, prior games, shared note code, frozen Human/runtime/model/clock and release locks remain unchanged.

This is a new host 0.1.0/save 1 using Human/runtime 0.1.1 and clock 0.1.0. It implements a direct coordination record; no general planner, memory, trust, normative evaluator or portable social abstraction was promoted.

## Comparisons and retained alternatives

The frozen development study has 25 prescribed variants across six families. Agreements match a competent timed-request route at minute 59; simply noticing current pump work solves the short-ready case at 51 without discussion. An accepted revision changes a later outcome from one unit to two, while unnecessary discussion delays an easy delivery from 42 to 44. A risky promise followed by no work supplies zero units. Different schedules incur real, unequal recovery/discussion exposure; whole-day recovery counts include work after service and are not minimum coordination costs. [Complete report](service-plan-comparison.md).

After committed freeze `b1ee8e8` at source `91333d8`, all four withheld scripts executed without tuning:

| Case | Retained outcome |
|---|---|
| Interrupted revision | Original terms survive; two units arrive at 51; three discussion minutes per person were paid |
| Promised rest omitted | Actual pump request fails capacity; zero units arrive |
| Old response after newer terms | Stale response rejects; two units arrive at 59 |
| Revision tied to expiry; request after departure | Earlier cart commitment remains; one unit arrives at 63 |

All 29 comparison journals replay on minimum Node 22. The withheld scripts are readable authored cases, and core tests overlap their mechanics; they are not blind samples or independent evidence of policy generalization. Separate post-review handover probes preserve another simpler success: early sharing delivers at 48, and sharing from the actual clinic-37 start delivers at 57. Late sharing still loses to the cart. All six old/new-host trial objects match across Node versions. Plans are useful expressible choices, not uniquely necessary for service or established human clarity.

## Reviews and verification

[Consolidated review](reviews/2026-09-08-shared-plans-review.md) preserves three fresh Astra reviews and a completed Fable design review on `claude-fable-5-1`. The Fable lifecycle process timed out after 1,500 seconds without a verdict. Its fresh Astra replacement found a real command-budget defect: no-effect admissions could leave insufficient room to stop or withdraw. The fix reserves every remaining unilateral control and intervening advance segment. Original failing states remain; an independent recheck covers interleaved controls ending exactly at journal entry 256, old-save equality and 14 successor paths.

**530 tests pass** on Node 26.8.1, repeated during deployment. **All 57 new tests pass on minimum Node 22.0.0.** Runtime packaging and the pinned Wrangler 4.129.0 dry-run check pass. The public build links 54 JavaScript modules/88 static edges. [Node 26](../artifacts/release-0.9/tests-node26.txt) · [Node 22](../artifacts/release-0.9/tests-node22.txt) · [Build check](../artifacts/release-0.9/deploy-check.txt).

Production Chrome checks at 320/390/1280 cover paid clinic entry, agreement/revision/refusal/interruption, distinct promise/readiness/arrival events, explicit work choice, risky failure, exact save/download/import/reload, whole-day entry and synthetic local notes. Separate regressions verify advance slot warnings and pausing an already-open note. [Game flows](../artifacts/release-0.9/production-shared-plan-browser.json) · [UI regressions](../artifacts/release-0.9/production-ui-regressions.json).

All ten gallery destinations and generated controls load their entry/host modules, and representative prior Rain/Watch/Last Light routes still pass. No actual page, request or asset failures, and no horizontal overflow. Ten precisely identified non-navigation Cloudflare prefetch refusals are recorded separately. [Collection checks](../artifacts/release-0.9/production-collection-browser.json). Two harness races are retained and corrected: waiting for asynchronous file import completion, and waiting for a generated game control instead of static HTML before checking module loads. These did not require public app changes. Desktop viewport checks and synthetic notes are not physical-phone testing or human playtesting.

## Exact delivery

| Identity | Verified value |
|---|---|
| Deployed/pushed app source | `cf4270c0a75880f8e9b0a29011a6b80c829e5701` |
| Worker version | `78eac7ef-d251-4724-af36-c0cc5fb1985c` |
| Public payload digest | `0f158916458dcfc8fb381fb61db3f8f571494b1311ee905dabe1920a80918709` |
| Public build | 79 payloads, headers and release manifest |
| Live checks | 79 exact payloads, required headers, 30 private/missing 404s |

[Live byte verification](../artifacts/release-0.9/live.json) · [Deployment output](../artifacts/release-0.9/deployment.txt). All original core/UI/comparison lane heads are pushed, preserving protocol and source identities. Private experiments, reviews, research, notes and saves remain outside the public asset allowlist. Later private evidence/tooling/handoff commits do not imply another app deployment.

The hourly continuation remains active. Next is [a headless feasibility study for separate actors' information and paid reports](across-cut-proposal.md), retaining the easy no-message counterexample before any new interface. Human explanation, measured human authoring benefit, physical-device timing and empirical/qualified theological review remain open.

[Final documentation consistency audit](../artifacts/release-0.9/documentation-audit.md) checks the recorded identities, counts, scopes and current/future work distinction.
