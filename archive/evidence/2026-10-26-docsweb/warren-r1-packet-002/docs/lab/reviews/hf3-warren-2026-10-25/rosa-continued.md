# Rosa Alvarez: Warren playtest (hf3-warren-r1, continued arm)

I played past the 15-minute floor and stopped at 925.9 s (about 15.4 minutes), reason **BORED**. I could not save `report.md`: I have no file-write tool, and each Bash call may contain only curl. This response is the full report for the coordinator to save.

## 1. Session details
- **Persona:** Rosa Alvarez, 62, retired school administrator from Puebla. Busy second-language reader.
- **Exposure:** first visit to Warren; I did not read the game's source.
- **Round, arm, paired session id:** hf3-warren-r1, continued, hf3-warren-r1-rosa-alvarez.
- **Pre-game diary:** my frozen free-branch diary from Voice (a different game). It contains no Warren history. This session is an alternative exposure, not a continuation.
- **URL:** https://warren.adamwhite.work. The visible title was "The Warren". No build number was shown.
- **Device:** 360×690 touch/light. I briefly switched to 1280×800 between 294 s and 300 s for the required check.
- **Access:** player driver at http://127.0.0.1:19607/, one curl POST per call.
- **Time limits:** floor 15 minutes, ceiling 25 minutes.
- **Player id:** none shown in the ordinary player UI.
- **Export:** none downloaded.
- **Screenshots:** `current.png`, `current-wide.png`, and the driver's own `first-minute.png`. That is three in total.
- **Harness limits:**
  - The harness has no drag operation. Every "drag" instruction in the game was done with single taps, one square at a time.
  - The game clock kept running between my requests.
  - Waits were real waits of 20–30 s.

## 2. First minute
My `first_minute` note was logged at 66.9 s, which is late; the checkpoint was due at 60 s. The original note says: "Reason to act: riders will attack, the village needs a shelter, and the line at top tells me the next job… Tappable: look, chalk, rub out, furnish, bell, Slow/Steady/Fast, plus/minus, Journal, the village. I could not drag; one tap of chalk worked when next to the wall, too far gave a reading that nobody can reach it… Chalk is selected. Slow is selected… First choice at about 5 s (chalk), first useful mark at 27 s. Two rereads already, before one minute. I do not know what the jars and little cups at the top mean."

| Item | Result |
|---|---|
| DL-1 A reason to act | **PASS.** "Dig a shelter where the village can survive attacks by riders," plus the top line "Choose chalk, then drag across stone beside the cellar." |
| DL-2 What can I touch | **PASS** for the tool buttons. The hill itself is tappable, but the squares are tiny. I did not know the jar and cup icons at the top meant anything, and nothing explained them. The visual look of the controls was checked on screenshot `current.png` (11 s). |
| DL-3 Urgency and selection | **PASS.** The top instruction line drew me first. "chalk" and "Slow" showed as pressed. Nothing felt urgent in the first minute. |
| DL-4 Why the limit | **FAIL.** I tapped stone "beside the cellar" and got "Nobody can reach that stone yet…" with "The chalk marks are beyond the dug space." I could not tell how far "beside" meant. Tapping directly against the wall freed it. |
| DL-5 Readable situation | **PASS.** "The dig is marked. If dug, this space would have about six sleeping places." Then "Meryem broke through the first chalked wall… coughing dust." |
| DL-6 A choice soon | **PASS.** The first choice (chalk) was available at 5.3 s and I took it at 17.5 s, before any long text. |
| DL-7 Learn by doing | **PASS.** Chalking, waiting, and then seeing Meryem dig taught me that people do the work, not me. I used no help in the first minute. Choices reached: chalk, plus 2 hill taps. |

