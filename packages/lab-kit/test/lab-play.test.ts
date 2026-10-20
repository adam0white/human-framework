import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

// Match the optional runtime tool boundary without adding its source to the lab-kit build project.
const helperPath = pathToFileURL(resolve('scripts/lab-play-helpers.ts')).href;
const { makeLogLine, parsePlayArgs, validatePlayOp } = await import(helperPath);

const requiredArgs = ['url=https://example.com/game?a=b', 'out=/tmp/play', 'port=8123', 'device=phone'];
describe('lab:play arguments', () => {
  it('preserves URL query values, defaults minutes and permits a short smoke budget', () => {
    expect(parsePlayArgs(requiredArgs)).toEqual({
      url: 'https://example.com/game?a=b',
      out: '/tmp/play',
      port: 8123,
      device: 'phone',
      floor: 15,
      ceiling: 25,
    });
    expect(parsePlayArgs([...requiredArgs, 'ceiling=0.001']).ceiling).toBe(0.001);
    expect(parsePlayArgs([...requiredArgs, 'floor=0']).floor).toBe(0);
    expect(parsePlayArgs([...requiredArgs, `ceiling=${2_147_483_647 / 60_000}`]).ceiling).toBe(
      2_147_483_647 / 60_000,
    );
  });
  it.each([
    [],
    [...requiredArgs, 'eval=x'],
    [...requiredArgs, 'port=8'],
    [...requiredArgs, 'ceiling=NaN'],
    [...requiredArgs, 'floor=-1'],
    [...requiredArgs, 'ceiling=0'],
    [...requiredArgs, `ceiling=${2_147_483_648 / 60_000}`],
    [...requiredArgs, 'ceiling=999999'],
    requiredArgs.map((arg) => (arg.startsWith('url=') ? 'url=file:///tmp/game' : arg)),
    requiredArgs.map((arg) => (arg.startsWith('port=') ? 'port=65536' : arg)),
    requiredArgs.map((arg) => (arg.startsWith('port=') ? 'port=3.5' : arg)),
    requiredArgs.map((arg) => (arg.startsWith('device=') ? 'device=tablet' : arg)),
  ])('rejects invalid arguments %j', (...args) => {
    expect(() => parsePlayArgs(args)).toThrow();
  });
});
describe('lab:play operation validation', () => {
  it.each([
    { op: 'open' },
    { op: 'tap', text: 'light fire' },
    { op: 'tap', name: 'Save', role: 'button' },
    { op: 'tap', x: 0, y: 42 },
    { op: 'select', label: 'Speed', option: 'fast' },
    { op: 'select', name: 'Speed', option: 'fast' },
    { op: 'type', text: '' },
    { op: 'scroll', dy: -300 },
    { op: 'scroll', dy: 200, text: 'Inventory' },
    { op: 'scroll', dy: 100, x: 100, y: 200 },
    { op: 'key', key: 'Escape' },
    { op: 'wait', s: 30 },
    { op: 'shot', file: 'first-minute.png' },
    { op: 'resize', width: 360, height: 690 },
    {
      op: 'log',
      kind: 'want_quit',
      reaction: 'Nothing changed',
      engagement: 1,
      reason: 'BORED',
      input: { clicked: ['button', 1], worked: false },
      game_clock: 'Day 2',
    },
  ])('accepts supported operation %j', (op) => {
    expect(validatePlayOp(op)).toEqual(op);
  });
  it.each([
    null,
    [],
    { op: 'eval', expression: 'secret' },
    { op: 'network' },
    { op: 'open', selector: '#secret' },
    { op: 'tap' },
    { op: 'tap', role: 'button' },
    { op: 'tap', text: 'go', name: 'go' },
    { op: 'tap', x: 2 },
    { op: 'tap', x: Infinity, y: 1 },
    { op: 'tap', x: -1, y: 1 },
    { op: 'select', label: 'x', name: 'x', option: 'y' },
    { op: 'select', label: 'x' },
    { op: 'type', text: 3 },
    { op: 'scroll', dy: 2, text: 'x', x: 1, y: 1 },
    { op: 'scroll', dy: NaN },
    { op: 'wait', s: 30.01 },
    { op: 'wait', s: -1 },
    { op: 'resize', width: 1.5, height: 690 },
    { op: 'resize', width: 0, height: 690 },
    { op: 'shot', file: '../outside.png' },
    { op: 'shot', file: 'sub/shot.png' },
    { op: 'shot', file: 'sub\\shot.png' },
    { op: 'shot', file: 'x.svg' },
    { op: 'open', kind: 'unknown' },
    { op: 'log', kind: 'note' },
    { op: 'log', reaction: 'hello' },
    { op: 'open', engagement: 0 },
    { op: 'open', engagement: 1.5 },
    { op: 'open', engagement: 6 },
    { op: 'open', reason: 'OTHER' },
    { op: 'open', game_clock: Infinity },
    { op: 'open', input: { bad: undefined } },
  ])('rejects unsupported or malformed operation %j', (op) => {
    expect(() => validatePlayOp(op)).toThrow();
  });
});
describe('lab:play wall-clock records', () => {
  const timing = { now: Date.UTC(2026, 9, 20, 12, 0, 2), openedAt: Date.UTC(2026, 9, 20, 12), op_ms: 85 };
  it('emits exactly the schema with absent values null and browser args as input', () => {
    expect(makeLogLine({ op: 'tap', text: 'light fire' }, timing)).toEqual({
      t: '2026-10-20T12:00:02.000Z',
      elapsed_s: 2,
      kind: 'input',
      op: 'tap',
      input: { text: 'light fire' },
      reaction: null,
      game_clock: null,
      engagement: null,
      reason: null,
      op_ms: 85,
      error: null,
    });
  });
  it('preserves caller metadata and does not replace a false input', () => {
    expect(
      makeLogLine(
        {
          op: 'log',
          kind: 'pulse',
          input: false,
          reaction: 'slow',
          game_clock: 0,
          engagement: 2,
          reason: 'TASTE',
        },
        timing,
      ),
    ).toMatchObject({
      kind: 'pulse',
      input: false,
      reaction: 'slow',
      game_clock: 0,
      engagement: 2,
      reason: 'TASTE',
    });
    expect(makeLogLine({ op: 'log', kind: 'note' }, timing).input).toBeNull();
  });
  it('sanitizes invalid metadata from a rejected request before logging the tool failure', () => {
    expect(
      makeLogLine(
        {
          op: 'tap',
          kind: 'unknown',
          reaction: 5,
          game_clock: Infinity,
          engagement: 9,
          reason: 'OTHER',
          input: { bad: undefined },
        },
        timing,
        'Invalid request',
      ),
    ).toMatchObject({
      kind: 'tool',
      reaction: null,
      game_clock: null,
      engagement: null,
      reason: null,
      input: null,
      error: 'Invalid request',
    });
  });
  it('records pre-open time as null and every failure as a tool error', () => {
    expect(
      makeLogLine({ op: 'open', kind: 'note' }, { ...timing, openedAt: null }, 'navigation failed'),
    ).toMatchObject({ elapsed_s: null, kind: 'tool', error: 'navigation failed' });
    expect(makeLogLine({ op: 'wait' }, timing, '').kind).toBe('tool');
  });
});
