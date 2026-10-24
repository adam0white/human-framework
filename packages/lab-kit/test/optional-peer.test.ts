import { expect, it, vi } from 'vitest';
import { notebookMenu } from '../src/notebook-menu.ts';

vi.mock('@adam0white/lab-client/package.json', () => {
  throw Error('Optional peer is not installed');
});
it('falls back to legacy dialog options when peer metadata is unavailable', async () => {
  const getRun = () => ({ seed: 1 });
  const openSendDialog = vi.fn();
  const entry = notebookMenu({
    lab: { openSendDialog },
    getRun,
    filename: 'run.json',
    compact: (run) => run,
    compactNote: 'Replays.',
  });
  document.body.append(entry);
  entry.click();
  const send = [...document.querySelectorAll('dialog button')].find(
    (b) => b.textContent === 'Feedback',
  ) as HTMLButtonElement;
  send.click();
  await vi.waitFor(() => expect(openSendDialog).toHaveBeenCalledWith({ getRun }));
  document.body.replaceChildren();
});
