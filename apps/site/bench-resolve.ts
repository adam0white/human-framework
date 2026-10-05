/**
 * Node resolve hook for the site bench (`vitest.bench.config.ts`), loaded with `--import`: the bench runs on Node's
 * own loader instead of Vite's module runner, so the `@adam0white/human-framework` alias is applied here, pointing at the
 * framework's TypeScript source (Node strips the types). Without it Node would resolve the package's `dist` build.
 */
import { registerHooks } from 'node:module';

const source = new URL('../../packages/human/src/index.ts', import.meta.url).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@adam0white/human-framework') return { url: source, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
