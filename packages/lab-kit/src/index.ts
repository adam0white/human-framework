/**
 * Scope: framework-free lab UI primitives. Import tokens.css explicitly for the Field Notebook look.
 * No client is created on import; game rules, simulation state and telemetry transport remain outside this kit.
 */
export { dayOf, englishDate, month, weekday } from './english-date.ts';
export { defineTerms, glossaryPanel, term } from './glossary.ts';
export { type IntroCardOptions, introCard } from './intro-card.ts';
export { nextLine, setNext } from './next-line.ts';
export { downloadJson, type NotebookLab, type NotebookMenuOptions, notebookMenu } from './notebook-menu.ts';
export { type FlagStorage, type OnceStorage, once } from './once.ts';