## 3. Verbatim diary
Times are driver elapsed seconds; each line is input → what I saw → my reaction.
- **0.6, opening screen:** a checkbox reading "New rules for this new hill… Existing hills keep their rules." "What is a hill here? Do I need to tick it? **Reread 1.** I leave it as it is."
- **5.3, Begin** → Dawn · 19 Aug · year 1, the hill view.
- **17.5, chalk** → "A dashed outline marks where people can dig."
- **19.8, tap the stone right of the cellar** → "Nobody can reach that stone yet…" with the top line "The chalk marks are beyond the dug space. Mark a path to them from the cellar with chalk."
- **24.1, want_quit CONFUSED:** "**Second reread**… I touched beside the cellar, as it said. Beyond? I thought I was beside. I would leave here by my rule. I continue because I set the time aside."
- **27.4, tap against the wall** → "The dig is marked… about six sleeping places." "Good! Six sleeping places."
- **62.2, after waiting** → "Meryem broke through…" and "The harvest needs more room below. Mark open ground as a store for the jars."
- **71–76, furnish → store, tap the cellar floor** → "The store is marked." "Yes, store. Clear words."
- **78.5, The village** → a list of six people by household. "Meryem and Maryam, two almost same names, I must be careful… ordinary people eating at home."
- **84.9, beds** → 3 of 6 circles filled: "Riders reach these beds from the entrance."
- **99.2, chalk below the room** → the panel was titled "Plan preview". "Did it mark it or only show me? I cannot tell."
- **124.5, Journal** → "Kian… still needs to care for his sister Ada." "I like this diary… Ordinary people."
- **128.5, Information** → help panel "Chalk and marks". "Help is clear, short… But nothing says when riders come."
- **142.0** → "The water jars are dry. People need a well or water carried below." "A well? I did not see well in furnish."
- **179.4, bell, by mistake** → "No smoke or riders are in sight. The call lasts six game hours."
- **211.1, Journal** → "They looked at the bell, then at you." "**I laughed.** Yes, it was me." The same journal also said "A lamp beside a stone wall lets them dig there."
- **218.3, lamp** → "The lamp is hanging here now."
- **253.6:** "Night 24 Aug then Dawn 24 Aug, the night comes before the dawn on the same day."
- **261.9, door placed in the shaft** → "The door is marked." "I worked it out myself. Proud."
- **290.9** → "Saliha rolled it once to test it." Now there were nine circles. "Who is Saliha?… more people came and nobody told me."
- **294–300, layout check (requested, not spontaneous)** → described in section 6.
- **312, tap "furnish ▾"** → error: the button was now named "door ▾". "It takes the name of what I chose last."
- **364.6, beds in the deep part** → 6 of 9 places. "'False alarms can weaken trust.' Ah, so my bell mistake cost something."
- **398.3, beds on the left** → "There is space for everyone." "All nine circles full! Very satisfying, like a seating plan for a family party."
- **439, Steady**: "so the quiet days go faster."
- **474.9, want_quit BORED:** "Everybody has a bed, the journal repeats the same lines, Steady feels no faster than Slow."
- **475.9, Fast** → **507.9:** "Time is paused for your choice. Smoke rises on the ridge." "Smoke! Now it is real… Ring the bell."
- **514–520, Slow, then The village, then Master Yusuf** → "74… He is exposed above ground during the raid." His line: "This is good enough for me." The panel also said "You are the keeper and hold the chalk and bell." I read twice: "**Ask to compare the old map with the line where work must stop today**". "What old map? What line? I only want to say: please come down."
- **545:** I waited 20 s and the clock stayed frozen, because the village list was still open.
- **570** → "Riders searched the entrances and looked in… No one was struck. They may return with more riders." The journal said that each person "could still be seen… would have been caught". "My door did nothing; nobody shut it."
- **584, screenshot `current.png`:** the riders' message covered the top of the hill and the + button.
- **663** → "The scouts rode off north… Next time they may strike."
- **670.7, look at a red square** → "Unbuilt plan… cannot be reached." "I think this is my very first wrong tap; the game said nobody can reach it, but it kept the mark anyway."
- **687** → 12 places. **723:** opened the menu. "No easier mode, no bigger text."
- **790.9** → "The Duman family came up the road with a donkey."
- **871** → 15 places for 13 people.
- **905** → "The Tuncer family came…" and I was 2 beds short again.
- **919–923, Feedback** → pressed "I would stop here". I typed nothing and did not Submit.
- **925.9, stop BORED:** "I understood the loop: chalk, wait, beds, a new family… one tap at a time on very small squares, and I could not make anyone shut the door. I would not leave it running. Maybe I come back one day for the raid, but not soon."

