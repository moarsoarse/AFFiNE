import type { DocMeta } from '@blocksuite/store';
import { isEqual } from 'lodash-es';
import { distinctUntilChanged, Observable } from 'rxjs';

import { Entity } from '../../../framework';
import { LiveData } from '../../../livedata';
import type { WorkspaceLocalState, WorkspaceService } from '../../workspace';

export type DocMode = 'edgeless' | 'page';

export class DocRecord extends Entity<{ id: string }> {
  id: string = this.props.id;
  meta: Partial<DocMeta> | null = null;
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly localState: WorkspaceLocalState
  ) {
    super();
  }

  meta$ = LiveData.from<Partial<DocMeta>>(
    new Observable<Partial<DocMeta>>(subscriber => {
      const emit = () => {
        if (this.meta === null) {
          // getDocMeta is heavy, so we cache the doc meta reference
          this.meta =
            this.workspaceService.workspace.docCollection.meta.getDocMeta(
              this.id
            ) || null;
        }
        subscriber.next({ ...this.meta });
      };

      emit();

      const dispose =
        this.workspaceService.workspace.docCollection.meta.docMetaUpdated.on(
          emit
        ).dispose;
      return () => {
        dispose();
      };
    }).pipe(distinctUntilChanged((p, c) => isEqual(p, c))),
    {
      id: this.id,
      title: '',
      tags: [],
      createDate: 0,
    }
  );

  setMeta(meta: Partial<DocMeta>): void {
    this.workspaceService.workspace.docCollection.setDocMeta(this.id, meta);
  }

  mode$: LiveData<DocMode> = LiveData.from(
    this.localState.watch<DocMode>(`page:${this.id}:mode`),
    'page'
  ).map(mode => (mode === 'edgeless' ? 'edgeless' : 'page'));

  setMode(mode: DocMode) {
    this.localState.set(`page:${this.id}:mode`, mode);
  }

  toggleMode() {
    this.setMode(this.mode$.value === 'edgeless' ? 'page' : 'edgeless');
    return this.mode$.value;
  }

  title$ = this.meta$.map(meta => meta.title ?? '');
}
