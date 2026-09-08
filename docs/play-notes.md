# Optional play-note export

Watch, Before the rain, Last Light, Service Day and A Shared Promise offer a collapsed **Save a play note** form. A player may describe their goal, a costly choice, an unexpected or unclear event, and another person's response. All fields are optional, but a completely blank note does not download. Opening the form pauses playback; downloading the note does not advance or otherwise change the game.

The file contains the entered words, capture time, game identity/version and a small explicitly selected public summary at download time. It contains neither a full save nor hidden world state. Existing game-save controls remain separate. Draft text lasts only while the page remains open; no note is submitted over the network or automatically stored. The UI explains the download and draft lifetime.

[Shared component](../web/play-note.js) · [Schema tests](../tests/play-note.test.js) · [Synthetic browser verification](../artifacts/play-notes/local-browser.json). Plain entered text, including markup, stays data. Bounds and unknown-field rejection constrain exports. The component has no participant ID, scoring or assessment field and cannot establish identity, truthfulness, comprehension or eligibility for the five-person explanation gate.

Three pure tests and actual browser download checks pass. The browser checks use clearly labeled synthetic answers on the two initial companion games, confirm paused playback, invalid/blank handling, unchanged saves, public context only and 320/390/1280 layout. Those fixture downloads are **not** human playtest responses and are never counted as such.

Actual notes supplied by people remain private source material. Human review must establish distinct participants and interpret the objective, tradeoff, failure and response explanations before applying the formative gate. Do not generate five sample notes and present them as human evidence.