### Concepts on every inspected screen
| Screen and purpose | New concepts (list every one) | Concept count | Sentences reread (verbatim) | Reason |
|---|---|---:|---|---|
| Title (0.6 s) | All games; Information; Game menu; shelter; village; riders' attacks; new-rules checkbox; hill; sleep/shelter outcomes; limited wild food; warned furnishing damage; existing hills; Begin; cross-game recording | 14 | "New rules for this new hill: sleep and shelter outcomes, limited wild food, and warned damage to furnishings. Existing hills keep their rules." | I did not know what a "hill" was, or whether I had to tick the box. |
| Hill view (5.3 s) | Date and time of day; year count; people circles; jar icons; bell icon; speed Slow/Steady/Fast; "time slows for new text"; chalk; cellar; zoom and fit hill; story line; Journal; look; rub out; furnish; bell tool | 16 | none observed | — |
| Chalk feedback (17–27 s) | Dashed outline; people choose when to work; reachability; dug space; reading panel; time paused for reading; sleeping-place estimate; entrance route; doors | 9 | "The chalk marks are beyond the dug space. Mark a path to them from the cellar with chalk." | I had tapped "beside" the cellar as told. |
| Furnish/store (69–76 s) | Store; beds; lamp; door rule (one square wide, open on two sides); grain jars; harvest | 6 | none observed | — |
| Village list (78 s) | Below/above ground; households; guest households; named people; current tasks; deaths count | 6 | none observed | — |
| Beds/plan preview (85–99 s) | Filled vs empty circles; plan preview; "dig deeper" | 3 | none observed | — |
| Journal (124 s) | Daily entries; loose stone; Kian's care for his sister Ada; route checks | 4 | none observed | — |
| Information (128 s) | Fresh air and light; maximum of three doors; tap people count to see who riders can reach | 3 | none observed | — |
| Water (142 s) | Water jars; well | 2 | none observed | — |
| Bell call (179 s) | Six-hour call; smoke as a warning; people may refuse | 3 | none observed | — |
| Journal (211 s) | Lamp needed to dig beyond daylight; trust | 2 | none observed | — |
| Door (261–291 s) | Carving when there is time and light; stone door groove; new families arriving | 3 | none observed | — |
| Wide layout (294 s) | Side story list; "Menu" label | 2 | none observed | — |
| Bell/door text (327 s) | A nearby adult may shut the doors; check other routes | 2 | none observed | — |
| Smoke choice (508 s) | Paused-for-choice dialog; "half a day or less"; Keep watching | 3 | none observed | — |
| Yusuf panel (518–520 s) | Age; needs (food/water/rest/care); exposed during raid; activity and words; keeper role; ask an adviser; old map; stopping line; End optional work | 9 | "Ask to compare the old map with the line where work must stop today" | No old map or line had appeared before this. My third reread, past my quit rule. |
| Scouts result (570 s) | Scouts vs raid; steps and levels as coordinates; "could be seen"; return with more riders | 4 | none observed | — |
| Scouts gone (663 s) | Pale tracks; north | 2 | none observed | — |
| Unbuilt plan (671 s) | Unbuilt plan; connecting passage | 2 | none observed | — |
| Game menu (723 s) | Paused while open; Feedback; Full screen; New game; Recording; Resume | 6 | none observed | Settings counted although I ignored them. |
| Feedback (919 s) | Three verdicts; optional note; name/tester id; share-run checkbox; What is sent; Submit; Back | 7 | none observed | — |

Nearly every screen added more than one new concept, which counts as a clarity finding under the protocol. The first two screens were the heaviest, with 14 and 16 new concepts.

## 4. Engagement
- **Best moment:** 398 s, "There is space for everyone." All nine circles were full. The 211 s line "They looked at the bell, then at you." was a close second.
- **Worst moment:** 518–570 s. Riders were coming, and old Yusuf "rests in the shade" with "This is good enough for me." I had no way to ask him to come down, and the door I built was never shut.
- **want_quit log:**
  - 24.1 s, CONFUSED: the second reread. It passed once a tap succeeded at 27 s.
  - 474.9 s, BORED: the quiet stretch. It passed when the smoke appeared at 508 s, then came back.
- **Pulses:**

| Time | Engagement (1–5) | Why |
|---|---:|---|
| 172 s | 3 | Liked the people; water dry, tiny map. |
| 357 s | 4 | Learning by doing. |
| 545 s | 4 | Smoke, worried about Yusuf. |
| 720 s | 3 | Mostly watching. |
| 910 s | 2 | The loop felt like homework. |

