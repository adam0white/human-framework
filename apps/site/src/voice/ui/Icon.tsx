/**
 * Inline SVG icons for Game 2's chrome and status (seventh pass). Icons sit beside text on pause kinds, verdicts,
 * voices, strengths, money and the strip legend; Halil's lines, reasons and ends stay words. Every icon carries a
 * label (role="img" + <title>) unless the caller marks it decorative because the same word is printed beside it.
 *
 * Glyph paths are copied from Lucide (https://lucide.dev, icons/<name>.svg on main, fetched 2026-10-04), except:
 * `check-slash` (Lucide's check with its slash laid over it, composed here), `tea-glass` and `waves-1/2/3` (drawn
 * here, not Lucide). Lucide's license, as it requires:
 *
 * ISC License
 *
 * Copyright (c) 2026 Lucide Icons and Contributors
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * Of the icons used here, check, clock, circle, x and corner-down-left are derived from the Feather project:
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2013-present Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import type { ReactNode } from 'react';
import type { BeatKind, Family, Strength, Tone, VoiceId } from '../protocol.ts';

const GLYPHS = {
  sunrise: (
    <>
      <path d="M12 2v8" />
      <path d="m4.93 10.93 1.41 1.41" />
      <path d="M2 18h2" />
      <path d="M20 18h2" />
      <path d="m19.07 10.93-1.41 1.41" />
      <path d="M22 22H2" />
      <path d="m8 6 4-4 4 4" />
      <path d="M16 18a4 4 0 0 0-8 0" />
    </>
  ),
  split: (
    <>
      <path d="M16 3h5v5" />
      <path d="M8 3H3v5" />
      <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
      <path d="m15 9 6-6" />
    </>
  ),
  flame: (
    <path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" />
  ),
  'message-circle': (
    <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
  ),
  'alarm-clock': (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M5 3 2 6" />
      <path d="m22 6-3-3" />
      <path d="M6.38 18.7 4 21" />
      <path d="M17.64 18.67 20 21" />
    </>
  ),
  'corner-down-left': (
    <>
      <path d="M20 4v7a4 4 0 0 1-4 4H4" />
      <path d="m9 10-5 5 5 5" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  shuffle: (
    <>
      <path d="m18 14 4 4-4 4" />
      <path d="m18 2 4 4-4 4" />
      <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" />
      <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" />
      <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />
    </>
  ),
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  'check-slash': (
    <>
      <path d="M20 6 9 17l-5-5" />
      <path d="M22 2 2 22" />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M4.929 4.929 19.07 19.071" />
    </>
  ),
  phone: (
    <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
  ),
  // Drawn here: a tulip tea glass on a saucer.
  'tea-glass': (
    <>
      <path d="M8 3h8l-1.2 5.5c-.3 1.5 1.2 3 1.2 5L15 19H9l-1-5.5c0-2 1.5-3.5 1.2-5z" />
      <path d="M5 21h14" />
    </>
  ),
  'door-open': (
    <>
      <path d="M10 21H2" />
      <path d="M10 3H7a2 2 0 00-2 2v16" />
      <path d="M14 12h.01" />
      <path d="M19 21V5a2 2 0 00-1.675-1.974l-6.163-1.013A1 1 0 0010 3v18a1 1 0 001.124.992z" />
      <path d="M22 21h-3" />
    </>
  ),
  'key-round': (
    <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
  ),
  ear: (
    <>
      <path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0" />
      <path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4" />
    </>
  ),
  'heart-pulse': (
    <>
      <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
      <path d="M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
    </>
  ),
  coins: (
    <>
      <path d="M13.744 17.736a6 6 0 1 1-7.48-7.48" />
      <path d="M15 6h1v4" />
      <path d="m6.134 14.768.866-.5 2 3.464" />
      <circle cx="16" cy="8" r="6" />
    </>
  ),
  'circle-minus': (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
    </>
  ),
  'circle-dot': (
    <>
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="12" r="10" />
    </>
  ),
  wrench: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z" />
  ),
  utensils: (
    <>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <path d="M16 3.128a4 4 0 0 1 0 7.744" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <circle cx="9" cy="7" r="4" />
    </>
  ),
  armchair: (
    <>
      <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
      <path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z" />
      <path d="M5 18v2" />
      <path d="M19 18v2" />
    </>
  ),
  moon: (
    <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
  ),
  cigarette: (
    <>
      <path d="M17 12H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h14" />
      <path d="M18 8c0-2.5-2-2.5-2-5" />
      <path d="M21 16a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M22 8c0-2.5-2-2.5-2-5" />
      <path d="M7 12v4" />
    </>
  ),
  'flower-2': (
    <>
      <path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1" />
      <circle cx="12" cy="8" r="2" />
      <path d="M12 10v12" />
      <path d="M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z" />
      <path d="M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z" />
    </>
  ),
  // Drawn here: a mouth-dot and one, two or three sound arcs (Mention, Urge, Insist).
  'waves-1': (
    <>
      <circle cx="5" cy="12" r="1" />
      <path d="M9 8a6 6 0 0 1 0 8" />
    </>
  ),
  'waves-2': (
    <>
      <circle cx="5" cy="12" r="1" />
      <path d="M9 8a6 6 0 0 1 0 8" />
      <path d="M13 5a10 10 0 0 1 0 14" />
    </>
  ),
  'waves-3': (
    <>
      <circle cx="5" cy="12" r="1" />
      <path d="M9 8a6 6 0 0 1 0 8" />
      <path d="M13 5a10 10 0 0 1 0 14" />
      <path d="M17 2a14 14 0 0 1 0 20" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof GLYPHS;

/**
 * One icon, `size` px square with a 1.5 px stroke in currentColor. With `label` it is an image with that name;
 * without, it is decorative (aria-hidden) and the caller prints the same word beside it.
 */
