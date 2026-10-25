/** Read-only context copied from the visible scene and his recorded rent end. */
import type { Frame } from '../protocol.ts';
import { storyDates } from './dates.ts';
import type { DayScene } from './scenes.ts';
import { explainTerms } from './terms.tsx';
import { voiceWords as settingWords } from './words.ts';

export interface PlanningContextData {
  people: string;
  occasion: string;
  line?: { speaker: string; words: string };
  rent?: { status: string; detail: string };
}

export function planningContext(
  frame: Pick<Frame, 'ends' | 'halil'>,
  scene: DayScene | null,
  lines = scene?.lines ?? [],
): PlanningContextData {
  const rent = frame.ends.find((end) => end.id === 'rent');
  return {
    people: scene?.names.join(' and ') ?? 'Halil',
    occasion: scene
      ? scene.place
      : frame.halil.doing
        ? `Halil chose to ${frame.halil.doing.label}.`
        : 'Halil is deciding what to do.',
    ...(lines.at(-1) ? { line: lines.at(-1) } : {}),
    ...(rent ? { rent: { status: rent.status, detail: rent.detail } } : {}),
  };
}

export function PlanningContext({ context, optionId }: { context: PlanningContextData; optionId?: string }) {
  const rentRelevant = optionId !== undefined && ['work-repair', 'work-extra', 'pay-rent'].includes(optionId);
  return (
    <aside className="v-planning-context" aria-label="The scene while you plan">
      <p className="v-planning-person">
        {context.occasion.startsWith(`${context.people} `) ? (
          <span>{settingWords(context.occasion)}</span>
        ) : (
          <>
            <strong>{settingWords(context.people)}</strong> <span>· {settingWords(context.occasion)}</span>
          </>
        )}
      </p>
      {context.line && (
        <p className="v-planning-line">
          <strong>{settingWords(context.line.speaker)}:</strong> “{explainTerms(context.line.words)}”
        </p>
      )}
      {rentRelevant && context.rent && (
        <p className="v-planning-rent">
          <strong>Rent:</strong> {settingWords(storyDates(context.rent.status))}.{' '}
          {settingWords(storyDates(context.rent.detail))}
        </p>
      )}
    </aside>
  );
}
