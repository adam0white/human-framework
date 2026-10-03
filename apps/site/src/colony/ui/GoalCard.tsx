import { useEffect, useRef } from 'react';
import { dayClock, type Frame } from './contract.ts';
import { AutoPauseToggle } from './parts.tsx';

/**
 * The start card (item 1): the run begins paused behind it. It shows the three goals, when the storm comes
 * and one line on the two sides. Play sends `resume`; so does Space. The auto-pause toggle sits on the card
 * because the backdrop covers the one in the topbar.
 */
export function GoalCard(props: {
  frame: Frame | null;
  text: string;
  autoPause: boolean;
  onAutoPause(on: boolean): void;
  onPlay(): void;
}) {
  const play = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    play.current?.focus();
  }, []);
  const storm = props.frame?.timeline.markers.find((m) => m.kind === 'storm');
  const day3 = (props.frame?.day.total ?? 2) > 2;
  const pauses = day3 ? 'refusals' : 'suggestions, refusals and the storm';
  return (
    <div className="goal-card-backdrop">
      <section className="goal-card" role="dialog" aria-modal="true" aria-labelledby="goal-card-title">
        <p className="eyebrow">{day3 ? 'Day 3' : 'Day 1 · 05:00'}</p>
        <h2 id="goal-card-title">Twice at the Well</h2>
        {day3 && props.text && <p className="goal-card-storm">{props.text}</p>}
        <p className="goal-card-sides">
          Two copies of one village hear every order you give. <b>Classic</b> units obey. <b>Human</b> people
          weigh your order against their own needs, duties and trust in you, and may say no.
        </p>
        {storm && !day3 && (
          <p className="goal-card-storm">
            A storm arrives at <b>{dayClock(storm.minute)}</b>.
          </p>
        )}
        <ol className="goal-card-goals">
          {(props.frame?.goals ?? []).map((g) => (
            <li key={g.id}>
              <b>{g.label}</b>
              <span>
                {g.target} · by {dayClock(g.deadlineMinute)}
              </span>
            </li>
          ))}
        </ol>
        <p className="muted small">
          Both villages are scored on the same goals. Pick a villager, then a place, then Confirm.
          {day3
            ? ''
            : ' Suggestions on the clock set up the story and name their risk; following only them will not roof the Human house. Your own orders can.'}
          {props.autoPause ? ` The game pauses for ${pauses}.` : ''}
          <span className="keys-hint"> Space pauses.</span>
        </p>
        <div className="goal-card-actions">
          <AutoPauseToggle on={props.autoPause} onChange={props.onAutoPause} />
          <button type="button" className="btn btn-play" ref={play} onClick={props.onPlay}>
            Play
          </button>
        </div>
      </section>
    </div>
  );
}
