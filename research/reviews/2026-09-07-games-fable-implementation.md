# Independent Claude Fable review: implementation

Working-tree snapshot, source hashes and exact request recorded in the paired provenance. Read-only review; no code execution or live browsing.

---

**Verdict: no major defect found.** Across the three new hosts I could not construct a player-reachable way to duplicate a resource, earn a world effect from a shorter, blocked, or failed action, reroll a targeted draw without a reload, or see hidden state through a controller view. Findings below are hardening items, one design observation, and evidence gaps.

**What I verified positively (concrete, from code):**
- Seal, meal, parcel and water conservation hold on every path, including refusals and spills (`src/games/shift.js:88-95`, `src/games/courier.js:136-141`, `src/games/courtyard.js:121-144`), and imports re-check them (`shift.js:160`, `courtyard.js:257`).
- Blocked attempts pay only maintenance: no effort, practice, rest, meal, draw index, or trial (`src/human/index.js:122-128`; `courtyard.js:132-133` skips the draw counter; `shift.js:87` and `courier.js:129` only reach the draw on a completed, allowed attempt).
- Draws are keyed by target and per-target ordinal, so zero-time or partial interruptions, rests and inspections cannot shift them (`shift.js:87-88`, `courier.js:129`, `courtyard.js:138`).
- Deadline boundaries settle unfinished effects as interrupted while keeping paid time (`shift.js:106-109`, `courier.js:155-159`); exact-deadline completion counts, and imports reject a playing state at the deadline.
- Views omit seed, hidden conditions, counters and authoritative body (`shift.js:71-74`, `courier.js:97-103`, `courtyard.js:63-71`); all controllers and Meryem consume only views.

## Findings, prioritized

**1. Import range on skills and body depends on an unseen default (medium, hypothesis).** `src/core/model.js` is absent, so I cannot see what `finite` does without min/max. The component validates skill levels and body fields with no explicit range (`src/human/index.js:17,22`). Shift bounds `lastEvent.skillBefore/After` to [0,1] (`shift.js:167`) but never bounds `person.skills.repair` (`shift.js:145`); courier bounds only the floor (`courier.js:174`); courtyard bounds nothing (`courtyard.js:253`). If `finite` defaults to an open range, a hand-edited save with repair or routecraft set to 0.99, or fatigue set to a negative value, passes every structural check and yields near-certain repairs and crossings. Not reachable via ordinary play, only via "Load save". Fix: in each import, assert skill in [baseline, 1] and body fields in [0, 1], one line each. If `finite` already defaults to [0,1], only the missing floor checks in shift and courtyard remain (cosmetic).

**2. Perceived-body bias is not pinned in shift and courtyard imports (low).** Courier rejects a non-zero `observationBias` (`courier.js:172`); shift (`shift.js:145-146`) and courtyard (`courtyard.js:254`) do not. Setting it to -1 in a save makes every fatigue meter, capacity forecast, success estimate and controller suggestion read as rested, while execution uses the true body. No effect exploit, but it silently breaks the "felt estimates" contract. Fix: copy the courier check.

**3. Courier UI does not warn when an action cannot finish before the deadline (low, player-facing).** Shift warns (`web/shift.js:34`); courier's button shows only minutes and a due-time note (`web/courier.js:34`, detail text at `courier.js:71`). At clock 238 a player can start a 3-minute delivery, finish it, and get an interrupted event with the parcel still in the bag. Behaviour is correct and documented in the event text; the pitfall is avoidable. Fix: append the same warning when `minutes > remainingMinutes`.

**4. Blocked social action would swallow a proposal (low, conditional on the core).** In courtyard, a blocked attempt skips the custom handler (`courtyard.js:132-133,149`), and the proposal is then cleared without counting as ignored or refused (`courtyard.js:192-195`). This matters only if `assessCapacity` can block a zero-effort observe action at extreme hunger, which I cannot confirm. Fix: for non-exertive social actions, either bypass the block path or count a blocked reply as ignored.

**5. Forged shift saves can raise TypeError instead of a validation error (cosmetic).** A numeric inspection `attemptId` hits `?.split` (`shift.js:158`); a numeric pending `actionId` hits `?.slice` (`shift.js:28`). The UI catches both, but the message is an internal one. Fix: type-check strings before parsing.

**6. Floating clock boundary (benign, hypothesis).** With fractional advances via the command API, `clock += DEADLINE - clock` can land a few ulps under the deadline and leave a sub-ulp pending remainder (`shift.js:106-109`, `courier.js:155-159`). The next advance settles it, and the browser UIs only issue integer minutes, so no stuck state. Host and person minutes are accumulated identically, so the strict equality on import holds. No change recommended beyond a comment.

**7. Dead branch (cosmetic).** `web/courtyard.js:62` has a "your next move will be late" branch for `dueRound - round === 0`, but `late` is already true at that round (`courtyard.js:200`), so it never renders.

## Documented rules that resemble defects

- **Practice on failed or interrupted work** (`src/human/index.js:126`) is documented in `docs/shift-game.md` and `research/learning-through-work.md`; the interruption probe reports it. Not a defect.
- **Same-draw retry after reload.** A failed repair or crossing can be reloaded, the body rested, and the same draw beaten. Shift documents this (`docs/shift-game.md`, "Changing body/skill may still legitimately change an outcome"). Courier and courtyard share the design but their notes do not say so; worth one sentence each.
- **Loan default has no outcome cost beyond refused future borrows** (`courtyard.js:89`). After defaulting, Meryem still gives via "ask" under surplus or reciprocity (`courtyard.js:93-96`), and the end status ignores the loan (`courtyard.js:205`). Reproducer: borrow on move 1, rest to the end: +2 buckets, one late-loan record. The documents call this "recorded", so it is a design choice, but it is the one place a player gains water with no material consequence.
- **Every player-initiated exchange costs Meryem a full move** (`courtyard.js:196`), documented in the UI. A finished player could stall her at equal cost; no gain for the player.

## Tests against code

- Test names match what they assert; I traced the zero-time reroll, seal conservation, blocked-cost, deadline, and forged-save cases to the exact lines above. The forged-save loops rely on the checks cited in finding 1 only for structure, not range.
- **Empirical claims I cannot verify:** the SHA-256 pins for the human component, workshop and core model (`tests/shift.test.js:100`); that capacity blocks a depot-market shuttle before the deadline (`tests/courier-game.test.js:108-117`); that the reliable policy reaches five deliveries with the sixth in hand by minute 237 (`tests/courier-policy.test.js:36-46`); the float assertion at `tests/shift.test.js:79`.
- **Coverage gaps:** no test that accepting Meryem's request transfers from the player and increments the player's gift count; no blocked social action case; no interrupted unload; no import test for skill or body out of range or a non-zero observation bias.

## Maintainability

- The keyed hash is copied three times (`shift.js:19`, `courier.js:41-47`, `workshop.js:27-33`) while courtyard imports `keyedRandom` from the core. Any fix to the hash would need four edits. Use the core function everywhere.
- The start/advance/settle/interrupt lifecycle and the pending-import checks are triplicated with small divergences: interruption reasons, host-level save size caps (courier only), event fields. The roadmap already proposes a shared helper; the divergences above are the argument for it.
- Several 300-plus-character compound conditions (`shift.js:158,165,169`) are hard to review and are where the TypeError cases hide.

## Evidence gaps

`src/core/model.js` and `src/core/random.js` are absent, so capacity thresholds, the practice curve, the `finite` default range, and the courtyard's random function are unverified; findings 1 and 4 are conditional on them. No screenshots or test runs were available, and I made none.
