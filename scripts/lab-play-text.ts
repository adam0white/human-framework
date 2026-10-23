/**
 * Resolve one complete text control label, excluding tooltip and hidden descendants.
 * Self-contained because Playwright serializes this function into the page. Never
 * match a label fragment, pick the first duplicate, or tap through another control.
 */
export function textControlPoint(text: string): { x: number; y: number } | { reason: string } {
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
  const wanted = normalize(text);
  const auxiliary = '.tooltip, [role="tooltip"], [hidden], [aria-hidden="true"]';
  const hidden = (element: Element) => {
    for (let node: Element | null = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (node.matches(auxiliary) || style.display === 'none' || style.visibility === 'hidden') return true;
    }
    return false;
  };
  const explicit = (element: HTMLElement) =>
    element.matches(
      'button, a[href], details > summary:first-of-type, input[type=button], input[type=submit], [onclick], [role=button], [role=link], [role=tab], [role=menuitem], [role=checkbox], [role=radio], [role=option], [role=switch]',
    ) || Boolean(element.onclick);
  const control = (element: HTMLElement) => {
    if (explicit(element)) return true;
    if (!element.hasAttribute('tabindex') && getComputedStyle(element).cursor !== 'pointer') return false;
    // Focusable or pointer-styled label spans still belong to their enclosing control.
    for (
      let parent = element.parentElement;
      parent && parent !== document.body;
      parent = parent.parentElement
    )
      if (
        explicit(parent) ||
        parent.hasAttribute('tabindex') ||
        getComputedStyle(parent).cursor === 'pointer'
      )
        return false;
    return true;
  };
  const labelText = (element: Element): string => {
    let label = '';
    for (const node of element.childNodes) {
      if (node.nodeType === 3) label += node.textContent ?? '';
      else if (node.nodeType === 1) {
        const child = node as Element;
        if (hidden(child)) continue;
        const block =
          child.tagName === 'BR' ||
          /^(block|flex|grid|table|list-item)/.test(getComputedStyle(child).display);
        label += `${block ? '\n' : ''}${labelText(child)}${block ? '\n' : ''}`;
      }
    }
    return label;
  };
  const candidates: HTMLElement[] = [];
  for (const element of document.querySelectorAll<HTMLElement>('body *')) {
    if (hidden(element) || !element.getClientRects().length || !control(element)) continue;
    // Keep ordinary child label text: "Send <span>Idris</span> home" is not "Send".
    const label = normalize(labelText(element));
    const accessible = element.matches('button, a[href], [role=button], [role=link]')
      ? element.getAttribute('aria-label')
      : null;
    if (label === wanted || (accessible !== null && normalize(accessible) === wanted))
      candidates.push(element);
  }
  if (candidates.length === 0) return { reason: 'not found' };
  if (candidates.length !== 1) return { reason: `${candidates.length} controls match` };
  const target = candidates[0];
  if (!target) return { reason: 'not found' };
  if (target.matches(':disabled, .disabled') || target.closest('[aria-disabled="true"]'))
    return { reason: 'disabled' };
  target.scrollIntoView({ block: 'center' });
  const box = target.getBoundingClientRect();
  let onScreen = false;
  for (const fy of [0.5, 0.3, 0.7, 0.15, 0.85])
    for (const fx of [0.5, 0.3, 0.7, 0.15, 0.85]) {
      const x = box.left + box.width * fx;
      const y = box.top + box.height * fy;
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      onScreen = true;
      const hit = document.elementFromPoint(x, y) as HTMLElement | null;
      if (!hit || hidden(hit) || (hit !== target && !target.contains(hit))) continue;
      let owner: HTMLElement | null = hit;
      while (owner && owner !== target && !control(owner)) owner = owner.parentElement;
      if (owner === target) return { x, y };
    }
  return { reason: onScreen ? 'covered by another element' : 'off screen' };
}
