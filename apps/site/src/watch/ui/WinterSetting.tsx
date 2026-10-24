import type { Frame } from '../sim/view.ts';
import type { WatchActions } from './useWatch.ts';

/** The flyleaf sets the next night. It never changes a night already under way. */
export function WinterSetting({ frame, actions }: { frame: Frame; actions: WatchActions }) {
  const setting = frame.winterSetting ?? { active: 'hard', next: 'hard' };
  return (
    <fieldset className="w-winter-setting">
      <legend>Words for the winter ahead</legend>
      <label>
        <input
          type="radio"
          name="winter"
          checked={setting.next === 'hard'}
          onChange={() => actions.input({ k: 'winter', winter: 'hard' })}
        />
        <span>
          Tamar: “Be grateful for what we have. Take the winter as it comes.”
          <small>Idris: “Let the young learn the watch we learned.”</small>
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
          Danyal: “Let us pray that the coming winter goes easier.”
          <small>Samira: “And a little rest for those on the wall.”</small>
          <small>Packs come later; movement is seen sooner. The same threats remain.</small>
        </span>
      </label>
      <p className="w-note">
        {frame.phase === 'goal'
          ? 'These are the village’s hopes for the first dusk.'
          : `The winter that came: ${setting.active === 'milder' ? 'packs came later; movement shows sooner' : 'as the village knows it'}. New hopes are for the next dusk.`}
      </p>
    </fieldset>
  );
}
