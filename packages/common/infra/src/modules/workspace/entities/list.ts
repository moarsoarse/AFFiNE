import { DebugLogger } from '@affine/debug';
import type { WorkspaceFlavour } from '@affine/env/workspace';
import { catchError, from, map, mergeMap, NEVER, switchMap } from 'rxjs';

import { Entity } from '../../../framework';
import { effect, LiveData, onComplete, onStart } from '../../../livedata';
import type { GlobalCache } from '../../storage';
import type { WorkspaceMetadata } from '../metadata';
import type { WorkspaceFlavourProvider } from '../providers/flavour';

const CACHE_STORAGE_KEY = 'jotai-workspaces';

const logger = new DebugLogger('affine:workspace-profile');

export class WorkspaceList extends Entity {
  workspaces$ = LiveData.from(
    this.cache.watch(CACHE_STORAGE_KEY).pipe(
      map(metadata => {
        if (metadata && Array.isArray(metadata)) {
          return metadata;
        }
        return [];
      })
    ),
    []
  );
  isLoading$ = new LiveData(false);
  error$ = new LiveData<Error | null>(null);

  constructor(
    private readonly providers: WorkspaceFlavourProvider[],
    private readonly cache: GlobalCache
  ) {
    super();

    this.subscribe();
  }

  private setFlavourCache(
    flavour: WorkspaceFlavour,
    workspaces: WorkspaceMetadata[]
  ) {
    this.cache.set(
      CACHE_STORAGE_KEY,
      this.workspaces$.value
        .filter(w => w.flavour !== flavour)
        .concat(workspaces)
    );
  }

  private setCache(workspaces: WorkspaceMetadata[]) {
    this.cache.set(CACHE_STORAGE_KEY, workspaces);
  }

  private subscribe() {
    this.providers.forEach(provider => {
      provider.subscribeWorkspaces(workspaces => {
        this.setFlavourCache(provider.flavour, workspaces);
      });
    });
  }

  revalidate = effect(
    switchMap((_: boolean) =>
      from(Promise.all(this.providers.map(p => p.getWorkspaces()))).pipe(
        mergeMap(workspaces => {
          this.setCache(workspaces.flat());
          return NEVER;
        }),
        catchError(err => {
          this.error$.next(err);
          logger.error('revalidate workspace list error', err);
          return NEVER;
        }),
        onStart(() => this.isLoading$.next(true)),
        onComplete(() => this.isLoading$.next(false))
      )
    )
  );
}
