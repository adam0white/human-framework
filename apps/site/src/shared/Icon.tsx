/**
 * One inline-SVG icon component for any glyph map (24×24, stroked, Lucide's conventions). A game passes its own
 * map of glyphs to `makeIcon` and gets an `Icon` typed to those names. An icon with a `label` is announced
 * (role="img" + <title>); without one it is decorative, for when the same word is printed beside it.
 * Extracted for Game 3 from `colony/ui/Icon.tsx` and `voice/ui/Icon.tsx` (quality review, 2026-10-04 §4);
 * Games 1–2 still carry their own copies. Each glyph map names its sources and carries the licences.
 */
import type { ReactNode } from 'react';

export interface IconProps<N extends string> {
  name: N;
  size?: number;
  /** A standalone icon's accessible name; without it the icon is decorative. */
  label?: string;
  className?: string;
}

export function makeIcon<G extends Record<string, ReactNode>>(glyphs: G) {
  return function Icon({ name, size = 18, label, className }: IconProps<keyof G & string>) {
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
    const body = glyphs[name];
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
  };
}
