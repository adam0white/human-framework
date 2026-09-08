// Public HTML is explicit: research or draft HTML in web/ is never published.
export const PUBLIC_PAGES=Object.freeze({
  'index.html':'index.html',
  'games/index.html':'web/games.html',
  'workshop/index.html':'web/workshop.html',
  'shift/index.html':'web/shift.html',
  'courtyard/index.html':'web/courtyard.html',
  'courier/index.html':'web/courier.html',
  'commons/index.html':'web/commons.html',
  'commons-next/index.html':'web/commons-next.html',
  'watch/index.html':'web/watch.html',
  'signals/index.html':'web/signals.html',
  'service/index.html':'web/service.html'
});

export const HTML_ROUTES=Object.freeze(Object.fromEntries(Object.entries(PUBLIC_PAGES).flatMap(([output,source])=>{
  const route=output==='index.html'?'/':`/${output.slice(0,-'index.html'.length)}`;
  return route==='/'?[[route,source]]:[[route,source],[route.slice(0,-1),source]];
})));
