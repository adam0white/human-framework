import type { ReactNode } from 'react';
import { settingWords } from './setting-words.ts';

/** Monoline ink sketches, one per game. Strokes use currentColor; the accent marks the player's part. */
export function Sketch({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg className="sketch" viewBox="0 0 120 72" role="img" aria-label={settingWords(label)}>
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
    <Sketch label="A coiled climbing rope beside a rock face and belay anchor">
      <path d="M82 4l-9 15 6 12-13 16 6 21M83 6l27 62M79 31l13 4M72 47l24 6" />
      <ellipse cx="37" cy="52" rx="24" ry="12" />
      <ellipse cx="37" cy="52" rx="18" ry="8" />
      <ellipse cx="37" cy="52" rx="11" ry="4" />
      <path className="accent" d="M13 52c0 19 48 19 48 0M60 52l6-29 10-4M70 17l8 4-3 7-8-4z" />
    </Sketch>
  ),
  pass: (
    <Sketch label="Three cooking pans on a kitchen counter">
      <path d="M8 55h104M15 34h22v15H15zM48 29h22v20H48zM81 34h22v15H81zM20 25v-8M57 20v-8M90 25v-8" />
      <path className="accent" d="M10 56h100M22 40h10M55 36h10M88 40h10" />
    </Sketch>
  ),
  glance: (
    <Sketch label="A water gauge beside a dam">
      <path d="M8 54h104M66 12l22 42H44zM12 20h24v34H12zM18 27h8M18 35h8M18 43h8" />
      <path className="accent" d="M3 61q12-8 24 0t24 0t24 0t24 0" />
    </Sketch>
  ),
  stairwell: (
    <Sketch label="Stairs and doors inside an apartment building">
      <path d="M12 63h20V50h20V37h20V24h20V11h16M15 36V15h15v21M49 23V4h15v19M84 64V43h15v21" />
      <path className="accent" d="M11 68l96-61" />
    </Sketch>
  ),
  hearsay: (
    <Sketch label="Two people exchanging a message">
      <circle cx="25" cy="35" r="6" />
      <circle cx="94" cy="35" r="6" />
      <path d="M14 62V49q11-13 22 0v13M83 62V49q11-13 22 0v13" />
      <path className="accent" d="M42 10h35v19H59l-10 9v-9h-7zM49 17h21" />
    </Sketch>
  ),
  goodhands: (
    <Sketch label="Hands holding a bowl">
      <path d="M36 30h48q-3 22-24 22T36 30zM8 48l25 13h54l25-13M15 42l20 12h50l20-12" />
      <path className="accent" d="M48 24c-7-7 7-9 0-16M66 24c-7-7 7-9 0-16" />
    </Sketch>
  ),
  valley: (
    <Sketch label="A river between hills">
      <path d="M3 41L27 9l26 32M61 40L85 8l31 33M4 65h30M85 65h31" />
      <path className="accent" d="M63 32c-29 12 23 21-7 35" />
    </Sketch>
  ),
  warren: (
    <Sketch label="Connected underground rooms">
      <path d="M5 15h110M15 15v22h22v26h27V36h31v27h15M20 63h17M64 63h31" />
      <path className="accent" d="M14 37h23M64 37h31" />
    </Sketch>
  ),
  commonstead: (
    <Sketch label="A farmhouse beside shared fields">
      <path d="M10 34l19-18 19 18v25H10zM23 59V44h12v15M59 20h48M59 31h48M59 42h48M59 53h48M59 64h48" />
      <path className="accent" d="M82 15v52" />
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
