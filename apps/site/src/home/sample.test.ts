import { describe, expect, it } from 'vitest';
import { answer } from './sample.ts';

describe('homepage code sample (shown on the page via ?raw)', () => {
  it('runs against the real API and gives the result its comments state', () => {
    expect(answer.verdict).toBe('refused');
    expect(answer.kind).toBe('willNot');
    expect(answer.says.length).toBeGreaterThan(0);
  });
});
