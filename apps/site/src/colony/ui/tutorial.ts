export type TutorialStep = 'person' | 'place' | 'answer' | 'done';
export type TutorialAction = 'person' | 'order' | 'answer';

export function advanceTutorial(step: TutorialStep, action: TutorialAction): TutorialStep {
  if (step === 'person' && action === 'person') return 'place';
  if (step === 'place' && action === 'order') return 'answer';
  if (step === 'answer' && action === 'answer') return 'done';
  return step;
}
