/**
 * Inline SVG icons for Game 1, drawn in `currentColor` at 16–20 px. No CDN, no package: the path data below is
 * copied from Lucide (lucide-static 1.51.0, https://lucide.dev).
 *
 * Lucide: ISC License. Copyright (c) 2026 Lucide Icons and Contributors. Permission to use, copy, modify, and/or
 * distribute this software for any purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies. THE SOFTWARE IS PROVIDED "AS IS" AND THE
 * AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE.
 *
 * `moon` is derived from Feather: The MIT License (MIT). Copyright (c) 2013-present Cole Bemis. Permission is
 * hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction, subject to the condition that the above
 * copyright notice and this permission notice be included in all copies or substantial portions of the
 * Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 *
 * An icon beside text is decorative (`aria-hidden`); a standalone icon takes a `label` and is `role="img"`.
 * `RingTimer` is drawn here, not copied.
 */
import type { ReactElement } from 'react';

const PATHS = {
  // lucide: zap
  rush: [
    'M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z',
  ],
  // lucide: hand-fist
  insist: [
    'M12.035 17.012a3 3 0 0 0-3-3l-.311-.002a.72.72 0 0 1-.505-1.229l1.195-1.195A2 2 0 0 1 10.828 11H12a2 2 0 0 0 0-4H9.243a3 3 0 0 0-2.122.879l-2.707 2.707A4.83 4.83 0 0 0 3 14a8 8 0 0 0 8 8h2a8 8 0 0 0 8-8V7a2 2 0 1 0-4 0v2a2 2 0 1 0 4 0',
    'M13.888 9.662A2 2 0 0 0 17 8V5A2 2 0 1 0 13 5',
    'M9 5A2 2 0 1 0 5 5V10',
    'M9 7V4A2 2 0 1 1 13 4V7.268',
  ],
  // lucide: house
  house: [
    'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8',
    'M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  ],
  // lucide: cooking-pot
  meals: [
    'M2 12h20',
    'M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8',
    'm4 8 16-4',
    'm8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8',
  ],
  // lucide: heart
  lives: [
    'M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5',
  ],
  // lucide: trees
  forest: [
    'M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z',
    'M7 16v6',
    'M13 19v3',
    'M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5',
  ],
  // lucide: tree-pine
  cedar: [
    'm17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z',
    'M12 22v-3',
  ],
  // lucide: wheat
  field: [
    'M2 22 16 8',
    'M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z',
    'M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z',
    'M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z',
    'M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z',
    'M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z',
    'M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z',
    'M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z',
  ],
  // lucide: droplet
  well: [
    'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z',
  ],
  // lucide: soup
  kitchen: [
    'M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z',
    'M7 21h10',
    'M19.5 12 22 6',
    'M16.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.73 1.62',
    'M11.25 3c.27.1.8.53.74 1.36-.05.83-.93 1.2-.98 2.02-.06.78.33 1.24.72 1.62',
    'M6.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.74 1.62',
  ],
  // lucide: landmark
  masjid: [
    'M10 18v-7',
    'M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z',
    'M14 18v-7',
    'M18 18v-7',
    'M3 22h18',
    'M6 18v-7',
  ],
  // lucide: moon
  home: [
    'M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401',
  ],
  // lucide: hammer
  build: [
    'm15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9',
    'm18 15 4-4',
    'm21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5',
  ],
} as const;

/** lucide: circle-slash-2 (a circle with a diagonal, drawn as a circle plus a path). */
function NoneGlyph(): ReactElement {
  return (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M22 2 2 22" />
    </>
  );
}

export type IconName = keyof typeof PATHS | 'none';

export function Icon({
  name,
  size = 16,
  label,
  className,
}: {
  name: IconName;
  size?: number;
  /** A standalone icon's accessible name; without it the icon is decorative. */
  label?: string;
  className?: string;
}) {
  const common = {
    className: `icon icon-${name}${className ? ` ${className}` : ''}`,
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    focusable: 'false' as const,
  };
  const body = name === 'none' ? <NoneGlyph /> : PATHS[name].map((d) => <path key={d} d={d} />);
  if (label) {
    return (
      <svg {...common} role="img" aria-label={label}>
        <title>{label}</title>
        {body}
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true">
      {body}
    </svg>
  );
}

/**
 * A ring that drains as time runs out (`left` of `span`). Decorative: the time is also given as text beside it.
 */
export function RingTimer({ left, span, size = 18 }: { left: number; span: number; size?: number }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, span > 0 ? left / span : 0));
  return (
    <svg
      className={`ring-timer ${frac < 0.25 ? 'is-low' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r={r} fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={3} />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={`${c * frac} ${c}`}
        transform="rotate(-90 12 12)"
      />
    </svg>
  );
}

/** Grey ∅ for a cell where Classic lacks the concept; the phrase is the tooltip and the accessible name. */
export function NoConcept({ text }: { text: string }) {
  return (
    <span className="no-concept-mark" title={text}>
      <Icon name="none" size={16} />
      <span className="visually-hidden">{text}</span>
    </span>
  );
}
