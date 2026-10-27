/** Scope: a small, initially collapsed place for diagnostics beside Lab privacy. */
export function debugFooter(...items: Node[]): HTMLElement {
  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.alignItems = 'baseline';
  footer.style.gap = '0.75em';
  const privacy = document.createElement('a');
  privacy.href = 'https://human.adamwhite.work/lab/privacy/';
  privacy.textContent = 'Lab privacy';
  privacy.style.display = 'inline-flex';
  privacy.style.alignItems = 'center';
  privacy.style.minHeight = '44px';
  const debug = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'Debug';
  summary.style.boxSizing = 'border-box';
  summary.style.minHeight = '44px';
  summary.style.minWidth = '44px';
  summary.style.paddingBlock = '12px';
  debug.append(summary, ...items);
  footer.append(privacy, debug);
  return footer;
}
