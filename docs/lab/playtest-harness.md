# Coordinator harness rulings (2026-10-26, from the Claude Voice r1 read: v3/claude-voice-r1-read.md)

Apply these from now on, in both playtest and playtest-b.
1. **One build per round.** Record the live commit (from /release.json) at the start of each session, in the report. If the build changes mid-round, mark each affected session with its commit. Ask through the coordination file that the game's deploys wait until the round ends. Playtest rounds hold that game's deploys, except CI fixes.
2. **Verbatim means raw.** Every persona, the Claude personas included, puts its raw diary and log lines under "verbatim", unedited. Summaries go in a separate section.
3. **Ledger rows:** quote the full "would you return" sentence, including any return clause. Set the disposition per session (keep / mixed / quit) from that sentence. Give each ask a distinct F-number in the game's own series, not one owner row such as F-492, and a realistic target.
4. **Real browsers at both sizes.** Each tester plays at least one session in a real browser at 360x690 and one at 1280x800, by tapping, not only through the text driver. Driver-only sessions are labelled as such.
5. **Human speed.** Before routing a timing complaint (for example a choice that vanishes before the tap), reproduce it at human tapping speed, 1 to 3 seconds per decision. If the driver delay caused it, record that and drop the complaint.
6. **Forced quits are not taste verdicts.** Label sessions that a protocol cut short, and leave them out of the patterns.
7. **Play checklist.** Remove pass/fail audit checklists from tester prompts. Ask for play diaries and the return question.

Use a fresh browser profile per agent run; never share a marked URL.
