/** Screen copy projections only. No strategy, capability inference or hidden-state reasons. */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { PlayAction } from '../src/adapter.ts';

/** Older game checkouts predate these pure UI readers. Missing evidence stays unmeasured. */
export async function optionalUiCopy<T>(directory: string, name: string): Promise<T | undefined> {
  const path = join(directory, 'src/ui', `${name}.ts`);
  if (!existsSync(path)) return undefined;
  // An existing module that fails to load is an error, not evidence of absent screen copy.
  return (await import(path)) as T;
}

/** The inn sheet's disabled controls remain visible; these are its displayed reasons. */
export function innControls(
  ringing: boolean,
  warnedAt: number | null,
  clock: (minute: number) => string,
  bridgeHigh: boolean,
): PlayAction[] {
  const out: PlayAction[] = [
    {
      id: 'ring',
      label: 'Ring Nerys',
      kind: 'read',
      promise: 0.3,
      ...(ringing ? { disabled: { reason: 'she’s gone to look' } } : {}),
    },
  ];
  // The low-river warning remains an edge action. Once warned, its disabled control is still evidence.
  if (warnedAt !== null || bridgeHigh)
    out.push({
      id: 'warn',
      label: 'Warn Mill Lane',
      kind: 'warn',
      promise: 0.8,
      tags: ['confront'],
      ...(warnedAt !== null ? { disabled: { reason: `warned at ${clock(warnedAt)}` } } : {}),
    });
  return out;
}

const RANK: Record<string, number> = { yes: 4, 'if pushed': 3, later: 2, 'rather not': 1, no: 0 };

/** Mirrors Murmur's card hint priority in src/ui/app.ts; an unwilling answer is never a disabled option. */
export function voiceHint(
  day: number,
  card: {
    id: string;
    hint?: string;
    options: { lean: string; pushed: string }[];
  },
): string {
  const sore = card.options.some((o) => (RANK[o.pushed] ?? 0) < (RANK[o.lean] ?? 0));
  return sore
    ? 'She’s had enough of being pushed. A hold now lands worse than a word.'
    : (card.hint ?? (day === 1 && card.id === 'alarm-1' ? 'Tap one to say it.' : ''));
}
