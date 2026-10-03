# App 0.8 documentation audit

Read-only, 2026-09-08, documentation changes above deployed source `afe95c7009f88b82fc6391d269014d2cc500d79e`. No source suite, browser or deployment rerun.

## Actionable wording mismatches

1. **[P3] Request cost is misstated.** `docs/roadmap.md:9` says `paid requests`. Current accepted requests and refusals do not advance time; the resulting work pays time (`docs/service-day-design.md:19`). Use `paid work, requests and independent refusal`. Keep future proposed paid communication clearly separate from the shipped control.
2. **[P3] Simulated actors are called real people.** `docs/mvp-contract.md:62` says `real independent people`. Use `two independently controlled simulated people` or `two independent actors`, preserving the explicit absence of human testing/evidence.
3. **[P3] Trial shorthand can double the evidence count.** `README.md:9` says both policies finish all 18 cases; similar wording appears in the new handoff/MVP/coverage/decision summaries. The artifact contains **nine conditions × two policies = 18 total runs**, nine runs for each policy. Prefer `Across 18 runs over nine conditions, both priorities protect the inlet and supply both clinic units.` This also prevents `finish` being read as preserving every service: diversion still loses morning water.
4. **[P3] README advertises an incoming-request response flow.** The Service Day row at `README.md:19` says players `make and respond to requests`. The shipped UI lets the player request work and see Deniz's acceptance/refusal; Deniz's autonomous work does not present a player accept/refuse flow. Use `make requests, see Deniz's responses and manage carryover`.

No material mismatch found in release identities, payload/test counts, production JSON scope, or the distinction between completed Service Day work and the next coordination experiment. Retained evidence supports 74 exact public payloads plus headers/manifest (76 build files), 28 private/missing 404s, app source `afe95c7`, Worker `d73508d4-459c-43a2-bbe2-27d181df75b8`, digest `308f90d536c3536283e56b9227b207901de800a3a4ce641a5d63d05791680bfe`, 473 passing current/deploy tests, 54 passing minimum-Node tests, nine gallery destinations, and nine separately identified speculative-prefetch refusals with successful actual navigations. Production browser reports support the stated Service Day and representative older-game flows, with desktop-viewport and synthetic-fixture limitations preserved. Runtime packaging and Wrangler dry-run logs support their stated checks. The handoff distinguishes deployed app source from subsequent private documentation and does not require a documentation-only redeploy.

## Quick wording recheck

The first three corrections are now present: roadmap describes paid accepted work, MVP names independent simulated people, and the handoff/release/README/coverage/decision summaries distinguish nine conditions per policy from 18 total runs. Release and handoff precisely name inlet protection and two clinic units rather than claiming morning-water success.

At this recheck, the fourth README table item still says `make and respond to requests`; the parent has been notified to name requesting and seeing Deniz's responses instead. README's revised `18 successful runs` should similarly use the precise outcomes already stated in release/handoff so it does not suggest all morning-water obligations succeeded. No other factual or evidence-scope issue was identified, and no tests or browser runs were repeated.

## Root final disposition

All copy findings are corrected in the private handoff revision. README now says the player makes requests and sees Deniz’s responses, and specifies inlet protection/full clinic supply across nine conditions per policy, 18 runs total; morning-water success is not implied. Roadmap says accepted work pays time; MVP names simulated people. The deployed app source remains `afe95c7`; these are documentation-only corrections.
