import { Help } from '../../shared/Help.tsx';
import { voiceWords as settingWords } from './words.ts';
/** Translate at display time; simulation text and replay remain unchanged. */
export const explainTerms = settingWords;

export function MealTerms() {
  return (
    <Help title="Meal terms">
      <p>The pre-dawn meal is eaten before the fast begins.</p>
      <p>The sunset meal breaks the fast after sunset.</p>
    </Help>
  );
}
