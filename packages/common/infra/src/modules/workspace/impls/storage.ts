import { type Memento, wrapMemento } from '../../../storage';
import type { GlobalState } from '../../storage';
import type { WorkspaceLocalState } from '../providers/storage';
import type { WorkspaceService } from '../services/workspace';

export class WorkspaceLocalStateImpl implements WorkspaceLocalState {
  wrapped: Memento;
  constructor(workspaceService: WorkspaceService, globalState: GlobalState) {
    this.wrapped = wrapMemento(
      globalState,
      `workspace-state:${workspaceService.workspace.id}:`
    );
  }

  keys(): string[] {
    return this.wrapped.keys();
  }

  get<T>(key: string): T | null {
    return this.wrapped.get<T>(key);
  }

  watch<T>(key: string) {
    return this.wrapped.watch<T>(key);
  }

  set<T>(key: string, value: T | null): void {
    return this.wrapped.set<T>(key, value);
  }

  del(key: string): void {
    return this.wrapped.del(key);
  }

  clear(): void {
    return this.wrapped.clear();
  }
}
