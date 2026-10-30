import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const name = '@adam0white/human-framework';
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

/** Resolve from the app, never from this helper's own installed dependencies. */
export function resolveSiteFramework(appRoot: string) {
  const appManifest = resolve(appRoot, 'package.json');
  const pin: unknown = read(appManifest).dependencies?.[name];
  if (typeof pin !== 'string' || !/^\d+\.\d+\.\d+(?:-[\da-zA-Z.-]+)?$/.test(pin)) {
    throw new Error(`Site HF dependency must be an exact version; got ${String(pin)}`);
  }
  const workspaceManifest = resolve(appRoot, '../../packages/human/package.json');
  const workspace = read(workspaceManifest);
  const frameworkLibrary: string = workspace.version;
  try {
    // Node's import.meta.resolve parent argument is experimental. An eval module starts in
    // cwd, so this uses stable ESM resolution from the app (including import exports),
    // without importing/executing HF or reusing this process's cached workspace symlinks.
    const urls = JSON.parse(
      execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          `process.stdout.write(JSON.stringify([import.meta.resolve('${name}/package.json'), import.meta.resolve('${name}')]))`,
        ],
        { cwd: appRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      ),
    ) as [string, string];
    const manifest = fileURLToPath(urls[0]);
    const installed = read(manifest);
    if (installed.name !== name || installed.version !== pin) {
      throw new Error(`Installed HF ${String(installed.version)} does not equal declared pin ${pin}`);
    }
    if (realpathSync(manifest) === realpathSync(workspaceManifest)) {
      throw new Error('Published HF resolved to the workspace');
    }
    const entry = fileURLToPath(urls[1]);
    if (!existsSync(entry)) throw new Error(`Missing HF runtime entry ${entry}`);
    // The site's declaration path uses this published layout before its workspace fallback.
    // A partial install must fail the runtime/build gate as well as ordinary npm checks.
    const declarations = resolve(dirname(manifest), 'dist/index.d.ts');
    if (!existsSync(declarations)) throw new Error(`Missing HF declarations ${declarations}`);
    return { entry, manifest, framework: pin, frameworkLibrary };
  } catch (cause) {
    throw new Error(`Cannot resolve published HF ${pin} from ${appRoot}: ${String(cause)}`, { cause });
  }
}
