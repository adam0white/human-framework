/**
 * Scope: optional DOM controller for the CSS phone stage. Games render all content.
 * Tracks sheet origins, focus, snap controls and visible scene bounds; no game state,
 * or DOM replacement lives here. One same-document history entry supports browser Back.
 */
export type SheetHeight = 'peek' | 'half' | 'full' | 'fit';
export interface StageSheet {
  id: string;
  height?: SheetHeight;
  opener?: HTMLElement;
  /** Stable game-owned selector when the renderer recreates an opener without an id. */
  openerSelector?: string;
}
export interface SceneRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface PhoneStageOptions {
  /** React owns transitions; observe geometry and emit snap requests only. */
  observeOnly?: boolean;
  /** Disable only when a game router owns browser Back and calls back() itself. */
  history?: boolean;
  onChange?: (sheet: Readonly<StageSheet> | null, canBack: boolean) => void;
  onSceneRect?: (rect: Readonly<SceneRect>) => void;
}
export interface PhoneStage {
  open(sheet: StageSheet): void;
  back(): void;
  close(): void;
  snap(height: SheetHeight): void;
  refresh(): void;
  destroy(): void;
}
const historyTraversals = new WeakMap<Window, { waiting: Set<() => void> }>();
let controllerId = 0;
const heights: SheetHeight[] = ['peek', 'half', 'full', 'fit'];
function isHeight(value: string | undefined): value is SheetHeight {
  return heights.includes(value as SheetHeight);
}

