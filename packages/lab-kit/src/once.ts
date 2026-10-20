/**
 * Remembers first-use hints in origin-local storage. Callers namespace keys per game.
 * Failed or explicitly disabled storage uses module memory; this does not synchronize tabs.
 */
export interface OnceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
/** Structural storage accepted by first-use components. */
export type FlagStorage = OnceStorage;

const memory = new Set<string>();
const storageMemory = new WeakMap<OnceStorage, Set<string>>();

export function once(key: string, storage?: OnceStorage | null): boolean {
  let target = storage;
  if (target === undefined) {
    try {
      target = globalThis.localStorage ?? null;
    } catch {
      target = null;
    }
  }
  let seen = memory;
  if (target) {
    seen = storageMemory.get(target) ?? new Set<string>();
    storageMemory.set(target, seen);
  }
  const storedKey = `hf-lab:once:${key}`;
  if (seen.has(storedKey)) return false;
  seen.add(storedKey);
  if (target) {
    try {
      if (target.getItem(storedKey) !== null) return false;
      target.setItem(storedKey, '1');
    } catch {
      // The same memory record applies whether reading or writing failed.
    }
  }
  return true;
}
