/**
 * Lab experiments: research runs, not games. The lab dashboard lists them in their own section; they never join
 * GAMES (games.ts), the homepage or /games/.
 *   href      where to look (a replay viewer, or the write-up when there is nothing to watch)
 *   writeup   the write-up on GitHub
 *   status    running, reported (a write-up exists) or stopped
 */
export type Experiment = {
  id: string;
  name: string;
  date: string;
  status: 'running' | 'reported' | 'stopped';
  href: string;
  writeup: string;
  line: string;
};

const DOCS = 'https://github.com/adam0white/human-framework/blob/main/docs/lab/experiments';

export const EXPERIMENTS: Experiment[] = [
  {
    id: 'island',
    name: 'Two minds, one island',
    date: '2026-10-20',
    status: 'reported',
    href: '/lab/island/',
    writeup: `${DOCS}/island-2026-10-20.md`,
    line: 'An HF person and LLM agents on the same small island with no task. Claude built a tower; HF, even with its memory and goals wired in, did not play.',
  },
  {
    id: 'triage',
    name: 'Ledger triage bake-off',
    date: '2026-10-20',
    status: 'reported',
    href: `${DOCS}/clairic-triage-2026-10-20.md`,
    writeup: `${DOCS}/clairic-triage-2026-10-20.md`,
    line: 'Clairic, Clef and four small Workers AI models label 50 hand-labelled feedback rows. Clef did best.',
  },
];
