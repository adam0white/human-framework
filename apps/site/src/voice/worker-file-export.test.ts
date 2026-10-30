/** TEST ONLY scheduling fault: a paused run must not start an unrelated, potentially long comparison. */
import { expect, it, vi } from 'vitest';
import { makePlaytestFile } from '../shared/playtest.ts';
import { scenarioOf } from './protocol.ts';
import { VoiceGame } from './sim/game.ts';
import { RecordedGame, voiceHash, voiceState } from './sim/record.ts';

vi.mock('./sim/counterfactual.ts', async (original) => ({
  ...(await original<typeof import('./sim/counterfactual.ts')>()),
  advanceSilentMonth: vi.fn(() => {
    throw new Error('TEST ONLY: an indivisible comparison turn is slow');
  }),
}));

it.each(['file', 'native'])(
  'replies to a full %s export after a paused tick without starting the background comparison',
  async (mode) => {
    vi.resetModules();
    const { advanceSilentMonth } = await import('./sim/counterfactual.ts');
    vi.mocked(advanceSilentMonth).mockClear();
    const rec = new RecordedGame(new VoiceGame(11, 4));
    rec.apply({ type: 'begin' });
    rec.apply({ type: 'pause' });
    const file = {
      ...(await makePlaytestFile({
        game: 'voice',
        seed: 11,
        scenario: scenarioOf(4),
        minute: rec.game.t,
        log: rec.log,
        hash: voiceHash(rec.game),
        engine: rec.game.run.c.runtime!.save().archive.engine.package,
        snapshot: voiceState(rec.game),
        plainSnapshot: true,
      })),
      voiceEdition: 'voice-hf4/1',
    };
    let receive: ((e: MessageEvent) => void) | undefined;
    const replies: Record<string, unknown>[] = [];
    vi.stubGlobal('addEventListener', (_: string, fn: typeof receive) => {
      receive = fn;
    });
    vi.stubGlobal('postMessage', (message: Record<string, unknown>) => replies.push(message));
    try {
      await import('./worker.ts');
      const send = (data: unknown) => receive?.({ data } as MessageEvent);
      if (mode === 'file') send({ type: 'fileSession' });
      send({ type: 'loadPlaytest', gen: 3, text: JSON.stringify(file) });
      await vi.waitFor(() => expect(replies.some((r) => r.type === 'replayed' && r.gen === 3)).toBe(true));
      // Real Worker messages are separate tasks; let load's finally release initialization first.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      send({ type: 'tick', dtMs: 0, wallDtMs: 16 });
      send({ type: 'exportPlaytest', full: true, requestId: 17 });
      await vi.waitFor(() =>
        expect(replies.some((r) => r.type === 'playtest' && r.gen === 3 && r.requestId === 17)).toBe(true),
      );
      const exported = replies.find((r) => r.type === 'playtest' && r.requestId === 17);
      expect(exported?.file).toMatchObject({ hash: file.hash, snapshot: file.snapshot });
      expect(advanceSilentMonth).not.toHaveBeenCalled();
      expect(replies.filter((r) => r.type === 'error')).toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
  },
);
