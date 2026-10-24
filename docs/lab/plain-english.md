# Plain English for the games

Write for a busy reader who uses English as a second language. Target grade 7 for instructions and controls. Dialogue may be richer, but it must still be grammatical.

1. Write full sentences with articles and verbs. Labels may be short: “Meal break: 20 minutes.”
2. Say literally what happens. Do not make the reader decode an image or phrase.
3. Use one name for each thing throughout the game.
4. Introduce at most one new idea per screen. Explain a game term on its first use.
5. Prefer familiar words. Preserve meaning, rules, difficulty, character and cultural detail.
6. Describe approximate state clearly: “Ali looks tired.”
7. Cut words the player does not need.

Use Feedback for feedback. Menus expose Resume, Feedback, Full screen, All games, one Recording switch and New game with inline confirmation. Diagnostic imports, seeds, replay, verification, editions and continuity controls require `?lab=1`. Continuity runs automatically in ordinary play. Keep recording consent separate from fictional continuity. Follow F-491 for one-page feedback and sharing.

## Source reading check

Run with Node >=24 from the HF worktree:

```sh
node scripts/lab-plain-english.ts --repo /absolute/game/worktree --game pass --baseline BASELINE_COMMIT --json
node scripts/lab-plain-english.ts --repo /absolute/game/worktree --game pass --json
```

The checker supports all 15 game names. Central `voice`, `well` and `watch` select that game plus shared source. External repositories scan `src` and `index.html`, including added and untracked source. Neighbours scans `neighbours/src` when present. Empty coverage fails. `--game all` scans all central site source. `--all-strings` includes unflagged candidates. `--terms continuity,checkpoint,seed` overrides the term vocabulary. Otherwise each game has a fixed vocabulary (for example Mention/Urge/Insist for Voice and winter hopes/thaw/granary for Watch). JSON records the exact terms; keep them fixed between measurements. Baseline reads Git objects without changing the checkout. After reads tracked, added and untracked working source. Use the same script and options for both counts.

This uses Babel syntax trees for TypeScript, JavaScript and JSX. HTML text is scanned after script/style blocks are removed. The prose flags are cheap heuristics. It includes internal and lab-only strings and misses runtime concatenations and canvas-built phrases. Templates preserve interpolation placeholders. It flags sentences over 24 words, possible fragments in each sentence without a common verb (five words on a standalone line; three in a paragraph, with short colon labels exempted), and terms that need first-use review. Labels can be valid fragments. Definitions may be elsewhere. Counts do not prove a reading grade or count exact rendered strings. Review flags in context. No network or model calls are made.

## Screen report

For each screen record its purpose, every new concept, concept count, sentences requiring rereading, and the literal replacement. More than one new idea requires a reason or a simpler screen. Two sentences requiring rereading make the busy second-language reader quit. This protocol does not authorize a new playtest round.

## Recording and navigation

The central games list supplies a short-lived fragment handoff on ordinary outgoing clicks. The destination accepts it only from a direct central referrer, checks the destination and age, strips the fragment immediately, and changes future recording identity. It does not relabel or merge historical records. Local Recording off and browser privacy signals still apply. A blocked iframe can still leave separately stored fictional shelves; the handoff transfers recording identity and notice status, not a hidden import of people or history. One-device storage remains the boundary.

The owner's Safari split is confirmed by the supplied inbox identities. Its historical browser cause remains unknown. Both engines retained one identity in the director's unblocked baseline. Deliberately blocking the iframe reproduces a split in WebKit; top-level navigation recovers central identity for future records. This is a failure-mode regression, not proof that ITP caused the original report.

Watch retains its chronicle and winter hopes as two gameplay menu entries. The chronicle holds player-observed history. Winter hopes change the next winter's gameplay. Removing those would remove existing choices rather than hide diagnostic tools. Other diagnostic controls remain lab-only.
