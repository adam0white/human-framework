import { afterEach, describe, expect, it, vi } from 'vitest';
import { parsePhoneArgs, parsePhoneSteps, phoneStepName } from '../../../scripts/lab-phone-helpers.ts';
import { auditPhone } from '../src/audit-phone.ts';

function required(selector: string): Element {
  const el = document.querySelector(selector);
  if (!el) throw new Error(selector);
  return el;
}
const rect = (x = 0, y = 0, width = 100, height = 50) =>
  ({ x, y, left: x, top: y, width, height, right: x + width, bottom: y + height, toJSON() {} }) as DOMRect;
function geometry(
  el: Element,
  box: DOMRect,
  clientWidth = box.width,
  clientHeight = box.height,
  scrollWidth = clientWidth,
  scrollHeight = clientHeight,
) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(box);
  for (const [key, value] of Object.entries({ clientWidth, clientHeight, scrollWidth, scrollHeight }))
    Object.defineProperty(el, key, { value, configurable: true });
}
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
describe('auditPhone real geometry checks', () => {
  it('finds target size, centre coverage, overlap, and actions behind a scroll box', () => {
    document.body.innerHTML =
      '<div id="scroll" style="overflow:auto"><button id="first">First</button><button id="second">Second</button></div><div id="cover"></div>';
    const scroll = required('#scroll');
    const a = required('#first');
    const b = required('#second');
    const cover = required('#cover');
    geometry(document.body, rect(0, 0, 360, 690));
    geometry(scroll, rect(0, 0, 100, 40), 100, 40, 100, 150);
    geometry(a, rect(0, 20, 40, 30));
    geometry(b, rect(20, 30, 50, 50));
    geometry(cover, rect(0, 0, 100, 100));
    vi.spyOn(document, 'elementFromPoint').mockReturnValue(cover);
    const findings = auditPhone();
    expect(findings.map((f) => f.kind)).toEqual(
      expect.arrayContaining(['small-target', 'covered', 'overlap', 'action-needs-scroll']),
    );
    expect(findings.find((f) => f.kind === 'covered')?.text).toBe('First');
  });
  it('only reports clipped text when a text rectangle crosses the clipping box', () => {
    document.body.innerHTML =
      '<div id="panel" style="overflow:hidden"><p id="text">Protect these beds by shutting the door.</p></div>';
    const panel = required('#panel');
    const text = required('#text');
    geometry(document.body, rect(0, 0, 360, 690));
    geometry(panel, rect(0, 0, 100, 40), 100, 40, 100, 120);
    geometry(text, rect(0, 0, 100, 120));
    vi.spyOn(Range.prototype, 'getClientRects').mockReturnValue([
      rect(0, 0, 90, 20),
    ] as unknown as DOMRectList);
    expect(auditPhone().filter((f) => f.kind === 'clipped')).toHaveLength(0);
    vi.mocked(Range.prototype.getClientRects).mockReturnValue([
      rect(0, 30, 90, 20),
    ] as unknown as DOMRectList);
    expect(auditPhone().find((f) => f.kind === 'clipped')).toMatchObject({
      selector: '#panel',
      text: 'Protect these beds by shutting the door.',
    });
  });
  it('reports a short text-only scroll box, while permitting a scrolling sheet body', () => {
    document.body.innerHTML =
      '<div style="overflow:auto" id="sheet"><p id="words" style="overflow:auto">Ring the bell so someone can choose to shut the door.</p></div>';
    geometry(document.body, rect(0, 0, 360, 690));
    geometry(required('#sheet'), rect(0, 0, 100, 80), 100, 80, 100, 180);
    geometry(required('#words'), rect(0, 0, 100, 50), 100, 50, 100, 180);
    vi.spyOn(Range.prototype, 'getClientRects').mockReturnValue([
      rect(0, 40, 90, 20),
    ] as unknown as DOMRectList);
    expect(auditPhone().filter((f) => f.kind === 'clipped')).toEqual([
      expect.objectContaining({
        selector: '#words',
        detail: 'Text requires internal scrolling inside its own box',
      }),
    ]);
  });
  it('audits the visible modal and excludes the content behind it', () => {
    document.body.innerHTML =
      '<button id="behind">Hidden behind</button><section role="dialog" aria-modal="true"><button id="front">Play</button></section>';
    for (const el of [document.body, ...document.body.querySelectorAll('*')])
      geometry(el, rect(0, 0, 20, 20));
    vi.spyOn(document, 'elementFromPoint').mockReturnValue(required('#front'));
    const findings = auditPhone();
    expect(findings.filter((f) => f.kind === 'small-target').map((f) => f.selector)).toEqual(['#front']);
    expect(findings.some((f) => f.kind === 'covered')).toBe(false);
  });
  it('does not treat a nonmodal open dialog as a modal', () => {
    document.body.innerHTML =
      '<button id="outside">Outside</button><dialog open><button id="inside">Inside</button></dialog>';
    for (const el of [document.body, ...document.body.querySelectorAll('*')])
      geometry(el, rect(0, 0, 20, 20));
    vi.spyOn(document, 'elementFromPoint').mockReturnValue(null);
    expect(
      auditPhone()
        .filter((f) => f.kind === 'small-target')
        .map((f) => f.selector),
    ).toEqual(['#outside', '#inside']);
  });
  it('excludes sentence links, hidden controls and ancestor/descendant target overlap', () => {
    document.body.innerHTML =
      '<p>Read the <a href="#">notes</a> here.</p><button style="display:none">Hidden</button><div role="button"><span tabindex="0">Child</span></div>';
    for (const el of [document.body, ...document.body.querySelectorAll('*')]) geometry(el, rect());
    const link = required('a');
    (link as HTMLElement).style.display = 'inline';
    geometry(link, rect(200, 200, 20, 20));
    vi.spyOn(document, 'elementFromPoint').mockReturnValue(null);
    expect(auditPhone().filter((f) => f.kind === 'small-target' || f.kind === 'overlap')).toHaveLength(0);
  });
  it('reports ellipsis, clamping, and page horizontal scroll', () => {
    document.body.innerHTML = '<p style="text-overflow:ellipsis;-webkit-line-clamp:2">Words</p>';
    geometry(document.body, rect());
    geometry(required('p'), rect());
    const originalStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
      const s = originalStyle(el);
      if (el === required('p')) {
        const property = s.getPropertyValue.bind(s);
        vi.spyOn(s, 'getPropertyValue').mockImplementation((name) =>
          name === '-webkit-line-clamp' ? '2' : property(name),
        );
      }
      return s;
    });
    Object.defineProperty(document.documentElement, 'scrollWidth', {
      value: window.innerWidth + 2,
      configurable: true,
    });
    expect(auditPhone().map((f) => f.kind)).toEqual(
      expect.arrayContaining(['ellipsis', 'clamped', 'hscroll']),
    );
    Object.defineProperty(document.documentElement, 'scrollWidth', {
      value: window.innerWidth + 1,
      configurable: true,
    });
    expect(auditPhone().some((f) => f.kind === 'hscroll')).toBe(false);
  });
});
describe('phone command pure helpers', () => {
  it('parses options and steps without importing a browser', () => {
    expect(parsePhoneArgs(['https://example.com', '--out', '/tmp/shots', '--steps', 'steps.json'])).toEqual({
      url: 'https://example.com',
      out: '/tmp/shots',
      steps: 'steps.json',
    });
    expect(
      parsePhoneSteps([
        { click: 'Begin' },
        { selector: '#order' },
        { type: 'Ada', selector: 'input' },
        { wait: 20 },
      ]),
    ).toHaveLength(4);
    expect(phoneStepName(2, 'Order / Ada')).toBe('02-order-ada');
  });
  it('rejects malformed options and steps', () => {
    expect(() => parsePhoneArgs([])).toThrow('Usage');
    expect(() => parsePhoneArgs(['https://example.com', '--bad', 'x'])).toThrow('Invalid option');
    expect(() => parsePhoneSteps({})).toThrow('array');
    expect(() => parsePhoneSteps([{ wait: -1 }])).toThrow('Invalid step');
  });
});
