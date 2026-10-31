**Would you return voluntarily?** I might come back another evening, but only if the game showed me how long each neighbour has before the smoke gets them, and only if the phone showed where my figure is. I would not leave it running. Both times I stopped at about 150 seconds with two of the four neighbours dead.

**Ranked asks**
1. Show each neighbour's smoke clock before I commit to them. Hacer died unseen on the phone, and Derya and Hacer died together on the desktop.
2. On the phone, show my figure and give a visible reaction to a tap. The named landing buttons were covered or off screen, and for the first minute I could not tell if I was moving.
3. Make the walk to a neighbour or the street feel faster, or show progress. I spent a lot of the run waiting on it.

## 1. Session

- **Persona:** Diego Silva, 28, Recife sound editor, impatient.
- **Exposure:** first visit to this game. I have played other HF games. I read all 753 lines of my own-history.md before play. It says nothing about this game.
- **Round and arm:** light-1031-smoke1, free stop (floor 0), ceiling 20 min.
- **Build:** draft 7070afb11b2262ffc5fef8997189f749238ef653 / HF4.8.0.
- **URL:** https://smoke.adamwhite.work/?labRunSource=agent
- **Session A:** 360x690 touch phone, light mode, port 22104. About 151 s.
- **Session B:** 1280x800 keyboard and mouse, light mode, port 22105. About 151 s.

## 2. First impressions

- **A, 6 s:** "Fire in a block of flats, get people out. Clock already running behind the card." The goal was clear straight away.
- **A, 10 to 48 s:** the drawing is nice, but selecting a neighbour or tapping a landing showed no movement. I felt frustrated.
- **B, 5 s:** it was the same game with a different cast. Sevim is home this time with her books. Smoke starts on landing 4, not landing 1.
- **B, 24 s:** I could see my figure climbing with a torch cone. "Much clearer than the phone."

## 3. Verbatim diary

### Session A (elapsed s, kind: text)

- 6.302: "Fire in a block of flats, get people out. Clock already running behind the card. Going in."
- 8.428: "Hacer needs to see the stair, I have a torch. Approaching her."
- 10.211: "Selecting did not move me. Tapping her again to approach."
- 15.195: "The drawing is nice but selecting a neighbour does not walk me. Walking to her landing by hand."
- 24.796: "Smoke is thin now; I waited, so trying the walk again. I cannot tell where I am or whether I moved."
- 36.545: "Burak made it out alone. My taps on neighbours and landings have not visibly moved me. Trying a key."
- 38.097: "Derya is nearer; trying her landing instead." The driver replied "covered or off screen".
- 40.627: "The named landing buttons are off screen. Tapping the drawn top landing by coordinates."
- 46.06: "I am at the bottom of the stair, apparently. Walking up one landing at a time by tapping the drawing."
- 48.309 note: "Nice drawn stairwell, but I cannot tell if my taps move me. Burak left by himself; Hacer and Derya still wait. Waiting to see if I walk."
- 67.052 first_minute (clock "stair closes in 103s"): "A minute in and nothing I did visibly worked. Pretty drawing, clear goal, but my taps on neighbours and landings gave no movement I could see. Burak walked out on his own while I stood there. Clock ticking and I do not know what my figure is doing. Frustrated, not gone yet."
- 69.61: "Trying Derya, the nearer person."
- 83.694: "Speech buttons woke up, so I was walking, just slowly and silently. Asking Derya to come."
- 85.243: "Derya is following. Leading her down."
- 100.925: "Now there is a real problem: Derya lost me in the smoke. Torch on, then show her the stair."
- 120.494: "Hacer now says smoke may kill her. That landed. But I still crawl toward Derya and cannot hurry."
- 123.577: "The torch worked: she sees the stair. Walk with me."
- 142.969 note (clock "stair closes in 26s"): "Hacer died from smoke while I led Derya out. That hit. I picked Derya because she was close, and I never knew the clock for Hacer was that short. Real cost, but I did not get to choose it knowing."
- 150.986 stop, FINISHED (clock "stair closes in 22s"): "I am stopping the phone session at about 150 seconds. Two out, one dead, one away. The first minute was me tapping and not knowing if I moved; from the torch moment on it was good and the death landed. I did not wait for the end card. Feedback: I picked I am stopping, typed nothing, pressed Not now."

### Session B (elapsed s, kind: text)

- 4.959: "Same game, different cast: Sevim is home this time with her books. This time I know to wait for the walk. Going in."
- 7.181: "Last time Hacer died. Going for her first with the keyboard."
- 23.564: "On desktop I can see my figure climbing with a torch cone. Much clearer than the phone. Waiting to reach Hacer."
- 30.047: "Hacer follows. Derya is on the landing below; I will collect her on the way down instead of making a second trip."
- 51.595: "Two followers. Burak is the next landing down; collecting him before heading for the street."
- 63.862 first_minute (clock "stair closes in 100s"): "Desktop is far clearer: I can see my figure and the torch cone, keys E/B/T/R/F and 1-4 work, and I picked up Hacer and Derya as followers on the way. The different cast this time (Sevim and her books) means it is not the same night. I like that Burak can just go down himself. The walking is slow and I am waiting on it, but now I know what I am waiting for."
- Several of these lines went in through the `reaction` field on an action call, not as separate log ops. The summary I wrote has no elapsed seconds for the 115.84 and 121.475 reactions, so I give them here as I remember them:
  - 115.84: "Walking down to Sevim with two followers behind me."
  - 121.475: "Three followers-ish: Sevim and Derya following, Hacer stopped behind. Leading down now."
  - 138.175: "Waiting for the walk to the street."
