import { castForGame } from '@adam0white/lab-client';
import { useEffect, useRef, useState } from 'react';
import { GAMES } from '../games.ts';
import { castChanges, castState, checkpointCast, fileSession, selectCast } from './cast-runtime.ts';
import { settingWords } from './setting-words.ts';

/** Offer a known person and their registered destinations at a natural stopping point. */
export function CastOffer({ game }: { game: string }) {
  const [, refresh] = useState(0);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ id: string; status: 'saving' | 'saved' | 'failed' } | null>(null);
  const capture = useRef<{ key: string; promise: Promise<boolean> } | null>(null);
  useEffect(() => castChanges(() => refresh((n) => n + 1)), []);
  const state = castState(game);
  const person =
    castForGame(game).find((p) => p.castId === state.selected && p.games.length > 1) ??
    castForGame(game).find((p) => p.games.length > 1);
  const id = person?.castId;
  useEffect(() => {
    if (fileSession || !state.enabled || !id) return;
    let current = true;
    const key = `${game}:${id}:${retry}`;
    setResult({ id, status: 'saving' });
    if (capture.current?.key !== key) {
      selectCast(game, id);
      capture.current = { key, promise: checkpointCast(game) };
    }
    void capture.current.promise
      .then((ok) => {
        if (current) setResult({ id, status: ok ? 'saved' : 'failed' });
      })
      .catch(() => {
        if (current) setResult({ id, status: 'failed' });
      });
    return () => {
      current = false;
    };
  }, [game, id, retry, state.enabled]);
  if (fileSession || !person || !state.enabled) return null;
  const destinations = person.games
    .filter((entry) => entry !== game)
    .map((entry) => GAMES.find((candidate) => candidate.id === entry))
    .filter((entry) => entry !== undefined)
    .slice(0, 2);
  if (!destinations.length) return null;
  const status = result && result.id === id ? result.status : 'saving';
  return (
    <section>
      <h2>Meet {settingWords(person.name)} again</h2>
      <p>People carry between compatible games on this browser.</p>
      {status === 'saving' && <p role="status">Saving this chapter…</p>}
      {status === 'failed' && (
        <p role="alert">
          This chapter could not be saved.{' '}
          <button type="button" onClick={() => setRetry((n) => n + 1)}>
            Try again
          </button>
        </p>
      )}
      {status === 'saved' &&
        destinations.map((destination) => (
          <p key={destination.id}>
            <a href={destination.href}>{destination.name}</a>
          </p>
        ))}
    </section>
  );
}
