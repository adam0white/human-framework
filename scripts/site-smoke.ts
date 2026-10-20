/** Static built-page smoke: each site entry must contain bundled JS and resolve its local assets. */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const pages = [
  'index.html',
  'games/index.html',
  'colony/index.html',
  'voice/index.html',
  'watch/index.html',
  'lab/index.html',
  'lab/privacy/index.html',
];

export function smokeSite(dist: string): void {
  const root = resolve(dist);
  for (const page of pages) {
    const html = readFileSync(resolve(root, page), 'utf8');
    // Privacy is deliberately static HTML with CSS; the other entries load application JS.
    if (page !== 'lab/privacy/index.html' && !/<script\b[^>]*\bsrc=["'][^"']+\.js["']/i.test(html))
      throw new Error(`${page}: missing bundled script`);
    for (const match of html.matchAll(/<(script|link)\b[^>]*\b(?:src|href)=["']([^"']+)["']/gi)) {
      // Alternate data, canonical links and API routes need no static file in dist.
      if (
        match[1]?.toLowerCase() === 'link' &&
        !/\brel=["'](?:stylesheet|modulepreload|preload|icon|apple-touch-icon)["']/i.test(match[0])
      )
        continue;
      const url = match[2];
      if (!url || /^(?:[a-z]+:|\/\/|#)/i.test(url)) continue;
      const asset = decodeURIComponent(url.split(/[?#]/)[0] ?? '');
      const target = resolve(root, asset.startsWith('/') ? `.${asset}` : `${page}/../${asset}`);
      if (!target.startsWith(root + sep) || !existsSync(target))
        throw new Error(`${page}: missing or escaping asset ${url}`);
    }
  }
  console.log(`Built-page asset smoke passed: ${pages.length} pages`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  smokeSite(resolve(import.meta.dirname, '../apps/site/dist'));
