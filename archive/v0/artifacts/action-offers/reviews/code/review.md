# Independent bounded action-offer code review

Reviewed candidate `src/games/across-cut-player.js`, `web/across-view.js`, contract, and authored contract tests against `bd944c8`. Own tests and diagnostics live in this directory; no repository edits were made. Before/after source hashes match. No full suite, previous broad matrix, preregistered comparison, external calls, or user-save exports were run.

## Finding

**P2 — Do not label admission uncertain when the entire visible body bin is impossible.** At `src/games/across-cut-player.js:65`, any upper-bound rejection sets `capacityUncertain: true`, but `docs/action-offer-contract.md:15` promises that uncertainty means the available estimate does not settle admission. With Across's zero observation bias and known 0.05 rounding, this is false for some long intervals. After starting with fatigue .95/hunger .15 and completing inspection, full repair is 6 minutes, visible fatigue is .95, and the classifier marks it uncertain. Even optimistic fatigue .925 plus the .081 interval cost reaches 1.006 and fails the unchanged host capacity rule. Repair for one minute is a valid conservative counterpart. At the existing .9751 starting fatigue, Inspect legitimately straddles admission, while the equally reopened 6-minute walk necessarily fails: .975 + .069 = 1.044. These Try controls cannot succeed for any body represented by their displayed estimate.

A classifier consistent with the stated contract should distinguish upper-fails/lower-passes from lower-fails, keeping the latter disabled. It can derive both bounds only from the detached actor view, without host requests, raw-body access, or a physics/policy change. The existing conservative unavailable string can stay unchanged, retaining the current recovery-stop comparison. `bin-boundary-diagnostic.mjs` and its JSON output record both failing examples and the valid counterparts. This is a pre-outcome review finding, not an experiment result.

## Verification and scope

Six independently authored focused probes in `probes.mjs` passed (see `results.tap`):

- Reviewed host, receiver, selected runtime, Human and model dependencies equal `bd944c8` byte for byte.
- Hunger-only twins with equal detached views admit/refuse inspection differently; refusal leaves host, recipe, receiver, frame and UI unchanged.
- Four paid partial repair minutes retain installed fitting and progress; full interval uses remaining work; stopping a fifth paid minute preserves work. Candidate baseline host/recipe/receiver/frame/UI are equal at every explicit command in that trace, and old view fields are unchanged.
- Release capacity twins keep water reservation and paid work correct; a refused request leaves the complete snapshot unchanged; stop restores reservation; consumed water remains structurally blocked.
- Own decision 126 permits one final request, and decision 127 after completion structurally blocks choices/reports without uncertainty.
- Simultaneous fatigue/hunger and radio/contact failures select structural reasons; detached offer reads do not mutate views or game snapshots.

Code review found no added host requests during offer construction, no new raw-body access, and no changed physical admission/payment/stop/replay transition. Report classification remains actor-local. Its one-minute effort is small enough that current top-bin failure still straddles a legal lower-bound body; the demonstrated false uncertainty occurs on longer work/travel intervals. This review does not claim browser behavior, service benefit, player clarity, or results from the separately prepared preregistered comparison.
