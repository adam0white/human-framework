import { expect, test } from 'vitest';
import { callAccount, requestAccount } from '../ui/request-account.ts';
import { SHIPPED_SEED, VoiceGame } from './game.ts';
import { play } from './headless.ts';
import { voiceState } from './record.ts';

test('ordinary evening tea inputs projects actual connected and missed host receipts without changing raw state', () => {
  const game = new VoiceGame(SHIPPED_SEED, 4);
  let connected = 0;
  let missed = 0;
  play(game, {
    pauseEvery: 15,
    choose: (f) =>
      f.minute % 1440 >= 20 * 60 && f.options.some((o) => o.id === 'tea:riza')
        ? { optionId: 'tea:riza', strength: 'urge', insist: true, appeal: 'belonging' }
        : undefined,
    stop: (g) => {
      const before = JSON.stringify(voiceState(g));
      const f = g.frame();
      const rows = callAccount(f);
      if (f.callFacts?.connected) {
        connected++;
        expect(f.callFacts.connected.minute).toBe(g.calls.at(-1)?.at);
        expect(rows.some((row) => row.text.includes('connected'))).toBe(true);
      }
      if (f.callFacts?.missed) {
        missed++;
        expect(f.callFacts.missed.minute).toBe(g.run.town.state.selinMissedAt);
        expect(rows.some((row) => row.text.includes('did not answer'))).toBe(true);
      }
      expect(JSON.stringify(voiceState(g))).toBe(before);
      return connected > 0 && missed > 0;
    },
  });
  expect(connected).toBeGreaterThan(0);
  expect(missed).toBeGreaterThan(0);
}, 60_000);

test('ordinary confirmed inputs retain request identity, actual answers and standing facts', () => {
  const game = new VoiceGame(SHIPPED_SEED, 4);
  let sent = 0;
  let begun = 0;
  let deferred = 0;
  let ended = 0;
  play(game, {
    confirm: true,
    stop: (g) => {
      const before = JSON.stringify(voiceState(g));
      const f = g.frame();
      const account = requestAccount(f);
      if (account) {
        sent++;
        expect(account.sent).toEqual(f.log.findLast((row) => row.kind === 'you'));
        if (account.answer?.tone === 'notNow') deferred++;
        if (f.standing?.begun) {
          begun++;
          expect(g.standing?.going).toBeTruthy();
          expect(account.status).toContain('Began at');
        }
        if (/suggestion.*ended|withdraw/.test(account.status)) ended++;
      }
      expect(JSON.stringify(voiceState(g))).toBe(before);
      return false;
    },
  });
  expect(sent).toBeGreaterThan(0);
  expect(begun).toBeGreaterThan(0);
  expect(deferred).toBeGreaterThan(0);
  expect(ended).toBeGreaterThan(0);
}, 60_000);

test('an actual refusal is shown immediately and another confirmed word replaces an active request', () => {
  const game = new VoiceGame(SHIPPED_SEED, 4);
  let draft: import('../protocol.ts').Draft | undefined;
  play(game, {
    pauseEvery: 30,
    stop: (g) => {
      const f = g.frame();
      if (!g.paused || !f.composer.open || !f.halil.doing || f.halil.asleep) return false;
      draft = f.options
        .map((o) => ({ optionId: o.id, strength: 'urge' as const, insist: true }))
        .find((d) => g.predict(d).tone === 'willNot');
      return !!draft;
    },
  });
  if (!draft) throw Error('No actual refused option found');
  game.suggest(draft);
  const declined = requestAccount(game.frame());
  expect(declined?.answer?.tone).toBe('willNot');
  expect(declined?.status).toContain('declined');
  expect(game.standing).toBeUndefined();

  const replacement = new VoiceGame(SHIPPED_SEED, 4);
  play(replacement, {
    confirm: true,
    stop: (g) =>
      !!g.standing &&
      g.frame().composer.open &&
      g.frame().options.some((o) => o.id !== g.standing?.draft.optionId),
  });
  const old = requestAccount(replacement.frame());
  const option = replacement.frame().options.find((o) => o.id !== replacement.standing?.draft.optionId);
  if (!old || !option) throw Error('No active word and replacement');
  replacement.suggest({ optionId: option.id, strength: 'mention', insist: false });
  const next = requestAccount(replacement.frame());
  expect(next?.id).not.toBe(old.id);
  expect(next?.sent.text).toContain(option.label);
  expect(next?.answer?.minute).toBeGreaterThanOrEqual(next?.sent.minute ?? 0);
}, 60_000);

test('a deferred request can actually begin and finish without treating its missing finish receipt as proof', () => {
  const game = new VoiceGame(SHIPPED_SEED, 4);
  const deferred = new Set<string>();
  play(game, {
    confirm: true,
    stop: (g) => {
      const f = g.frame();
      const a = requestAccount(f);
      if (a?.answer?.tone === 'notNow') deferred.add(a.id);
      return !!a && deferred.has(a.id) && !!f.standing?.begun;
    },
  });
  const started = requestAccount(game.frame());
  const decisionId = game.standing?.going;
  const cell = game.cells.find((c) => c.decisionId === decisionId);
  if (!started || !cell || !decisionId || !deferred.has(started.id))
    throw Error('No deferred-to-begun request found');
  const countBefore = game.run.town.state.completed.halil?.[cell.action] ?? 0;
  play(game, { stop: (g) => g.standing?.going !== decisionId });
  const countAfter = game.run.town.state.completed.halil?.[cell.action] ?? 0;
  expect(countAfter).toBeGreaterThan(countBefore);
  expect(game.standing).toBeUndefined();
  const after = requestAccount(game.frame());
  expect(after?.id).toBe(started.id);
  expect(after?.status).toContain('end or result is not recorded');
}, 60_000);
