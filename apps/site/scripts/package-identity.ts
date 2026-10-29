/** Native Node commands use Vite's existing package resolver and file-identity define.
 * This reads only package metadata. It never reads an actor archive or changes the package graph.
 */
import { fileURLToPath } from 'node:url';
import { resolveSiteFramework } from '../hf-resolution.ts';

const packageVersion = resolveSiteFramework(fileURLToPath(new URL('..', import.meta.url))).framework;
const definitions = globalThis as typeof globalThis & { __HF_PACKAGE_VERSION__?: string };
if (definitions.__HF_PACKAGE_VERSION__ !== undefined && definitions.__HF_PACKAGE_VERSION__ !== packageVersion)
  throw new Error('The command and framework package identities differ.');
definitions.__HF_PACKAGE_VERSION__ = packageVersion;
