# Design language: "Field Notebook"

Adopted 2026-10-18 for all HF games and sites (human, neighbours, rope, repair). One language, applied everywhere.

**Idea.** Everything the player sees is a page from someone's field notebook: ink on warm paper, drawn by hand, annotated in the margin. This fits "show, don't count". A notebook records what was seen and felt, not true numbers.

## Tokens
| Token | Light | Dark (lamp-lit page) |
|---|---|---|
| `--paper` | `#F3ECDD` | `#1E1B16` |
| `--paper-2` (cards, folds) | `#E9DFCB` | `#29251E` |
| `--ink` | `#23201B` | `#E8DFCC` |
| `--ink-soft` (secondary, contour lines) | `#6E665A` | `#9A9080` |
| `--rope` (the one accent: action, selection, the player's voice) | `#C2412D` | `#E2614A` |
| `--moss` (consent, assent, safe) | `#4F6B3A` | `#8DAA6E` |
| `--sky` (cold, night, information received) | `#3D5A73` | `#7FA2C0` |

Only `--rope` calls for attention. Never add a second loud color.

## Type
- Text: **Literata**, a book serif. Handwritten notes in the margin: **Caveat**, used sparingly for a person's voice and for annotations. Numbers, when unavoidable: Literata tabular figures.
- Base size 17px on phones. Line length is at most 60ch.

## Marks
- Lines have a 1.5px ink stroke with a slight wobble (jittered SVG/canvas paths). Keep regions flat, with no gradients or drop shadows.
- State is shown as drawing: a stride gets shorter, a figure leans, a hand-shaded hatch shows cold, an ink blot shows injury. Never use bars or percentages for a person's inner state.
- Icons are simple, monoline and hand-inked. Prefer an icon with a short label over a sentence.
- Motion is slow and physical: ink draws on, pages turn. Use no bounce or glow.

## Layout
- Phones come first: Galaxy S26 is 360×780 CSS px with about 690px visible. Keep thumb actions in the bottom 40%. Respect safe areas.
- The scene comes first. One drawer or sheet at a time, with progressive disclosure.
- A shared top-left mark, "◇ human framework", links to the hub. The footer is a single "◇ all notebooks" link to https://human.adamwhite.work/games/, the collection page (data: apps/site/src/games.ts).

## Voice
- Short sentences in plain words. People speak in first person in Caveat. The narrator speaks in Literata, in past tense, like a journal entry.
- Faith stays quiet. A prayer at dusk is a line in the journal, never a mechanic.
