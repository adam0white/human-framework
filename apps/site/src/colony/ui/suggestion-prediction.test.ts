// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import type { WorkerToMain } from '../protocol.ts';
import type { OrderInput } from '../sim/orders.ts';
import { type Colony, useColony } from './useColony.ts';

vi.mock('../../shared/lab.tsx', () => ({
  gameLabs: {
    well: { setPersonaRecording: vi.fn(), allowPersonaRecording: vi.fn(), personaRecordingAllowed: false },
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => vi.unstubAllGlobals());
function Harness({ capture }: { capture: (value: Colony) => void }) {
  capture(useColony());
  return null;
}

it('keeps suggestion forecasts independent of composer and scene forecasts, and drops superseded replies', async () => {
  const listeners = new Set<(e: { data: WorkerToMain }) => void>();
  const messages: Record<string, unknown>[] = [];
  vi.stubGlobal(
    'Worker',
    class {
      postMessage(msg: Record<string, unknown>) {
        messages.push(msg);
      }
      addEventListener(event: string, fn: (e: { data: WorkerToMain }) => void) {
        if (event === 'message') listeners.add(fn);
      }
      removeEventListener(event: string, fn: (e: { data: WorkerToMain }) => void) {
        if (event === 'message') listeners.delete(fn);
      }
      terminate() {}
    },
  );
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  let colony: Colony | undefined;
  const root = createRoot(document.createElement('div'));
  await act(() =>
    root.render(
      createElement(Harness, {
        capture: (value) => {
          colony = value;
        },
      }),
    ),
  );
  if (!colony) throw new Error('Hook did not mount');
  const state = () => {
    if (!colony) throw new Error('Missing state');
    return colony;
  };
  const input: OrderInput = { personId: 'samira', placeId: 'site', rush: true, insist: false };
  const request = () => messages.filter((m) => m.type === 'predict').at(-1);
  await act(() => state().actions.predictSuggestion?.(input));
  const first = request();
  expect(first?.input).toEqual(input);
  await act(() => state().actions.predict({ personId: 'idris', placeId: 'forest' }));
  const composer = request();
  await act(() => state().actions.predictPlaces?.([{ personId: 'yusuf', placeId: 'site' }]));
  const scene = request();
  const reply = (req: typeof first, kind: 'assent' | 'willNot') => {
    if (!req) throw new Error('Missing request');
    for (const listener of listeners)
      listener({
        data: {
          type: 'predicted',
          gen: 1,
          requestId: req.requestId as number,
          prediction: { personId: (req.input as OrderInput).personId, action: 'build', kind, text: kind },
        },
      });
  };
  await act(() => {
    reply(first, 'willNot');
    reply(composer, 'assent');
    reply(scene, 'assent');
  });
  expect(state().suggestionPrediction?.prediction.kind).toBe('willNot');
  expect(state().prediction?.input.personId).toBe('idris');
  expect(state().scenePredictions?.site?.input.personId).toBe('yusuf');
  await act(() => state().actions.predictSuggestion?.({ ...input, personId: 'danyal' }));
  const second = request();
  expect(state().suggestionPrediction).toBeNull();
  await act(() => {
    reply(second, 'assent');
    reply(first, 'willNot');
  });
  expect(state().suggestionPrediction?.input.personId).toBe('danyal');
  await act(() => state().actions.predictSuggestion?.(null));
  expect(state().suggestionPrediction).toBeNull();
  await act(() => root.unmount());
});
