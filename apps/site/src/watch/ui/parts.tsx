/** Small drawn pieces shared by the pages: the granary's sacks, the bell rope's strands, the Keeper's impressions. */
import type { CSSProperties } from 'react';
import type { Impression } from '../sim/reads.ts';
import { ropeWords } from './words.ts';

/** 0..n-1 as plain values, so list keys are the item's own number rather than a map index. */
export function range(n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(i);
  return out;
}

export function Sacks({ have, lost, label }: { have: number; lost: number; label: string }) {
  const total = Math.max(0, have) + Math.max(0, lost);
  const perRow = 10;
  const rows = Math.max(1, Math.ceil(total / perRow));
  return (
    <svg
      className="w-sacks"
      viewBox={`0 0 ${perRow * 18 + 4} ${rows * 16 + 4}`}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {range(total).map((n) => {
        const x = 2 + (n % perRow) * 18 + 8;
        const y = 2 + Math.floor(n / perRow) * 16 + 8;
        const gone = n >= have;
        return (
          <g key={n} className={gone ? 'sack sack-gone' : 'sack'}>
            <ellipse cx={x} cy={y + 1} rx={7.5} ry={6.5} />
            <path d={`M${x - 3} ${y - 5} q3 -3 6 0`} />
          </g>
        );
      })}
    </svg>
  );
}

export function Rope({ wear, snapped }: { wear: number; snapped: boolean }) {
  const strands = 6;
  const left = snapped ? 0 : Math.max(1, Math.round(strands * (1 - wear)));
  const label = ropeWords(wear, snapped);
  return (
    <svg className="w-rope" viewBox="0 0 120 24" role="img" aria-label={label}>
      <title>{label}</title>
      {range(strands).map((i) => {
        const y = 6 + i * 2.4;
        const whole = i < left;
        return whole ? (
          <path key={i} className="strand" d={`M4 ${y} C40 ${y - 3} 80 ${y + 3} 116 ${y}`} />
        ) : (
          <g key={i} className="strand strand-cut">
            <path d={`M4 ${y} C24 ${y - 2} 44 ${y + 1} ${54 - i * 2} ${y + 3}`} />
            <path d={`M${66 + i * 2} ${y + 3} C80 ${y + 2} 98 ${y - 1} 116 ${y}`} />
          </g>
        );
      })}
    </svg>
  );
}

/** The Keeper's impressions: each phrase is as solid as he is sure, with a soft bar that fades where he isn't. */
export function Impressions({ impressions }: { impressions: Impression[] }) {
  return (
    // Spans, not a list: this can sit inside a roster button.
    <span className="w-imps">
      {impressions.map((im) => (
        <span
          key={im.text}
          className={im.sure <= 0 ? 'w-imp is-unknown' : 'w-imp'}
          style={{ '--sure': im.sure } as CSSProperties}
        >
          {im.text}
        </span>
      ))}
    </span>
  );
}

/** A budget drawn as lit and spent pips (the Keeper's daylight for talks). */
export function Pips({ left, of, label }: { left: number; of: number; label: string }) {
  return (
    <span className="w-pips" role="img" aria-label={label}>
      {range(of).map((i) => (
        <span key={i} className={i < left ? 'w-pip' : 'w-pip is-spent'} />
      ))}
    </span>
  );
}
