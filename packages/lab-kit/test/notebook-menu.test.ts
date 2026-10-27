import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadJson, notebookMenu } from '../src/notebook-menu.ts';

const peer = vi.hoisted(() => ({ version: '0.1.2' }));
vi.mock('@adam0white/lab-client/package.json', () => ({ default: peer }));
beforeEach(() => history.replaceState(null, '', '/'));
afterEach(() => {
  document.querySelectorAll('dialog').forEach((d) => {
    d.close();
  });
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
function open(options: Parameters<typeof notebookMenu>[0]) {
  const entry = notebookMenu(options);
  document.body.append(entry);
  entry.click();
  return document.querySelector('dialog') as HTMLDialogElement;
}
function button(sheet: HTMLDialogElement, text: string) {
  return [...sheet.querySelectorAll('button')].find((b) => b.textContent === text) as HTMLButtonElement;
}
describe('Notebook', () => {
  it('downloads complete JSON and releases its URL after the click', async () => {
    vi.useFakeTimers();
    let blob: Blob | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
      blob = value as Blob;
      return 'blob:export';
    });
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    let filename = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      filename = this.download;
    });
    const run = { seed: 3, inputs: ['serve'], state: { large: 'full' } };
    downloadJson('run.json', run);
    expect(filename).toBe('run.json');
    expect(JSON.parse((await blob?.text()) ?? '')).toEqual(run);
    expect(revoke).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:export');
    expect(document.querySelector('a')).toBeNull();
  });
  it('passes compaction to 0.1.2 and closes the sheet before opening the client dialog', async () => {
    peer.version = '0.1.2';
    const getRun = () => ({ seed: 4 });
    const compact = (run: unknown) => run;
    const openSendDialog = vi.fn(() => expect(document.querySelector('dialog[open]')).toBeNull());
    const sheet = open({
      lab: { openSendDialog },
      getRun,
      compact,
      compactNote: 'Seed and inputs replay everything.',
      filename: 'run.json',
    });
    button(sheet, 'Feedback').click();
    await vi.waitFor(() =>
      expect(openSendDialog).toHaveBeenCalledWith({
        getRun,
        compact,
        compactNote: 'Seed and inputs replay everything.',
      }),
    );
  });
  it('omits unsupported compaction for 0.1.1 while keeping send available', async () => {
    peer.version = '0.1.1';
    const getRun = () => ({ seed: 4 });
    const openSendDialog = vi.fn();
    const sheet = open({
      lab: { openSendDialog },
      getRun,
      compact: (run) => run,
      compactNote: 'Compact.',
      filename: 'run.json',
    });
    button(sheet, 'Feedback').click();
    await vi.waitFor(() => expect(openSendDialog).toHaveBeenCalledWith({ getRun }));
  });
  it('works without a lab, exposes privacy, and reports save failure', async () => {
    const sheet = open({
      getRun: () => ({}),
      filename: 'run.json',
      onSave: () => {
        throw Error('offline');
      },
    });
    expect(sheet.textContent).toContain('downloaded export still has everything');
    expect(sheet.querySelector('a')?.href).toBe('https://human.adamwhite.work/lab/privacy/');
    expect(button(sheet, 'Download this run')).toBeDefined();
    button(sheet, 'Save').click();
    await vi.waitFor(() =>
      expect(sheet.querySelector('[role=status]')?.textContent).toContain('That did not work'),
    );
  });
  it('uses the full export for the download action even when compaction is configured', async () => {
    const run = { state: 'complete' };
    let blob: Blob | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
      blob = b as Blob;
      return 'blob:run';
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const compact = vi.fn(() => ({}));
    const sheet = open({ getRun: () => run, filename: 'run.json', compact });
    button(sheet, 'Download this run').click();
    expect(JSON.parse((await blob?.text()) ?? '')).toEqual(run);
    expect(compact).not.toHaveBeenCalled();
  });
});

it('keeps a send startup failure visible with download still available', async () => {
  const sheet = open({
    lab: {
      openSendDialog() {
        throw Error('broken');
      },
    },
    getRun: () => ({}),
    filename: 'run.json',
  });
  button(sheet, 'Feedback').click();
  await vi.waitFor(() =>
    expect(sheet.querySelector('[role=status]')?.textContent).toContain('Sending could not open'),
  );
  expect(sheet.open).toBe(true);
  expect(button(sheet, 'Download this run')).toBeDefined();
});

it('does not open Send late if the player closes Notebook during peer detection', async () => {
  peer.version = '0.1.2';
  const openSendDialog = vi.fn();
  const sheet = open({
    lab: { openSendDialog },
    getRun: () => ({}),
    filename: 'run.json',
    compact: (run) => run,
  });
  button(sheet, 'Feedback').click();
  sheet.close();
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(openSendDialog).not.toHaveBeenCalled();
});

it('shows Save and puts the export in a collapsed Debug beside Lab privacy', () => {
  const sheet = open({ getRun: () => ({ seed: 1 }), filename: 'run.json', onSave: vi.fn() });
  const details = sheet.querySelector('details');
  expect(details?.open).toBe(false);
  expect(details?.querySelector('summary')?.textContent).toBe('Debug');
  expect(details?.querySelector('button')?.textContent).toBe('Download this run');
  expect(details?.parentElement?.querySelector('a')?.textContent).toBe('Lab privacy');
  expect(button(sheet, 'Save')).toBeDefined();
});

it('passes the explicit feedback choices opt-in through the native sheet handoff', async () => {
  const openSendDialog = vi.fn();
  const getRun = () => ({ seed: 17 });
  const sheet = open({ lab: { openSendDialog }, getRun, filename: 'run.json', feedbackChoices: true });
  button(sheet, 'Feedback').click();
  await vi.waitFor(() => expect(openSendDialog).toHaveBeenCalledWith({ getRun, feedbackChoices: true }));
});
