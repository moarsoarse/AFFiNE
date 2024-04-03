import { DebugLogger } from '@affine/debug';
import { DEFAULT_WORKSPACE_NAME } from '@affine/env/constant';
import { WorkspaceFlavour } from '@affine/env/workspace';
import type { WorkspacesService } from '@toeverything/infra';
import { buildShowcaseWorkspace, initEmptyPage } from '@toeverything/infra';

const logger = new DebugLogger('createFirstAppData');

export async function createFirstAppData(workspacesService: WorkspacesService) {
  if (localStorage.getItem('is-first-open') !== null) {
    return;
  }
  localStorage.setItem('is-first-open', 'false');
  if (runtimeConfig.enablePreloading) {
    const workspaceMetadata = await buildShowcaseWorkspace(
      workspacesService,
      WorkspaceFlavour.LOCAL,
      DEFAULT_WORKSPACE_NAME
    );
    logger.info('create first workspace', workspaceMetadata);
    return workspaceMetadata;
  } else {
    const workspaceMetadata = await workspacesService.create(
      WorkspaceFlavour.LOCAL,
      async workspace => {
        workspace.meta.setName(DEFAULT_WORKSPACE_NAME);
        const page = workspace.createDoc();
        workspace.setDocMeta(page.id, {
          jumpOnce: true,
        });
        initEmptyPage(page);
      }
    );
    logger.info('create first workspace', workspaceMetadata);
    return workspaceMetadata;
  }
}