- **Hard, but kept going:** the squares were tiny and I kept missing them; the long top message covered the map; and there is no drag in this tool. At 723 s I looked in the menu for bigger text or an easier mode and found none. I stayed because I wanted to see the next raid and I cared about the families.

## 5. Clarity failures
- **DL-4 / DL-5 (19.8 s):** "The chalk marks are beyond the dug space." I did not know what distance "beside" meant. The refused mark also stayed on the map as an "Unbuilt plan", which I only found at 671 s.
- **DL-5 (99 s):** a panel titled "Plan preview" appeared and I could not tell whether my mark was placed.
- **DL-20 (518–520 s):** "Ask to compare the old map with the line where work must stop today". The old map and the line were not introduced anywhere I saw. Separately, the line "You are the keeper…" first appeared at about 520 s, more than 8 minutes in.
- **DL-3 (291 s):** three people arrived and the circle count changed. On the phone the only story line showed the door news, and the "Çoban family" arrival was visible only in the wide layout.
- **Silent stale state:**
  - The line under the hill said "Meryem… coughing dust" from 20 Aug until 23 Aug.
  - The top line went back to the opening cellar message at 670 s.
  - At 545 s I waited while time was paused, because the village list was still open, and nothing obvious told me.
- **Mechanics I could not resolve:** I could not make anyone shut the stone door. "Can choose" was the only explanation offered. This is about what I could tell, not a claim that no rule exists.
- **DL-13:** Feedback opened locally and worked. There was no "I'm stopping" or "I'm confused" choice, so I pressed "I would stop here". I typed no note and did not press Submit, so nothing was sent.

## 6. English, dates, layout, hands-on
- **DL-20: PARTIAL.** Most English was plain and I could act in it.
  - Main terms (chalk, store, beds, lamp, door) were explained on first use in the furnish menu.
  - "Hill" on the title screen and "old map/line" were not explained.
  - The help answered my question about the circles but not "when do riders come".
- **DL-21: PASS for reading dates.**
  - English dates crossed a month boundary without trouble ("31 Aug" to "1 Sep").
  - "Riders may arrive in half a day or less" was clear.
  - Quirk: the clock showed "Night · 24 Aug" before "Dawn · 24 Aug", and "Night · 11 Sep" before "Morning · 11 Sep". I had to work out that "Night" means the early hours.
  - No deadline was ever given to compare against today.
- **DL-22: PARTIAL, from screenshots.**
  - The immediate reply (top line, reading panel) was on screen at 360×690 without scrolling.
  - The hill itself is small, and the bottom half of the phone screen was empty (`current.png`).
- **DL-30: FAIL.**
  - At 584 s (`current.png`) the four-line riders message covered the top of the hill and the + zoom button.
  - The story line was cut off: "They were checking the village. No one was…" and "There were 4 people in the family.…".
  - In the wide layout (`current-wide.png`) the Tamar line was cut at "next time" at the bottom of the side list, and the hill area showed only empty paper, with no hill visible even after zooming in.
- **DL-31: NOT TESTED.** No order or answer sheet exists. With the village list open, the people count and date stayed visible.
- **DL-32:** the longest stretch of only watching was 401–508 s, then again 720–790 s. I wanted to make people safe and to move the story on. During the raid (514–663 s) I wanted to tell Yusuf to come below and could not.
- **DL-33: on the thing itself.** Digging, beds, lamp and door were all placed by tapping the hill. No form opened. Speaking to a person happens through their panel, which only offered adviser questions.

## 7. Stop
- **Where:** 925.9 s, after the Tuncer family arrived, at 11 Sep · year 1.
- **Reason:** BORED.
- **First want_quit:** passed after one tap.
- **Leave running?** No. I closed it rather than leaving it running.
- **Return voluntarily?** Possibly, much later, to see a real raid. Not soon.
- **Browser:** the coordinator can close it; I no longer need it.

## 8. Changes I would want
1. "Let me ask people to come below, or tell me plainly why they shut or do not shut the door."
2. "Make the squares bigger on my phone, and keep the message from covering the hill."
3. "Tell me when new people arrive, and say once at the start that I am the keeper."

**Cleanup:** I created no worktrees, branches, servers or workers. The three screenshots are within the limit, so none were deleted. I touched no repository, so `git worktree list` does not apply.
