import { DebugLogger } from '@affine/debug';
import { catchError, from, map, mergeMap, NEVER, switchMap } from 'rxjs';

import { Entity } from '../../../framework';
import { effect, LiveData, onComplete, onStart } from '../../../livedata';
import type { GlobalCache } from '../../storage';
import type { WorkspaceMetadata } from '../metadata';
import type { WorkspaceFlavourProvider } from '../providers/flavour';
import type { Workspace } from './workspace';

const logger = new DebugLogger('affine:workspace-profile');

const WORKSPACE_PROFILE_CACHE_KEY = 'workspace-information:';

export interface WorkspaceProfileInfo {
  avatar?: string;
  name?: string;
}

/**
 * # WorkspaceProfile
 *
 * This class take care of workspace avatar and name
 */
export class WorkspaceProfile extends Entity<{ metadata: WorkspaceMetadata }> {
  private readonly provider: WorkspaceFlavourProvider | null;

  get id() {
    return this.props.metadata.id;
  }

  profile$ = LiveData.from<WorkspaceProfileInfo | null>(
    this.cache.watch(WORKSPACE_PROFILE_CACHE_KEY + this.props.metadata.id).pipe(
      map(data => {
        if (!data || typeof data !== 'object') {
          return null;
        }

        const info = data as WorkspaceProfileInfo;

        return {
          avatar: info.avatar,
          name: info.name,
        };
      })
    ),
    null
  );

  avatar$ = this.profile$.map(v => v?.avatar);
  name$ = this.profile$.map(v => v?.name);

  isLoading$ = new LiveData(false);

  constructor(
    private readonly cache: GlobalCache,
    providers: WorkspaceFlavourProvider[]
  ) {
    super();

    this.provider =
      providers.find(p => p.flavour === this.props.metadata.flavour) ?? null;
  }

  private setCache(info: WorkspaceProfileInfo) {
    this.cache.set(WORKSPACE_PROFILE_CACHE_KEY + this.props.metadata.id, info);
  }

  revalidate = effect(
    switchMap(() => {
      if (!this.provider) {
        return NEVER;
      }
      return from(
        this.provider?.getWorkspaceProfile(this.props.metadata.id)
      ).pipe(
        mergeMap(info => {
          if (info) {
            this.setCache(info);
          }
          return NEVER;
        }),
        catchError(err => {
          logger.error(err);
          return NEVER;
        }),
        onStart(() => this.isLoading$.next(true)),
        onComplete(() => this.isLoading$.next(false))
      );
    })
  );

  syncWithWorkspace(workspace: Workspace) {
    this.setCache({
      avatar:
        workspace.docCollection.meta.avatar ?? this.profile$.value?.avatar,
      name: workspace.docCollection.meta.name ?? this.profile$.value?.name,
    });
    workspace.docCollection.meta.commonFieldsUpdated.on(() => {
      this.setCache({
        avatar:
          workspace.docCollection.meta.avatar ?? this.profile$.value?.avatar,
        name: workspace.docCollection.meta.name ?? this.profile$.value?.name,
      });
    });
  }
}
