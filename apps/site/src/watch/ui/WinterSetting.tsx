import type { Frame } from '../sim/view.ts';
import type { WatchActions } from './useWatch.ts';

/** The flyleaf sets the next night. It never changes a night already under way. */
export function WinterSetting({ frame, actions }: { frame: Frame; actions: WatchActions }) {
  const setting = frame.winterSetting ?? { active: 'hard', next: 'hard' };
  return (
    <fieldset className="w-winter-setting">
      <legend>The winter ahead</legend>
      <label>
        <input
          type="radio"
          name="winter"
          checked={setting.next === 'hard'}
          onChange={() => actions.input({ k: 'winter', winter: 'hard' })}
        />
        <span>
          Hard winter <small>As the village knows it.</small>
        </span>
      </label>
      <label>
        <input
          type="radio"
          name="winter"
          checked={setting.next === 'milder'}
          onChange={() => actions.input({ k: 'winter', winter: 'milder' })}
        />
        <span>
          Milder winter <small>Packs come later; movement is seen sooner. The same threats remain.</small>
        </span>
      </label>
      <p className="w-note">
        {frame.phase === 'goal'
          ? 'Chosen for the first dusk.'
          : `In force: ${setting.active === 'milder' ? 'milder winter' : 'hard winter'}. Changes take effect from the next dusk.`}
      </p>
    </fieldset>
  );
}
