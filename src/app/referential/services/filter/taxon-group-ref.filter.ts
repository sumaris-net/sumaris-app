import { BaseReferentialFilter } from './referential.filter';
import { EntityAsObjectOptions, EntityClass, FilterFn, isNotEmptyArray } from '@sumaris-net/ngx-components';
import { StoreObject } from '@apollo/client/core';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';

@EntityClass({ typename: 'TaxonGroupFilterVO' })
export class TaxonGroupRefFilter extends BaseReferentialFilter<TaxonGroupRefFilter, TaxonGroupRef> {
  static fromObject: (source: any, opts?: any) => TaxonGroupRefFilter;

  includedPriorities?: number[];
  excludedPriorities?: number[];

  constructor() {
    super();
    this.entityName = TaxonGroupRef.ENTITY_NAME;
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source);
    this.includedPriorities = source.includedPriorities;
    this.excludedPriorities = source.excludedPriorities;
  }

  asObject(opts?: EntityAsObjectOptions): StoreObject {
    const target = super.asObject(opts);
    if (opts && opts.minify) {
      delete target.includedPriorities;
      delete target.excludedPriorities;
    } else {
      target.includedPriorities = this.includedPriorities;
      target.excludedPriorities = this.excludedPriorities;
    }
    return target;
  }

  asFilterFn<E extends TaxonGroupRef>(): FilterFn<E> {
    const filterFns: FilterFn<E>[] = [];

    const inheritedFn = super.asFilterFn();
    if (inheritedFn) filterFns.push(inheritedFn);

    // Filter by included priorities
    if (isNotEmptyArray(this.includedPriorities)) {
      const includedPriorities = this.includedPriorities;
      filterFns.push((entity) => includedPriorities.includes(entity.priority));
    }
    // Filter by excluded priorities
    if (isNotEmptyArray(this.excludedPriorities)) {
      const excludedPriorities = this.excludedPriorities;
      filterFns.push((entity) => !excludedPriorities.includes(entity.priority));
    }

    if (!filterFns.length) return undefined;

    return (entity) => !filterFns.find((fn) => !fn(entity));
  }
}
