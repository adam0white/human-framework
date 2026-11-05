import { describe, expect, it } from 'vitest';
import { advanceTutorial } from './tutorial.ts';

describe('Well tutorial', () => {
  it('waits for a person, an order, and an answer in sequence', () => {
    expect(advanceTutorial('person', 'order')).toBe('person');
    expect(advanceTutorial('person', 'person')).toBe('place');
    expect(advanceTutorial('place', 'answer')).toBe('place');
    expect(advanceTutorial('place', 'order')).toBe('answer');
    expect(advanceTutorial('answer', 'answer')).toBe('done');
  });
});
