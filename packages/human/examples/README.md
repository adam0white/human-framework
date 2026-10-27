# HF 4 examples

Each example uses only the public run API (`createRun`, `createPerson`, `step`, `inspect`, `preview`, `exportRun`, `restoreRun`, `replay`). All person facts are authored engineering examples, not measurements of real people.

- `minimal.ts` authors one person, offers actions, settles each host request and checks that restore and replay give the same archive hash. It has no local imports, because the packed-package smoke test copies this file alone.
- `suggestions.ts` previews a player suggestion without changing the run, then records the person's actual response.
- `community.ts` runs two people, settles two requests issued against the same world revision, and checks a saved and restored run against an uninterrupted one.
- `host-gifts-and-work-control.ts` prepares gift receipts from current host stock. Low stock gives a partial gift; empty stock or an interruption gives nothing.
- `word-and-witness-control.ts` checks a broken promise, a known witness against an unreported one, source trust held by the recipient and exact replay.
- `plain-world-control.ts` checks that host-written prose is kept and that repeated person-perspective reads change neither the archive hash nor the random state.

The 3.x examples were removed in 4.0. The 4.0 CHANGELOG migration section will list them.