- 142.767 want_quit, FRUSTRATED (clock "stair closes in 22s"): "Both followers died while I walked slowly down with Sevim. I collected them early, and the smoke clock ran out on them while I waited for the slow walk. I did not see their clocks coming."
- 151.132 stop, FRUSTRATED (clock "stair closes in 16s"): "I am stopping the desktop session at about 150 seconds. Sevim and Burak out, Derya and Hacer dead. Desktop controls were clear and fast, but I collected two followers early and they died while I fetched the others, with no visible warning of how long they had. Feedback: I picked I am stopping, typed nothing, pressed Not now."
- On B I logged no `pulse`, because the session ended before 180 s. On A I logged no `pulse` and no `want_quit`. Later checkpoints were not tested.

## 4. Moments

- **What lost me (A):** the first minute of tapping without seeing a result.
- **What held me (A):** the torch moment. Derya lost me in the smoke, I turned the torch on and used Show the stair, and she followed. "From the torch moment on it was good."
- **What hit (A):** Hacer died while I led Derya out. I chose Derya because she was close and did not know Hacer's clock was that short.
- **What held me (B):** the keyboard. I could see my figure and torch cone, and I collected Hacer and Derya on the way. I liked that Burak checks the stair and goes down by himself.
- **What lost me (B):** Derya and Hacer died while I went for Sevim and walked down. My plan was to collect them early and save a trip. It cost me both. I wanted the smoke clocks to be visible.
- **Quit wishes:** one `want_quit` (B, 142.767, FRUSTRATED). It did not pass. I stopped about 8 s later.

## 5. Confusion and clarity

- **Confused (A):**
  - Whether my tap moved me.
  - Why the named "Walk to landing" buttons were covered or off screen.
  - Why speech buttons stayed grey. I only found out they wake up when I am near, around 83 s.
- **Clear:**
  - The goal in the left panel (Find who is home. Show them the stair. Ask them to leave).
  - The log lines and the status text under each name. I mostly learned the rules from those.
  - The torch and Show the stair rule, once I met it.
- **Not clear:** how long each neighbour has before the smoke gets them.
- **End card:** I never saw one on either device, because I stopped early. I saw the Feedback dialog only as text in the driver reply.

## 6. Device use

- **Phone screenshots viewed:**
  - `phone/a-001.png`: the title card "Smoke on the Stairs." with an "Enter the stairwell" button.
  - `phone/a-002.png`: the dark stairwell drawing with Hacer, Derya and Burak and a "MOVE · THICK IN 3s" banner. The neighbour tabs and verb buttons sit below it.
  - `phone/a-003.png`: my figure near the bottom, at the street end.
- **Desktop screenshots viewed:**
  - `desktop/b-001.png`: the title card centered over a dimmed game.
  - `desktop/b-002.png`: the building drawing with the torch cone, with Derya, Hacer, Burak and Sevim named on their landings. The text panel is below it and the clock and goals panel is on the left.
- **Phone controls used:** tapping neighbour tabs, taps on the drawing by coordinates, the verb buttons, Torch, Street, and the menu.
- **Desktop controls used:** keys 1 to 4, E, B, T, R and F, the "Walk to landing" buttons, Street, and the menu.
- **Trouble I saw on the phone:** the named walk buttons were covered or off screen. A tap gave no visible response. I did not see the layout beyond the three screenshots.
- **Different between devices:** the desktop showed the left panel and a clearly visible figure. The phone showed neither. Both sessions also had a different cast and smoke location.

## 7. Stop and return

- **A stop:** FINISHED, at about 151 s. That reason is inaccurate: no end card appeared. I stopped with "stair closes in 22s" still showing. Hacer was dead, Burak and Derya were out, and Sevim was away.
- **B stop:** FRUSTRATED, at about 151 s, with "stair closes in 16s" showing.
- **Feedback on both:** I opened the menu and Feedback and chose "I'm stopping". The note box came up prefilled with "I'm stopping". I typed nothing, changed no consent, left Record checked, and pressed Not now.
- **Would you return voluntarily?** Conditions as at the top. Another evening: yes, maybe, with the conditions above. Leave it running: no.

## 8. Changes wanted

1. Show each neighbour's smoke clock before I commit to them.
2. On the phone, show my figure and give a visible response to a tap.
3. Make the walk faster, or show its progress.

## 9. Compared with my last visit

First visit to this game. Session B was a second visit the same evening on the other device. I recognized the same four names and the "Hacer: I cannot see the stair" line from session A, with high confidence. The cast and smoke location were different.

`git worktree list`: I touched no repo, so none of my worktrees exist.
