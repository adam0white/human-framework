> Readable formatting view. The [integration note](integration-notes.md) links the byte-identical archived original and its source hash. Original words remain the evidence authority.

# Voice playtest: Leila Mansour, round hf3-voice-r1, continued arm

## 1. Session

- **Persona:** Leila Mansour, 26, translator from Alexandria.
- **Declared exposure:** "Return after completed own prior session". But my supplied diary says "No sessions recorded", so in practice this was a first visit. I am noting the mismatch rather than inventing a history.
- **Round/arm:** hf3-voice-r1, continued arm, session id hf3-voice-r1-leila-mansour.
- **URL:** https://human.adamwhite.work/voice/, played through the local driver at 127.0.0.1:19487.
- **Device:** primary 1280x800, keyboard and mouse. A short requested visit at 360x690 around 299 s.
- **Time:** about 912 s of real time (15.2 min). Game clock went from Ramadan 1 to Ramadan 15, 13:34.
- **Report file:** I did not write report.md. The brief only allows curl in Bash and I have no file-writing tool, so this response is the report for the coordinator to save.

## 2. First impressions

- **First minute (~58 s):** the title screen at 1280x800 (current-wide.png) looked clean. The live clock was already running; I lost the dawn mosque suggestion while toggling Urge/Insist, and the clock ran out at 05:14.
- **Early reactions:** the clock slipped away from me. I was curious about the mechanics but not gripped.

## 3. Verbatim

These are my log lines from this stretch, unedited. Earlier lines are in the raw JSONL the coordinator keeps.
- "Wait, now it says 600 lira owed to Osman, the goal line still says 300. Did the debt double because I missed something, or is it two payments? Nobody told me. And Hacer at the door again saying the Nuran lines."
- Pulse 2: "Mosque promise evaporated, the standing word just vanished and he went to the workshop instead. Nothing told me he dropped it. At least he is earning on payday. The 600 vs 300 thing bothers me."
- "Oh. He paid Osman while I was waiting, 2 lira left, 300 owed by Ramadan 30. So the 600 was two instalments. The payday I was worried about happened off-screen with no moment at all. Relief, but flat. Now the sheet finally does arithmetic for me: 242 by day 30 if mornings only. That is the kind of line I wanted from the start."
- "What? I pressed Take the afternoon shift and the screen says Your words 19:00, You: Which part of that memory stays with you? I never said that. Wrong line, wrong time stamp. Did my shift order go through or not? I cannot trust what I said any more."
- "Now it shows You: Take the afternoon shift at 13:05. So the earlier line was a stale leftover from some other moment. And again: after Hacer, I will do it. Same Hacer door, same delay, same promise he broke this morning."
- Stop, BORED: "Same sheet, same Hacer at the door, same after-this-I-will promise. The one big moment, paying Osman, happened while I was not looking. I understand the loop now and it is not giving me anything new to decide. I am done for tonight."

## 4. Moments

**What held me**
- **Good moments:**
  - The doctor visit.
  - Halil's "I did not want to say that to an empty room" when he called Selin.
  - Rıza as a small win.
  - The payday deadline, which gave the session some pull.
  - The money projection line near the end ("242 by day 30 if mornings only").

**What lost me**
- The same Nuran-at-the-table conversations with Hacer, over and over.
- Suggestions that vanish without a word.
- Paying Osman happening off-screen.

**Quit wishes**
- **~491 s, BORED:** the conversations repeated. This partly passed when the skip choice and the payday deadline came up.
- **~912 s, final stop, BORED.**

**Pulses**
| Time   | Engagement | Note                                                  |
| ------ | ---------- | ----------------------------------------------------- |
| ~178 s | 3          | the clock slipping away from me                       |
| ~350 s | 3          | curious, not gripped                                  |
| ~540 s | 3          | Rıza was a small win, but the dialogue felt templated |
| ~600 s | 3          | the payday deadline gave pull                         |
| ~774 s | 2          | the mosque suggestion evaporated                      |

## 5. Confusion and clarity

**Still confusing**
- 600 owed against a goal of 300. It became clear only after the fact: two instalments.
- Standing suggestions disappear with no message.
- He says "after I finish this task, I will do it" and then doesn't.
- The clock sits "stopped" during conversations until I press Let time pass. I found that out by waiting while nothing moved.
- Right after I tapped "Take the afternoon shift.", the screen showed a line I had not said, stamped 19:00. The correct line appeared later.
- Smaller earlier issues:
  - Two headings, "How he feels" and "How Halil feels".
  - Replies hidden behind the Goals tab.
  - "Did not do anything new toward his goals" after 11 calls to Selin.

**Became clear**
- Mention/Urge/Insist strength, and the skip screen with standing suggestions.

## 6. Device use

**1280x800**
- Viewed current-wide.png (title screen).
- current.png was taken around 110 s but I did not view it.
- Everything else was driver-only text.
- Controls I tapped by name:
  - Speak and the quick lines
  - Plan
  - Withdraw
  - Keep listening
  - Let time pass
  - Skip ⏩
  - Say nothing
  - Take the afternoon shift.

**360x690**
- Resized at ~299 s and viewed current-phone.png (the Ramadan 2 day card).
- Tapped "Into the day" at (180,623), which worked. Then resized back.
- I saw no layout trouble in that one screenshot. The rest of the phone layout went unseen.

**Driver notes**
- The screenshot limit of 3 is used up.
- I did not open the Feedback menu and submitted nothing.

## 7. Stop and return

**Stop:** BORED, ~912 s, Ramadan 15, 13:34. "I understand the loop now and it is not giving me anything new to decide. I am done for tonight."

**Would you return voluntarily?** Probably not on my own. I'd come back if:
- my suggestions got a clear answer when he drops them,
- big events like paying Osman happened on-screen as moments I could see,
- the conversations at the door stopped repeating.

The Selin and doctor moments showed the writing can land, and that alone might tempt me to see Ramadan 30 if someone told me those things had changed.

**Leave it running?** No. Return another evening? Only under the conditions above.

## 8. Asks (ranked)

1. Tell me when Halil drops or ignores my suggestion, and why, at the moment it happens.
2. Show key events like paying a debt as a scene, not a silent change in a number.
3. Make "Your words" show what I actually just said, and vary the repeated Hacer/Nuran lines.

**Browser:** I'm done with it. The coordinator can stop the driver.

**Cleanup:** I touched no repos or worktrees, so there is no `git worktree list` output to show. Screenshots on disk: current-wide.png, current.png, current-phone.png.
