import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  severity: { score: 1.6 },
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
  it('keeps answers by id, never overwrites them and fails closed on a damaged cache', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lab-inbox-'));
    try {
      expect(readSuggestion(dir, 'run-1')).toBeNull();
      writeSuggestion(dir, 'run-1', response);
      expect(readSuggestion(dir, 'run-1')).toEqual(parseSuggestion(response));
      expect(() => writeSuggestion(dir, 'run-1', response)).toThrow();
      expect(JSON.parse(readFileSync(join(dir, 'suggest/run-1.json'), 'utf8'))).toEqual(response);
      mkdirSync(join(dir, 'suggest'), { recursive: true });
      writeFileSync(join(dir, 'suggest/bad.json'), '{}');
      expect(() => readSuggestion(dir, 'bad')).toThrow();
      for (const id of ['../escape', '/absolute', 'a/b', 'a\\b', '']) {
        expect(() => readSuggestion(dir, id)).toThrow();
        expect(() => writeSuggestion(dir, id, response)).toThrow();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it('stops new calls at the invocation spend cap', () => {
    expect(canSuggest(0)).toBe(true);
    expect(canSuggest(0.04999)).toBe(true);
    expect(canSuggest(0.05)).toBe(false);
    expect(canSuggest(0.05001)).toBe(false);
  });
});

// Run the actual entry point with fake Wrangler and Clef. These tests cannot reach the network.
function inboxFixture(inputTokens: number, failAuth = false) {
  const root = mkdtempSync(join(tmpdir(), 'lab-inbox-script-'));
  mkdirSync(join(root, 'scripts'));
  mkdirSync(join(root, '.lab-inbox/runs'), { recursive: true });
  for (const file of ['lab-inbox.ts', 'lab-inbox-suggest.ts'])
    writeFileSync(join(root, 'scripts', file), readFileSync(resolve('scripts', file)));
  writeFileSync(join(root, 'package.json'), '{"type":"module"}');
  const date = new Date().toISOString().slice(0, 10);
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
      JSON.stringify({ note: 'Three words here', who: 'agent name', run: {} }),
    );
  const preload = `
    import child from 'node:child_process';
    import { syncBuiltinESMExports } from 'node:module';
    child.execFileSync = (_cmd, args) => {
      if (!args.includes('auth')) return '';
      if (${failAuth}) throw Object.assign(new Error('synthetic-token-secret'), { stdout: 'synthetic-token-secret' });
      return '{"token":"test-token"}';
    };
    syncBuiltinESMExports();
    globalThis.fetch = async (url, options) => {
      const body = JSON.parse(options.body);
      if (body.state !== 'Source kind: agent\\nFeedback: Three words here') throw new Error('Wrong request');
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
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}
describe('lab:inbox entry point without network', () => {
  it('stops real request dispatch at the cap and reports it on the console and page', () => {
    const fixture = inboxFixture(208334);
    try {
      expect(fixture.run()).toContain('1 calls, 0 cached');
      expect(fixture.html()).toContain('Clef spend stop: reached 0.05 USD');
      expect(fixture.html().match(/Suggested by Clef/g)).toHaveLength(1);
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
  it('sanitizes Wrangler auth failures instead of exposing captured stdout', () => {
    const fixture = inboxFixture(1250, true);
    try {
      let stderr = '';
      try {
        fixture.run();
      } catch (error) {
        stderr = String((error as { stderr: string }).stderr);
      }
      expect(stderr).toContain('Could not read Cloudflare token from Wrangler');
      expect(stderr).not.toContain('synthetic-token-secret');
    } finally {
      fixture.cleanup();
    }
  });
});
