import { describe, expect, it } from 'vitest';
import { answer, record } from './sample.ts';
import { SAMPLE_OUTPUT } from './sampleOutput.ts';

describe('homepage code sample (shown on the page via ?raw)', () => {
  it('runs against the real API and gives the output the page prints', () => {
    expect(answer.verdict).toBe(SAMPLE_OUTPUT.verdict);
    expect(answer.kind).toBe(SAMPLE_OUTPUT.kind);
    expect(answer.reason).toBe(SAMPLE_OUTPUT.reason);
    expect(answer.says).toBe(SAMPLE_OUTPUT.says);
    expect(record.chosenAction).toBe(SAMPLE_OUTPUT.chosen);
    const steal = record.considered.find((c) => c.action === 'steal');
    expect(steal?.utility.toFixed(2)).toBe(SAMPLE_OUTPUT.stealScore);
    const terms = Object.fromEntries((steal?.terms ?? []).map((t) => [t.source, t.value.toFixed(2)]));
    for (const [source, value] of SAMPLE_OUTPUT.stealTerms) expect(terms[source]).toBe(value);
    // The refused option outscored what she did: the held norm vetoed it.
    const chosen = record.considered.find((c) => c.action === record.chosenAction);
    expect(steal && chosen && steal.utility > chosen.utility).toBe(true);
  });
});
