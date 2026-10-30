import { castForGame } from '@adam0white/lab-client';
import { expect, it } from 'vitest';
import { canCheckpoint, localCastAuthority, validateCastRecord } from './cast-authority.ts';

it('retains complete checked absences and denials, rejects contradictory authority, and keeps explicit local play nonowning', async () => {
  const ids = castForGame('voice').map((p) => p.castId);
  const id = ids[0]!;
  const raw = {
    castOwnership: {},
    castSources: {},
    castLocalOnly: false,
    castSkipped: [id],
    castAuthority: {
      format: 'site-cast-authority/1',
      mode: 'shared',
      denied: [id],
      expectedHeads: Object.fromEntries(ids.map((key) => [key, key === id ? 'a'.repeat(64) : null])),
    },
  };
  const record = await validateCastRecord('voice', raw);
  expect(canCheckpoint(record.authority, id, record.heads)).toBe(false);
  expect(canCheckpoint(record.authority, ids[1]!, record.heads)).toBe(true);
  expect(canCheckpoint(record.authority, 'unknown', record.heads)).toBe(false);
  expect(canCheckpoint(undefined, ids[1]!, record.heads)).toBe(false);
  expect(await validateCastRecord('voice', JSON.parse(JSON.stringify(raw)))).toEqual(record);
  for (const bad of [
    { ...raw, castAuthority: undefined },
    { ...raw, castSkipped: [] },
    { ...raw, castSkipped: [id, id] },
    { ...raw, castLocalOnly: true },
    { ...raw, castAuthority: { ...raw.castAuthority, denied: [id, id] } },
    { ...raw, castAuthority: { ...raw.castAuthority, denied: ['unknown'] }, castSkipped: ['unknown'] },
    { ...raw, castAuthority: { ...raw.castAuthority, expectedHeads: {} } },
    { ...raw, castOwnership: { [id]: {} } },
    { ...raw, castSources: { [id]: {} } },
  ])
    await expect(validateCastRecord('voice', bad)).rejects.toThrow();
  const local = await validateCastRecord('voice', {
    castAuthority: localCastAuthority(),
    castOwnership: {},
    castSources: {},
    castSkipped: [],
    castLocalOnly: true,
  });
  expect(canCheckpoint(local.authority, id, {})).toBe(false);
});