export function Icon({
  name,
  label,
  size = 16,
  className,
}: {
  name: IconName;
  label?: string;
  size?: number;
  className?: string;
}) {
  const props = {
    className: `v-icon ${className ?? ''}`,
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: (1.5 * 24) / size,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (!label)
    return (
      <svg {...props} aria-hidden="true">
        {GLYPHS[name]}
      </svg>
    );
  return (
    <svg {...props} role="img" aria-label={label}>
      <title>{label}</title>
      {GLYPHS[name]}
    </svg>
  );
}

export const BEAT_ICON: Record<BeatKind, IconName> = {
  wake: 'sunrise',
  verdict: 'corner-down-left',
  voice: 'message-circle',
  craving: 'flame',
  'close-call': 'split',
  'duty-risk': 'alarm-clock',
  recall: 'clock',
  'day-end': 'moon',
  eid: 'sunrise',
};

/** Verdicts: assented, put off (or something like it), refused, under protest, cannot. */
export const TONE_ICON: Record<Tone, IconName> = {
  yes: 'check',
  notNow: 'clock',
  willNot: 'x',
  protest: 'check-slash',
  cannot: 'ban',
};
export const TONE_WORD: Record<Tone, string> = {
  yes: 'said yes',
  notNow: 'put you off',
  willNot: 'refused',
  protest: 'did it under protest',
  cannot: 'could not',
};

export const VOICE_ICON: Record<VoiceId, IconName> = {
  you: 'ear',
  selin: 'phone',
  riza: 'tea-glass',
  hacer: 'door-open',
  osman: 'key-round',
  doctor: 'heart-pulse',
};

export const STRENGTH_ICON: Record<Strength | 'insist', IconName> = {
  mention: 'waves-1',
  urge: 'waves-2',
  insist: 'waves-3',
};

export const FAMILY_ICON: Record<Family, IconName> = {
  worship: 'circle-dot',
  work: 'wrench',
  food: 'utensils',
  social: 'users',
  phone: 'phone',
  rest: 'armchair',
  sleep: 'moon',
  health: 'heart-pulse',
  money: 'coins',
  smoke: 'cigarette',
  grave: 'flower-2',
};
