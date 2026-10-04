/** Top bar (plan §6.2) with the sky band (§2): the hour's light, prayer notches, the fast, and a "now" mark. */
import { memo } from 'react';
import { FullscreenButton } from '../../shared/fullscreen.tsx';
import { PlaytestMenu } from '../../shared/PlaytestMenu.tsx';
import type { Frame, Pace } from '../protocol.ts';
import type { VoiceActions } from './useVoice.ts';

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
          title={`${p.name}${p.state ? `: ${p.state}${p.mosque ? ', at the mosque' : ''}` : ''}`}
        >
          <span className="v-sky-pip">{p.mosque && <span className="v-sky-pip-dot" />}</span>
        </span>
      ))}
      <span className="v-sky-now" style={{ left: `${(sky.hour / 24) * 100}%` }} />
    </div>
  );
});

const PACES: { id: Pace; label: string }[] = [
  { id: 'slow', label: 'Slow' },
  { id: 'normal', label: 'Normal' },
  { id: 'fast', label: 'Fast' },
];

const paceLabel = (p: Pace) => PACES.find((x) => x.id === p)?.label ?? p;
const nextPace = (p: Pace): Pace => {
  const i = PACES.findIndex((x) => x.id === p);
  return PACES[(i + 1) % PACES.length]?.id ?? 'slow';
};

/** The frame fields the top bar shows, passed one by one so `memo` can compare them. */
export type TopBarFields = Pick<
  Frame,
  'phase' | 'dayLabel' | 'clock' | 'sky' | 'paused' | 'pace' | 'autoPause'
> & {
  fastForward: string | undefined;
};

export const TopBar = memo(function TopBar({
  actions,
  onPlaytestError,
  ...frame
}: TopBarFields & {
  actions: VoiceActions;
  onPlaytestError: (message: string) => void;
}) {
  const live = frame.phase === 'day' || frame.phase === 'eid' || frame.phase === 'free';
  return (
    <header className="v-top">
      <div className="v-top-id">
        <a className="v-top-title" href="/" title="Human Framework home">
          The Day You Say Nothing
        </a>
        <div className="v-top-when">
          <span className="v-top-day">{frame.dayLabel}</span>
          <span className="v-top-clock">{frame.clock}</span>
        </div>
      </div>
      <div className="v-top-sky">
        <SkyBand sky={frame.sky} />
        <span className="v-sr">
          {frame.sky.prayers
            .filter((p) => p.state)
            .map((p) => `${p.name} ${p.state}${p.mosque ? ' at the mosque' : ''}`)
            .join(', ')}
        </span>
        <div className="v-top-ff" aria-live="polite">
          {frame.fastForward ? `skipping: ${frame.fastForward}` : frame.sky.fast ? 'fasting' : ''}
        </div>
      </div>
      <div className="v-top-controls">
        <button
          type="button"
          className="v-btn v-btn-play"
          onClick={() => actions.setPaused(!frame.paused)}
          disabled={!live}
          aria-label={frame.paused ? 'Play (Space)' : 'Pause (Space)'}
          title={frame.paused ? 'Play (Space)' : 'Pause (Space)'}
        >
          {frame.paused ? (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 2.5v11l9-5.5z" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" />
            </svg>
          )}
        </button>
        <fieldset className="v-seg v-pace" aria-label="Pace">
          {PACES.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={frame.pace === p.id}
              onClick={() => actions.setPace(p.id)}
            >
              {p.label}
            </button>
          ))}
        </fieldset>
        <button
          type="button"
          className="v-btn v-btn-quiet v-pace-cycle"
          onClick={() => actions.setPace(nextPace(frame.pace))}
          title="Pace"
          aria-label={`Pace: ${paceLabel(frame.pace)}. Change pace`}
        >
          {paceLabel(frame.pace)}
        </button>
        <button
          type="button"
          className="v-btn v-btn-quiet v-autopause"
          aria-pressed={frame.autoPause}
          onClick={() => actions.setAutoPause(!frame.autoPause)}
          title="Stop when something matters"
        >
          <span className="v-autopause-mark" aria-hidden="true" />
          <span className="v-long">Auto-pause</span>
          <span className="v-short">Auto</span>
        </button>
        {live && (
          <button type="button" className="v-btn v-btn-quiet v-endday" onClick={actions.endDay}>
            <span className="v-long">End the day</span>
            <span className="v-short">End day</span>
          </button>
        )}
        <PlaytestMenu
          className="v-playtest pt-compact"
          onExport={actions.exportPlaytest}
          onLoad={actions.loadPlaytest}
          onError={onPlaytestError}
          extra={<FullscreenButton variant="item" className="v-fs-item" />}
        />
        <FullscreenButton className="v-fs" />
      </div>
    </header>
  );
});
