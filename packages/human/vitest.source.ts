import { registerHooks } from 'node:module';

// Setup files execute once per test file. Keep one resolver per worker.
const key = Symbol.for('human-framework.vitest.source-resolver');
if (!Reflect.get(globalThis, key)) {
  const source = new URL('./src/index.ts', import.meta.url).href;
  const hook = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === '@adam0white/human-framework') {
        return nextResolve(source, context);
      }
      return nextResolve(specifier, context);
    },
  });
  Reflect.set(globalThis, key, hook);
}
