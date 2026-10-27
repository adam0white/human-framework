/**
 * Morning talk wording (2026-10-27 panel): different watchers give their own wording of a shared answer (F-1595),
 * a discovery is told once a game, and the Gate question says what was agreed (F-1597). Text only: the rule hash
 * does not see talk words.
 */
import { expect, it } from 'vitest';
import { WATCH_DISCOVERIES } from '../../shared/cast-discoveries.ts';
import { applyInput, newGame, stepMinute } from './night.ts';
import { canTalk, talk } from './talk.ts';

function firstDawn(seed: number) {
  const s = newGame(seed);
  applyInput(s, { k: 'start' });
  applyInput(s, { k: 'begin' });
  while (s.phase === 'night') stepMinute(s);
  return s;
}

it('gives two watchers different words for the same answer', () => {
  const s = firstDawn(4242);
  const [a, b] = s.community.people.filter((p) => canTalk(s, p.id)).map((p) => p.id);
  if (!a || !b) throw new Error('two watchers expected');
  // Same trait band for both, so without per-person wording they would say the very same sentence.
  for (const id of [a, b]) {
    const p = s.community.people.find((x) => x.id === id);
    if (!p) continue;
    Object.assign(p.traits, { conscientiousness: 0.9, emotionality: 0.2 });
    Object.assign(p.body, { sleepPressure: 0, health: 1, injuries: [], illnesses: [] });
    if (p.body.exertion !== undefined) p.body.exertion = 0;
  }
  expect(talk(s, a, 'body')).toBe(true);
  expect(talk(s, b, 'body')).toBe(true);
  const [ta, tb] = s.talks.said.slice(-2).map((x) => x.text);
  // Both answers come from the one "fit" band, so only the per-person wording can tell them apart.
  const fit = /^“(I am fit enough|I can stand watch tonight|I’m well\. I will|Ready for tonight)/;
  expect(ta).toMatch(fit);
  expect(tb).toMatch(fit);
  expect(ta).not.toBe(tb);
});

it('tells a discovery once a game, not every dawn', () => {
  const s = firstDawn(1);
  expect(talk(s, 'kian', 'night')).toBe(true);
  expect(s.talks.said.at(-1)?.text).toContain(WATCH_DISCOVERIES.kian);
  applyInput(s, { k: 'toDusk' });
  applyInput(s, { k: 'begin' });
  while (s.phase === 'night') stepMinute(s);
  expect(talk(s, 'kian', 'night')).toBe(true);
  expect(s.talks.said.at(-1)?.text).not.toContain(WATCH_DISCOVERIES.kian);
});

it('confirms a Gate answer in plain words', () => {
  const s = firstDawn(4242);
  const who = s.community.people.find(
    (p) => s.cast[p.id] && canTalk(s, p.id) && talk(structuredClone(s), p.id, 'gate'),
  )?.id;
  if (!who) throw new Error('nobody can be asked about the Gate');
  expect(talk(s, who, 'gate')).toBe(true);
  expect(s.talks.said.at(-1)?.text).toMatch(/said (yes|no)\. When you choose who keeps the Gate next/);
});
