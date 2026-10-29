import { expect, test } from 'vitest';
import { main as minimal } from '../examples/minimal.ts';
import { main as suggestions } from '../examples/suggestions.ts';

// Faculty-specific examples were superseded by their owned controls. The community entrypoint
// is exercised once in save-resume.test.ts, including the actual two-issued-request case.
test('the packed minimal host settles actual actions and replays its current archive', () => {
  const result = minimal();
  expect(result.completed).toBeGreaterThan(0);
  expect(result.archive.version).toBe(6);
  expect(result.archive.current.pending).toEqual([]);
  expect(result.replayVerified).toBe(true);
});

test('ordinary suggestion preview is detached and the actual response is recorded separately', () => {
  const result = suggestions();
  expect(result.previewUnchanged).toBe(true);
  expect(result.hint.hypothetical).toBe(true);
  expect(result.hint.perspective).toEqual({ kind: 'host' });
  expect(result.archive.current.events.some((event) => event.data.kind === 'suggestion-resolved')).toBe(true);
  expect(result.archive.current.pending).toEqual([]);
});
