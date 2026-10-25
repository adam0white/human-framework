/** Top bar (voice.md §7.2) with the sky band (§4): the hour's light, prayer notches, the fast, and a "now" mark. */
import { memo } from 'react';
import { settingWords } from '../../shared/setting-words.ts';
import type { Frame } from '../protocol.ts';
import { storyDate } from './dates.ts';
import { deriveScene } from './scenes.ts';
import { explainTerms } from './terms.tsx';

const SKY: [number, string][] = [
  [0, '#121831'],
  [4, '#1b2140'],
  [4.8, '#3b3358'],
  [5.4, '#c8744a'],
  [6.3, '#9cb8cf'],
  [11, '#d7e3ea'],
  [15.5, '#f3efe2'],
  [18.2, '#e8a33c'],
  [19.2, '#6a3c4a'],
  [20.5, '#1b2140'],
  [24, '#121831'],
];

const BAND = `linear-gradient(90deg, ${SKY.map(([h, c]) => `${c} ${((h / 24) * 100).toFixed(2)}%`).join(', ')})`;
const pct = (minute: number) => `${(((minute % 1440) + 1440) % 1440) / 14.4}%`;

export const SkyBand = memo(function SkyBand({ sky }: { sky: Frame['sky'] }) {
  return (
    <div className="v-sky" style={{ backgroundImage: BAND }} aria-hidden="true">
      {sky.fast && (
        <span
          className="v-sky-fast"
          style={{ left: pct(sky.fast.from), width: `${(sky.fast.until - sky.fast.from) / 14.4}%` }}
        />
      )}
      {sky.prayers.map((p) => (
        <span
          key={p.name}
          className={`v-sky-notch ${p.state ? `is-${p.state}` : ''}`}
          style={{ left: pct(p.minute) }}
          title={settingWords(
            `${p.name}${p.state ? `: ${p.state}${p.mosque ? ', at the mosque' : ''}` : ''}`,
          )}
        >
          <span className="v-sky-pip">{p.mosque && <span className="v-sky-pip-dot" />}</span>
        </span>
      ))}
      <span className="v-sky-now" style={{ left: `${(sky.hour / 24) * 100}%` }} />
    </div>
  );
});

export const TopBar = memo(function TopBar({
  frame,
  title,
  reading,
  skipping,
  infoOpen,
  menuOpen,
  onInfo,
  onMenu,
}: {
  frame: Frame | null;
  title: boolean;
  reading: boolean;
  skipping: boolean;
  infoOpen: boolean;
  menuOpen: boolean;
  onInfo: () => void;
  onMenu: () => void;
}) {
  const scene = frame ? deriveScene(frame) : null;
  const runningPage = frame && !frame.intro && ['day', 'eid', 'free'].includes(frame.phase);
  const label =
    !frame || title ? (
      ''
    ) : frame.phase === 'report' ? (
      'A week after Eid'
    ) : frame.phase === 'between' ? (
      `${frame.dayLabel} is over`
    ) : frame.phase === 'free' ? (
      `After Eid · day ${frame.day - 31} · ${frame.clock}`
    ) : (
      <>
        {settingWords(frame.dayLabel)} ·{' '}
        <span className="v-calendar-desktop">{settingWords(storyDate(frame.day))}</span>
        <span className="v-calendar-phone">
          {settingWords(
            storyDate(frame.day).replace(
              /Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|March|April/g,
              (word) => word.slice(0, 3),
            ),
          )}
        </span>{' '}
        · <time>{frame.clock}</time>
      </>
    );
  return (
    <header className="v-shell-top">
      <div className="v-shell-when">{title ? <a href="/">All games</a> : label}</div>
      {frame && !title && frame.phase !== 'report' && (
        <div className="v-shell-state">
          <SkyBand sky={frame.sky} />
          <span className="v-sr">
            {settingWords(
              frame.sky.prayers
                .filter((p) => p.state)
                .map((p) => `${p.name} ${p.state}`)
                .join(', '),
            )}
          </span>
          <div className="v-shell-state-words" style={!runningPage ? { visibility: 'hidden' } : undefined}>
            <span>
              {skipping
                ? 'skipping to the next event…'
                : frame.fastForward
                  ? `skipping: ${explainTerms(frame.fastForward)}`
                  : frame.sky.fast
                    ? `fasting until ${String(Math.floor(frame.sky.fast.until / 60)).padStart(2, '0')}:${String(frame.sky.fast.until % 60).padStart(2, '0')}`
                    : ''}
            </span>
            <span>
              {settingWords(
                menuOpen || infoOpen
                  ? menuOpen
                    ? 'held: menu open'
                    : 'held: information open'
                  : frame.paused
                    ? `stopped: ${scene?.current ? scene.names.join(' and ') : (frame.pauseBeat?.text ?? 'a moment with Halil')}`
                    : reading
                      ? 'reading: the day slows while you choose'
                      : '',
              )}
            </span>
          </div>
        </div>
      )}
      <div className="v-shell-controls">
        <button type="button" aria-label="Information" aria-expanded={infoOpen} onClick={onInfo}>
          i
        </button>
        <button type="button" aria-label="Game menu" aria-expanded={menuOpen} onClick={onMenu}>
          ≡<span className="v-menu-word"> Menu</span>
        </button>
      </div>
    </header>
  );
});
