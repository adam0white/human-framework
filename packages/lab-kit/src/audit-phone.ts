/** Real-layout heuristics for DL-30. Reports DOM targets and text; canvas contents need a player review. */
export type PhoneFindingKind =
  | 'clipped'
  | 'ellipsis'
  | 'clamped'
  | 'covered'
  | 'overlap'
  | 'small-target'
  | 'hscroll'
  | 'action-needs-scroll';
export interface PhoneFinding {
  kind: PhoneFindingKind;
  selector: string;
  text: string;
  detail: string;
}

/** Self-contained so builders can inject this function into a browser without a bundled dependency. */
export function auditPhone(root: Element = document.body): PhoneFinding[] {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  if (!win) return [];
  const findings: PhoneFinding[] = [];
  const seen = new Set<string>();
  const selector = (el: Element): string => {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts: string[] = [];
    let node: Element | null = el;
    for (let i = 0; node && i < 3; i++, node = node.parentElement) {
      const tag = node.localName;
      const siblings = node.parentElement
        ? [...node.parentElement.children].filter((s) => s.localName === tag)
        : [];
      parts.unshift(`${tag}${siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(node) + 1})` : ''}`);
      if (node === root) break;
    }
    return parts.join(' > ');
  };
  const words = (el: Element) =>
    (el.textContent ?? el.getAttribute('aria-label') ?? '').replace(/\s+/g, ' ').trim().slice(0, 160);
  const add = (kind: PhoneFindingKind, el: Element, detail: string, text = words(el)) => {
    const sel = selector(el);
    const key = `${kind}|${sel}|${text}|${detail}`;
    if (!seen.has(key)) {
      seen.add(key);
      findings.push({ kind, selector: sel, text, detail });
    }
  };
  const rendered = (el: Element): boolean => {
    for (let p: Element | null = el; p; p = p.parentElement) {
      const s = win.getComputedStyle(p);
      if (
        (s.clip && s.clip !== 'auto') ||
        (s.clipPath && s.clipPath !== 'none' && p.getBoundingClientRect().width <= 1)
      )
        return false;
      if (
        p.localName === 'details' &&
        !p.hasAttribute('open') &&
        el !== p &&
        !p.querySelector(':scope > summary')?.contains(el)
      )
        return false;
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0' || p.hasAttribute('hidden'))
        return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const inView = (r: DOMRect) =>
    r.bottom > 0 && r.right > 0 && r.top < win.innerHeight && r.left < win.innerWidth;
  const modal = [...doc.querySelectorAll('dialog[open], [role=dialog][aria-modal=true]')]
    .filter((el) => {
      if (!rendered(el)) return false;
      if (el.getAttribute('aria-modal') === 'true') return true;
      try {
        return el.matches(':modal');
      } catch {
        return false;
      }
    })
    .at(-1);
  const elements = [root, ...root.querySelectorAll('*')];
  for (const el of elements) {
    if (!rendered(el) || (modal && !modal.contains(el))) continue;
    const onScreen = inView(el.getBoundingClientRect());
    const style = win.getComputedStyle(el);
    if (onScreen && words(el) && style.textOverflow === 'ellipsis')
      add('ellipsis', el, 'text-overflow: ellipsis');
    const clamp = style.getPropertyValue('-webkit-line-clamp') || style.getPropertyValue('line-clamp');
    if (onScreen && words(el) && clamp && clamp !== 'none' && clamp !== '0')
      add('clamped', el, `line-clamp: ${clamp}`);
    // Test each text node against its clipping ancestor. An overflowing layout ancestor alone
    // is not evidence that a sentence is clipped (e.g. a scene beside an intentional sheet).
    for (const child of el.childNodes) {
      if (child.nodeType !== 3 || !child.textContent?.trim()) continue;
      const range = doc.createRange();
      range.selectNodeContents(child);
      const textRects = [...range.getClientRects()];
      for (let p: Element | null = el; p; p = p.parentElement) {
        const s = win.getComputedStyle(p);
        const clipX = /^(hidden|clip)$/.test(s.overflowX || s.overflow);
        const internalTextScroll =
          p === el && onScreen && /^(auto|scroll)$/.test(s.overflowY || s.overflow) && !el.children.length;
        const clipY = /^(hidden|clip)$/.test(s.overflowY || s.overflow) || internalTextScroll;
        if (!clipX && !clipY) continue;
        const r = p.getBoundingClientRect();
        const left = r.left + p.clientLeft;
        const top = r.top + p.clientTop;
        if (
          textRects.some(
            (t) =>
              (clipX &&
                p.scrollWidth > p.clientWidth + 1 &&
                (t.left < left - 1 || t.right > left + p.clientWidth + 1)) ||
              (clipY &&
                p.scrollHeight > p.clientHeight + 1 &&
                (t.top < top - 1 || t.bottom > top + p.clientHeight + 1)),
          )
        ) {
          add(
            'clipped',
            p,
            internalTextScroll
              ? 'Text requires internal scrolling inside its own box'
              : 'Text extends outside an overflow hidden/clip box',
            child.textContent.trim().slice(0, 160),
          );
          break;
        }
      }
    }
  }
  const targets = elements.filter(
    (el) =>
      el.matches(
        'button, a[href], input:not([type=hidden]), select, textarea, summary, [contenteditable=true], [role=button], [role=link], [tabindex]',
      ) &&
      !el.matches(':disabled, [aria-disabled=true], [tabindex="-1"]') &&
      rendered(el) &&
      (!modal || modal.contains(el)),
  );
  const visibleTargets: Element[] = [];
  for (const el of targets) {
    const r = el.getBoundingClientRect();
    for (let p = el.parentElement; p; p = p.parentElement) {
      const s = win.getComputedStyle(p);
      if (!/auto|scroll|hidden|clip/.test(`${s.overflow} ${s.overflowX} ${s.overflowY}`)) continue;
      const box = p.getBoundingClientRect();
      if (
        (p.scrollHeight > p.clientHeight + 1 &&
          (r.top < box.top - 1 || r.bottom > box.top + p.clientHeight + 1)) ||
        (p.scrollWidth > p.clientWidth + 1 &&
          (r.left < box.left - 1 || r.right > box.left + p.clientWidth + 1))
      ) {
        add('action-needs-scroll', el, `Outside scroll container ${selector(p)}`);
        break;
      }
    }
    if (!inView(r)) continue;
    visibleTargets.push(el);
    const inlineLink =
      el.matches('a[href]') &&
      win.getComputedStyle(el).display === 'inline' &&
      !!el.parentElement &&
      [...el.parentElement.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());
    if (!inlineLink && (r.width < 44 || r.height < 44))
      add('small-target', el, `${Math.round(r.width)}×${Math.round(r.height)}; minimum 44×44`);
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    if (x >= 0 && y >= 0 && x < win.innerWidth && y < win.innerHeight) {
      const top = doc.elementFromPoint(x, y);
      if (top && top !== el && !el.contains(top)) add('covered', el, `Centre covered by ${selector(top)}`);
    }
  }
  for (let i = 0; i < visibleTargets.length; i++) {
    const a = visibleTargets[i];
    if (!a) continue;
    const ar = a.getBoundingClientRect();
    for (const b of visibleTargets.slice(i + 1)) {
      if (a.contains(b) || b.contains(a)) continue;
      const br = b.getBoundingClientRect();
      if (
        Math.min(ar.right, br.right) - Math.max(ar.left, br.left) > 1 &&
        Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top) > 1
      )
        add('overlap', a, `Intersects ${selector(b)} (${words(b)})`);
    }
  }
  if (doc.documentElement.scrollWidth > win.innerWidth + 1)
    add(
      'hscroll',
      doc.documentElement,
      `${doc.documentElement.scrollWidth}px page / ${win.innerWidth}px viewport`,
    );
  return findings;
}
