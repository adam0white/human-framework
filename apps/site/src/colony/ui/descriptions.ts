/** Approximate player-facing readings. These labels never change simulation state. */
export function trustDescription(value: number): string {
  if (value < 0.3) return 'They are wary of you.';
  if (value < 0.6) return 'They are getting to know you.';
  if (value < 0.8) return 'They usually trust you.';
  return 'They trust you deeply.';
}

export function moodDescription(value: number): string {
  if (value < -0.3) return 'They feel disheartened.';
  if (value < -0.08) return 'They feel uneasy.';
  if (value < 0.15) return 'They feel settled.';
  return 'They feel encouraged.';
}

export function needDescription(id: string, value: number): string {
  const low = value < 0.3;
  const middling = value < 0.65;
  switch (id) {
    case 'food':
      return low ? 'They are very hungry.' : middling ? 'They could eat.' : 'They have eaten.';
    case 'water':
      return low ? 'They are very thirsty.' : middling ? 'They could use a drink.' : 'They are not thirsty.';
    case 'sleep':
      return low ? 'They are exhausted.' : middling ? 'They are tired.' : 'They are rested.';
    case 'health':
      return low ? 'They feel unwell.' : middling ? 'They are recovering.' : 'They feel well.';
    case 'injury':
      return value >= 1
        ? 'They are unhurt.'
        : low
          ? 'They are badly hurt.'
          : middling
            ? 'They are hurt.'
            : 'They are slightly hurt.';
    default:
      return low
        ? 'This need feels urgent.'
        : middling
          ? 'This need is on their mind.'
          : 'They feel at ease.';
  }
}

/** Display only: action labels remain unchanged in saved frames and the canvas. */
export function activityDescription(label: string): string {
  label = label.replace(
    /\bto (House|Forest|Field|Kitchen|Well|Site|Cedar|Home|Wellhouse|Masjid)\b/g,
    (_, place: string) => `to the ${place === 'Masjid' ? place : place.toLowerCase()}`,
  );
  if (label === 'Idle' || label === 'waiting') return 'They are waiting.';
  if (label === 'Beam fell: recovering') return 'They are recovering after the beam fell.';
  if (label.startsWith('Collapsed')) return `They have ${label[0]?.toLowerCase()}${label.slice(1)}.`;
  if (label.startsWith('Carried by ')) return `They are being carried by ${label.slice(11)}.`;
  return `They are ${label[0]?.toLowerCase()}${label.slice(1)}.`;
}
