# What's left (2026-10-19, soft stop)

Owner, 2026-10-19: "slow down on the Claude usage … we can move most of the stuff to codex. Keep note of what's left."
From here on, Codex does the work by default. Claude handles only design judgement and reviews that need taste.

## Still running at the soft stop (each told to finish its current step, deploy and report)
- In-site games (Colony, Voice, The Night Watch): merge the round-2 fixes, then deploy.
- Neighbours: Phase D deploy, and the offer-design fix for the background repair lever (nbh-01z.37).
- The Valley and The Warren: their current rounds.
- Codex bake-off: writes docs/lab/agent-routing.md.

## Next work: Codex
- Add CI workflows to pass, glance, murmur, valley, stairwell and warren.
- Add lab-client to The Rope, Small Works, Neighbours, Valley, Stairwell, Warren and the in-site games.
- Fix The Rope's empty /release.json.
- Make gate.test.ts faster (about 194 s of its 300 s setup limit).
- Fix harness bugs: seed arguments, multi-word commands, `show` and `chronicle`.
- Fix text and state consistency bugs listed in the playtests:
  - Night Watch: "It was done", "tore into the store", map names, looping cards.
  - Voice: ends ticks, summary counts, pick numbering.
  - Colony: Health 100 while hurt.
- Commit Small Works' playtester adapters if they are still uncommitted.

- Fix the lab worker review findings in docs/lab/reviews/ (bake-off 2026-10-19):
  - Blocker: a past day keeps only its first 600 batches.
  - A 7.6 KB upload costs 160 MB of memory.
  - IPv6 rotation defeats the rate limit.
  - Unknown game ids are accepted.
  - The opt-out is not shared across tabs.
  - A race at midnight drops events.
  - Target 2026-10-20.

## Next work: owner
- `npm login`, then `npm publish -w packages/lab-client`, then add the trusted publisher.
- Play, and send feedback or runs with "Send this run to the notebook".
- Decide whether to start the Small Works scenario redesign for natural difficulty.

## Design, needs judgement (dated)
- Colony: player orders must matter. Orders should persist, the "what would have won" hint must be reproducible, and the economy must be visible. 2026-11-02.
- Night Watch: fatigue visible before dusk, dawn talks that matter, more to do in the seasons. 2026-11-02.
- Voice: Selin and Hacer scenes; reason chips that show in his answers. 2026-10-28.
- The Stairwell: weeks 2–4 and the boiler fund. The returner persona's 0/3 is unexplained. 2026-10-30.
- HF 2.10:
  - game events should not feed life-scale emotions (2026-11-15);
  - an urge he agrees to should cost something;
  - mental effort should fill the fatigue store;
  - `alongside` should accept a voice;
  - the phrase fade-rate API.

## Small Works and Neighbours on HF 2.8.0 (hard stop, 2026-10-19)

Not committed: the four adapter files under `packages/playtester/examples/` (smallworks-*, neighbours-*) are staged but their commit is waiting on 1Password signing. Target 2026-10-26.

HF requests (to be moved to docs/game-requests-2026-10-18.md, target 2026-10-26):
- **SW-1, mental effort should fill the slow fatigue store.** Confirmed (2.8.0 dist): the store fills only from physical effort above `depletionFloor` 0.3; bench work (effort 0.03 to 0.08, high focus) never tires anyone across a week. Proposal: an optional, off-by-default focus term in the fill. Workaround: none honest; Small Works leaves fatigue to sleep pressure.
- **SW-2, `alongside` should accept a voice.** Confirmed (types): `alongside` takes PersonIds weighted by closeness; the player is a voice with no closeness. Proposal: allow a voice, weighted by that voice's trust. Workaround: lessons use a player suggestion.
- **Supports Valley 5.** Confirmed: `restore` re-stamps the engine on each person, so a host comparing `restore(saved)` with `saved` rejects every older save after an upgrade. Workaround: normalise the engine stamp in the host.
- **Neighbours 4a, perceived unfinished shared work.** Confirmed: repairs 0 of 6,699 chances without a goal, 30 of 369 with a goal adopted on seeing the damage (`hall-care.ts`, adoptGoal/abandonGoal). Proposal: a documented recipe or helper. Assumed: other games hit the same pattern.

Game status:
- Small Works: live at 5623597, HF 2.8.0, engine small-works@5, CI green. The remaining items are deferred to 2026-10-26 in that repo's HANDOFF.md.
- Neighbours: 9094b17 (local, not pushed); a second commit is waiting on signing. Live is still e3d0382 / HF 2.6.0. Remaining, target 2026-10-26: regenerate the evidence and three tapes (about 10 opus calls through the local `claude` CLI) with phase-d-regeneration.md; run check-evidence, parity and the browser suite; push, CI, deploy, /release.json; HANDOFF and bead nbh-01z.37. A: 40/40 with no retry. B: the host's cause is fixed by hall care.

## Neighbours (final report 2026-10-19, target 2026-10-26)
- State: 9094b17 is committed locally and unpushed. The crash fix, the browser tests and the five playtests are staged. The live site is still e3d0382 on HF 2.6.0.
- Steps, in order:
  1. Commit the staged work once signing works.
  2. Regenerate the evidence and the 3 replay tapes (about 10 opus calls), and write phase-d-regeneration.md.
  3. Run check-evidence, parity and the full browser suite.
  4. Push, wait for CI, deploy, and verify /release.json.
  5. Update HANDOFF.md and the bead nbh-01z.37. HANDOFF still has the wrong diagnosis for A.
- Playtester fixes:
  - hints that stay after they stop applying;
  - "Open/Keep this section" options that don't say which section;
  - a duplicate journal line;
  - lab readouts shown to players;
  - Sam is hungry with no way to eat.
- Design: residents should bring requests to the player, and the player should be seated at evenings. Verdict: "the town does not need me".
- HF request 4a: a recipe for "perceived unfinished shared work".
