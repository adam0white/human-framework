import { downloadJson } from '@adam0white/lab-kit';
import { canonicalCast } from '../../../../packages/lab-client/src/cast.ts';
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
    try {
      title.textContent = canonicalCast(summary.castId).name;
    } catch {
      title.textContent = summary.castId;
    }
    article.append(title);
    if (summary.terminal) {
      const closed = document.createElement('p');
      closed.textContent =
        'Closed by an actual death. The last living passport is archived. Only an explicit alternate fresh branch can continue.';
      article.append(closed);
    }
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
    let currentCast: ReturnType<typeof canonicalCast> | undefined;
    try {
      currentCast = canonicalCast(summary.castId);
    } catch {}
    if (currentCast && currentCast.revision !== summary.castRevision) {
      const note = document.createElement('p');
      note.textContent =
        'Older cast edition. Inspect or download it here. To replace it, import a new branch here after exporting a fresh chapter.';
      article.append(note);
    }
    button('Earlier retained revisions', async () => {
      const revisions = (await shelfRequest({
        action: 'history',
        castId: summary.castId,
      })) as PersonaSummary[];
      for (const old of revisions.filter((p) => p.revision !== summary.revision)) {
        const row = document.createElement('details');
        const label = document.createElement('summary');
        label.textContent = `Edition ${old.castRevision} · ${old.source.game} · ${old.revision.slice(0, 12)}`;
        row.append(label);
        const inspect = document.createElement('button');
        inspect.type = 'button';
        inspect.textContent = 'Inspect and download this revision';
        inspect.onclick = () => {
          void (async () => {
            const envelope = await shelfRequest({
              action: 'get',
              castId: summary.castId,
              revision: old.revision,
            });
            const pre = document.createElement('pre');
            pre.textContent = JSON.stringify(envelope, null, 2);
            row.append(pre);
            downloadJson(`${summary.castId}-${old.revision.slice(0, 12)}.json`, envelope);
          })().catch((e) => report(String(e)));
        };
        row.append(inspect);
        article.append(row);
      }
      if (revisions.length < 2)
        report(
          'No earlier revisions remain in the bounded local cache. Downloaded source files remain independent backups.',
        );
    });
    button('Delete this person', async () => {
      await shelfRequest({ action: 'delete', castId: summary.castId });
      await render();
      report('Deleted from this browser shelf. Exported files and received lab records remain.');
    });
    people.append(article);
  }
  if (!list.length) report('No people on this browser shelf. Play a participating game or import a file.');
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
    report(
      'Imported. When recording is on, this history is linked automatically across games on this device.',
    );
  })().catch((e: unknown) => report(e instanceof Error ? e.message : 'Import failed.'));
});
void render().catch(() => report('Browser storage is unavailable. Use persona files in the game.'));
