/** One day as a strip (plan §2, replacing the kilim): what he did across 24 hours, coloured by family. */
import type { Family, StripRow } from '../protocol.ts';
import { FAMILY_ICON, Icon } from './Icon.tsx';
import { VOICE_COLOURS, VOICE_NAMES } from './parts.tsx';

export const FAMILY_LABEL: Record<Family, string> = {
  worship: 'prayer',
  work: 'work',
  food: 'food',
  social: 'friends',
  phone: 'phone',
  rest: 'rest',
  sleep: 'sleep',
  health: 'health',
  money: 'money',
  smoke: 'smoke',
  grave: 'grave',
};

export function Strip({ row, showLabel = true }: { row: StripRow; showLabel?: boolean }) {
  return (
    <div className="v-strip-row">
      {showLabel && <span className="v-strip-label">{row.label}</span>}
      <div
        className="v-strip"
        role="img"
        aria-label={`${row.label}: ${row.cells.map((c) => c.label).join(', ')}`}
      >
        {[6, 12, 18].map((h) => (
          <span key={h} className="v-strip-hour" style={{ left: `${(h / 24) * 100}%` }} />
        ))}
        {row.cells.map((c) => (
          <span
            key={`${c.from}-${c.label}`}
            className={`v-strip-cell fam-${c.family} ${c.promptedBy ? 'is-prompted' : ''}`}
            style={{
              left: `${(c.from / 1440) * 100}%`,
              width: `${(Math.max(6, c.to - c.from) / 1440) * 100}%`,
              ...(c.promptedBy ? ({ '--who': VOICE_COLOURS[c.promptedBy] } as React.CSSProperties) : {}),
            }}
            title={`${c.label}${c.promptedBy ? ` (after ${VOICE_NAMES[c.promptedBy]} spoke)` : ''}`}
          />
        ))}
      </div>
    </div>
  );
}

export function StripLegend({ rows }: { rows: StripRow[] }) {
  const fams = [...new Set(rows.flatMap((r) => r.cells.map((c) => c.family)))];
  const prompted = rows.some((r) => r.cells.some((c) => c.promptedBy));
  return (
    <ul className="v-strip-legend">
      {fams.map((f) => (
        <li key={f}>
          <span className={`v-strip-key fam-${f}`} />
          <Icon name={FAMILY_ICON[f]} />
          {FAMILY_LABEL[f]}
        </li>
      ))}
      {prompted && (
        <li>
          <span className="v-strip-key is-prompted-key" />
          after a voice spoke
        </li>
      )}
      <li className="v-strip-axis">00 · 06 · 12 · 18 · 24</li>
    </ul>
  );
}
