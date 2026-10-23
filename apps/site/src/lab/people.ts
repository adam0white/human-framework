import { downloadJson } from '@adam0white/lab-kit';
import {
  createPersona,
  PERSONA_LIMITS,
  type PersonaEnvelope,
  type PersonaSummary,
  validatePersona,
} from '../../../../packages/lab-client/src/persona.ts';
import { shelfRequest } from './persona-store.ts';

const status = document.querySelector<HTMLElement>('#status');
const people = document.querySelector<HTMLElement>('#people');
const report = (message: string) => {
  if (status) status.textContent = message;
};
async function render() {
  if (!people) return;
  people.replaceChildren();
  const list = (await shelfRequest({ action: 'list' })) as PersonaSummary[];
  for (const summary of list) {
    const article = document.createElement('article');
    const title = document.createElement('h2');
    title.textContent = summary.castId;
    article.append(title);
    const button = (label: string, action: () => Promise<void>) => {
      const node = document.createElement('button');
      node.textContent = label;
      node.type = 'button';
      node.onclick = () => {
        void action().catch((e: unknown) => report(e instanceof Error ? e.message : 'Shelf unavailable.'));
      };
      article.append(node);
    };
    const get = async () =>
      shelfRequest({ action: 'get', castId: summary.castId }) as Promise<PersonaEnvelope>;
    button('Inspect', async () => {
      const pre = document.createElement('pre');
      pre.textContent = JSON.stringify(await get(), null, 2);
      article.append(pre);
    });
    button('Download', async () => {
      downloadJson(`${summary.castId}.json`, await get());
    });
    button('Delete this person', async () => {
      await shelfRequest({ action: 'delete', castId: summary.castId });
      await render();
      report('Deleted from this browser shelf. Exported files and received lab records remain.');
    });
    people.append(article);
  }
  if (!list.length)
    report('No people on this browser shelf. Enable continuity in a participating game or import a file.');
}
document.querySelector<HTMLInputElement>('#file')?.addEventListener('change', (event) => {
  void (async () => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > PERSONA_LIMITS.transferBytes) throw new Error('File exceeds 256 KiB.');
    const envelope = await validatePersona(JSON.parse(await file.text()));
    try {
      await shelfRequest({ action: 'put', envelope });
    } catch (error) {
      report(error instanceof Error ? error.message : 'Import conflict.');
      const fork = document.createElement('button');
      fork.type = 'button';
      fork.textContent = 'Import as an explicit new branch';
      fork.onclick = () => {
        void (async () => {
          const { revision, ...body } = envelope;
          const fresh = await createPersona({
            ...body,
            branchId: crypto.randomUUID(),
            parentRevision: null,
            limitations: [...body.limitations.slice(0, 63), `Forked from revision ${revision}`],
          });
          await shelfRequest({ action: 'put', envelope: fresh, fork: true });
          fork.remove();
          await render();
          report('Imported a new branch. The previous history will now conflict if it tries to advance.');
        })().catch((e: unknown) => report(e instanceof Error ? e.message : 'Import failed.'));
      };
      status?.after(fork);
      return;
    }
    await render();
    report('Imported. Recording this history still needs its own choice if the recording identity changed.');
  })().catch((e: unknown) => report(e instanceof Error ? e.message : 'Import failed.'));
});
void render().catch(() => report('Browser storage is unavailable. Use persona files in the game.'));
