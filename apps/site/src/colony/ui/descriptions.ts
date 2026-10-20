/** Approximate player-facing readings. These labels never change simulation state. */
export function trustDescription(value: number): string {
  if (value < 0.3) return 'Wary of you';
  if (value < 0.6) return 'Getting acquainted';
  if (value < 0.8) return 'Usually trusts you';
  return 'Trusts you deeply';
}

export function moodDescription(value: number): string {
  if (value < -0.3) return 'Disheartened';
  if (value < -0.08) return 'Uneasy';
  if (value < 0.15) return 'Settled';
  return 'Heartened';
}

export function needDescription(id: string, value: number): string {
  const low = value < 0.3;
  const middling = value < 0.65;
  switch (id) {
    case 'food':
      return low ? 'Very hungry' : middling ? 'Could eat' : 'Fed';
    case 'water':
      return low ? 'Very thirsty' : middling ? 'Could use a drink' : 'Not thirsty';
    case 'sleep':
      return low ? 'Exhausted' : middling ? 'Tired' : 'Rested';
    case 'health':
      return low ? 'Unwell' : middling ? 'Recovering' : 'Well';
    case 'injury':
      return value >= 1 ? 'Unhurt' : low ? 'Badly hurt' : middling ? 'Hurt' : 'Slightly hurt';
    default:
      return low ? 'Pressing' : middling ? 'On their mind' : 'At ease';
  }
}
