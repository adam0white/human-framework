import { Window } from 'happy-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { textControlPoint } from './lab-play-text.ts';

describe('lab:play exact text controls', () => {
  let window: Window;
  beforeEach(() => {
    window = new Window();
    vi.stubGlobal('document', window.document);
    vi.stubGlobal('getComputedStyle', window.getComputedStyle.bind(window));
    vi.stubGlobal('innerWidth', 1280);
    vi.stubGlobal('innerHeight', 800);
    // happy-dom has no layout. The browser tests exercise real geometry and hit testing.
    vi.spyOn(window.HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as never);
    vi.spyOn(window.HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      top: 10,
      right: 110,
      bottom: 60,
      width: 100,
      height: 50,
    } as never);
    window.document.elementFromPoint = () => window.document.querySelector('.button, button');
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    await window.happyDOM.close();
  });

  it.each(['class="tooltip"', 'role="tooltip"', 'hidden', 'style="display:none"'])(
    'matches the complete label without a %s descendant',
    (attribute) => {
      window.document.body.innerHTML = `<div class="button" onclick="void 0">cart<div ${attribute}>wood 30</div></div>`;
      expect(textControlPoint('cart')).toEqual({ x: 60, y: 35 });
    },
  );

  it.each([
    ['cart tomorrow', 'cart'],
    ['Send <span>Idris</span> home', 'Send'],
    ['Send <span>Idris</span> home', 'Send Tariq home'],
  ])('refuses partial or changed label %s for %s', (label, requested) => {
    window.document.body.innerHTML = `<div class="button" onclick="void 0">${label}</div>`;
    expect(textControlPoint(requested)).toEqual({ reason: 'not found' });
  });

  it('refuses two controls with the same complete label', () => {
    window.document.body.innerHTML =
      '<button>cart</button><div class="button" onclick="void 0">cart<div class="tooltip">wood 30</div></div>';
    expect(textControlPoint('cart')).toEqual({ reason: '2 controls match' });
  });

  it('does not treat tooltip text as another control label', () => {
    window.document.body.innerHTML =
      '<div class="button" onclick="void 0">trap<div class="tooltip">cart</div></div>';
    expect(textControlPoint('cart')).toEqual({ reason: 'not found' });
  });

  it('does not promote an inherited pointer cursor on a label fragment to a control', () => {
    window.document.body.innerHTML =
      '<button style="cursor:pointer">Send <span style="cursor:pointer">Idris</span> home</button>';
    window.document.elementFromPoint = () => window.document.querySelector('span');
    expect(textControlPoint('Idris')).toEqual({ reason: 'not found' });
  });

  it('counts a nested label once and keeps whitespace normalization', () => {
    window.document.body.innerHTML = '<button><span> Send <b>Tariq</b> home </span></button>';
    expect(textControlPoint('Send  Tariq home')).toEqual({ x: 60, y: 35 });
  });

  it('never includes a visible tooltip in the requested label', () => {
    window.document.body.innerHTML = '<button>cart<span class="tooltip"> wood 30</span></button>';
    expect(textControlPoint('cart wood 30')).toEqual({ reason: 'not found' });
  });

  it.each(['role="img"', 'tabindex="0"'])(
    'does not promote a %s label fragment to a control',
    (attribute) => {
      window.document.body.innerHTML = `<button>Send <span ${attribute}>Idris</span> home</button>`;
      window.document.elementFromPoint = () => window.document.querySelector('span');
      expect(textControlPoint('Idris')).toEqual({ reason: 'not found' });
    },
  );

  it.each(['<span class="tooltip">wood 30</span>', '<button>other</button>'])(
    'refuses points covered by an auxiliary or independent descendant: %s',
    (child) => {
      window.document.body.innerHTML = `<div class="button" role="button">cart${child}</div>`;
      window.document.elementFromPoint = () =>
        window.document.querySelector('.button')?.lastElementChild ?? null;
      const label = child.includes('other') ? 'cartother' : 'cart';
      expect(textControlPoint(label)).toEqual({ reason: 'covered by another element' });
    },
  );

  it('scrolls the single enabled control to the center before hit testing', () => {
    window.document.body.innerHTML = '<button>Continue</button>';
    const target = window.document.querySelector('button');
    if (!target) throw new Error('Missing fixture button');
    let scrolled = false;
    const scroll = vi.spyOn(target, 'scrollIntoView').mockImplementation(() => {
      scrolled = true;
    });
    vi.spyOn(target, 'getBoundingClientRect').mockImplementation(
      () => ({ left: 10, top: scrolled ? 10 : 1200, width: 100, height: 50 }) as never,
    );
    expect(textControlPoint('Continue')).toEqual({ x: 60, y: 35 });
    expect(scroll).toHaveBeenCalledWith({ block: 'center' });
  });

  it('refuses a disabled control before scrolling or hit testing', () => {
    window.document.body.innerHTML = '<div aria-disabled="true"><button>Continue</button></div>';
    const target = window.document.querySelector('button');
    if (!target) throw new Error('Missing fixture button');
    const scroll = vi.spyOn(target, 'scrollIntoView');
    expect(textControlPoint('Continue')).toEqual({ reason: 'disabled' });
    expect(scroll).not.toHaveBeenCalled();
  });

  it('reports off screen when scrolling cannot expose a control', () => {
    window.document.body.innerHTML = '<button>Continue</button>';
    const target = window.document.querySelector('button');
    if (!target) throw new Error('Missing fixture button');
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      top: 1200,
      width: 100,
      height: 50,
    } as never);
    expect(textControlPoint('Continue')).toEqual({ reason: 'off screen' });
  });
});
