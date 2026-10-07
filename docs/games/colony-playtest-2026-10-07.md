# Game 1 playtest — 2026-10-07 (owner, export only)

The owner sent a playtest export; no player words were recorded with it. Build 29c7b09 (framework 2.1.0, engine 2.0.0), seed 20261003, colony-scenario@2, saved at D4 05:00 after "Another day". On d1ca5f1 it replays to the file's hash 0f1907d2e0ffdc with an identical snapshot (no colony code changed since 29c7b09). The build stamp comes from `/release.json` fetched without cache, so the run was most likely on the 29c7b09 deploy, before the 2026-10-06 deploys (inferred).

| Day | Goals C / H / Solo | Meals at judge C/H/Solo | Roof or store-room |
|---|---|---|---|
| 2 | ✓✓✓ / ✓✓✓ / ✗✓✓ | 14 / 18 / 16 | C roofed D1 19:24, H D2 18:39 (21 minutes before the storm), Solo 9.72 at the storm |
| 3 | ✓✓✓ / ✓✓✓ / ✗✓✓ | 16 / 17 / 17 | store-room C 15:09, H 15:57, Solo 5/6 |

End: meals 10/11/12, injuries 10/5/5, prayers 75/75 (H, Solo), morale 0.45/0.42, trust 0.51/0.54; nobody died. Moments 4 (D1 14:01) and 2 (D1 18:11). 42 orders, all Rush, none Insist; appeals "for the children" 32, duty 6, safety 3, none 1. 3 of 10 suggestion cards used (dusk-site, roof-hands-1, storm-pot), 7 skipped, so moments 1, 3 and 5 never fired. Branch replays (inferred; the run is sensitive) say the appeals and Rush mattered: without either, the Human roof misses the storm.

How the Human side answered: mostly yes, with "after I pray" deferrals and breaks for drink and food. Tariq's trust fell 0.75 → 0.585 on Day 1 from three harm events on rushed builds (D1 12:24, 15:04, 17:05). Orders at 22:00 met "I'm asleep".

## Findings

Bugs (confirmed in code)
1. **Classic villagers are hurt resting inside the finished house.** From the storm, Classic Idris and Samira live at `site`, which is not indoors, so "Resting at home" rolls storm exposure: 8 of Classic's 10 injuries (D2 19:11–21:31, health to 80 and 75). Breaks §2 "A finished house matters" for Classic, and reverses the Deferred line "Human injured more than Classic".
2. **Cook orders made while cooking is not on offer get no Human reply.** o10 (D1 18:11, 11 meals) and o27 (D2 15:41, 9 meals): the composer predicted "Can't: unavailable", the card stayed pending without a reply for 120 minutes and greyed. §3 says a deferral is never a silent drop; Classic says "could not (reason)". Why Maryam's 16:00 decision, with cooking on offer, carried no suggestion result was not traced.
3. **Cards lapse grey when the Human side did the job** (o4, o5, o9): the lapse needs both sides settled, and Classic was still on it.
4. **tariq-again claims a memory Tariq does not have** ("He remembers last night") when squall-tariq was skipped and Tariq slept.

**Fixed 2026-10-07 (colony-scenario@3, [colony.md](colony.md) §12).** 1: the roofed house is indoors for Classic too. 2: an order whose job is not on offer gets "not now" with a counter-offer and keeps standing (shuttering a roofed house: "cannot"). The 16:00 miss was a second cause: the order carried no `since`, so the framework took Maryam's noon pot as already satisfying it and never weighed it; orders now carry the minute they were given. 3: a card whose Human side finished is done at the lapse. 4: tariq-again's reason depends on whether squall-tariq was taken. This export is from colony-scenario@2 and is now refused on load with both versions named; its log replayed under the new rules (headless, bypassing the version check) gives Classic 2 injuries instead of 10, o10 and o27 answer "not now: when the store runs low", and o4, o5 and o9 end done. Found while tracing 2 and deferred (2026-10-28): a new order to the same person replaces the old one without settling its card (o27 said "Fine." and began cooking, then storm-pot's o33 replaced it and o27 greyed).

Design
5. **Appeals cost nothing.** "For the children" adds persuasion from benevolence with no wear-off, so it became a default suffix; "you'll be safer" reads a mostly low safety need and does little.
6. **storm-shutter said the roof would not be on before the storm**; Idris roofed at 18:39 (the house was at 9.91 at 18:00).
7. **Human injuries move no health bar** here (all five were storm-exposure rolls, health stayed full), while Classic's cost health. Check whether that is intended.

Minor: moment 2 says "yes in the morning" when the yes came at 15:17 and the deferral named Asr; o26 lapsed still reading "Fine." after Maryam ate, prayed and rested; Samira, never ordered on Day 3, gathered grain to 22:00 and was nearly starving by D4 04:00 with 36 grain unused.
