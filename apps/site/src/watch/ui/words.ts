/** Words for things the play UI never shows as numbers: which night, the hour, rope wear. */

const ORDINALS = [
  'First',
  'Second',
  'Third',
  'Fourth',
  'Fifth',
  'Sixth',
  'Seventh',
  'Eighth',
  'Ninth',
  'Tenth',
  'Eleventh',
  'Twelfth',
];

export function nightName(n: number): string {
  const o = ORDINALS[n - 1];
  return o ? `${o} night` : 'Another night';
}

export function hourWords(clock: number, phase: string): string {
  if (phase === 'goal') return 'Before dusk';
  if (phase === 'dusk') return 'Dusk';
  if (phase === 'dawn' || phase === 'fallen') return 'Dawn';
  const h = Math.floor(clock / 60);
  if (h >= 18 && h < 20) return 'Nightfall';
  if (h >= 20 && h < 23) return 'Night';
  if (h >= 23 || h < 1) return 'Midnight';
  if (h >= 1 && h < 4) return 'The small hours';
  return 'Before dawn';
}

export function ropeWords(wear: number, snapped: boolean): string {
  if (snapped) return 'The rope has snapped';
  if (wear < 0.15) return 'The rope is sound';
  if (wear < 0.45) return 'The rope is fraying';
  if (wear < 0.75) return 'The rope is badly frayed';
  return 'The rope hangs by a few strands';
}
