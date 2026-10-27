import { castForGame } from '@adam0white/lab-client';
import { useEffect, useState } from 'react';
import { GAMES } from '../games.ts';
import { castChanges, castState, checkpointCast, selectCast } from './cast-runtime.ts';
import { settingWords } from './setting-words.ts';

/** Offer a known person and their registered destinations at a natural stopping point. */
export function CastOffer({ game }: { game: string }) {
  const [, refresh] = useState(0);
  const [saved, setSaved] = useState(false);
  useEffect(() => castChanges(() => refresh((n) => n + 1)), []);
  const state = castState(game);
  const person =
    castForGame(game).find((p) => p.castId === state.selected && p.games.length > 1) ??
    castForGame(game).find((p) => p.games.length > 1);
  if (!person || !state.enabled) return null;
  const destinations = person.games
    .filter((id) => id !== game)
    .map((id) => GAMES.find((entry) => entry.id === id))
    .filter((entry) => entry !== undefined)
    .slice(0, 2);
  if (!destinations.length) return null;
  return (
    <section>
      <h2>Meet {settingWords(person.name)} again</h2>
      <p>People carry between compatible games on this browser. Save this chapter before leaving.</p>
      <button
        type="button"
        disabled={state.busy}
        onClick={() => {
          selectCast(game, person.castId);
          setSaved(false);
          void checkpointCast(game).then(setSaved);
        }}
      >
        Save {settingWords(person.name)}
      </button>
      <p role="status">{state.status}</p>
      {saved &&
        destinations.map((destination) => (
          <p key={destination.id}>
            <a href={destination.href}>{destination.name}</a>
          </p>
        ))}
    </section>
  );
}
