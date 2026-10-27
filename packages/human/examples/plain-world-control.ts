/** One renderer preserves host prose, and pure reads preserve exact state and RNG. No selector arms. */
import {
  createPerson,
  createRun,
  exportRun,
  type Input,
  inspect,
  type PerceptData,
} from '@adam0white/human-framework';
import {
  authoredPerson,
  DAY,
  exampleOffers,
  exampleSpec,
  freshHost,
  isMain,
  need,
  openingInputs,
  START,
  serve,
} from './minimal.ts';

export function runPlainWorldControl() {
  const run = need(createRun(exampleSpec(31)));
  need(createPerson(run, authoredPerson('ada', 'Ada')));
  const summary = 'I read the host’s handwritten note.';
  const percept: PerceptData = {
    id: 'host-note',
    occurredAt: START,
    channel: 'saw',
    kind: 'host-note',
    salience: 1,
    summary,
    claims: [],
    norms: [],
    advice: [],
    consequences: [],
    withdrawConsequences: [],
    witnesses: [],
    reports: [],
    provenance: ['world'],
  };
  const offers = exampleOffers('ada');
  const inputs: Input[] = [
    ...openingInputs([{ id: 'ada', offers }]),
    {
      id: 'host:2-note',
      at: START,
      source: { type: 'host', id: 'world' },
      kind: 'observation.received',
      payload: { person: 'ada', evidenceId: 'host-note-evidence', percepts: [percept] },
    },
  ];
  serve(run, freshHost(), new Map([['ada', offers]]), START + DAY, inputs);
  const before = exportRun(run),
    personBefore = before.current.people.ada;
  if (!personBefore) throw new Error('Missing authored person');
  const first = need(
    inspect(run, {
      perspective: { kind: 'person', observer: 'ada' },
      people: ['ada'],
      select: ['summary', 'events'],
    }),
  );
  const second = need(
    inspect(run, {
      perspective: { kind: 'person', observer: 'ada' },
      people: ['ada'],
      select: ['summary', 'events'],
    }),
  );
  const after = exportRun(run),
    personAfter = after.current.people.ada;
  if (!personAfter) throw new Error('Missing person after pure reads');
  const unchangedModelState =
    before.hashes.full === after.hashes.full && JSON.stringify(first) === JSON.stringify(second);
  const unchangedRng =
    JSON.stringify([before.current.rng, personBefore.rng]) ===
    JSON.stringify([after.current.rng, personAfter.rng]);
  const lines = first.events.flatMap((event) => event.narration.map((line) => line.text));
  const preservedHostProse =
    personAfter.memory.episodes.some((episode) => episode.summary === summary) &&
    lines.some((line) => line.includes(summary));
  if (!unchangedModelState || !unchangedRng || !preservedHostProse)
    throw new Error('Current world rendering/purity control failed');
  return { unchangedModelState, unchangedRng, preservedHostProse };
}
if (isMain(import.meta.url)) console.log(JSON.stringify(runPlainWorldControl(), null, 2));
