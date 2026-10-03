## Verdict: retention is not justified by these cases

**The cancel arm is dominated by an arm already in the set.** A: wait/recover and cancel-restart both give household 303 / both 311, but fatigue .6815 vs .8065. The .125 gap is exactly 5 min × (0.0015 meal accrual + 0.0235 forgone net rest). B: .230 vs .233 is 2 min × 0.0015 against a rest arm clamped at 0. Retention returns *minutes*, not body state — a perfect resume still leaves the eat-first arm +.125 at 303.

**And the minutes buy nothing.** Retention's only arithmetic gain is meal end 306 vs 311 (A) and, unexecuted, ~409 vs 411 (B). Households (306/303), camp nights (4), and food are unchanged; both land past the decisive checkpoint. Zero objective value in the cases offered.

## Conflations to separate

- **Preemption vs. retained progress.** The real friction is an 8-minute atomic job against a 5- and 2-minute lock window (line 70 exclusivity). That is job/window *fit*, not lost work. Retention would be a workaround for scheduling.
- **Preparation vs. eating.** Cancel refunds the portion (line 93), so no prepared artifact survives. Retention would bank progress against a portion back on the shelf that `desire` (115) can hand to the neighbor at hunger ≥ .65.
- **Reserved vs. consumed.** Currently clean: begin removes from stock without touching `stats.spent`; only `settleFixed` marks spent/`consumedFood`/`mealConsumed`. Retention with a refunded reservation breaks that ledger.
- **Meal vs. recovery.** `activity:'meal'` is neither `'rest'` nor `'active'` (v0.1.1 142–144), so meals accrue base fatigue; idle is unconditionally rest (`const recovering=true`). Waiting is free and already optimal in both windows.

## Missing alternatives and causal errors

- **Wrong baseline.** Retention's comparator is *wait*, not *cancel*. The set contains its own refutation and still frames cancel as motivating.
- **Misattribution risk at 403/403/399.** The cancel arm's 4-minute edge comes from building an extra cache and gathering fewer minutes — different worker allocation, correctly flagged. It is not meal-handling evidence and must not be credited as such.
- **A's window is already optimally used.** Nothing else fits 5 minutes (gather 16/22, forage 14, cache locked and gated by `built()`), so rest is the only fit and is strictly best.
- **B's upstream 365 prefix is correctly excluded** as non-selectable at 381, and no dominance is claimed — appropriate, since it trades .3695 fatigue for .060 hunger.

## Atomic controls: strength and limits

Strong: whole-duration capacity gate at begin (73), incomplete-interval guard (167), `Meal receipt requires completed meal` (164), refund on stop, single relief.

Limits: relief is anchored to `pending.bodyBefore` (171) and is sound *only because attempts are contiguous* (150). An unexecuted resume would credit 8 minutes of maintenance across a 28-minute span in A, silently deleting ~0.04 hunger. That is invisible in this set only because both cases clamp to 0 (hunger .226/.432 < mealRelief .55). Second limit: one `pending` slot per person and one job per actor — parking requires new state in a versioned human module.

**Unexecuted labels:** the 5-minute retention arithmetic (306), the B figure ~409, and the 0.04 hunger deletion are arithmetic only; no resume candidate exists or was run.

## One bounded next priority

Execute a default-creation meal case in the regime this preflight never enters: **hunger ≥ mealRelief, including one meal whose hunger reaches the ceiling mid-attempt.** Assert relief applied once from `bodyBefore`, ceiling maintenance preserved per the 169–171 comment, and an interrupted meal granting zero relief with the portion refunded.

No new state, no extra game, no retimed deadlines — supported commands from default creation. It is the highest-value step because line 171 is the only code the retention question actually turns on, its stated behavior is currently unexercised, and it would pre-empt any future resume proposal on correctness grounds rather than case-by-case arithmetic.
