// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';

const controls = vi.hoisted(() => ({ save: vi.fn<() => Promise<boolean>>() }));
vi.mock('./cast-runtime.ts', () => ({
  fileSession: false,
  castChanges: () => () => {},
  castState: () => ({ enabled: true, busy: false, selected: 'hf.cast.selin.voice', status: '' }),
  selectCast: () => {},
  checkpointCast: controls.save,
}));

import { CastOffer } from './CastOffer.tsx';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
it('automatically saves the selected person and offers a retry if saving fails', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  controls.save.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  await act(async () => root.render(createElement(CastOffer, { game: 'voice' })));
  expect(controls.save).toHaveBeenCalledOnce();
  expect(host.querySelector('a')).toBeNull();
  expect(host.textContent).toContain('could not be saved');
  await act(async () => {
    host.querySelector('button')?.click();
  });
  expect(host.querySelector('a')?.getAttribute('href')).toBe('https://goodhands.adamwhite.work');
  await act(() => root.unmount());
  host.remove();
});
