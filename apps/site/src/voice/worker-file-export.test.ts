/** TEST ONLY scheduling fault: a paused run must not start an unrelated, potentially long comparison. */
import { expect, it, vi } from 'vitest';
import { makePlaytestFile } from '../shared/playtest.ts';
import { scenarioOf } from './protocol.ts';
import { VoiceGame } from './sim/game.ts';
import { OLD_VOICE_SAVE } from './sim/hf4-run.ts';
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
    let pending:
      | {
          type: string;
          requestId?: number;
          resolve(message: Record<string, unknown>): void;
          reject(error: Error): void;
        }
      | undefined;
    const reply = (type: string, requestId?: number) =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        pending = { type, requestId, resolve, reject };
      });
    vi.stubGlobal('postMessage', (message: Record<string, unknown>) => {
      replies.push(message);
      if (message.type === 'error' || message.type === 'playtestError') {
        const waiting = pending;
        pending = undefined;
        waiting?.reject(new Error(String(message.message)));
      } else if (
        pending &&
        message.gen === 3 &&
        message.type === pending.type &&
        (pending.requestId === undefined || message.requestId === pending.requestId)
      ) {
        const waiting = pending;
        pending = undefined;
        waiting.resolve(message);
      }
    });
    try {
      await import('./worker.ts');
      // A real Worker delivers each message in a separate task. Await protocol completion,
      // including async file validation/hash, before releasing this case's worker globals.
      const send = async (data: unknown) => {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        receive?.({ data: structuredClone(data) } as MessageEvent);
      };
      if (mode === 'file') await send({ type: 'fileSession' });
      const [replayed] = await Promise.all([
        reply('replayed'),
        send({ type: 'loadPlaytest', gen: 3, text: JSON.stringify(file) }),
      ]);
      expect(replayed.result).toMatchObject({ matches: true, hash: file.hash, driftAt: -1 });
      await send({ type: 'tick', dtMs: 0, wallDtMs: 16 });
      const [exported] = await Promise.all([
        reply('playtest', 17),
        send({ type: 'exportPlaytest', full: true, requestId: 17 }),
      ]);
      expect(exported.file).toMatchObject({ hash: file.hash, snapshot: file.snapshot });
      expect(advanceSilentMonth).not.toHaveBeenCalled();
      expect(replies.filter((r) => r.type === 'error')).toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
  },
);

it('refuses a continued save that no longer replays, instead of showing a run that ignores input', async () => {
  vi.resetModules();
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
      hash: voiceHash(rec.game).replace(/^./, (c) => (c === '0' ? '1' : '0')),
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
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    receive?.({
      data: { type: 'loadPlaytest', gen: 3, text: JSON.stringify(file), local: true },
    } as MessageEvent);
    await vi.waitFor(() =>
      expect(replies).toContainEqual({ type: 'playtestError', message: OLD_VOICE_SAVE, gen: 3 }),
    );
    expect(replies.some((r) => r.type === 'replayed')).toBe(false);
  } finally {
    vi.unstubAllGlobals();
  }
});
