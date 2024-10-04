import { SortDirection } from '@angular/material/sort';

import {
  BaseEntityServiceOptions,
  EntitiesServiceLoadOptions,
  EntitiesStorage,
  EntityServiceLoadOptions,
  EntityStorageLoadOptions,
  IReferentialRef,
  LoadResult,
  NetworkService,
} from '@sumaris-net/ngx-components';
import { Directive, inject, Injector } from '@angular/core';
import { IReferentialFilter } from './filter/referential.filter';
import { BaseReferentialService } from '@app/referential/services/base-referential-service.class';

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class BaseReferentialRefService<
  T extends IReferentialRef<T, ID>,
  F extends IReferentialFilter<F, any, ID>,
  ID = number,
> extends BaseReferentialService<T, F, ID> {
  protected readonly network = inject(NetworkService);
  protected readonly entities = inject(EntitiesStorage);

  protected constructor(
    injector: Injector,
    protected dataType: new () => T,
    protected filterType: new () => F,
    options: BaseEntityServiceOptions<T, ID>
  ) {
    super(injector, dataType, filterType, options);
  }

  async loadAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: Partial<F>,
    opts?: EntitiesServiceLoadOptions
  ): Promise<LoadResult<T>> {
    const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
    if (offline) {
      return this.loadAllLocally(offset, size, sortBy, sortDirection, filter, opts);
    }

    return super.loadAll(offset, size, sortBy, sortDirection, filter, opts);
  }

  load(id: ID, opts?: EntityServiceLoadOptions): Promise<T> {
    const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
    if (offline) {
      return this.loadLocally(id, opts);
    }

    return super.load(id, opts);
  }

  /* -- protected function -- */

  protected async loadAllLocally(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: Partial<F>,
    opts?: EntitiesServiceLoadOptions & EntityStorageLoadOptions
  ): Promise<LoadResult<T>> {
    filter = this.asFilter(filter);

    const variables: any = {
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || filter.searchAttribute || 'label',
      sortDirection: sortDirection || 'asc',
      filter: filter && filter.asFilterFn(),
    };

    const { data, total } = await this.entities.loadAll(this._typename, variables, opts);

    const entities = !opts || opts.toEntity !== false ? (data || []).map((json) => this.fromObject(json)) : ((data || []) as unknown as T[]);

    const res: LoadResult<T> = { data: entities, total };

    // Add fetch more function
    const nextOffset = (offset || 0) + entities.length;
    if (nextOffset < total) {
      res.fetchMore = () => this.loadAllLocally(nextOffset, size, sortBy, sortDirection, filter, opts);
    }

    return res;
  }

  protected async loadLocally(id: ID, opts?: EntitiesServiceLoadOptions & EntityStorageLoadOptions): Promise<T> {
    const json = await this.entities.load(id as number, this._typename, opts);
    return !opts || opts.toEntity !== false ? this.fromObject(json) : (json as unknown as T);
  }
}
