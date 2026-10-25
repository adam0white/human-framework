/** Driver and observer wrappers must carry the per-call forecast choice without changing pure inputs. */
import { expect, test, vi } from 'vitest';
import { q26Offer, q26Person } from '../examples/q26-conditioned-forecast-control.ts';
import * as bodyModule from '../src/body/index.ts';
import { ambientBodyParams, ambientModifiers } from '../src/environment/index.ts';
import { pregnancyModifiers } from '../src/family/index.ts';
import { imagine, predictAs, previewCommandAs } from '../src/impression.ts';
import { lifeModifiers, predict, previewCommand, snapshot } from '../src/index.ts';
import { createCommunity, preview, stepCommunity } from '../src/sim/sim.ts';

// Native ESM exports are immutable; auto-spy retains each real implementation.
vi.mock('../src/body/index.ts', { spy: true });

const conditioned = { forecastContext: 'conditioned' } as const;
test('driver, preview and observer wrappers forward conditioned context through the existing partial model', () => {
  const target = q26Person(true, true);
  const observer = q26Person();
  observer.id = 'observer';
  target.body.sleepPressure = 0.9;
  target.body.exertion = 0.8;
  const before = snapshot(target);
  const observerBefore = snapshot(observer);
  const offers = [q26Offer];
  const suggestion = { voiceId: 'v', affordanceId: q26Offer.id, strength: 0.5 };
  const cmd = { voiceId: 'v', affordanceId: q26Offer.id, since: target.now };
  const model = imagine(observer, target, target.now);
  expect(model.body).not.toEqual(target.body);
  const spy = vi.mocked(bodyModule.forecastBody);
  const checkContext = (p: typeof target) => {
    expect(spy).toHaveBeenCalled();
    for (const args of spy.mock.calls) {
      expect(args[2]).toEqual(ambientModifiers(p, pregnancyModifiers(p, lifeModifiers(p))));
      expect(args[3]).toEqual(ambientBodyParams(p, bodyModule.BODY_DEFAULTS));
    }
    spy.mockClear();
  };
  try {
    const expectedPreview = predict(target, offers, suggestion, conditioned);
    spy.mockClear();
    expect(preview(target, offers, suggestion, conditioned)).toEqual(expectedPreview);
    checkContext(target);
    const expectedPrediction = predict(model, offers, suggestion, conditioned);
    spy.mockClear();
    expect(predictAs(observer, target, offers, suggestion, conditioned).resolution).toEqual(
      expectedPrediction,
    );
    checkContext(model);
    const expectedCommand = previewCommand(model, offers, cmd, conditioned);
    spy.mockClear();
    expect(previewCommandAs(observer, target, offers, cmd, target.now, conditioned).outcome).toEqual(
      expectedCommand,
    );
    checkContext(model);
    expect(target).toEqual(before);
    expect(observer).toEqual(observerBefore);
    // The driver mutates its own clone, while the pure wrappers above retain full state and RNG.
    const driven = snapshot(target);
    stepCommunity(
      createCommunity([driven]),
      {
        now: () => driven.now,
        affordancesFor: () => offers,
        perceptsFor: () => [],
        resolve: (p, a) => ({
          at: p.now,
          status: 'completed',
          affordanceId: a.affordanceId,
          action: a.action,
        }),
      },
      driven.now,
      conditioned,
    );
    checkContext(target);
    expect(target).toEqual(before);
    expect(observer).toEqual(observerBefore);
  } finally {
    spy.mockRestore();
  }
});
