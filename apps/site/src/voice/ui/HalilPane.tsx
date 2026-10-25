import { settingWords } from '../../shared/setting-words.ts';
/** What the player sees of him (voice.md §8): doing now, the felt body, named feelings, what's on his mind, money. */

import { memo } from 'react';
import type { HalilView } from '../protocol.ts';
import { Icon } from './Icon.tsx';
import { explainTerms } from './terms.tsx';

const STATE_LABEL: Record<HalilView['onMind'][number]['state'], string> = {
  open: '',
  closing: 'closing',
  kept: 'kept',
  missed: 'missed',
  excused: 'excused',
};

export const HalilPane = memo(function HalilPane({ halil }: { halil: HalilView }) {
  return (
    <section className="v-pane v-halil" aria-label="Halil">
      <h2 className="v-pane-title">Halil</h2>
      <div className="v-doing">
        {halil.doing ? (
          <>
            <p className="v-doing-label">Halil chose to {explainTerms(halil.doing.label)}.</p>
            {halil.doing.intention && <p className="v-doing-why">{explainTerms(halil.doing.intention)}</p>}
            <p className="v-doing-until">until {settingWords(halil.doing.until)}</p>
          </>
        ) : (
          <p className="v-doing-label">
            {halil.asleep ? 'Halil is asleep.' : 'Halil is deciding what to do.'}
          </p>
        )}
      </div>

      <h3 className="v-sub">How he feels</h3>
      <ul className="v-felt">
        {halil.felt.map((f) => (
          <li key={f.id}>
            <span className="v-felt-id">{settingWords(f.id === 'tired' ? 'tiredness' : f.id)}</span>
            <span className="v-felt-word">{settingWords(f.word)}</span>
          </li>
        ))}
      </ul>
      {halil.feelings.length > 0 && (
        <p className="v-feelings">
          {halil.feelings.map((f) => (
            <span key={f.name} className="v-feeling">
              {settingWords(f.word)}
            </span>
          ))}
        </p>
      )}

      {halil.health && halil.health.length > 0 && (
        <>
          <h3 className="v-sub">His health</h3>
          <ul className="v-health">
            {halil.health.map((line) => (
              <li key={line}>{settingWords(line)}</li>
            ))}
          </ul>
        </>
      )}

      <h3 className="v-sub">On his mind</h3>
      <ul className="v-mind">
        {halil.onMind.length === 0 && <li className="v-muted">Nothing needs his attention right now.</li>}
        {halil.onMind.map((c) => (
          <li key={c.id} className={`v-mind-${c.state}`}>
            <span className="v-mind-label">{explainTerms(c.label)}</span>
            <span className="v-mind-due">{settingWords(c.due)}</span>
            {STATE_LABEL[c.state] && (
              <span className="v-mind-state">{settingWords(STATE_LABEL[c.state])}</span>
            )}
          </li>
        ))}
      </ul>

      {halil.weighs && halil.weighs.length > 0 && (
        <>
          <h3 className="v-sub">How Halil feels</h3>
          <ul className="v-mind v-weighs">
            {halil.weighs.map((w) => (
              <li key={w.label}>
                <span className="v-mind-label">{explainTerms(w.label)}</span>
                <span className="v-mind-due">{settingWords(w.word)}</span>
                {w.trend !== 'same' && (
                  <span className="v-mind-state">
                    {w.trend === 'easier' ? 'easier than at the start' : 'heavier than at the start'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="v-sub">Money</h3>
      <p className="v-money">
        <span>
          <Icon name="coins" />
          <strong>{halil.money}</strong> in hand
        </span>
        <span>
          <Icon name="circle-minus" />
          <strong>{halil.owed}</strong> owed to Osman
        </span>
      </p>
    </section>
  );
});
