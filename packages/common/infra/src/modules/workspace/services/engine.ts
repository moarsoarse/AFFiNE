import { Service } from '../../../framework';
import { WorkspaceEngine } from '../entities/engine';
import type { WorkspaceService } from './workspace';

export class WorkspaceEngineService extends Service {
  readonly engine: WorkspaceEngine;

  constructor(workspaceService: WorkspaceService) {
    super();
    this.engine = this.framework.createEntity(WorkspaceEngine, {
      engineProvider:
        workspaceService.workspace.flavourProvider.getEngineProvider(
          workspaceService.workspace
        ),
    });
  }
}
