import { Observable } from 'rxjs';

import { FetchPolicy } from '@apollo/client/core';
import { SortDirection } from '@angular/material/sort';

import {
  BaseEntityService,
  BaseEntityServiceOptions,
  EntityServiceLoadOptions,
  EntityServiceWatchOptions,
  GraphqlService,
  IEntityService,
  IReferentialRef,
  isNotNil,
  LoadResult,
  PlatformService,
  ReferentialUtils,
  SuggestService,
} from '@sumaris-net/ngx-components';
import { Directive, Injector } from '@angular/core';
import { IReferentialFilter } from './filter/referential.filter';

export const TEXT_SEARCH_IGNORE_CHARS_REGEXP = /[ \t-*]+/g;

export interface IReferentialEntityService<
  T extends IReferentialRef<T, ID>,
  F extends IReferentialFilter<F, T, ID>,
  ID = number,
  LO extends EntityServiceLoadOptions = EntityServiceLoadOptions
> extends IEntityService<T, ID, LO> {

  /**
   * Check if a label already exists in database
   *
   * @param label
   * @param filter
   * @param opts
   */
  existsByLabel(label: string, filter?: Partial<F>, opts?: LO & {
    fetchPolicy?: FetchPolicy;
  }): Promise<boolean>;

}

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class BaseReferentialService<
  T extends IReferentialRef<T, ID>,
  F extends IReferentialFilter<F, T, ID>,
  ID = number,
  WO extends EntityServiceWatchOptions = EntityServiceWatchOptions,
  LO extends EntityServiceLoadOptions = EntityServiceLoadOptions
  >
  extends BaseEntityService<T, F, ID, WO, LO>
  implements SuggestService<T, F>,
    IReferentialEntityService<T, F, ID, LO> {


  protected constructor(
    injector: Injector,
    protected dataType: new() => T,
    protected filterType: new() => F,
    options: BaseEntityServiceOptions<T, ID>
  ) {
    super(
      injector.get(GraphqlService),
      injector.get(PlatformService),
      dataType,
      filterType,
      {
        ...options
      });
  }

  watchAll(offset: number, size: number, sortBy?: string, sortDirection?: SortDirection, filter?: F, opts?: WO): Observable<LoadResult<T>> {
    // Use search attribute as default sort, is set
    sortBy = sortBy || filter && filter.searchAttribute;
    // Call inherited function
    return super.watchAll(offset, size, sortBy, sortDirection, filter, opts);
  }

  async loadAll(offset: number, size: number,
                sortBy?: string | keyof T,
                sortDirection?: SortDirection,
                filter?: Partial<F>,
                opts?: LO & { debug?: boolean }): Promise<LoadResult<T>> {
    // Use search attribute as default sort, is set
    sortBy = sortBy || filter?.searchAttribute;

    // Call inherited function
    return super.loadAll(offset, size, sortBy as string, sortDirection, filter, opts);
  }

  async load(id: ID, opts?: LO): Promise<T> {
    const query = opts && opts.query || this.queries.load;
    if (!query) {
      if (!this.queries.loadAll) throw new Error('Not implemented');
      const data = await this.loadAll(0, 1, null, null, { id } as unknown as F, opts);
      return data && data[0];
    }
    return super.load(id, opts);
  }

  async suggest(value: any, filter?: Partial<F>,
                sortBy?: string | keyof T,
                sortDirection?: SortDirection,
                opts?: {
                  fetchPolicy?: FetchPolicy;
                  [key: string]: any;
                }): Promise<LoadResult<T>> {
    if (ReferentialUtils.isNotEmpty(value)) return {data: [value]};
    value = (typeof value === 'string' && value !== '*') && value || undefined;
    // Replace '*' character by undefined
    if (!value || value === '*') {
      value = undefined;
    }
    // trim search text, and ignore some characters
    else if (value && typeof value === 'string') {
      value = value.trim().replace(TEXT_SEARCH_IGNORE_CHARS_REGEXP, '*');
    }

    return this.loadAll(0, !value ? 30 : 10, sortBy, sortDirection,
      {
        ...filter,
        searchText: value as string
      },
      {withTotal: true /* Used by autocomplete */, ...opts} as unknown as LO
    );
  }

  equals(e1: T, e2: T): boolean {
    return e1 && e2 && ((isNotNil(e1.id) && e1.id === e2.id) || (e1.label && e1.label === e2.label));
  }

  async existsByLabel(label: string, filter?: Partial<F>, opts?: LO & { fetchPolicy?: FetchPolicy }): Promise<boolean> {
    const count = await this.countAll(filter, opts as LO);
    return count > 0;
  }

  /* -- protected functions -- */

}
