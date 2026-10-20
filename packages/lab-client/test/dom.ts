/** Small DOM surface for the plain-DOM dialog; browser transport and compression remain real. */
export class Element {
  children: (Element | string)[] = [];
  parent: Element | undefined;
  listeners = new Map<string, ((event: unknown) => unknown)[]>();
  id = '';
  className = '';
  textContent = '';
  value = '';
  disabled = false;
  readOnly = false;
  open = false;
  constructor(readonly tagName: string) {}
  append(...children: (Element | string)[]) {
    for (const child of children) {
      if (child instanceof Element) child.parent = this;
      this.children.push(child);
    }
  }
  setAttribute() {}
  addEventListener(type: string, listener: (event: unknown) => unknown) {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }
  removeEventListener() {}
  focus() {}
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this);
  }
  async fire(type: string) {
    if (type === 'click' && this.disabled) return;
    for (const listener of this.listeners.get(type) ?? []) await listener({ target: this });
  }
  all(): Element[] {
    return [this, ...this.children.flatMap((child) => (child instanceof Element ? child.all() : []))];
  }
  querySelectorAll() {
    return this.all();
  }
}

export function documentFixture() {
  const body = new Element('body');
  const head = new Element('head');
  return {
    body,
    head,
    activeElement: null,
    createElement: (tag: string) => new Element(tag),
    getElementById: (id: string) => [...body.all(), ...head.all()].find((node) => node.id === id),
    addEventListener() {},
    removeEventListener() {},
  };
}
