import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

// Like lab-play.test.ts: keep the optional script outside the lab-kit build project.
const helperPath = pathToFileURL(resolve('scripts/lab-inbox-suggest.ts')).href;
const { buildNoteRequest, parseSuggestion, renderSuggestion, readSuggestion, writeSuggestion, canSuggest } =
  await import(helperPath);
const answers = {
  verdict: { choice: 'mixed', confidence: 0.49 },
  severity: { score: 1.6, probabilities: { '0': 0.1, '1': 0.3, '2': 0.5, '3': 0.1 } },
  ...Object.fromEntries(
    [
      'bug',
      'unclear',
      'layout',
      'pacing',
      'difficulty',
      'repetition',
      'agency',
      'delight',
      'direction',
      'tooling',
    ].map((k) => [`has_${k}`, { noul: k === 'bug' ? 0.75 : k === 'unclear' ? 0.5 : 0.1 }]),
  ),
};
const response = { answers, usage: { input_tokens: 1250 } };

describe('lab:inbox Clef suggestions', () => {
  it('sends only the source first word and whole note with all category questions', () => {
    const request = buildNoteRequest('  agent private identity', 'The button broke.\nStill stuck.');
    expect(request.state).toBe('Source kind: agent\nFeedback: The button broke.\nStill stuck.');
    expect(request.model).toBe('clef');
    expect(request.questions.verdict).toMatchObject({ type: 'choice' });
    expect(request.questions.severity).toMatchObject({ type: 'score' });
    expect(Object.keys(request.questions)).toHaveLength(12);
    expect(request.questions.has_bug).toMatchObject({ type: 'noul' });
    expect(buildNoteRequest(undefined, 'Three words here').state).toContain('Source kind: unknown');
    expect(buildNoteRequest('owner', ' \n two words ')).toBeNull();
    expect(buildNoteRequest('owner', '')).toBeNull();
  });
  it('rounds expected severity, includes the 0.5 category boundary and prices response usage', () => {
    expect(parseSuggestion(response)).toEqual({
      verdict: 'mixed',
      confidence: 0.49,
      severity: 'Real friction',
      blockerProbability: 0.1,
      categories: [
        { category: 'bug', probability: 0.75 },
        { category: 'unclear', probability: 0.5 },
      ],
      inputTokens: 1250,
      usd: 0.0003,
    });
    expect(parseSuggestion({ ...response, usage: { prompt_tokens: 1250 } }).usd).toBe(0.0003);
  });
  it('rejects malformed answers and missing usage instead of hiding spend', () => {
    for (const bad of [
      { answers },
      response.answers,
      { ...response, usage: { input_tokens: -1 } },
      { ...response, answers: { ...answers, verdict: { choice: 'other', confidence: 0.7 } } },
      { ...response, answers: { ...answers, severity: { score: 4 } } },
      { ...response, answers: { ...answers, has_bug: { noul: 2 } } },
    ])
      expect(() => parseSuggestion(bad)).toThrow();
  });
  it('renders probabilities, verdict confidence and a visible low confidence mark with escaping', () => {
    const suggestion = parseSuggestion(response);
    const html = renderSuggestion(suggestion);
    expect(html).toContain('Suggested by Clef (check it):');
    expect(html).toContain('mixed');
    expect(html).toContain('Real friction');
    expect(html).toContain('bug 0.75, unclear 0.50');
    expect(html).toContain('verdict confidence 0.49');
    expect(html).toContain('<strong>low confidence</strong>');
    expect(renderSuggestion({ ...suggestion, confidence: 0.5 })).not.toContain('low confidence');
    expect(
      renderSuggestion({ ...suggestion, verdict: '<img>', categories: [{ category: '&', probability: 1 }] }),
    ).toContain('&#60;img&#62;');
    expect(renderSuggestion({ ...suggestion, categories: [] })).toContain('categories: none');
  });
  it('keeps valid answers by id, never overwrites them and moves damaged caches aside', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lab-inbox-'));
    try {
      expect(readSuggestion(dir, 'run-1')).toBeNull();
      writeSuggestion(dir, 'run-1', response);
      expect(readSuggestion(dir, 'run-1')).toEqual(parseSuggestion(response));
      expect(() => writeSuggestion(dir, 'run-1', response)).toThrow();
      expect(JSON.parse(readFileSync(join(dir, 'suggest/run-1.json'), 'utf8'))).toEqual(response);
      mkdirSync(join(dir, 'suggest'), { recursive: true });
      writeFileSync(join(dir, 'suggest/bad.json'), '{}');
      expect(readSuggestion(dir, 'bad')).toBeNull();
      expect(existsSync(join(dir, 'suggest/bad.json'))).toBe(false);
      expect(readFileSync(join(dir, 'suggest/bad.invalid.json'), 'utf8')).toBe('{}');
      expect(() => writeSuggestion(dir, 'invalid', {})).toThrow();
      expect(existsSync(join(dir, 'suggest/invalid.json'))).toBe(false);
      for (const id of ['../escape', '/absolute', 'a/b', 'a\\b', '']) {
        expect(() => readSuggestion(dir, id)).toThrow();
        expect(() => writeSuggestion(dir, id, response)).toThrow();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it('marks worst-severity probability at 0.25 even when expected severity rounds lower', () => {
    for (const [probability, visible] of [
      [0.2499, false],
      [0.25, true],
      [0.2625, true],
    ] as const) {
      const suggestion = parseSuggestion({
        ...response,
        answers: { ...answers, severity: { score: 1.9769, probabilities: { '3': probability } } },
      });
      expect(suggestion.blockerProbability).toBe(probability);
      const html = renderSuggestion(suggestion);
      expect(html).toContain('Real friction');
      expect(html.includes('possible blocker')).toBe(visible);
      if (visible) expect(html).toContain(`Made the player quit or blocks play: ${probability.toFixed(2)}`);
    }
    for (const probabilities of [undefined, { '3': -1 }, { '3': 1.1 }, { '3': '0.25' }])
      expect(() =>
        parseSuggestion({
          ...response,
          answers: { ...answers, severity: { score: 1.98, probabilities } },
        }),
      ).toThrow();
  });
  it('stops new calls at the invocation spend cap', () => {
    expect(canSuggest(0)).toBe(true);
    expect(canSuggest(0.04999)).toBe(true);
    expect(canSuggest(0.05)).toBe(false);
    expect(canSuggest(0.05001)).toBe(false);
  });
});

// Run the actual entry point and budget guard with fake Wrangler, account analytics and Clef.
// Each child has a temporary home and durable ledger. It cannot reach the network or the owner's ledger.
type Failure = 'auth' | 'network' | 'http' | 'json' | 'usage' | 'answer' | 'read' | 'write' | 'rename';
function inboxFixture(
  inputTokens: number,
  failure?: Failure,
  options: { nearDailyCap?: boolean; note?: string; overReserveBy?: number } = {},
) {
  const root = mkdtempSync(join(tmpdir(), 'lab-inbox-script-'));
  mkdirSync(join(root, 'scripts'));
  mkdirSync(join(root, '.lab-inbox/runs'), { recursive: true });
  for (const file of [
    'lab-inbox.ts',
    'lab-inbox-suggest.ts',
    'lab-inbox-linked.ts',
    'lab-inbox-persona.ts',
    'lab-wai-budget.ts',
  ])
    writeFileSync(join(root, 'scripts', file), readFileSync(resolve('scripts', file)));
  writeFileSync(join(root, 'package.json'), '{"type":"module"}');
  const date = new Date().toISOString().slice(0, 10);
  const note = options.note ?? 'Three words here';
  const reserve = Math.ceil(
    ((Buffer.byteLength(JSON.stringify(buildNoteRequest('agent name', note))) + 1024) * 21818) / 1e6,
  );
  const home = join(root, 'home');
  const budgetDir = join(home, 'code/.lab-scratch/wai-daily');
  mkdirSync(budgetDir, { recursive: true });
  const initialNeurons = options.nearDailyCap ? 2000 - reserve + (options.overReserveBy ?? 0) : 0;
  writeFileSync(
    join(budgetDir, 'budget.json'),
    JSON.stringify({
      version: 1,
      historicalUSD: 0.207,
      reservedUSD: 0.207 + initialNeurons * 0.000011,
      days: { [date]: { models: {}, reservedNeurons: initialNeurons, neurons: initialNeurons } },
    }),
  );
  const dispatchFile = join(root, 'dispatch.json');
  const runs = ['one', 'two'].map((id) => ({
    id,
    key: `runs/${date}/${id}`,
    game: 'test',
    hour: `${date}T12`,
  }));
  writeFileSync(join(root, '.lab-inbox/index.json'), JSON.stringify({ runs }));
  for (const run of runs)
    writeFileSync(
      join(root, `.lab-inbox/runs/${run.id}.json`),
      JSON.stringify({ note, who: 'agent name', run: {} }),
    );
  const preload = `
    import child from 'node:child_process';
    import fs from 'node:fs';
    import os from 'node:os';
    os.homedir = () => ${JSON.stringify(home)};
    fs.statfsSync = () => ({ bavail: 10_000_000, bsize: 4096 });
    import { syncBuiltinESMExports } from 'node:module';
    child.execFileSync = (_cmd, args) => {
      if (!args.includes('auth')) return '';
      if (${failure === 'auth'}) throw Object.assign(new Error('synthetic-token-secret'), { stdout: 'synthetic-token-secret' });
      return '{"token":"test-token"}';
    };
    const failure = ${JSON.stringify(failure) ?? 'undefined'};
    for (const [method, stage] of [['readFileSync', 'read'], ['writeFileSync', 'write'], ['renameSync', 'rename']]) {
      const original = fs[method];
      fs[method] = (file, ...args) => {
        if (failure === stage && String(file).endsWith('/suggest/two.json'))
          throw new Error('synthetic-token-secret <script>private data</script>');
        return original(file, ...args);
      };
    }
    syncBuiltinESMExports();
    let calls = 0;
    globalThis.fetch = async (url, options) => {
      if (String(url) === 'https://api.cloudflare.com/client/v4/graphql') return Response.json({ data: { viewer: { accounts: [{ aiInferenceAdaptiveGroups: [{ sum: { totalNeurons: 0 } }] }] } } });
      if (!String(url).includes('/ai/run/@cf/cloudflare/clef')) throw Error('Unexpected URL; no real network is available');
      calls++;
      fs.writeFileSync(${JSON.stringify(dispatchFile)}, JSON.stringify({ calls }));
      if (calls === 1) {
        if (failure === 'network') throw new Error('synthetic-token-secret');
        if (failure === 'http') return new Response('synthetic-token-secret', { status: 503 });
        if (failure === 'json') return new Response('synthetic-token-secret');
        if (failure === 'usage') return new Response(JSON.stringify({ success: true, result: { answers: {} } }));
        if (failure === 'answer') return new Response(JSON.stringify({ success: true, result: { answers: {}, usage: { input_tokens: ${inputTokens} } } }));
      }
      const body = JSON.parse(options.body);
      if (body.state !== ${JSON.stringify(`Source kind: agent\nFeedback: ${note}`)}) throw new Error('Wrong request');
      return new Response(JSON.stringify({ success: true, result: ${JSON.stringify({ ...response, usage: { input_tokens: inputTokens } })} }));
    };
  `;
  writeFileSync(join(root, 'preload.mjs'), preload);
  return {
    root,
    run: (suggest = true) =>
      execFileSync(
        process.execPath,
        [
          '--import',
          join(root, 'preload.mjs'),
          join(root, 'scripts/lab-inbox.ts'),
          ...(suggest ? ['--suggest'] : []),
        ],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      ),
    html: () => readFileSync(join(root, '.lab-inbox/index.html'), 'utf8'),
    dispatches: () =>
      existsSync(dispatchFile)
        ? (JSON.parse(readFileSync(dispatchFile, 'utf8')) as { calls: number }).calls
        : 0,
    budget: () => JSON.parse(readFileSync(join(budgetDir, 'budget.json'), 'utf8')),
    initialNeurons,
    reserve,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}
describe('lab:inbox entry point without network', () => {
  it('stops real request dispatch at the shared 2000-neuron cap before the old invocation dollar cap', () => {
    const fixture = inboxFixture(1250, undefined, { nearDailyCap: true });
    try {
      expect(fixture.run()).toContain('2 calls, 0 cached');
      expect(fixture.dispatches()).toBe(1);
      expect(fixture.html()).toContain('Clef spend stop: response usage unavailable');
      expect(fixture.html().match(/Suggested by Clef/g)).toHaveLength(1);
    } finally {
      fixture.cleanup();
    }
  });
  it('reserves UTF-8 bytes before dispatch and refuses a request one neuron over the daily limit', () => {
    const note = `Şimdi ${'çay '.repeat(150)}`;
    const fixture = inboxFixture(1250, undefined, { nearDailyCap: true, note, overReserveBy: 1 });
    try {
      const request = JSON.stringify(buildNoteRequest('agent name', note));
      const wrongCharacterReserve = Math.ceil(((request.length + 1024) * 21818) / 1e6);
      expect(fixture.reserve).toBeGreaterThan(wrongCharacterReserve);
      expect(fixture.initialNeurons + wrongCharacterReserve).toBeLessThanOrEqual(2000);
      expect(fixture.run()).toContain('1 calls, 0 cached; 0.00000000 USD');
      expect(fixture.dispatches()).toBe(0);
      const day = fixture.budget().days[new Date().toISOString().slice(0, 10)];
      expect(day.reservedNeurons).toBe(fixture.initialNeurons);
      expect(day.models).toEqual({});
      expect(fixture.html()).toContain('Clef spend stop: response usage unavailable');
    } finally {
      fixture.cleanup();
    }
  });
  it('renders valid caches without dispatch even when new requests cannot fit the daily budget', () => {
    const fixture = inboxFixture(1250, undefined, { nearDailyCap: true, overReserveBy: 1 });
    try {
      mkdirSync(join(fixture.root, '.lab-inbox/suggest'), { recursive: true });
      for (const id of ['one', 'two'])
        writeFileSync(join(fixture.root, `.lab-inbox/suggest/${id}.json`), JSON.stringify(response));
      expect(fixture.run()).toContain('0 calls, 2 cached; 0.00000000 USD');
      expect(fixture.dispatches()).toBe(0);
      expect(fixture.html().match(/Suggested by Clef/g)).toHaveLength(2);
    } finally {
      fixture.cleanup();
    }
  });
  it('uses cached answers on rerun and hides suggestions without the flag', () => {
    const fixture = inboxFixture(1250);
    try {
      expect(fixture.run()).toContain('2 calls, 0 cached; 0.00060000 USD');
      expect(fixture.run()).toContain('0 calls, 2 cached; 0.00000000 USD');
      expect(fixture.html().match(/Suggested by Clef/g)).toHaveLength(2);
      expect(fixture.run(false)).not.toContain('Clef');
      expect(fixture.html()).not.toContain('Clef');
    } finally {
      fixture.cleanup();
    }
  });
  it.each(['auth', 'network', 'http', 'json', 'answer', 'read', 'write', 'rename'] as const)(
    'writes every note despite a sanitized %s failure',
    (failure) => {
      const fixture = inboxFixture(1250, failure);
      try {
        if (failure === 'read' || failure === 'rename') {
          mkdirSync(join(fixture.root, '.lab-inbox/suggest'), { recursive: true });
          writeFileSync(join(fixture.root, '.lab-inbox/suggest/two.json'), '{}');
        }
        const output = fixture.run();
        const html = fixture.html();
        expect(html.match(/<article>/g)).toHaveLength(2);
        expect(html).toContain('Clef suggestion failed:');
        expect(html + output).not.toContain('synthetic-token-secret');
        expect(html + output).not.toContain('<script>');
        if (['answer', 'read', 'write', 'rename'].includes(failure))
          expect(html).toContain('Suggested by Clef');
        else {
          expect(html).not.toContain('Suggested by Clef');
          expect(fixture.dispatches()).toBe(failure === 'auth' ? 0 : 1);
        }
        if (failure === 'answer')
          expect(existsSync(join(fixture.root, '.lab-inbox/suggest/two.json'))).toBe(false);
      } finally {
        fixture.cleanup();
      }
    },
  );
  it.each(['{broken', '{}'])(
    'quarantines invalid cached content %s, re-asks once and then uses the repaired cache',
    (content) => {
      const fixture = inboxFixture(1250);
      try {
        fixture.run();
        writeFileSync(join(fixture.root, '.lab-inbox/suggest/two.json'), content);
        expect(fixture.run()).toContain('1 calls, 1 cached');
        expect(readFileSync(join(fixture.root, '.lab-inbox/suggest/two.invalid.json'), 'utf8')).toBe(content);
        expect(fixture.html().match(/Suggested by Clef/g)).toHaveLength(2);
        expect(fixture.run()).toContain('0 calls, 2 cached');
      } finally {
        fixture.cleanup();
      }
    },
  );
  it.each(['json', 'usage'] as const)(
    'stops calls when %s leaves spend unknown but still renders cached notes',
    (failure) => {
      const fixture = inboxFixture(1250, failure);
      try {
        expect(fixture.run()).toContain('1 calls, 0 cached');
        expect(fixture.html()).toContain('Clef spend stop: response usage unavailable');
        expect(fixture.dispatches()).toBe(1);
        expect(fixture.budget().days[new Date().toISOString().slice(0, 10)].reservedNeurons).toBe(
          fixture.reserve,
        );
        expect(fixture.html().match(/<article>/g)).toHaveLength(2);
        mkdirSync(join(fixture.root, '.lab-inbox/suggest'), { recursive: true });
        writeFileSync(join(fixture.root, '.lab-inbox/suggest/one.json'), JSON.stringify(response));
        expect(fixture.run()).toContain('1 calls, 1 cached');
        expect(fixture.budget().days[new Date().toISOString().slice(0, 10)].reservedNeurons).toBe(
          2 * fixture.reserve,
        );
        expect(fixture.html()).toContain('Suggested by Clef');
      } finally {
        fixture.cleanup();
      }
    },
  );
  it('does not retry a bad answer and counts known usage toward the shared daily cap', () => {
    const fixture = inboxFixture(1250, 'answer', { nearDailyCap: true });
    try {
      expect(fixture.run()).toContain('2 calls, 0 cached; 0.00030000 USD');
      expect(fixture.dispatches()).toBe(1);
      expect(fixture.budget().days[new Date().toISOString().slice(0, 10)].neurons).toBeCloseTo(
        fixture.initialNeurons + (1250 * 21818) / 1e6,
      );
      expect(fixture.html()).toContain('Clef suggestion failed:');
      expect(fixture.html()).toContain('Clef spend stop: response usage unavailable');
      expect(fixture.html()).not.toContain('Suggested by Clef');
      expect(existsSync(join(fixture.root, '.lab-inbox/suggest/two.json'))).toBe(false);
    } finally {
      fixture.cleanup();
    }
  });
});
