/** Preview an ordinary suggestion, then observe the actual response.
 * No five-verdict script or predicted success is promised.
 */
import {
  createPerson,
  createRun,
  exportRun,
  type Input,
  inspect,
  preview,
} from '@adam0white/human-framework';
import {
  authoredPerson,
  exampleOffers,
  exampleSpec,
  freshHost,
  isMain,
  MINUTE,
  need,
  openingInputs,
  START,
  serve,
} from './minimal.ts';

export function main() {
  const run = need(createRun(exampleSpec(11)));
  const person = authoredPerson('ada', 'Ada');
  person.state.body.satiety = 0.2; // an explicit authored circumstance, not a disabled faculty
  need(createPerson(run, person));
  const offers = exampleOffers('ada', ['wait', 'rest', 'work']);
  const inputs: Input[] = [
    ...openingInputs([{ id: 'ada', offers }]),
    {
      id: 'voice:example-request',
      at: START,
      source: { type: 'voice', id: 'player' },
      kind: 'suggestion.received',
      payload: {
        person: 'ada',
        received: {
          kind: 'ordinary',
          suggestion: {
            adviceId: 'example-advice',
            voiceId: 'player',
            affordanceId: 'work',
            strength: 0.8,
          },
        },
      },
    },
  ];
  const before = exportRun(run);
  const hint = need(
    preview(run, {
      // The host proposes its own offers and voice input. A person preview cannot author host evidence.
      perspective: { kind: 'host' },
      person: 'ada',
      until: START + 15 * MINUTE,
      inputs,
    }),
  );
  const previewUnchanged = before.hashes.full === exportRun(run).hashes.full;
  if (!previewUnchanged) throw new Error('Preview mutated the live run');
  serve(run, freshHost(), new Map([['ada', offers]]), START + 60 * MINUTE, inputs);
  const view = need(
    inspect(run, {
      perspective: { kind: 'person', observer: 'ada' },
      people: ['ada'],
      select: ['summary', 'body', 'agenda', 'events'],
    }),
  );
  return { hint, view, archive: exportRun(run), previewUnchanged };
}
if (isMain(import.meta.url)) {
  const result = main();
  console.log(
    JSON.stringify(
      {
        engine: result.archive.engine,
        previewUnchanged: result.previewUnchanged,
        hypotheticalBoundary: result.hint.boundary,
        actualEvents: result.view.events,
      },
      null,
      2,
    ),
  );
}
