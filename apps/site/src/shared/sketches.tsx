import type { ReactNode } from 'react';

/** Monoline ink sketches, one per game. Strokes use currentColor; the accent marks the player's part. */
export function Sketch({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg className="sketch" viewBox="0 0 120 72" role="img" aria-label={label}>
      {children}
    </svg>
  );
}

const SKETCHES: Record<string, ReactNode> = {
  well: (
    <Sketch label="A well between two houses, with a person nearby">
      <path d="M10 30l14-10 14 10v20H10z" />
      <path d="M84 36l13-9 13 9v18H84z" />
      <ellipse cx="60" cy="48" rx="12" ry="4.5" />
      <path d="M48 48v8c0 3 24 3 24 0v-8M52 30v14M68 30v14M50 30h20" />
      <circle cx="40" cy="44" r="3" />
      <path d="M40 47.5v9M36.5 51h7M40 56.5l-3 6M40 56.5l3 6" />
      <path className="accent" d="M44 36c4-5 12-6 16-3" />
    </Sketch>
  ),
  voice: (
    <Sketch label="A crescent moon over an open notebook">
      <path d="M68 8a12 12 0 1 0 9 20 10 10 0 0 1-9-20z" />
      <path d="M22 44c12-4 26-4 38 2 12-6 26-6 38-2v22c-12-4-26-4-38 2-12-6-26-6-38-2z" />
      <path d="M60 46v22M30 52c8-1 16-1 22 1M30 58c8-1 14-1 20 1" />
      <path className="accent" d="M68 52c7-2 15-2 22 0" />
    </Sketch>
  ),
  watch: (
    <Sketch label="A watch tower on a village wall at night, a lantern below">
      <path d="M4 50h112M4 50v-6h8v6M20 50v-6h8v6M92 50v-6h8v6M108 50v-6h8v6" />
      <path d="M50 66V26h20v40M47 26h26" />
      <circle cx="60" cy="16" r="3" />
      <path d="M60 19.5v6" />
      <path d="M20 14h0M34 8h0M90 10h0M104 20h0" strokeWidth="2.4" strokeLinecap="round" />
      <path className="accent" d="M28 58h6v7h-6zM29 58c0-3 4-3 4 0" />
    </Sketch>
  ),
  rope: (
    <Sketch label="A climber on a rope down a rock face">
      <path d="M6 70c8-14 10-30 22-40s18-22 30-28M58 2c10 10 18 24 22 40s14 22 30 28" />
      <path className="accent" d="M60 4c0 14 2 28 0 40" />
      <circle cx="60" cy="48" r="3" />
      <path d="M60 51.5v9M56 55h8M60 60.5l-3 6M60 60.5l3 6" />
    </Sketch>
  ),
  neighbours: (
    <Sketch label="A row of houses on a street">
      <path d="M8 60V40l10-9 10 9v20M32 60V36l12-10 12 10v24M60 60V42l9-8 9 8v18M82 60V34l13-11 13 11v26" />
      <path d="M4 60h112" />
      <path className="accent" d="M41 60v-9h6v9" />
    </Sketch>
  ),
  repair: (
    <Sketch label="A lamp and a wrench on a workbench">
      <path d="M8 52h104M16 52v16M104 52v16" />
      <path d="M30 52h18M39 52l-5-22 14-12M44 14l14 5 4 12-18 4z" />
      <path className="accent" d="M76 48l18-18m0 0a5 5 0 1 1 6-6l-4 4 3 3 4-4a5 5 0 0 1-6 6" />
    </Sketch>
  ),
};

/** Fallback for a game with no sketch yet: an open notebook. */
const FALLBACK = (
  <Sketch label="An open notebook">
    <path d="M22 14c12-4 26-4 38 2 12-6 26-6 38-2v44c-12-4-26-4-38 2-12-6-26-6-38-2z" />
    <path d="M60 16v44M30 26c8-1 16-1 22 1M30 34c8-1 16-1 22 1M68 27c7-2 15-2 22 0" />
  </Sketch>
);

export function sketchFor(id: string): ReactNode {
  return SKETCHES[id] ?? FALLBACK;
}
