/** Author-side clues. Never included in public canonical profiles or assumed to be player knowledge.
 * These are small disclosures through completed work or an actual conversation. Larger registry outcomes
 * remain authored possibilities until their distinct choices and consequences are implemented.
 */
export const VOICE_DISCOVERIES: Record<string, string> = {
  halil:
    'Halil finds an old repair order marked finished without a price. “Nuran said I should name what the work costs.”',
  selin:
    'Selin says she deleted an ordinary voice message from Nuran before knowing it would matter. “There is no copy. I miss hearing her.”',
  riza: 'Rıza takes an envelope from his pocket. The back carries a careful sketch of a tiled doorway. “My daughter sent the first photograph.”',
  hacer:
    'Hacer describes a tiny paper room she is making. “This one has a very large window. I still have to decide about the door.”',
  osman:
    'Osman mentions an old cash contribution he has not reconciled with a former tenant. “Finding the note is not the same as putting the account right.”',
};
const WELL_DISCOVERIES: Record<string, { actions: string[]; line: string }> = {
  maryam: {
    actions: ['cook'],
    line: 'Maryam shows a string puzzle while the pot settles. “Pulling harder is not always the way.”',
  },
  yusuf: {
    actions: ['build'],
    line: 'Yusuf finds an old timber token among his tools. He says the roof store was used for another household’s promised repair; Zehra has not heard the whole account.',
  },
  tariq: {
    actions: ['build'],
    line: 'Tariq shows a sketch of a tiny boat and laughs at the failed sails. “I would test it away from the drinking water.”',
  },
  idris: {
    actions: ['gather-timber', 'fell-cedar'],
    line: 'Idris stops at a boundary marker and admits he once moved one while hauling. “I should have asked before taking that cut.”',
  },
  samira: {
    actions: ['gather-grain'],
    line: 'Samira shows a permitted scrap stained yellow and asks for an empty shell. She is testing how a pigment dries, not gathering a medicine.',
  },
  danyal: {
    actions: ['draw-water'],
    line: 'Danyal checks the rope, then mentions the empty jars on a shelf he repaired only after his wife died. “I kept saying the public work could not wait.”',
  },
};
export function wellDiscovery(role: string, action: string): string | undefined {
  const fact = WELL_DISCOVERIES[role];
  return fact?.actions.includes(action) ? fact.line : undefined;
}
export const WATCH_DISCOVERIES: Record<string, string> = {
  tamar:
    '“An old signal was misunderstood. I changed the gesture without checking they understood. I have let the story sound simpler.”',
  kian: 'Kian unfolds a little road map. “Ada named this inn The Very Small King. Nobody taller than the keeper gets in.” He folds it away before the next watch.',
  samira:
    '“I left my paints at home tonight. The yellow changes as it dries. I want to look at it with rested eyes.”',
  idris:
    '“There is a boundary marker I moved while hauling. The money helped at home. Samira has not heard where it came from.”',
  danyal:
    '“My wife asked me to fix a shelf. I found time after she died. Now it holds empty jars. The public work was not all she wanted from me.”',
  meryem:
    'Meryem shows two ink marks on her route sketch. “This part I walked. That part came from my grandfather’s map. I took the distinction off the neat copy. I need to put it back.”',
};
