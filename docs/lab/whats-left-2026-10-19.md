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
