# G1 public-run control on published HF 4.1.0

Protocol control for the [port recipe](hf4-port-recipe.md). This is not a Stairwell integration test.
Work/rest are minimal-host actions, not a caretaker job or cast journey. Only public HF calls and
the versioned minimal-host example are used.

Run from an HF checkout with the v4.1.0 tag available, using an empty scratch directory:

````sh
set -eu
export PATH=/opt/homebrew/bin:$PATH
hf_root=$(pwd)
proof_dir=$(mktemp -d "$HOME/code/.lab-scratch/g1-proof.XXXXXX")
git show v4.1.0:packages/human/examples/minimal.ts > "$proof_dir/minimal.ts"
python3 - "$hf_root/docs/hf4-port-control.md" "$proof_dir/proof.ts" <<'PY'
import pathlib, sys
text = pathlib.Path(sys.argv[1]).read_text()
pathlib.Path(sys.argv[2]).write_text(text.split('```typescript\n', 1)[1].split('```', 1)[0])
PY
cd "$proof_dir"
printf '%s\n' '{"private":true,"type":"module"}' > package.json
pnpm add --save-exact @adam0white/human-framework@4.1.0
pnpm install --frozen-lockfile
node proof.ts > result.json
cat result.json
````

Treat `result.json` as evidence only after exit 0. Keep the script, exact pin/lock and result with
the task report. The `admission:{}` check proves unconditional admission-field rejection, not
validation of a legitimate carried envelope. Valid host persona/calendar queries independently
prove the missing projection route.

```typescript
import assert from 'node:assert/strict';
import {
  createRun,
  createPerson,
  step,
  inspect,
  preview,
  exportRun,
  restoreRun,
  replay,
} from '@adam0white/human-framework';
import {
  authoredPerson,
  exampleSpec,
  exampleOffers,
  openingInputs,
  freshHost,
  restoredHost,
  serve,
  need,
  START,
  MINUTE,
} from './minimal.ts';

function arm(action: 'work' | 'rest') {
  const run = need(createRun(exampleSpec(7)));
  need(createPerson(run, authoredPerson('ada', 'Ada')));
  const offers = exampleOffers('ada', [action]);
  const book = new Map([['ada', offers]]);
  const host = freshHost();
  const pending = need(step(run, { until: START + MINUTE, inputs: openingInputs([{ id: 'ada', offers }]) }));
  assert.equal(pending.boundary.type, 'world-required');
  const unsettled = exportRun(run);
  const pendingRestore = need(restoreRun(unsettled));
  const pendingAgain = need(step(pendingRestore, { until: START + MINUTE, inputs: [] }));
  assert.deepEqual(pendingAgain.boundary, pending.boundary);
  serve(run, host, book, START + MINUTE, [], pending);
  assert.equal(host.active.length, 1);
  assert.equal(host.completed, 0);
  const active = exportRun(run);
  const resumed = need(restoreRun(JSON.parse(JSON.stringify(active))));
  assert.equal(exportRun(resumed).hashes.full, active.hashes.full);
  const resumedHost = restoredHost(active);
  assert.deepEqual(resumedHost, host);
  const before = JSON.stringify(exportRun(run));
  const view = need(
    inspect(run, {
      perspective: { kind: 'person', observer: 'ada' },
      people: ['ada'],
      select: ['summary', 'body', 'events'],
    }),
  );
  const forecast = need(
    preview(run, {
      perspective: { kind: 'person', observer: 'ada' },
      person: 'ada',
      until: START + 16 * MINUTE,
      inputs: [],
    }),
  );
  assert.equal(forecast.hypothetical, true);
  assert.equal(JSON.stringify(exportRun(run)), before);
  serve(run, host, book, START + 16 * MINUTE);
  serve(resumed, resumedHost, book, START + 16 * MINUTE);
  assert.ok(host.completed >= 1);
  const end = exportRun(run);
  assert.deepEqual(exportRun(resumed), end);
  const exact = need(replay(JSON.parse(JSON.stringify(end))));
  assert.equal(exact.verified, true);
  assert.equal(exact.fullHash, end.hashes.full);
  const persona = inspect(run, { perspective: { kind: 'host' }, people: ['ada'], select: ['persona'] });
  assert.equal(persona.ok, false);
  if (!persona.ok) assert.equal(persona.error.code, 'invalid-admission');
  const calendar = inspect(run, { perspective: { kind: 'host' }, people: ['ada'], select: ['calendar'] });
  assert.equal(calendar.ok, false);
  const admission = createPerson(run, {
    ...authoredPerson('returning', 'Returning'),
    admission: {} as never,
  });
  assert.equal(admission.ok, false);
  if (!admission.ok) assert.equal(admission.error.path, '$.admission');
  return { end, view, persona, calendar, admission, completed: host.completed };
}
const work = arm('work'),
  rest = arm('rest');
assert.notDeepEqual(work.end.current.people.ada.body, rest.end.current.people.ada.body);
assert.equal(work.end.engine.package, '@adam0white/human-framework@4.1.0');
console.log(
  JSON.stringify(
    {
      scope: 'public HF contract control, not a Stairwell port',
      engine: work.end.engine,
      workHash: work.end.hashes.full,
      restHash: rest.end.hashes.full,
      workCompleted: work.completed,
      restCompleted: rest.completed,
      pendingRestore: true,
      activeRestoreContinuationExact: true,
      replayExact: true,
      previewReadOnly: true,
      controlBodyDiffers: true,
      persona: work.persona,
      calendar: work.calendar,
      admission: work.admission,
    },
    null,
    2,
  ),
);
```

## Observed result, 2026-10-27

Node 26.12.0, published package 4.1.0. Pending-boundary restore, active-work restore/continuation,
JSON round-trip, complete archive equality, read-only inspection/preview and exact replay passed
for both arms. Each completed one action. Work/rest body states differed.

- Engine build: `9af2ceebbce3664b26bdc8996cd418f8ae39dbe251d1e920dcc6eda9eb9b27e6`.
- Engine schema: `2ee210c9d00aa6691fe3947f7d6bb51bb2ce4e1697a86f48622a5e3c5319fcd1`.
- Work full hash: `9162735f0c682d59507b5476916918cb4fa9b9884db5350f63580ee6df8cbac4`.
- Rest full hash: `8c4f2e0e704e4b3ead432c897d067c5912a016ecdeed26543a09969769e9db29`.

Persona/calendar returned `invalid-admission` at `$.select`; admission-field presence returned
`invalid-admission` at `$.admission`. The error text says HF 4.0; this is published 4.1.0.
These negative controls confirm G2 remains blocked. They do not prove general portable admission.
