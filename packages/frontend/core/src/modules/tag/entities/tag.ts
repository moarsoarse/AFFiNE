import type { Tag as TagSchema } from '@affine/env/filter';
import type { DocsService } from '@toeverything/infra';
import { Entity, LiveData } from '@toeverything/infra';

import type { WorkspaceLegacyProperties } from '../../properties';
import { tagColorMap } from './utils';

export class Tag extends Entity<{ id: string }> {
  id = this.props.id;
  constructor(
    private readonly properties: WorkspaceLegacyProperties,
    private readonly docs: DocsService
  ) {
    super();
  }

  private readonly tagOption$ = this.properties.tagOptions$.map(
    tags => tags.find(tag => tag.id === this.id) as TagSchema
  );

  value$ = this.tagOption$.map(tag => tag?.value || '');

  color$ = this.tagOption$.map(tag => tagColorMap(tag?.color) || '');

  createDate$ = this.tagOption$.map(tag => tag?.createDate || Date.now());

  updateDate$ = this.tagOption$.map(tag => tag?.updateDate || Date.now());

  rename(value: string) {
    this.properties.updateTagOption(this.id, {
      id: this.id,
      value,
      color: this.color$.value,
      createDate: this.createDate$.value,
      updateDate: Date.now(),
    });
  }

  changeColor(color: string) {
    this.properties.updateTagOption(this.id, {
      id: this.id,
      value: this.value$.value,
      color,
      createDate: this.createDate$.value,
      updateDate: Date.now(),
    });
  }

  tag(pageId: string) {
    const pageRecord = this.docs.docRecordList.record$(pageId).value;
    if (!pageRecord) {
      return;
    }
    pageRecord?.setMeta({
      tags: [...(pageRecord.meta$.value.tags ?? []), this.id],
    });
  }

  untag(pageId: string) {
    const pageRecord = this.docs.docRecordList.record$(pageId).value;
    if (!pageRecord) {
      return;
    }
    pageRecord?.setMeta({
      tags: pageRecord.meta$.value.tags?.filter(tagId => tagId !== this.id),
    });
  }

  readonly pageIds$ = LiveData.computed(get => {
    const pages = get(this.docs.docRecordList.records$);
    return pages
      .filter(page => get(page.meta$).tags?.includes(this.id))
      .map(page => page.id);
  });
}
