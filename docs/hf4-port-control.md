# G1 public-run control on published HF 4.4.0

Protocol control for the [port recipe](hf4-port-recipe.md). This is not a Stairwell integration test.
Work/rest are minimal-host actions, not a caretaker job or cast journey. Only public HF calls and
the versioned minimal-host example are used.

Run from an HF checkout with the v4.4.0 tag available, using an empty scratch directory:

````sh
set -eu
export PATH=/opt/homebrew/bin:$PATH
hf_root=$(pwd)
proof_dir=$(mktemp -d "$HOME/code/.lab-scratch/g1-proof.XXXXXX")
git show v4.4.0:packages/human/examples/minimal.ts > "$proof_dir/minimal.ts"
python3 - "$hf_root/docs/hf4-port-control.md" "$proof_dir/proof.ts" <<'PY'
import pathlib, sys
text = pathlib.Path(sys.argv[1]).read_text()
pathlib.Path(sys.argv[2]).write_text(text.split('```typescript\n', 1)[1].split('```', 1)[0])
PY
cd "$proof_dir"
printf '%s\n' '{"private":true,"type":"module"}' > package.json
pnpm add --save-exact @adam0white/human-framework@4.4.0
pnpm install --frozen-lockfile
node proof.ts > result.json
cat result.json
````

Treat `result.json` as evidence only after exit 0. Keep the script, exact pin/lock and result with
the task report. The `admission:{}` check proves the archived admission field still refuses;
retained runtime admission uses `portable`. Valid host persona/calendar queries below prove
the supported projection route, not a complete cross-game journey.

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
  const persona = inspect(run, {
    perspective: { kind: 'host' },
    people: ['ada'],
    select: ['persona'],
    portable: { person: 'ada', castId: 'cast.ada', castRevision: '1' },
  });
  assert.equal(persona.ok, true);
  if (persona.ok) {
    const person = persona.value.people[0];
    assert.equal(person?.kind, 'host');
    if (person?.kind === 'host') {
      const part = person.parts.find((p) => p.select === 'persona');
      assert.equal(part?.select, 'persona');
      if (part?.select === 'persona') assert.equal(part.value.version, 2);
    }
  }
  const calendar = inspect(run, { perspective: { kind: 'host' }, people: ['ada'], select: ['calendar'] });
  assert.equal(calendar.ok, true);
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
  const activePersona = inspect(run, {
    perspective: { kind: 'host' },
    people: ['ada'],
    select: ['persona'],
    portable: { person: 'ada', castId: 'cast.ada', castRevision: '1' },
  });
  assert.equal(activePersona.ok, false);
  const resumed = need(restoreRun(JSON.parse(JSON.stringify(active))));
  assert.equal(exportRun(resumed).hashes.full, active.hashes.full);
  const resumedHost = restoredHost(active);
  assert.deepEqual(resumedHost, host);
  const before = JSON.stringify(exportRun(run));
  const view = need(
    inspect(run, {
      perspective: { kind: 'person', observer: 'ada' },
      people: ['ada'],
      select: ['summary', 'body', 'sourceTrust', 'events'],
    }),
  );
  const forecast = need(
    preview(run, {
      perspective: { kind: 'person', observer: 'ada' },
      person: 'ada',
      until: START + 16 * MINUTE,
      bodyForecast: [
        {
          label: action,
          durationMs: 15 * MINUTE,
          load: {
            mode: 'awake',
            effort: action === 'work' ? 0.8 : 0,
            focus: action === 'work' ? 0.3 : 0,
          },
        },
      ],
      inputs: [],
    }),
  );
  assert.equal(forecast.hypothetical, true);
  assert.equal(forecast.bodyForecast?.person, 'ada');
  assert.equal(forecast.bodyForecast?.from, active.current.at);
  assert.equal(forecast.bodyForecast?.spans[0]?.endsAt, START + 16 * MINUTE);
  assert.equal(forecast.bodyForecast?.spans[0]?.basis, 'conditional-load-projection');
  assert.equal(JSON.stringify(exportRun(run)), before);
  serve(run, host, book, START + 16 * MINUTE);
  serve(resumed, resumedHost, book, START + 16 * MINUTE);
  assert.ok(host.completed >= 1);
  const end = exportRun(run);
  assert.deepEqual(exportRun(resumed), end);
  const exact = need(replay(JSON.parse(JSON.stringify(end))));
  assert.equal(exact.verified, true);
  assert.equal(exact.fullHash, end.hashes.full);
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
assert.equal(work.end.engine.package, '@adam0white/human-framework@4.4.0');
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
      structuredBodyForecast: true,
      portableProjectionAtIdleOpening: true,
      activeWorkProjectionRefused: true,
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

Node 26.12.0, published package 4.4.0. Pending-boundary restore, active-work restore/continuation,
JSON round-trip, complete archive equality, read-only inspection/preview and exact replay passed
for both arms. Each completed one action. Work/rest body states differed.

- Engine build: `46ffd721860c4b85e77250b64c7c756d6f1213c8c311c448f911c8efe43b81ed`.
- Engine schema: `c8dfe9d9479c26019e2537f695be9d99f15d6ca1eb30ed054562ad5dcee132e0`.
- Work full hash: `4cebb9f43752c647e7c7dcbca1902d0181bbdae96663030a726eb59eeb027259`.
- Rest full hash: `d6c17c77bfc19ed8c30583dc969eb422638a9991d52f0e3f23c40f45c45db75b`.

Host persona projection at an idle opening returns the retained v2 passport with explicit cast metadata.
Active work refuses projection without ending the activity or dropping it; host calendar
inspection succeeds. Self source-trust and structured conditional bodily forecast reads succeed and
preserve the live run. The archived `admission` field still returns `invalid-admission` at
`$.admission`; use the documented `portable` route for retained runtime admission.
This control does not establish general portability, game adoption or a peer journey.

The earlier published 4.2 control correctly rejected persona/calendar at that version. Its negative
result remains historical evidence; this 4.4 rerun measures the new supported public contract.


### Historical 4.2 control, 2026-10-27

The earlier published 4.2 run passed the work/rest protocol controls and rejected persona/calendar
with `invalid-admission` at `$.select`. Admission-field presence rejected at `$.admission`.
Those were version-specific negative controls, not retained-person admission evidence.

- Engine build: `c15e1236d89617ec4b824749ada5247b3aacbdfc70fd8e0424f9f4d20918ff2c`.
- Engine schema: `015d9b1576d37d5f242825d97ff411dca00ba720e3f8288a255a0b695053aeab`.
- Work full hash: `adc1158fc3c9010ada1da6f0a5fa7fcc5435463237fe5f88ce63b05a7e7c9671`.
- Rest full hash: `c3b70b999ce3e1dca3ee10d3a052d9559f6c993fbb68a8b5cb19f8a09bea9d38`.
