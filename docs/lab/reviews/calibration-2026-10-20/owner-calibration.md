# Owner verdicts vs source-unread LLM players, per game

Read-only research, 2026-10-20. No repository file was edited. Every inference is marked (inferred). Every unknown is marked unknown.

## How to read this

- "Owner" is Adam. He directs these games, so he is never a cold player in the sense of not knowing the design. Whether he was cold to a given build is judged per game below (inferred).
- "LLM player" is a source-unread Codex (or Claude) persona that played the live build on a phone. The Codex sessions in `docs/lab/reviews/{clarity-retest,clarity-followups,design-round,patterns}-2026-10-20/` ran 360x690, touch, with an eight-minute ceiling. Elapsed times below come from those reports. "LLM reviewer" (the adversarial fun reviews) is a different thing and is kept separate.
- Verdict words (keep, quit, mixed) are the ledger's (`docs/lab/feedback-ledger.md`), which classifies them. Where I read the report myself I say so.
- Build identity: the LLM reports almost never record a game build ("no build identifier seen"). Commit ids come from the folder READMEs and ledger rows. I compared them with the owner's commit by git ancestry.

## Headline findings

1. **No LLM session in the four 2026-10-20 review folders is confirmed to have run on the build the owner played.** For rounds 3 and later (README gives commits), the owner build is a strict ancestor of every LLM build for every game with a 2026-10-20 owner note. Clarity-retest round 1 (about 08:10 UTC) records no commit; the README says only that it ran after the first-minute clarity fixes. Whether a gameplay change landed between the owner build and that round is not confirmed. The owner build is the 2026-10-19 ~23:06 deploy (glance 5e6e2f2, murmur 1ffe13e, rope 9203659, stairwell 5f3b463, warren ed0f65d; valley unknown, see below). The LLM sessions ran on later builds, after the owner's feedback had already been fixed.
2. **The nearest pair of builds is Murmur; Rope is not a confirmed same-build pair.** Murmur: four 2026-10-19 LLM sessions ran on 4fc01c6, two gameplay commits before the owner's 1ffe13e (dcadc48 polish round, then 50f9366 "First-timer fixes"); only the Haiku first-timer ran on dcadc48, one gameplay commit away. Lab telemetry and CI commits also sit between. Rope: the first-time LLM of 2026-10-18 named "Worker 72e3be13"; the owner's file names no worker id, and the Fable file says there were several deploys that day (footer HF 2.5.0, bundle later 2.6.0). Same build is not confirmed. The late-casual LLM played a local build that already had the owner's fixes. Rope notes are coordinator-relayed summaries, not full reports.
3. **Symptoms mostly agree. Verdicts often do not.** The owner and the LLMs hit the same confusion (goal, what is clickable, what is important, why actions are limited). The owner still gave positive or "good start" verdicts on every game with those symptoms, except Rope. Most LLM sessions of 2026-10-20 ended in a voluntary quit at 2:30 to 6:35.
4. **Owner-liked and LLM-also-kept:** Glance, Stairwell (partly), Murmur (partly). **Owner-liked and LLM-quit:** The Pass, Twice at the Well, The Valley, The Warren. **Split:** The Night Watch (4 LLM sessions: 1 keep, 1 mixed, 2 quit). **Owner-disliked and LLM-liked:** The Rope (partly; same build not confirmed).
5. **Time played is unknown for the owner on every game.** Nothing in the owner files or lab inbox records real minutes. The only direct statement is Valley: "after little play". Input counts and game-minute exports exist (below). They show multiple runs per game for Glance and Murmur and a full six-night run for The Pass. That suggests longer total play than a 3-5 minute LLM session (inferred), but it is not measured.

## Summary table

