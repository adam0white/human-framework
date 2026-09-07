// Stateless keyed draws: new narrative/UI activity never consumes simulation RNG.
export function keyedRandom(seed,...keys) {
  let h=2166136261;
  for(const c of JSON.stringify([seed,...keys])) {h^=c.charCodeAt(0);h=Math.imul(h,16777619);}
  h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;
  return (h>>>0)/4294967296;
}
