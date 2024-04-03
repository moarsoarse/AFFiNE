import type { WorkspaceFlavour } from '@affine/env/workspace';
import type {
  CollectionInfoSnapshot,
  Doc,
  DocSnapshot,
  JobMiddleware,
} from '@blocksuite/store';
import { Job } from '@blocksuite/store';
import { Map as YMap } from 'yjs';

import { getLatestVersions } from '../blocksuite/migration/blocksuite';
import { DocsService } from '../modules/doc/services/docs';
import type { WorkspacesService } from '../modules/workspace/services/workspaces';
import { replaceIdMiddleware } from './middleware';

export function initEmptyPage(page: Doc, title?: string) {
  page.load(() => {
    const pageBlockId = page.addBlock(
      'affine:page' as keyof BlockSuite.BlockModels,
      {
        title: new page.Text(title ?? ''),
      }
    );
    page.addBlock(
      'affine:surface' as keyof BlockSuite.BlockModels,
      {},
      pageBlockId
    );
    const noteBlockId = page.addBlock(
      'affine:note' as keyof BlockSuite.BlockModels,
      {},
      pageBlockId
    );
    page.addBlock(
      'affine:paragraph' as keyof BlockSuite.BlockModels,
      {},
      noteBlockId
    );
  });
}

/**
 * FIXME: Use exported json data to instead of building data.
 */
export async function buildShowcaseWorkspace(
  workspacesService: WorkspacesService,
  flavour: WorkspaceFlavour,
  workspaceName: string
) {
  const meta = await workspacesService.create(
    flavour,
    async (docCollection, blobStorage) => {
      docCollection.meta.setName(workspaceName);
      const { onboarding } = await import('@affine/templates');

      const info = onboarding['info.json'] as CollectionInfoSnapshot;
      const blob = onboarding['blob.json'] as { [key: string]: string };

      const migrationMiddleware: JobMiddleware = ({ slots, collection }) => {
        slots.afterImport.on(payload => {
          if (payload.type === 'page') {
            collection.schema.upgradeDoc(
              info?.pageVersion ?? 0,
              {},
              payload.page.spaceDoc
            );
          }
        });
      };

      const job = new Job({
        collection: docCollection,
        middlewares: [replaceIdMiddleware, migrationMiddleware],
      });

      job.snapshotToCollectionInfo(info);

      // for now all onboarding assets are considered served via CDN
      // hack assets so that every blob exists
      // @ts-expect-error - rethinking API
      job._assetsManager.writeToBlob = async () => {};

      const docSnapshots: DocSnapshot[] = Object.entries(onboarding)
        .filter(([key]) => {
          return key.endsWith('snapshot.json');
        })
        .map(([_, value]) => value as unknown as DocSnapshot);

      await Promise.all(
        docSnapshots.map(snapshot => {
          return job.snapshotToDoc(snapshot);
        })
      );

      const newVersions = getLatestVersions(docCollection.schema);
      docCollection.doc
        .getMap('meta')
        .set('blockVersions', new YMap(Object.entries(newVersions)));

      for (const [key, base64] of Object.entries(blob)) {
        await blobStorage.set(key, new Blob([base64ToUint8Array(base64)]));
      }
    }
  );

  const { workspace, dispose } = workspacesService.open({ metadata: meta });

  await workspace.engine.waitForRootDocReady();

  const docsService = workspace.scope.get(DocsService);

  // todo: find better way to do the following
  // perhaps put them into middleware?
  {
    // the "Write, Draw, Plan all at Once." page should be set to edgeless mode
    const edgelessPage1 = docsService.docRecordList.records$.value.find(
      p => p.title$.value === 'Write, Draw, Plan all at Once.'
    );

    if (edgelessPage1) {
      edgelessPage1.setMode('edgeless');
    }

    // should jump to "Write, Draw, Plan all at Once." by default
    const defaultPage = docsService.docRecordList.records$.value.find(p =>
      p.title$.value.startsWith('Write, Draw, Plan all at Once.')
    );

    if (defaultPage) {
      defaultPage.setMeta({
        jumpOnce: true,
      });
    }
  }
  dispose();
  return meta;
}

function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const binaryArray = binaryString.split('').map(function (char) {
    return char.charCodeAt(0);
  });
  return new Uint8Array(binaryArray);
}
