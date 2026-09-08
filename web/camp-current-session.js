import * as camp from '../src/games/camp-current.js';

export const STORAGE_KEY = 'human-camp-current-v0.3.0';
export const MAX_SAVE_BYTES = 1024 * 1024;

export function createSession(game = camp.createGame()) {
  camp.getGameView(game);
  return { game, running: false, reason: 'Choose a job. Available time lets you recover.', error: null };
}
export function pauseSession(session, reason = 'Paused. Your work is kept.') {
  return { ...session, running: false, reason, error: null };
}
export function playSession(session) {
  const view = camp.getGameView(session.game);
  return { ...session, running: view.canAdvance,
    reason: view.canAdvance ? 'Time is moving. You can pause or stop work.' : view.pauseReason, error: null };
}
export function commandSession(session, command) {
  try {
    const game = camp.applyCommand(session.game, command), view = camp.getGameView(game);
    const reply = ['request', 'release', 'handover'].includes(command.type) ? view.lastResponse?.reason : null;
    return { game, running: false, reason: reply ?? view.pauseReason ?? 'Your choice is recorded. Advance time when ready.', error: null };
  } catch (error) {
    return { ...session, running: false, reason: error.message, error: error.message };
  }
}
const jobIdentity = job => job ? `${job.id}:${job.startedAt}:${job.workId ?? ''}` : null;
function boundary(before, after) {
  if (before.phase !== after.phase || !after.canAdvance) return after.pauseReason ?? 'The next camp decision is ready.';
  if (!before.people.player.job && !after.people.player.job && after.choices.some(choice =>
    !choice.unavailable && before.choices.find(old => old.id === choice.id)?.unavailable)) return 'You are ready for another kind of work.';
  for (const id of ['player', 'neighbor']) {
    const prior = before.people[id], next = after.people[id];
    if (jobIdentity(prior.job) !== jobIdentity(next.job)) return id === 'player' ? 'Your work reached a decision point.' : 'Meryem has finished or chosen her next work.';
    if (!next.job && prior.body.fatigue > 0 && next.body.fatigue === 0) return id === 'player' ? 'You have recovered your strength.' : 'Meryem has recovered her strength.';
  }
  return null;
}
export function advanceSession(session, minutes) {
  if (!Number.isSafeInteger(minutes) || minutes < 0 || minutes > 1440) throw new Error('Advance a whole number of minutes from 0 to 1440.');
  let result = { ...session, error: null };
  for (let i = 0; i < minutes; i++) {
    const before = camp.getGameView(result.game);
    if (!before.canAdvance) return { ...result, running: false, reason: before.pauseReason };
    try {
      const game = camp.advanceGame(result.game, 1), after = camp.getGameView(game), reason = boundary(before, after);
      result = { ...result, game };
      if (reason) return { ...result, running: false, reason };
    } catch (error) {
      return { ...result, running: false, reason: error.message, error: error.message };
    }
  }
  return result;
}
export function nextEventSession(session) {
  try {
    const before = camp.getGameView(session.game);
    if (!before.canAdvance) return pauseSession(session, before.pauseReason);
    const game = camp.advanceToNextEvent(session.game), after = camp.getGameView(game);
    return { game, running: false, reason: boundary(before, after) ?? 'Paused at the next work or recovery boundary.', error: null };
  } catch (error) {
    return { ...session, running: false, reason: error.message, error: error.message };
  }
}

function readSave(raw) {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > MAX_SAVE_BYTES) throw new Error('Choose a current Camp save no larger than one megabyte.');
  const data = JSON.parse(raw);
  if (data?.format !== 'human-camp-current') throw new Error('This file is not a current Camp save. Earlier camp formats are unsupported.');
  return camp.restoreGame(data);
}

// Only the current key is read. An unreadable value stays untouched and downloadable.
export function createSaveStore(storage) {
  let protectedStorage = false;
  return {
    load() {
      let raw = null;
      try {
        raw = storage.getItem(STORAGE_KEY);
        return { game: raw === null ? null : readSave(raw), backup: null, error: null };
      } catch {
        protectedStorage = true;
        return { game: null, backup: raw,
          error: 'The device save could not be opened and has not been replaced. Download your current camp before leaving.' };
      }
    },
    save(game) {
      if (protectedStorage) return { ok: false, error: 'The unreadable device save is protected. Download your current camp before leaving.' };
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(camp.exportGame(game)));
        return { ok: true, error: null };
      } catch {
        return { ok: false, error: 'Device storage is unavailable or full. Your camp is still here; download it before leaving.' };
      }
    },
  };
}

// A preview belongs to exactly the camp that was current when reading began.
export function createImportPreview(getCurrentGame) {
  let epoch = 0, pending = null;
  const invalidate = () => { epoch++; pending = null; };
  return {
    invalidate,
    async read(file) {
      invalidate();
      const token = epoch, baseGame = getCurrentGame();
      const stale = () => token !== epoch || baseGame !== getCurrentGame();
      try {
        if (!file || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_SAVE_BYTES) throw new Error('Choose a current Camp save no larger than one megabyte.');
        const raw = await file.text();
        if (stale()) return { status: 'stale' };
        const game = readSave(raw);
        pending = { game, baseGame };
        return { status: 'ready', game };
      } catch (error) {
        if (stale()) return { status: 'stale' };
        pending = null;
        return { status: 'error', error: error.message };
      }
    },
    confirm() {
      if (!pending || pending.baseGame !== getCurrentGame()) {
        invalidate();
        throw new Error('This import preview is no longer current. Select the save again.');
      }
      const game = pending.game;
      invalidate();
      return game;
    },
  };
}
