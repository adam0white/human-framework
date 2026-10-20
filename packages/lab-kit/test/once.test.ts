import { describe, expect, it } from 'vitest';
import { type OnceStorage, once } from '../src/once.ts';

describe('once', () => {
  it('survives a blocked browser storage getter', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError');
      },
    });
    try {
      expect(once('blocked-default-storage')).toBe(true);
      expect(once('blocked-default-storage')).toBe(false);
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });
  it('persists namespaced flags and separates game keys', () => {
    const records = new Map<string, string>();
    const storage: OnceStorage = {
      getItem: (key) => records.get(key) ?? null,
      setItem: (key, value) => {
        records.set(key, value);
      },
    };
    expect(once('game-a:welcome', storage)).toBe(true);
    expect(once('game-a:welcome', storage)).toBe(false);
    expect(once('game-b:welcome', storage)).toBe(true);
    expect(records.get('hf-lab:once:game-a:welcome')).toBe('1');
    expect(once('game-a:welcome', { ...storage })).toBe(false);
  });
  it('uses memory when storage fails at either operation', () => {
    for (const failure of ['read', 'write']) {
      const storage: OnceStorage = {
        getItem: () => {
          if (failure === 'read') throw new Error('blocked');
          return null;
        },
        setItem: () => {
          throw new Error('full');
        },
      };
      expect(once('hint', storage)).toBe(true);
      expect(once('hint', storage)).toBe(false);
    }
    expect(once('memory-test', null)).toBe(true);
    expect(once('memory-test', null)).toBe(false);
  });
});
