import { afterEach, describe, expect, it, vi } from 'vitest';
import { introCard } from '../src/intro-card.ts';

afterEach(() => {
  document.querySelectorAll('dialog').forEach((d) => {
    d.close();
  });
  document.body.replaceChildren();
});
describe('introCard', () => {
  it('leads with the goal, limits instructions, and closes through Start only once', async () => {
    const onClose = vi.fn();
    const options = {
      title: 'The room',
      goal: 'Feed everyone before closing.',
      steps: ['Look.', 'Choose.', 'Serve.', 'Ignored.'],
      next: 'Choose a table.',
      onClose,
      key: 'intro-test',
      storage: null,
    };
    const card = introCard(options);
    expect(card?.open).toBe(true);
    expect(card?.firstElementChild?.textContent).toBe(options.goal);
    expect(card?.querySelectorAll('li')).toHaveLength(3);
    expect(card?.querySelectorAll('button')).toHaveLength(1);
    card?.querySelector('button')?.click();
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(document.querySelector('dialog')).toBeNull();
    expect(introCard(options)).toBeNull();
  });
  it('renders untrusted words as text and allows Escape-style closure', async () => {
    const onClose = vi.fn();
    const card = introCard({
      title: '<script>',
      goal: '<img src=x>',
      onClose,
      key: 'intro-escape',
      storage: null,
    });
    expect(card?.querySelector('img')).toBeNull();
    card?.close();
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });
  it('replaces an open kit sheet rather than stacking sheets', () => {
    const first = introCard({ title: 'First', goal: 'Choose.', onClose() {}, key: 'first', storage: null });
    const second = introCard({
      title: 'Second',
      goal: 'Choose again.',
      onClose() {},
      key: 'second',
      storage: null,
    });
    expect(first?.open).toBe(false);
    expect(second?.open).toBe(true);
  });
});