| Game | Owner verdict (date) | Owner build | LLM outcomes (2026-10-20 unless noted) | LLM main complaint | Symptoms agree? | Verdict agrees? | Same build? |
|---|---|---|---|---|---|---|---|
| Glance | "Definitely fun." / "Love the simplicity and the hidden layer behind." Mixed on clarity (2026-10-20) | 5e6e2f2, HF 2.8.0 | Priya keep 5:55; Ngozi keep 6:19. 2026-10-19 builds: Priya 7/10 keep-ish, Tomas keep, Jade quit, Gwen quit/mixed | Reading timestamps ambiguous; sheet and menu reachability | Partly (owner: goal, end, weir/river; LLM: timestamps, controls) | Yes (both keep) | Not confirmed. LLM builds 60919d2 (after) and 4e2f35a (before: 6 commits, 3 gameplay, and HF 2.7.0 vs the owner's 2.8.0) |
| Murmur | "this goes to the top. We need more!" (2026-10-20) | 1ffe13e, client 0.2.1 | Keep: Priya 3:30, Tomas 4:23 (design round). Mixed: Leyla 4:45. Quit: Farah 2:51, Lina 2:48. 2026-10-19 (4fc01c6/dcadc48): bus driver 7/10, skeptic 7/10, story-seeker mixed, first-timer mixed, min-maxer quit | Taps against her leaning often fail; repetition; "I do not feel useful" | Partly (owner complained about redundancy and a false "same as yesterday" line; LLMs about influence and repetition) | Partly. Half keep, half quit; none as enthusiastic | Closest of the six: 2026-10-19 LLM builds are 1 (dcadc48) to 2 (4fc01c6) gameplay commits before. Not identical |
| Stairwell | "Irresistibly enjoyable ... second great success" (2026-10-20) | 5f3b463 | Hamid keep 4:55 (satisfied, "would come back to sit with Tarik"); Deniz quit 2:54. 2026-10-19 round 2 on 4b2e041: Murat keep, Hale keep, Deniz mixed, Bayram mixed | Wanted a longer gap, not this ride; small items below the fold (2026-10-19) | Partly (owner wants hidden story paths and more log room; LLMs asked for stories that go somewhere) | Partly (owner very positive; LLMs positive about story, cooler about ride) | Not confirmed. 4b2e041 is 1 gameplay commit before owner; 9f1f216 after |
| Rope | 2026-10-18: "rope was not that fun. Maybe not my type. Keep it though." 2026-10-19: "still not for me". 2026-10-20: bug report only | 2026-10-20: 9203659 | 2026-10-18 first-time (deployed build): "Yes, for one more climb". Late casual: "I liked it, but I lost control". 2026-10-20: Hanna quit 5:44; Mateo quit 4:38; Signe mixed 6:05 | Cannot tell whether orders took effect; cause of refusals | Yes, partly (owner: nothing to decide, waiting; LLMs: orders not visibly executed) | No. Owner "not for me", first-time LLM "yes" | Rope 2026-10-18: not confirmed (several deploys that day). 2026-10-20: not same |
| Warren | "Good start." Wants UI, usability, gameplay, understanding (2026-10-20) | ed0f65d, client 0.2.0 | All quit or mixed: Ilse 6:05, Bao 4:43, Tunde 4:45, Mirela 6:35, Kofi 5:57, Ines 5:14, Yusra 4:30, Teodor 4:41 (mixed) | Cannot tell if people are safe; panel/phone clipping; goals unclear | Yes, strongly. Same ask: what is the goal, what is the state | Roughly. Owner "good start", most LLMs quit but several "would return on a larger screen" | Not confirmed. All LLM builds later than ed0f65d (first LLM build 3 deploys later) |
| Valley | "good start but I had no idea what we're supposed to be doing" ... "potential to become a deep, fun game." (2026-10-20) | Unknown. Not in owner file (inferred: 8177e46 or earlier) | 2026-10-20: Elif quit 2:50; Hatice quit 3:20. 2026-10-19 (6ecb85c / fc20970): casual quit, story-seeker quit, literary quit, veteran mixed/keep, edge-pusher mixed/keep | Phone panels: scrolling to read replies and numbers | Yes. What is clickable, text hierarchy, what the due is | No on keep/quit: owner "keep" (F-204), LLMs quit. But LLMs say they would return for the families on a larger screen | 2026-10-19 round 2 (6ecb85c) is 2 gameplay commits before the likely owner build. Not identical |
| The Pass | 2026-10-19: "I see great potential ... I need more!" | 3c1faa9 (HF 2.7.0, pass@1, 2026-10-18) | 2026-10-20 builds pass@5 to pass@8: all quit at 2:33 to 4:45 (Tomas, Joon, Rosa, Adaeze, Tomasz 3:09, Mateus, Siobhan; Tomas stop time not extracted) | Re-asking cooks back to stations; mostly watching; label changes | Partly. Owner also saw break-refusal workaround and dead stretches | No. Owner keep, every 2026-10-20 LLM quit | No. LLM builds are pass@5..8, 3+ editions later |
| Night Watch | 2026-10-05: "this is already a game, and an interesting one" | d48d8f6, HF 2.0.0 | 2026-10-20: Marek mixed ~4:14; Sofia keep 4:36; Callum quit 3:37; Dara quit 3:59 | Waits, unclear consequences, phone layout | Yes (owner: slow, "feels bad kind of a slow", unclear speed, no feedback on training) | Partly. Owner graduated the game; LLMs mostly quit | No. 15 days and many fixes apart |
| Well | 2026-10-03: "I like this simulation. It leaves one desiring more." Main problem: goals never stated | 5466c8c, desktop | 2026-10-20 phone: all quit, 3:29 to 4:57 (8 of 8) | Phone presentation; cannot watch workers while ordering | Yes on goals-unstated style issues; different surface | No, but different device (desktop vs phone) and build | No |
| Voice | 2026-10-04: "Second game is much longer, I like it." | 456c794 / 577874b, S26 phone | Keep: Nadia, Ingrid (patterns). Mixed: Leila. Quit: Selin, Amara, Marguerite, Yusuf, Esra | Conversation shown as instruction form; "Fine" over the same exchange | Partly | Partly | No |

Games with no owner verdict found: Neighbours, Small Works (repair), Goodhands, Hearsay. LLM-only.

## Per-game detail

### Glance

Owner (file `glance/docs/playtests/owner-2026-10-20.md`). Three runs from the notebook, all commit `5e6e2f258b56`, HF 2.8.0, client 0.1.0. Sent about 05:00 UTC (midnight CDT), by the lab inbox hour (inferred from `index.json`). Device unknown. He played this three times in a row (three notebook sends), so he is not a one-shot cold player on this game (inferred). Whether it was his first look at this build is unknown.

> is there an end to this? Can't tell. Definitely fun.

> Still a bit confusing; the weir, the river, what to do, the gate levels; but getting better.

> Love the font showing the sleep visibly. Love the simplicity and the hidden layer behind. Only missing piece is a goal and a bit more knowledge at the beginning. I think showing the end-day report at the beginning for 10 seconds tutorial would be fair. Good job.

Run size (from lab inbox replay files): 74, 26 and 8 inputs. They ended at the dawns after Thursday, Tuesday and Monday respectively (from the game's own notes). Chronological order of the three runs is unknown. `index.json` lists runs newest-first by hour, so a file order of 8, 26, 74 inputs is possible (inferred, weak); if so his sitting grew longer each time, a pattern no LLM showed. Real minutes unknown.

LLM players:
- Priya (clarity retest, live build, commit unknown): keep, 5:55. "I would return voluntarily for Tuesday on another train ride." Complaint: a reading timestamp "may mean two different things". She said the opening purpose was clear: "Good, a dam and a town. That is a job I understand." That is the opposite of the owner's "missing piece is a goal". Not a contradiction: the retest ran after the clarity fixes (inferred).
- Ngozi (follow-up, glance 60919d2): keep, 6:19. "I would return voluntarily to test a different approach to Dai's sleep."
- 2026-10-19, build 4e2f35a, 360x780, scripted driver: Priya 7/10 ("I'd keep playing for the information puzzle"), Tomas keep, Gwen mixed/quit ("I sat watching the clock and the dam went over"), Jade quit ("I mostly watched it happen. 5/10").
- Clarity audit (Codex, 3-4 minutes, build after owner): DL-6 FAIL for Glance because the mandatory intro plus sample report put the start button below long text. The owner asked for exactly that sample report, so this tests the owner's own fix.

Judgement. Symptoms: partly agree. The owner wanted a goal and an end; the 2026-10-19 LLMs did not complain about the goal (they complained about gate orders and reading bias). Verdict: agree (both keep). Same build: not confirmed. The LLM builds are 4e2f35a (4 commits before the owner build) and 60919d2 (after).

### Murmur

Owner (file `murmur/docs/playtests/owner-2026-10-20.md`). Two runs, commit `1ffe13e4a1b1`, HF 2.8.0, client 0.2.1. Both about 05:00 UTC. Firefox; device unknown. Time of night: "almost 1 am (I slept and woke up, don't worry)". 40 inputs per run. Real minutes unknown. Second run marked "owner, proud".

> Still so much fun. We both need more of the same as well as other campaigns.

> Wow. It's just the right amount of expiring decisions, backstory, the buildup, habits, everything. Just wow.

> If it's time that we rank the games, this goes to the top. We need more!

> This one needs no further tutorial, it becomes self evident.

Complaints: "'Coffee. Same as yesterday' wasn't the same as yesterday." and "Redundancy, let's eliminate it" (outcome shown twice). "Some sentences can be slightly longer to clear confusion."

"Still so much fun" implies he had played an earlier Murmur build (inferred from the word "Still"). Not a first cold read.

LLM players:
- 2026-10-19, builds 4fc01c6 / dcadc48 (the nearest to the owner build), scripted, full week: bus driver 7/10 ("I'd open it again tomorrow on my break"), skeptic 7/10 ("gentle, well-written week"), story-seeker mixed, first-timer mixed (outcomes "felt unfair"), min-maxer quit ("By Wednesday I was waiting for scripted scenes to finish, not choosing").
- Clarity retest Leyla (mixed, 4:45): "I would return to try sitting with Ece."
- Follow-up Farah (murmur 82cc0d6): quit 2:51: "this sequence of taps felt too much like watching her follow the other voice." Lina (a9447c2): quit 2:48: "I just do not feel useful."
- Design round, murmur 0.3.0: Priya (052ad26, keep, 3:30), Tomas (60a10ec, keep, 4:23). Both "would return voluntarily for a short session".
- Fun review (LLM reviewer): "Keep 0.3.0, but do not call quitting fixed."

Judgement. Symptoms: partly agree. Owner saw redundancy and one false recall line. LLMs saw repetition and low influence. Both are "same lines repeat". Verdict: partly. Two of five 10-20 sessions kept. None matched "goes to the top". Same build: nearest pair of all games (1 gameplay commit and telemetry), but not identical.

### Stairwell

Owner (file `stairwell/docs/playtests/owner-2026-10-20.md`): one run, commit `5f3b463defc1`, HF 2.8.0, client 0.1.0. 93 inputs, game minute 1260 (Monday 21:00, inferred from minute/60), phase night. Real minutes unknown. Device unknown. He suggests "more room on bigger screens, including phone" for the log, which suggests he did not see it at phone size in this session (inferred, weak).

> Irresistibly enjoyable. I can't stop making up something about everyone (though good things only, for now at least)!

> This is a game of gossip, such relatable, and I need this to be expanded greatly.

> I'll come back and play this more.

> This game is the second great success. Congrats!

LLM players: 
- 2026-10-19 round 2 (4b2e041): Murat "Yes, I'd open it tomorrow, mostly to find out who the man at Derya's door is"; Hale keep; Deniz mixed; Bayram mixed ("nearly quit on Wednesday").
- Clarity retest Deniz (quit 2:54): "I might open it later to provoke another resident, but I did not yet want to manage the whole week."
- Follow-up Hamid (keep 4:55, stairwell 9f1f216): "The bread round is done. That is enough for this delivery break. I would come back to sit with Tarik when I have a longer gap."

Judgement. Symptoms: partly agree. The owner's wish (stories that go somewhere) matches the LLM complaint "the parcel ... went nowhere" (F-153). Verdict: partly agree. LLMs like it but stop after one bread round. The owner's "irresistibly enjoyable" is stronger than any LLM. Same build: not confirmed.

### Rope

Owner, three files:
- 2026-10-18 (Hollin, seed 334144833, 40 inputs, game day 05:00 to 23:00): "It's my fault, but rope was not that fun. Maybe not my type. Keep it though." and "Get an agent to iterate on that." Assumed about 4 real minutes at normal speed (the lab's own assumption, not measured). The export holds game minutes only.
- 2026-10-19 (Kestrel, climb 3 of the season): "Okay the rope is still not for me though I'm glad the issues are fixed. I had another funny take at it if you want to investigate."
- 2026-10-20 (commit `92036592ea70`, HF 2.8.0, client 0.1.0, 37 inputs, game minute 5700): "Speed ran things, after auto ending the night it still didn't end". This is a bug report, not a taste verdict. The lab classifies it "quit".

By his 2026-10-19 note he had already played climb 3, so he knows the game; not cold.

LLM players:
- 2026-10-18, deployed build (Worker 72e3be13), first-time Darkest Dungeon fan (coordinator-relayed): verdict "Yes, for one more climb." Refusals "in a real voice" were a hook.
- 2026-10-18 late casual (local build with owner fixes, about 11 real minutes, Opus): "A cozy, sad little hiking story where your friends actually ignore you. I liked it, but I lost control of my group fast."
- Fable: "The fiction holds ... What is broken is the player's seat."
- 2026-10-20: Hanna quit 5:44: "I wanted to care for this group, but did not trust my understanding of whether my instructions had changed anything." Mateo quit 4:38: "I quit because I could not tell how to make the physical help I wanted happen." Signe mixed 6:05: "I would come back to finish the walk."

Judgement. Symptoms: agree in kind. The owner reported nothing to decide, refusals with no stated reason, orders without visible effect. The LLMs reported the same cause. Verdict: **no**. This is the one game where the owner disliked it and LLM players (a first-time persona on a 2026-10-18 deploy; and a late casual on a local build that already had the owner's fixes) said they liked it. Rope shows the LLMs can like a game the owner does not (taste differs, or the LLM persona is gentler). Same build: not confirmed for 2026-10-18 (several deploys that day); 2026-10-20 not the same.

### Warren

Owner (file `warren/docs/playtests/owner-2026-10-20.md`): run `r-yzbd6wq2da`, commit `ed0f65d0f29c`, HF 2.8.0, client 0.2.0, exported 2026-10-20 06:20 UTC. 25 inputs, game minute 7110 (about 4.9 game days). Real minutes unknown. Device unknown, probably a desktop or tablet (he noticed an "extra scroll" of 61 px, which the lab reproduced at 360x780, 412x891 and 1440x900).

> Good start. We need improvements in UI, usability, game play, understanding.

> I need to understand the goals, and current state better, and just what are we doing here.

> It can start as more zoomed in and go out as we build larger base.

LLM players: all eight quit or mixed, 4:30 to 6:35. Examples. Ilse quit 6:05: "I wanted to keep everyone safe, and two people have been hurt while I was trying to find out what to do." Bao quit 4:43. Tunde 4:45: "I still cannot say these people are safe." Teodor mixed (natural stop 4:41): "I would return on a larger screen."

Judgement. Symptoms: **agree strongly**. Both say the goal and state are unclear. Verdict: roughly agree. The owner says "good start" and wants more; most LLMs quit but name digging and villagers as appealing. Same build: not confirmed. First 2026-10-19 LLM build 3dc00d6 and 6ed1783 are earlier. 9eaf251 is 5 commits before the owner build (round 3 gameplay change 8963225 sits between).

### Valley

Owner (file `valley/docs/playtests/owner-2026-10-20.md`). No commit id, no run id. The lab notebook refused the run ("too complex or too large") "after little play", so the owner downloaded the export (seed 406153184, day 12, game minute 17550, 16 inputs, 2.98 MB). Build: unknown. Likely 8177e46 or earlier (inferred): the owner's notes were committed at 7541433 before any fix commit. Device unknown. Likely not cold on the game (he had the design), but he said "I had no idea what we're supposed to be doing", so the screen was cold to him.

> Yeah this is looking like a good start but I had no idea what we're supposed to be doing here. What's clickable? Which text is the important parts since there are too many?

> Why I can only do a few things, will I be able to keep doing them, why do I do them? What comes next?

> the dates and important things should stay in English since we aren't translating the entire game.

> This one has the potential to become a deep, fun game.

(Ledger: F-201 and F-202 "mixed", F-203 "-", F-204 "keep".)

LLM players:
- 2026-10-19 round 1 (fc20970) and round 2 (6ecb85c): casual phone Haiku quit ("I'd put it down around 6 Agustos, after about 50 taps"), story-seeker quit ("Score: 4/10"), literary reader quit on wedding invitations, EU/CK veteran mixed, edge-pusher keep on the "rewarding" edge, grand-strategy fan mixed, train commuter quit.
- Clarity audit: DL-2 FAIL, houses look like decoration; DL-6 FAIL, about 80 words before Begin. These match "What's clickable?" and "too many texts".
- 2026-10-20 patterns round: Elif (a5d4c2b) quit 2:50, Hatice (36324e4) quit 3:20: "I would return for the families, but not voluntarily for this phone reading layout."

**Key question 1 answer.** Yes. The owner reported the same symptoms the LLMs reported and still gave a positive overall verdict. Verbatim: "a good start" and "the potential to become a deep, fun game." The LLMs also said they wanted to help the families, but quit. Their verdict was a quit for presentation reasons, the owner's was a conditional keep (inferred: he kept playing to day 12 before sending).

Judgement. Symptoms: agree. Verdict: no (owner keep, LLMs quit; both conditional on the UI). Same build: not confirmed.

### The Pass

Owner (file `pass/docs/playtests/owner-2026-10-19.md`): commit 3c1faa9 (HF 2.7.0, 2026-10-18 23:39), all six nights, 97 inputs, seed 1984246569, won the week (₺5,720 against ₺5,200, 143 of 149 tables). Real time unknown. A full six-night run is the longest owner session on record (inferred).

> The pass is interesting, definitely. I see great potential in it. Time management, a classic with a twist of better simulated human beings. ... Improve pass, too, including extending it coz I need more!

Ledger classes this "keep" (F-013). The file notes he made no input for 134 minutes on Tuesday and still fed 20 of 20. The lab reads that as dead time he did not mind (inferred).

LLM players (2026-10-20, pass@5 to pass@8, builds a606f2d, d26fc06, 7116cfc, 19419a9, bf28f56, d3d3439): all quit at 2:33 to 4:45. Examples: Joon "asking cooks back to stations was more of the activity than the food"; Rosa "I would not start another service now"; Siobhan "I would not return voluntarily for this kind of eight-minute break". 2026-10-19: Mira (cozy) keep, speedrunner quit.

**Key question 2 answer (owner liked, LLM quit).** The Pass. The owner played six nights and asked for more. Every 2026-10-20 LLM left after one service (7 of 7). The builds differ (pass@5 and later versus the owner's pass@1), so the disagreement is confounded by edition (inferred) and by session length (LLM budget was a persona break).

### The Night Watch (older owner verdict)

Owner, 2026-10-05 (file `docs/games/watch-playtest-2026-10-05.md`): live build d48d8f6, HF 2.0.0, desktop and mobile Firefox, years 2, 3 and 4 exported (272 inputs for year 4).

> Ok here's more feedback. Before the critical feedback, I want to say that this is already a game, and an interesting one nonetheless.

> I almost was gonna say that the game is too slow, but neigh, it's correctly human at human speed

> I got more people now but I'm less connected to everyone, and it's starting to feel repetitive.

He also wrote "Currently not much happens so it feels bad kind of a slow" and that the game froze and felt choppy. He played at least four in-game years (inferred from exports). Longest recorded owner session on any game (inferred).

LLM (HF site, after 2026-10-05): Marek mixed 4:14; Sofia keep 4:36 ("I would return voluntarily for a short session to hear Mara or Joss"); Callum quit 3:37 (bf9d176); Dara quit 3:59 (a64b93b). Complaint: waits and unclear consequences, "I still cannot judge the grain loss". Fun review (LLM reviewer): "keep the readable posting screen, but ... the waits and unclear consequences remain."

Judgement. Symptoms: agree (slow waits, unclear consequences). Verdict: partly (owner accepted; LLMs mostly stop at the first or second dawn). Same build: no, 15 days apart.

### Twice at the Well and The Day You Say Nothing (older owner verdicts)

- Well, 2026-10-03 (build 5466c8c, desktop, three runs): "I like this simulation. It leaves one desiring more." Main problem: "the sim is too easy and the goals are never stated" (relayed by the coordinator, so not verbatim). All eight 2026-10-20 phone LLMs quit at 3:29 to 4:57, mostly on phone presentation. Different device and build.
- Voice (Game 2), 2026-10-04: "Second game is much longer, I like it." and "it felt good to impact his life". Phone, S26. LLMs 2026-10-20: two keep (Nadia, Ingrid), one mixed, five quit. Different build.

## Answers to the key questions

**1. Same confusion symptoms as the LLMs, still a positive verdict?** Yes, in four games. Quotes:

- Valley: "this is looking like a good start but I had no idea what we're supposed to be doing here." and "This one has the potential to become a deep, fun game."
- Warren: "Good start." then "I need to understand the goals, and current state better, and just what are we doing here."
- Glance: "Still a bit confusing; the weir, the river, what to do, the gate levels; but getting better." and "Definitely fun."
- Glance run 3: "Only missing piece is a goal and a bit more knowledge at the beginning ... Good job."
- Murmur and Stairwell: owner had no confusion complaint; he said Murmur "needs no further tutorial". LLM clarity audits found confusion in the first minutes of Murmur (the one-line session goal and end condition, F-208).

The owner's positive verdict sits beside real confusion. He treats clarity as a to-do, not a reason to leave (inferred). LLM sessions of 2026-10-20 treat the same confusion as a reason to leave in most cases (they quit at 2:30 to 6:35).

**2. Owner liked and LLMs kept? Owner disliked and LLMs liked?**

- Owner liked and LLMs also kept: Glance (Priya, Ngozi, both keep). Stairwell (Hamid keep, plus 2026-10-19 Murat and Hale). Murmur (Priya and Tomas keep on 0.3.0, plus 2026-10-19 bus driver). Night Watch is split (Sofia keep, Marek mixed, Callum and Dara quit). All are partial: each game also had LLM quits.
- Owner liked and LLMs quit: The Pass, The Valley, The Warren, the Well (phone), Voice (mostly). The Pass is the clearest case: seven of seven quit.
- Owner disliked and LLMs liked: The Rope. The first-time LLM on a 2026-10-18 deploy (same build as the owner not confirmed; coordinator-relayed) said "Yes, for one more climb". The late casual said "I liked it". The owner said "rope was not that fun. Maybe not my type" and "still not for me". Later LLMs (Hanna, Mateo) quit and Signe was mixed, so it is not a clean contrast.
- No game where the owner disliked and every LLM liked it.

**3. How long did the owner play compared with the LLM sessions (3-5 min)?** Real time unknown.

Proxy, game time reached (not real time; labelled as such). The owner went further in game time than the LLMs on every game except Warren (inferred from reports and exports):

| Game | Owner reached (game time) | LLM stops (game time) |
|---|---|---|
| Glance | dawn after Thursday (longest run); other runs Tuesday and Monday dawns | one night (first-light report) |
| Stairwell | Monday 21:00 (minute 1260), 93 inputs | Monday 09:17 to 11:04 |
| Rope | full day to 23:00 | 09:31 to 11:44 |
| Warren | 4.9 game days (minute 7110) | 7 to 15 days (LLMs chose fast speed; 19 Aug to 3 Sep for Ilse) |
| Valley | day 12, 16 inputs | Hatice 22 July of year one |

Valley is the best length-matched pair: 16 owner inputs against short LLM sessions. The owner still said "potential to become a deep, fun game" while both LLMs quit. That sharpens the answer to question 1. Input counts and the inbox ordering (below) are the only other evidence. No owner file records real minutes. Evidence available:

| Game | Owner play evidence | Unit | LLM (2026-10-20) |
|---|---|---|---|
| Glance | 3 runs (74, 26, 8 inputs); ended at dawns after Thu, Tue, Mon | game inputs | 5:55, 6:19 |
| Murmur | 2 runs, 40 inputs each | game inputs | 2:48 to 4:45 |
| Stairwell | 1 run, 93 inputs, to Monday 21:00 | game inputs | 2:54, 4:55 |
| Rope | 37 to 40 inputs per run, one full day | game inputs | 4:38 to 6:05 |
| Warren | 25 inputs, 4.9 game days | game inputs | 4:30 to 6:35 |
| Valley | 16 inputs, day 12 ("after little play") | game inputs | 2:50, 3:20 |
| The Pass | 97 inputs, six nights | game inputs | 2:33 to 4:45 |

The LLM numbers are real seconds. The owner numbers are game inputs. They are not comparable without a replay on the same clock. The `.lab-inbox/replay/*.json` files hold input timestamps in game time only (`at` field), not wall time. Murmur's two runs were played at about 05:00 UTC; the owner says "almost 1 am". The lab inbox lists the glance runs at hour 05 UTC, murmur at 05, rope at 04, stairwell and warren at 06 (all UTC). Nothing gives start and end. For Glance and Murmur the owner sent more than one run in one sitting, and for the Pass he played six nights over a day or two. These imply longer cumulative play than a 3-5 minute LLM sitting (inferred), not proof.

Owner overall verdict on 2026-10-20 (`docs/lab/grand-ideas-2026-10-20.md`): "these games are becoming real fun. I need more of everything, more games and more grandiose ideas."

## What this means for calibration (inferred)

- The LLM persona sessions carry a built-in budget ("ten minutes until her stop", a lunch break). The owner has no such budget. Quits at 3-5 minutes partly measure the persona's brief, not the game (inferred).
- The owner's positive verdicts arrive together with the same clarity complaints. A clarity fix that moves LLMs from quit to keep may not move the owner at all, and a game the owner loves (Pass, Valley) can still show 7 of 7 LLM quits on a phone.
- Rope is the only owner-negative game, and it is the one where early LLMs were most positive. Use Rope as the contrast case when judging whether LLM enthusiasm predicts the owner.
- Device: the owner's 2026-10-04 and 2026-10-05 notes name S26 phone, desktop, mobile Firefox. For 2026-10-20 the device is unknown for every game. The LLMs ran only 360x690 phone, with one desktop look. Several LLMs said "I would try it on a larger screen" (Warren, Valley, Watch, Well). That is a device mismatch worth checking against the owner (unknown).
- To get a clean comparison, run one LLM session on the exact owner builds (5e6e2f2 glance, 1ffe13e murmur, 5f3b463 stairwell, ed0f65d warren, 9203659 rope, 8177e46 valley) from their git history. This was not done here.

## Sources

Owner: `../../../../docs/owner-directions-2026-10-18.md`; `{glance,murmur,rope,stairwell,valley,warren}/docs/playtests/owner-2026-10-20.md`; `rope/docs/playtests/owner-2026-10-18.md`, `owner-2026-10-19.md`; `pass/docs/playtests/owner-2026-10-19.md`; `human-framework/docs/games/watch-playtest-2026-10-05.md`, `playtest-2026-10-04.md`, `colony-playtest-2026-10-03.md`; ledger rows F-006 to F-019, F-184 to F-205; run metadata in `human-framework/.lab-inbox/index.json` and `replay/*.json`.
LLM: `human-framework/docs/lab/reviews/{clarity-retest,clarity-followups,design-round,patterns}-2026-10-20/`, `clarity-audit-2026-10-20.md`; 2026-10-19 persona files in each game repo; ledger rows F-020 to F-119 and F-206 to F-301. `t3-claude.md` and `t3-codex.md` are code reviews of lab telemetry, not play sessions, and are not used.
Build ancestry: `git merge-base --is-ancestor` and `git log` in each game repo.
