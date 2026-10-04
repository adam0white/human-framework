/**
 * One inline-SVG icon component for any glyph map (24×24, stroked, Lucide's conventions). A game passes its own
 * map of glyphs to `makeIcon` and gets an `Icon` typed to those names. An icon with a `label` is announced
 * (role="img" + <title>); without one it is decorative, for when the same word is printed beside it.
 * Shared by all three games since the quality review (2026-10-04 §4); each game's `Icon.tsx`/`icons.tsx` holds only
 * its glyph map, which names its sources and carries the licences. `options` keeps a game's own look: its default
 * size, its class names (Game 2 styles `.v-icon`) and its stroke (Game 2 keeps a 1.5 px stroke at any size).
 */
import type { ReactNode } from 'react';

export interface IconProps<N extends string> {
  name: N;
  size?: number;
  /** A standalone icon's accessible name; without it the icon is decorative. */
  label?: string;
  className?: string;
}

export interface IconOptions {
  /** Default size in px (18). */
  size?: number;
  /** The svg's class for an icon name and the caller's extra class (default `icon icon-<name> <extra>`). */
  classFor?: (name: string, extra: string | undefined) => string;
  /** Stroke width in the 24-unit viewBox for a rendered size (default 2). */
  strokeFor?: (size: number) => number;
}

const defaultClass = (name: string, extra: string | undefined) =>
  `icon icon-${name}${extra ? ` ${extra}` : ''}`;

export function makeIcon<G extends Record<string, ReactNode>>(glyphs: G, options: IconOptions = {}) {
  const { size: defaultSize = 18, classFor = defaultClass, strokeFor } = options;
  return function Icon({ name, size = defaultSize, label, className }: IconProps<keyof G & string>) {
    const common = {
      className: classFor(name, className),
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: strokeFor ? strokeFor(size) : 2,
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
