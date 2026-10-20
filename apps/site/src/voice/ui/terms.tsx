/** Presentation only: repeat short meanings so any entry point can be a first encounter. */
export function explainTerms(text: string): string {
  return text.replace(
    /\b(suhoor|iftar)\b/gi,
    (term) =>
      `${term} (${term.toLowerCase() === 'suhoor' ? 'meal before the fast' : 'meal that breaks the fast'})`,
  );
}

export function MealTerms() {
  return (
    <details className="v-meal-terms">
      <summary>Meal terms</summary>
      <p>Suhoor is the meal before the fast, eaten before dawn.</p>
      <p>Iftar is the meal that breaks the fast, eaten after sunset.</p>
    </details>
  );
}
