import { GAMES } from '../games.ts';
import type { CuratedGame } from './ledger.ts';

/** The games the lab tracks: the site's one games list (read here, never edited), reduced to id, name, link. */
export const LAB_GAMES: CuratedGame[] = GAMES.map(({ id, name, href }) => ({ id, name, href }));