/** Mount once after the stage DOM exists. Delegated controls survive game rerenders. */
export function phoneStage(root: HTMLElement, options: PhoneStageOptions = {}): PhoneStage {
  const win = root.ownerDocument.defaultView;
  if (!win) throw new Error('phoneStage needs a browser document');
  const stack: StageSheet[] = [];
  const historyKey = `lab-kit-stage-${++controllerId}`;
  let removingHistory = false;
  let destroyed = false;
  const ownsHistory = () =>
    !removingHistory && options.history !== false && win.history.state?.__labKitStage === historyKey;
  const addHistory = () => {
    if (destroyed || !current) return;
    const pending = historyTraversals.get(win);
    if (pending) {
      pending.waiting.add(addHistory);
      return;
    }
    if (removingHistory || options.observeOnly || options.history === false || ownsHistory()) return;
    const state: unknown = win.history.state;
    win.history.pushState(
      {
        ...(state && typeof state === 'object' ? state : { previousState: state }),
        __labKitStage: historyKey,
      },
      '',
    );
  };
  let current: StageSheet | null = null;
  let origin: Pick<StageSheet, 'opener' | 'openerSelector'> | undefined;
  let focusRevision = 0;
  const restoreFocus = (target: Pick<StageSheet, 'opener' | 'openerSelector'> | undefined) => {
    const find = () => {
      const element = target?.opener;
      const replacement = target?.openerSelector
        ? root.ownerDocument.querySelector<HTMLElement>(target.openerSelector)
        : element?.id
          ? root.ownerDocument.getElementById(element.id)
          : null;
      return element?.isConnected ? element : replacement;
    };
    find()?.focus();
    // React commits after the event handler. Recover the opener after that render too.
    const revision = focusRevision;
    win.setTimeout(() => {
      if (revision === focusRevision) find()?.focus();
    }, 0);
  };
  const removeHistory = () => {
    if (!ownsHistory() || historyTraversals.has(win)) return;
    removingHistory = true;
    const pending = { waiting: new Set<() => void>() };
    historyTraversals.set(win, pending);
    pending.waiting.add(() => {
      removingHistory = false;
      if (current) addHistory();
    });
    win.addEventListener(
      'popstate',
      () => {
        // All controllers ignore this traversal, including a replacement mounted before
        // the browser delivers it. Rearm after every popstate listener has run.
        win.setTimeout(() => {
          if (historyTraversals.get(win) !== pending) return;
          historyTraversals.delete(win);
          for (const resume of pending.waiting) resume();
        });
      },
      { once: true },
    );
    win.history.back();
  };
  let drag: { y: number; height: number; pointer: number } | undefined;
  const sheet = () => root.querySelector<HTMLElement>('.lk-sheet');
  const scene = () => root.querySelector<HTMLElement>('.lk-scene');
  const refresh = () => {
    const viewport = win.visualViewport;
    const viewportHeight = viewport?.height ?? win.innerHeight;
    const viewportTop = viewport?.offsetTop ?? 0;
    const availableHeight = Math.max(
      0,
      viewportTop + viewportHeight - Math.max(root.getBoundingClientRect().top, viewportTop),
    );
    root.style.setProperty('--lk-viewport-height', `${viewportHeight}px`);
    root.style.setProperty('--lk-available-height', `${availableHeight}px`);
    root.dataset.lkKeyboard = String(viewportHeight < win.innerHeight * 0.8);
    root.style.setProperty('--lk-viewport-top', `${viewport?.offsetTop ?? 0}px`);
    const bounds = scene()?.getBoundingClientRect();
    if (!bounds) return;
    const rect = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    for (const [key, value] of Object.entries(rect))
      root.style.setProperty(`--lk-scene-${key}`, `${value}px`);
    const stripHeight = root.querySelector('.lk-strip')?.getBoundingClientRect().height ?? 0;
    root.style.setProperty('--lk-strip-height', `${stripHeight}px`);
    options.onSceneRect?.(rect);
  };
  const render = () => {
    focusRevision++;
    if (options.observeOnly) {
      refresh();
      return;
    }
    root.dataset.sheet = current?.height ?? 'closed';
    if (current) root.dataset.sheetId = current.id;
    else delete root.dataset.sheetId;
    root.dataset.sheetBack = String(stack.length > 0);
    const panel = sheet();
    if (panel) {
      panel.hidden = !current;
      panel.setAttribute('aria-hidden', String(!current));
      if (!panel.hasAttribute('role')) panel.setAttribute('role', 'region');
    }
    root.querySelectorAll<HTMLElement>('[data-lk-snap]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.lkSnap === current?.height));
    });
    root.querySelectorAll<HTMLButtonElement>('[data-lk-back]').forEach((button) => {
      button.hidden = !stack.length;
    });
    options.onChange?.(current ? { ...current } : null, stack.length > 0);
    refresh();
  };
  const close = () => {
    const focus = origin;
    current = null;
    stack.length = 0;
    origin = undefined;
    removeHistory();
    render();
    restoreFocus(focus);
  };
  const back = () => {
    const previous = stack.pop();
    if (!previous) return close();
    const focus = current ?? undefined;
    current = previous;
    render();
    restoreFocus(focus);
  };
  const popstate = () => {
    if (historyTraversals.has(win)) return;
    if (current) {
      back();
      if (current) addHistory();
    }
  };
  const snap = (height: SheetHeight) => {
    if (!isHeight(height)) throw new Error(`Unknown sheet height: ${height}`);
    if (options.observeOnly) {
      options.onChange?.({ id: root.dataset.sheetId ?? 'sheet', height }, root.dataset.sheetBack === 'true');
      return;
    }
    if (!current) return;
    current = { ...current, height };
    render();
  };
  const click = (event: MouseEvent) => {
    const target =
      event.target instanceof win.Element
        ? event.target.closest<HTMLElement>(
            '[data-lk-snap], [data-lk-back], [data-lk-close], [data-lk-strip-toggle]',
          )
        : null;
    if (!target || !root.contains(target)) return;
    if (isHeight(target.dataset.lkSnap)) snap(target.dataset.lkSnap);
    else if (target.hasAttribute('data-lk-back')) back();
    else if (target.hasAttribute('data-lk-close')) close();
    else {
      const strip = target.closest<HTMLElement>('.lk-strip');
      if (strip) {
        const expanded = strip.dataset.expanded !== 'true';
        strip.dataset.expanded = String(expanded);
        target.setAttribute('aria-expanded', String(expanded));
        refresh();
      }
    }
  };
  const keydown = (event: KeyboardEvent) => {
    if (!options.observeOnly && event.key === 'Escape' && current) {
      event.preventDefault();
      back();
    }
  };
  const pointerdown = (event: PointerEvent) => {
    const handle = event.target instanceof win.Element ? event.target.closest('.lk-sheet-handle') : null;
    if (!handle || (!current && (!options.observeOnly || root.dataset.sheet === 'closed'))) return;
    drag = {
      y: event.clientY,
      height: sheet()?.getBoundingClientRect().height ?? 0,
      pointer: event.pointerId,
    };
    (handle as HTMLElement).setPointerCapture?.(event.pointerId);
  };
  const pointerup = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const delta = drag.y - event.clientY;
    if (Math.abs(delta) > 25) {
      const available = Math.max(
        1,
        root.getBoundingClientRect().height -
          (root.querySelector('.lk-strip')?.getBoundingClientRect().height ?? 0),
      );
      const desired = (drag.height + delta) / available;
      snap(desired > 0.7 ? 'full' : desired > 0.25 ? 'half' : 'peek');
    }
    drag = undefined;
  };
  const pointercancel = () => {
    drag = undefined;
  };
  root.classList.add('lk-stage');
  root.addEventListener('click', click);
  root.addEventListener('pointerdown', pointerdown);
  root.addEventListener('pointerup', pointerup);
  root.addEventListener('pointercancel', pointercancel);
  root.addEventListener('keydown', keydown);
  win.addEventListener('popstate', popstate);
  win.addEventListener('resize', refresh);
  win.visualViewport?.addEventListener('resize', refresh);
  win.visualViewport?.addEventListener('scroll', refresh);
  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(refresh);
  for (const element of [root, sheet(), scene(), root.querySelector('.lk-strip')])
    if (element) observer?.observe(element);
  render();
  return {
    open(next) {
      if (!next.id) throw new Error('A sheet needs an id');
      if (next.height !== undefined && !isHeight(next.height))
        throw new Error(`Unknown sheet height: ${next.height}`);
      const opener =
        next.opener ??
        (root.ownerDocument.activeElement instanceof win.HTMLElement
          ? root.ownerDocument.activeElement
          : undefined);
      if (current) stack.push(current);
      else origin = { opener, openerSelector: next.openerSelector };
      current = { ...next, height: next.height ?? 'fit', ...(opener ? { opener } : {}) };
      addHistory();
      render();
      const panel = sheet();
      if (panel) {
        if (!panel.hasAttribute('tabindex')) panel.tabIndex = -1;
        panel.focus();
      }
    },
    back,
    close,
    snap,
    refresh,
    destroy() {
      focusRevision++;
      destroyed = true;
      observer?.disconnect();
      root.removeEventListener('click', click);
      root.removeEventListener('pointerdown', pointerdown);
      root.removeEventListener('pointerup', pointerup);
      root.removeEventListener('pointercancel', pointercancel);
      root.removeEventListener('keydown', keydown);
      win.removeEventListener('popstate', popstate);
      win.removeEventListener('resize', refresh);
      win.visualViewport?.removeEventListener('resize', refresh);
      win.visualViewport?.removeEventListener('scroll', refresh);
      removeHistory();
    },
  };
}
