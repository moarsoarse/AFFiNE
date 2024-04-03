import { isEqual } from 'lodash-es';
import { distinctUntilChanged, map, Observable } from 'rxjs';

import { Entity } from '../../../framework';
import { LiveData } from '../../../livedata';
import type { WorkspaceService } from '../../workspace';
import { DocRecord } from './record';

export class DocRecordList extends Entity {
  constructor(private readonly workspaceService: WorkspaceService) {
    super();
  }

  private readonly recordsPool = new Map<string, DocRecord>();

  public readonly records$ = LiveData.from<DocRecord[]>(
    new Observable<string[]>(subscriber => {
      const emit = () => {
        subscriber.next(
          this.workspaceService.workspace.docCollection.meta.docMetas.map(
            v => v.id
          )
        );
      };

      emit();

      const dispose =
        this.workspaceService.workspace.docCollection.meta.docMetaUpdated.on(
          emit
        ).dispose;
      return () => {
        dispose();
      };
    }).pipe(
      distinctUntilChanged((p, c) => isEqual(p, c)),
      map(ids =>
        ids.map(id => {
          const exists = this.recordsPool.get(id);
          if (exists) {
            return exists;
          }
          const record = this.framework.createEntity(DocRecord, { id });
          this.recordsPool.set(id, record);
          return record;
        })
      )
    ),
    []
  );

  public readonly isReady$ =
    this.workspaceService.workspace.engine.rootDocState$.map(
      state => !state.syncing
    );

  public record$(id: string) {
    return this.records$.map(record => record.find(record => record.id === id));
  }
}
