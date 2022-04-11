import { FetchPolicy } from '@apollo/client/core';
import { SortDirection } from '@angular/material/sort';

import { BaseEntityServiceOptions, EntitiesStorage, IReferentialRef, LoadResult, NetworkService } from '@sumaris-net/ngx-components';
import { Directive, Injector } from '@angular/core';
import { IReferentialFilter } from './filter/referential.filter';
import { BaseReferentialService } from '@app/referential/services/base-referential-service.class';

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class BaseReferentialRefService<
  T extends IReferentialRef<T, ID>,
  F extends IReferentialFilter<F, any, ID>,
  ID = number
  >
  extends BaseReferentialService<T, F, ID> {

  protected readonly network: NetworkService;
  protected readonly entities: EntitiesStorage;

  protected constructor(
    injector: Injector,
    protected dataType: new() => T,
    protected filterType: new() => F,
    options: BaseEntityServiceOptions<T, ID>
  ) {
    super(injector, dataType, filterType, options);
    this.network = injector.get(NetworkService);
    this.entities = injector.get(EntitiesStorage);
  }

  async loadAll(offset: number,
                size: number,
                sortBy?: string,
                sortDirection?: SortDirection,
                filter?: Partial<F>,
                opts?: {
                  [key: string]: any;
                  fetchPolicy?: FetchPolicy;
                  debug?: boolean;
                  toEntity?: boolean;
                  withTotal?: boolean;
                }): Promise<LoadResult<T>> {

    const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
    if (offline) {
      return this.loadAllLocally(offset, size, sortBy, sortDirection, filter, opts);
    }

    return super.loadAll(offset, size, sortBy, sortDirection, filter, opts);
  }


  protected async loadAllLocally(offset: number,
                                 size: number,
                                 sortBy?: string,
                                 sortDirection?: SortDirection,
                                 filter?: Partial<F>,
                                 opts?: {
                                   [key: string]: any;
                                   toEntity?: boolean;
                                 }): Promise<LoadResult<T>> {

    filter = this.asFilter(filter);

    const variables: any = {
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || filter.searchAttribute || 'label',
      sortDirection: sortDirection || 'asc',
      filter: filter && filter.asFilterFn()
    };

    const {data, total} = await this.entities.loadAll(this._typename, variables);

    const entities = (!opts || opts.toEntity !== false) ?
      (data || []).map(json => this.fromObject(json)) :
      (data || []) as unknown as T[];

    const res: LoadResult<T> = {data: entities, total};

    // Add fetch more function
    const nextOffset = (offset || 0) + entities.length;
    if (nextOffset < total) {
      res.fetchMore = () => this.loadAllLocally(nextOffset, size, sortBy, sortDirection, filter, opts);
    }

    return res;
  }
}
