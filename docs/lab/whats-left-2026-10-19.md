# What's left (2026-10-19, soft stop)

Owner, 2026-10-19: "slow down on the Claude usage … we can move most of the stuff to codex. Keep note of what's left."
From here on, Codex does the work by default. Claude handles only design judgement and reviews that need taste.

## Outcome of the soft-stop queue (2026-10-19)

- Colony, Voice and The Night Watch: all three original branches and their staged playtests committed and merged. First public delivery verified at `8b25c28`; follow-up corrections are in `3e069af`.
- Neighbours: Phase D and the crash fix are committed locally. Evidence and tape regeneration still block publication; no Claude calls were made.
- Valley and Warren: their existing rounds remain intact; CI and the lab integration are delivered below.
- Bake-off: [agent routing](agent-routing.md), both Selin playtests and the merged ledger are committed and pushed in `e4800fb`.

## Codex work completed

- [x] Add CI workflows to pass, glance, murmur, valley, stairwell and warren. All six first runs passed; the later integration/upgrade runs passed too.
- [x] Add lab-client to Rope, Small Works, Neighbours, Valley, Stairwell, Warren and the in-site games. All use released client 0.1.1; Neighbours is committed locally and held behind its evidence gate. The in-site source is `3e069af`.
- [x] Fix Rope's empty `/release.json`: build stamping and service-worker bypass are deployed and checked against the exact commit.
- [x] Speed up `gate.test.ts` without dropping any of its 144 paired simulations or four assertions. Committed in `e4800fb`; the reviewed isolated gate ran in 8.87 s.
- [x] Fix harness seed arguments, multi-word commands, `show` and `chronicle` (`3e069af`).
- [x] Fix confirmed text/state inconsistencies (`3e069af`): Night Watch's false thaw success, zero-loss and mixed-breach raid narration, proposal/practice loops; Voice's end ticks, summary counts and stable pick numbering; Colony's injury display. The 2026-10-20 earlier-frame replay confirmed the Watch map report: co-located watchers were hidden after the first. The map and harness now show each occupant, with a regression; all three retained rule hashes still match ([findings](../findings.md)).
- [x] Commit Small Works and Neighbours playtester adapters (`f1e9c4a`, included in main).
- [x] Fix the lab worker review findings in [reviews](reviews/) (`3e069af`): resumable aggregation replaces the first-600 cutoff; bounded preview and JSON complexity replace unbounded work; IPv6 /64 keys share rate limits; unknown games and unreviewed labels are rejected; opt-out crosses tabs; late writes after midnight are retained; conditional reservations cap daily uploads. Raw data already deleted by the old worker cannot be recovered. Over-bound legacy days stay retained for offline recovery.
- [x] Fix two additional review findings: mixed-breach Watch narration preserves legacy scenario-9 continuation; Voice exports survive restart and ignore stale worker/build replies. The Voice bug was reproduced and retested through the mounted React hook in a browser.

### Delivered external consumers

All entries below use client 0.1.1. Their signed commits are pushed, their checks passed, and live manifests and JS/CSS bytes matched clean builds. Rope has no current CI workflow; the other seven exact-commit CI runs passed.

| Game | Commit |
|---|---|
| Pass | `156c064` |
| Glance | `5e6e2f2` |
| Two Voices | `1ffe13e` |
| Rope | `9203659` |
| Small Works | `ccf367f7` |
| Valley | `8177e467` |
| Stairwell | `5f3b463d` |
| Warren | `ed0f65d0` |

Client asset: [lab-client-v0.1.1](https://github.com/adam0white/human-framework/releases/tag/lab-client-v0.1.1). Its public download was fetched and its SHA-512 matched the fresh packed consumer. The npm publish workflow correctly skipped the absent package; first publication is `deferred-by-owner` (2026-10-20), with no date. Final HF deployment and live browser receipts are recorded in `scratch/codex-finish-report.md`; `/release.json` identifies the live source.

## Next work: owner
- **`deferred-by-owner` (2026-10-20), no date:** first lab-client npm publication and trusted-publisher setup. When resumed: `npm login`, then `npm publish -w packages/lab-client`, then add the trusted publisher.
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

Committed and pushed: the four adapter files under `packages/playtester/examples/` (smallworks-*, neighbours-*) landed in `f1e9c4a`. Signing is available; no signing setting was disabled.

HF requests (to be moved to docs/game-requests-2026-10-18.md, target 2026-10-26):
- **SW-1, mental effort should fill the slow fatigue store.** Confirmed (2.8.0 dist): the store fills only from physical effort above `depletionFloor` 0.3; bench work (effort 0.03 to 0.08, high focus) never tires anyone across a week. Proposal: an optional, off-by-default focus term in the fill. Workaround: none honest; Small Works leaves fatigue to sleep pressure.
- **SW-2, `alongside` should accept a voice.** Confirmed (types): `alongside` takes PersonIds weighted by closeness; the player is a voice with no closeness. Proposal: allow a voice, weighted by that voice's trust. Workaround: lessons use a player suggestion.
- **Supports Valley 5.** Confirmed: `restore` re-stamps the engine on each person, so a host comparing `restore(saved)` with `saved` rejects every older save after an upgrade. Workaround: normalise the engine stamp in the host.
- **Neighbours 4a, perceived unfinished shared work.** Confirmed: repairs 0 of 6,699 chances without a goal, 30 of 369 with a goal adopted on seeing the damage (`hall-care.ts`, adoptGoal/abandonGoal). Proposal: a documented recipe or helper. Assumed: other games hit the same pattern.

Game status:
- Small Works: live at `ccf367f7`, HF 2.8.0, client 0.1.1; checks, CI and exact live assets verified. The scenario-design work remains deferred to 2026-10-26 in that repository.
- Neighbours: `9148a96` on `neighbours`, committed locally and unpushed, including Phase D, the crash fix, lab integration and client 0.1.1. Live remains `e3d0382` / HF 2.6.0. No evidence, tape or provenance was rewritten.

## Neighbours publication gate (target 2026-10-26)

- The crash fix is signed commit `1d47c6b`. A rejected intervention now leaves the Python engine usable rather than turning a refusal into a fatal bridge error. Combined local integration checks are recorded in that repository's HANDOFF.
- Current evidence fails its package-lock source digest. Zero-call tape replay rejects changed source. The three tape generators invoke Claude CLI. Under the original no-Claude instruction, publication stays blocked; Neighbours was neither pushed nor deployed.
- Next: regenerate evidence and all three tapes, write `phase-d-regeneration.md`, run check-evidence/parity/full browser gates, then push/deploy from `neighbours` and verify the live release. The existing `nbh-01z.37` and that repository's HANDOFF own the remaining work.
- Retained playtester follow-ups: stale hints; unnamed Open/Keep section options; duplicate journal line; lab readouts in player views; Sam's hunger without an eating option. Residents bringing requests and the player sitting at evenings remain design work. Verdict: "the town does not need me".
- HF request 4a remains a recipe for perceived unfinished shared work. No new HF faculty or 2.10 slice was started.
