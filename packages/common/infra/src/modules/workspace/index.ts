export type { WorkspaceProfileInfo } from './entities/profile';
export { Workspace } from './entities/workspace';
export { globalBlockSuiteSchema } from './global-schema';
export type { WorkspaceMetadata } from './metadata';
export type { WorkspaceOpenOptions } from './open-options';
export type { WorkspaceEngineProvider } from './providers/flavour';
export { WorkspaceFlavourProvider } from './providers/flavour';
export { WorkspaceLocalState } from './providers/storage';
export { WorkspaceScope } from './scopes/workspace';
export { WorkspaceService } from './services/workspace';
export { WorkspacesService } from './services/workspaces';

import type { Framework } from '../../framework';
import { GlobalCache, GlobalState } from '../storage';
import { WorkspaceEngine } from './entities/engine';
import { WorkspaceList } from './entities/list';
import { WorkspaceProfile } from './entities/profile';
import { WorkspaceUpgrade } from './entities/upgrade';
import { Workspace } from './entities/workspace';
import { WorkspaceLocalStateImpl } from './impls/storage';
import { WorkspaceFlavourProvider } from './providers/flavour';
import { WorkspaceLocalState } from './providers/storage';
import { WorkspaceScope } from './scopes/workspace';
import { WorkspaceDestroyService } from './services/destroy';
import { WorkspaceEngineService } from './services/engine';
import { WorkspaceFactoryService } from './services/factory';
import { WorkspaceListService } from './services/list';
import { WorkspaceProfileRepositoryService } from './services/profile-repo';
import { WorkspaceRepositoryService } from './services/repo';
import { WorkspaceTransformService } from './services/transform';
import { WorkspaceUpgradeService } from './services/upgrade';
import { WorkspaceService } from './services/workspace';
import { WorkspacesService } from './services/workspaces';
import { TestingWorkspaceLocalProvider } from './testing/testing-provider';

export function configureWorkspaceModule(framework: Framework) {
  framework
    .service(WorkspacesService, [
      [WorkspaceFlavourProvider],
      WorkspaceListService,
      WorkspaceProfileRepositoryService,
      WorkspaceTransformService,
      WorkspaceRepositoryService,
      WorkspaceFactoryService,
      WorkspaceDestroyService,
    ])
    .service(WorkspaceDestroyService, [[WorkspaceFlavourProvider]])
    .service(WorkspaceListService)
    .entity(WorkspaceList, [[WorkspaceFlavourProvider], GlobalCache])
    .service(WorkspaceProfileRepositoryService)
    .entity(WorkspaceProfile, [GlobalCache, [WorkspaceFlavourProvider]])
    .service(WorkspaceFactoryService, [[WorkspaceFlavourProvider]])
    .service(WorkspaceTransformService, [
      WorkspaceFactoryService,
      WorkspaceDestroyService,
    ])
    .service(WorkspaceRepositoryService, [
      [WorkspaceFlavourProvider],
      WorkspaceProfileRepositoryService,
    ])
    .scope(WorkspaceScope)
    .service(WorkspaceService)
    .entity(Workspace, [WorkspaceScope])
    .service(WorkspaceEngineService, [WorkspaceService])
    .entity(WorkspaceEngine, [WorkspaceService])
    .service(WorkspaceUpgradeService)
    .entity(WorkspaceUpgrade, [
      WorkspaceService,
      WorkspaceFactoryService,
      WorkspaceDestroyService,
    ])
    .impl(WorkspaceLocalState, WorkspaceLocalStateImpl, [
      WorkspaceService,
      GlobalState,
    ]);
}

export function configureTestingWorkspaceProvider(framework: Framework) {
  framework.impl(
    WorkspaceFlavourProvider('LOCAL'),
    TestingWorkspaceLocalProvider,
    [GlobalState]
  );
}
