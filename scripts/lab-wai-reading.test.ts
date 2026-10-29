import { describe, expect, it } from 'vitest';
import {
  buildReadingPrompt,
  buildVariantPrompt,
  castExcerpt,
  formatLiveReceipt,
  readingModel,
  readingSelection,
  selectGameTemplates,
  sourceRepo,
  validateWordings,
} from './lab-wai-reading.ts';

describe('daily reading jobs', () => {
  it('selects only explicit wording keys in game source and rotates those keys', () => {
    const templates = {
      'decision.act': ['I will {action}.{why}'],
      'decision.wait': ['I will wait.'],
      'body.woke': ['I woke up.'],
    };
    const source = [
      {
        file: 'src/lexicon.ts',
        text: "const lexicon = { wordings: { 'decision.act': ['I will {action}.{why}', 'I choose to {action}.{why}', 'My next step is to {action}.{why}', 'I plan to {action}.{why}'], 'decision.wait': ['I will wait.', 'I will give it time.', 'I will pause.', 'I will wait a little longer.'] } }",
      },
    ];
    expect(Object.keys(selectGameTemplates(source, templates, 0, 1))).toEqual(['decision.act']);
    expect(Object.keys(selectGameTemplates(source, templates, 1, 1))).toEqual(['decision.wait']);
    expect(
      selectGameTemplates([{ file: 'src/a.ts', text: "const note = 'body.woke'" }], templates, 0, 5),
    ).toEqual({});
  });
  it('rotates across the whole registry and maps central and external sources', () => {
    expect(readingSelection(new Date('2026-10-27T00:00:00Z'), ['a', 'b', 'c'])).not.toBe(
      readingSelection(new Date('2026-10-28T00:00:00Z'), ['a', 'b', 'c']),
    );
    expect(sourceRepo('watch', '/code', '/hf')).toBe('/hf');
    expect(sourceRepo('repair', '/code', '/hf')).toBe('/code/repair-game');
    expect(sourceRepo('neighbours', '/code', '/hf')).toBe('/code/concordia');
  });
  it('labels source candidates honestly and includes the guide and provenance', () => {
    const prompt = buildReadingPrompt('pass', 'GUIDE', [
      { file: 'src/a.ts', line: 9, text: 'Hello', flags: [] },
    ]);
    expect(prompt).toContain('GUIDE');
    expect(prompt).toContain('src/a.ts');
    expect(prompt).toContain('not proof');
    const live = buildReadingPrompt('pass', 'GUIDE', [], {
      url: 'https://example.test/',
      text: 'Observed text',
    });
    expect(live).toContain('Observed text');
    expect(live).toContain('https://example.test/');
    expect(live).toContain('initial page');
  });
  it('keeps voices pending and supplies rules and registry for narration', () => {
    const prompt = buildVariantPrompt('pass', 'GUIDE', 'REGISTRY', 'FAITH', {
      'decision.act': ['I will {action}.{why}'],
    });
    expect(prompt).toContain('REGISTRY');
    expect(prompt).toContain('FAITH');
    expect(prompt).toContain('{action}');
    expect(prompt).toContain('at least four distinct variants per key');
    expect(prompt).toContain('Do not generate persona voices');
  });
  it('rejects malformed, unknown, repeated, or slot-changing variants', () => {
    const templates = { 'decision.act': ['I will {action}.{why}'] };
    const valid = [
      'I choose to {action}.{why}',
      'I will {action}.{why}',
      'I plan to {action}.{why}',
      'My next step is to {action}.{why}',
    ];
    expect(validateWordings({ wordings: { 'decision.act': valid } }, templates)).toEqual({
      'decision.act': valid,
    });
    expect(validateWordings({ wordings: { 'decision.act': valid.slice(0, 3) } }, templates)).toEqual({
      'decision.act': valid.slice(0, 3),
    });
    expect(() =>
      validateWordings(
        { wordings: { 'decision.act': [...valid.slice(0, 3), 'I choose {action}.'] } },
        templates,
      ),
    ).toThrow();
    expect(() => validateWordings({ wordings: { 'decision.wait': ['Wait.'] } }, templates)).toThrow();
    expect(() =>
      validateWordings({ wordings: { 'decision.act': [...valid.slice(0, 3), valid[0]] } }, templates),
    ).toThrow();
  });
  it('persists observed text and provenance in a safe indented JSON block', () => {
    const receipt = formatLiveReceipt({
      url: 'https://example.test/',
      timestamp: '2026-10-27T00:00:00Z',
      text: 'line\n```\nnext',
      limitations: ['initial state only'],
    });
    expect(receipt).toContain('https://example.test/');
    expect(receipt).toContain('2026-10-27T00:00:00Z');
    expect(receipt).toContain('line\\n```\\nnext');
    expect(receipt).toContain('    {');
  });
  it('selects only the supported reading models', () => {
    const qwen = '@cf/qwen/qwen3-30b-a3b-fp8';
    const llama = '@cf/meta/llama-3.2-3b-instruct';
    expect(readingModel([llama, qwen])).toBe(qwen);
    expect(readingModel([llama])).toBe(llama);
    expect(() => readingModel(['@cf/qwen/unapproved', 'unknown'])).toThrow();
  });
  it('includes bounded biographies only for allocated cast', () => {
    const registry =
      '| Pass | Zeynep | 1 |\n### 01. Zeynep\n\n**Identity:** Cook.\n\n**Games and roles:** Pass.\n\n**Authored life**\n\nShe cooks.\n\n### 02. Other\n\nSecret.';
    const excerpt = castExcerpt('pass', registry);
    expect(excerpt).toContain('She cooks.');
    expect(excerpt).not.toContain('Secret.');
  });
});
