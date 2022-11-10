import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { BaseEntityGraphqlQueries, EntitiesServiceWatchOptions, EntityUtils, IEntitiesService, isNil, isNotNil, LoadResult, StartableService } from '@sumaris-net/ngx-components';
import { ImageAttachment, ImageAttachmentFilter } from '@app/image/image.model';
import { SortDirection } from '@angular/material/sort';
import { map } from 'rxjs/operators';
import { BehaviorSubject, Observable } from 'rxjs';

const queries: BaseEntityGraphqlQueries = {
  loadAll: null,
}

@Injectable({providedIn: 'root'})
export class ImageAttachmentService extends StartableService
  implements IEntitiesService<ImageAttachment, ImageAttachmentFilter> {

  dataSubject = new BehaviorSubject<Partial<ImageAttachment>[]>([
    {id: 0, url: 'https://test.sumaris.net/assets/img/bg/ray-1.jpg', title: 'ray #1'},
    {id: 1, url: 'https://test.sumaris.net/assets/img/bg/ray-2.jpg', title: 'ray #2'}
  ]);

  constructor(protected platform: Platform
  ) {
    super(platform);
    console.debug('[image-attachment] Create service');
  }

  protected ngOnStart(): Promise<any> {
    return Promise.resolve(undefined);
  }

  watchAll(offset: number, size: number, sortBy?: string, sortDirection?: SortDirection, filter?: ImageAttachmentFilter, opts?: EntitiesServiceWatchOptions & { query?: any }): Observable<LoadResult<ImageAttachment>> {
    console.debug('[image-attachment] Watching images...');
    return this.dataSubject
      .pipe(
        map(images => {
          let data = (images || []).map(ImageAttachment.fromObject);

          data = EntityUtils.sort(data, sortBy, sortDirection);

          console.debug(`[image-attachment] Loaded ${data.length} images...`);

          return {data, total: data.length};
        })
      );
  }

  async saveAll(entities: ImageAttachment[], opts?: any): Promise<any[]> {
    console.debug('[image-attachment] Saving images...' + JSON.stringify(entities));
    if (!entities) return [];

    let currentId = this.dataSubject.value.reduce((res, image) => Math.max(res, +image?.id || 0), 0);
    entities.filter(item => isNil(item.id))
      .forEach(item => {
        item.id = ++currentId;
      });
    this.dataSubject.next([
      ...this.dataSubject.value,
      ...entities
    ]);
  }

  async deleteAll(entities: ImageAttachment[], opts?: any): Promise<any> {
    const deletedIds = (entities||[]).map(item => item.id).filter(isNotNil);
    const filteredData = (this.dataSubject.value).filter(item => !deletedIds.includes(item.id));
    this.dataSubject.next(filteredData);
  }

  asFilter(filter: any) {
    return ImageAttachmentFilter.fromObject(filter);
  }
}
