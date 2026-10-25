import { useState } from 'react';
import { settingWords } from '../../shared/setting-words.ts';
import { dayClock, type Frame } from './contract.ts';
import { VILLAGE_WORDS } from './village-words.ts';

/** Phone presentation only. Orders still pass through the same callbacks and simulation. */
export function VillageStrip({ frame, side }: { frame: Frame | null; side: 'human' | 'classic' }) {
  const [expanded, setExpanded] = useState(false);
  const roof = frame?.goals.find((g) => g.id === 'project') ?? frame?.goals.find((g) => g.id === 'roof');
  const food = frame?.goals.find((g) => g.id === 'stock');
  const world = side === 'human' ? frame?.humanWorld : frame?.classicWorld;
  const meals = frame?.scoreboard[side].meals ?? 0;
  const storm = frame?.timeline.markers.find((m) => m.kind === 'storm');
  const stormPassed = Boolean(frame && storm && frame.minute >= (storm.until ?? storm.minute));
  const deadline = stormPassed ? roof?.deadlineMinute : (storm?.minute ?? roof?.deadlineMinute);
  const stage = world?.project.stage ?? world?.houseStage ?? 0;
  const target = world?.project.stages ?? roof?.targetValue ?? 10;
  const label = world?.project.kind === 'storeroom' ? 'Store-room' : 'Roof';
  return (
    <section
      className="well-phone-strip lk-strip"
      data-expanded={expanded}
      aria-label={settingWords(`${side === 'human' ? 'Human' : 'Classic'} village state`)}
    >
      <button
        type="button"
        className="lk-chips"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <span>
          {side === 'human' ? 'Human' : 'Classic'} · {label} {stage} of {target}
        </span>
        <span>
          Meals {meals}
          {settingWords(food ? ` / ${food.targetValue}` : '')}
        </span>
        <span>
          {settingWords(stormPassed ? `${label} by ` : 'Storm ')}
          {deadline === undefined ? 'not scheduled' : dayClock(deadline)}
        </span>
      </button>
      <p className="village-setting">{VILLAGE_WORDS[frame?.village ?? 'default'].season}</p>
      <p className="lk-strip-detail" data-expanded={expanded}>
        The {side === 'human' ? 'Human' : 'Classic'} village has completed {stage} of {target}{' '}
        {label.toLowerCase()} stages and stores {meals} meals.{' '}
        {deadline !== undefined &&
          (stormPassed
            ? `${label} due ${dayClock(deadline)}.`
            : `The storm arrives on ${dayClock(deadline)}.`)}
        {food && ` Food target: ${food.targetValue} meals by ${dayClock(food.deadlineMinute)}.`}
      </p>
      {stormPassed && storm && (
        <details className="well-storm-history">
          <summary>Weather history</summary>
          <p>
            Storm passed · {dayClock(storm.minute)}–{dayClock(storm.until ?? storm.minute)}
          </p>
        </details>
      )}
    </section>
  );
}
