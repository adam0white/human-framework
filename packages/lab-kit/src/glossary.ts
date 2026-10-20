/**
 * Defines a game glossary and renders inline explanations as native disclosure buttons.
 * First occurrence means first render since defineTerms; this does not persist reading history.
 */
let definitions: Readonly<Record<string, string>> = {};
const encountered = new Set<string>();
let sequence = 0;

/** Replace the current game's terms and reset first-occurrence tracking. */
export function defineTerms(terms: Readonly<Record<string, string>>): void {
  definitions = { ...terms };
  encountered.clear();
}

export function term(word: string): HTMLSpanElement {
  if (!Object.hasOwn(definitions, word)) throw new Error(`Unknown glossary term: ${word}`);
  const meaning = definitions[word] as string;
  const wrapper = document.createElement('span');
  wrapper.className = 'lk-term';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'lk-term-button';
  button.textContent = word;
  const explanation = document.createElement('span');
  explanation.id = `lk-term-${++sequence}`;
  explanation.className = 'lk-term-meaning';
  explanation.textContent = ` (${meaning})`;
  explanation.hidden = encountered.has(word);
  encountered.add(word);
  button.setAttribute('aria-controls', explanation.id);
  button.setAttribute('aria-expanded', String(!explanation.hidden));
  button.addEventListener('click', () => {
    explanation.hidden = !explanation.hidden;
    button.setAttribute('aria-expanded', String(!explanation.hidden));
  });
  wrapper.append(button, explanation);
  return wrapper;
}

export function glossaryPanel(): HTMLDListElement {
  const list = document.createElement('dl');
  list.className = 'lk-glossary';
  list.setAttribute('aria-label', 'Glossary');
  for (const [word, meaning] of Object.entries(definitions)) {
    const label = document.createElement('dt');
    label.textContent = word;
    const definition = document.createElement('dd');
    definition.textContent = meaning;
    list.append(label, definition);
  }
  return list;
}
