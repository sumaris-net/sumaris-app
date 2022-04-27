import {
  EntityAsObjectOptions,
  EntityClass,
  EntityFilter,
  EntityUtils,
  FilterFn,
  getPropertyByPath,
  IReferentialRef,
  isNil,
  isNotEmptyArray,
  isNotNil,
  Referential,
  ReferentialRef,
  StatusIds,
  toDateISOString,
  uncapitalizeFirstLetter
} from '@sumaris-net/ngx-components';


export declare interface IReferentialFilter<
  F extends EntityFilter<F, T, ID, AO, FO>,
  T extends IReferentialRef<T, any>,
  ID = number,
  AO extends EntityAsObjectOptions = EntityAsObjectOptions,
  FO = any
  >
  extends EntityFilter<F, T, ID, AO, FO> {
  entityName?: string;

  label?: string;
  name?: string;

  statusId?: number;
  statusIds?: number[];

  levelId?: number;
  levelIds?: number[];

  levelLabel?: string;
  levelLabels?: string[];

  searchJoin?: string; // If search is on a sub entity (e.g. Metier can search on TaxonGroup)
  searchJoinLevelIds?: number[];
  searchText?: string;
  searchAttribute?: string;

  includedIds?: ID[];
  excludedIds?: ID[];
}

export abstract class BaseReferentialFilter<
  F extends EntityFilter<F, T, ID, AO, FO>,
  T extends IReferentialRef<T, any>,
  ID = number,
  AO extends EntityAsObjectOptions = EntityAsObjectOptions,
  FO = any>
  extends EntityFilter<F, T, ID, AO, FO>
  implements IReferentialFilter<F, T, ID, AO, FO> {

  entityName?: string;

  label?: string;
  name?: string;

  statusId?: number;
  statusIds?: number[];

  levelId?: number;
  levelIds?: number[];

  levelLabel?: string;
  levelLabels?: string[];

  searchJoin?: string; // If search is on a sub entity (e.g. Metier can search on TaxonGroup)
  searchJoinLevelIds?: number[];
  searchText?: string;
  searchAttribute?: string;

  includedIds?: ID[];
  excludedIds?: ID[];

  constructor(__typename?: string) {
    super(__typename);
  }

  fromObject(source: any, opts?: FO) {
    super.fromObject(source, opts);
    this.entityName = source.entityName || this.entityName;
    this.label = source.label;
    this.name = source.name;
    this.statusId = source.statusId;
    this.statusIds = source.statusIds;
    this.levelId = source.levelId;
    this.levelIds = source.levelIds;
    this.levelLabel = source.levelLabel;
    this.levelLabels = source.levelLabels;
    this.searchJoin = source.searchJoin;
    this.searchJoinLevelIds = source.searchJoinLevelIds;
    this.searchText = source.searchText;
    this.searchAttribute = source.searchAttribute;
    this.includedIds = source.includedIds;
    this.excludedIds = source.excludedIds;
  }

  asObject(opts?: AO): any {
    const target = super.asObject(opts);
    target.updateDate = toDateISOString(this.updateDate);
    target.levelIds = isNotNil(this.levelId) ? [this.levelId] : this.levelIds;
    target.levelLabels = isNotNil(this.levelLabel) ? [this.levelLabel] : this.levelLabels;
    target.statusIds = isNotNil(this.statusId) ? [this.statusId] : (this.statusIds || [StatusIds.ENABLE]);
    if (opts && opts.minify) {
      // do NOT include entityName
      delete target.entityName;
      delete target.levelId;
      delete target.levelLabel;
      delete target.statusId;
    }
    return target;
  }

  countNotEmptyCriteria(): number {
    const nbDefaults = isNil(this.statusId) && isNil(this.statusIds) ? 1 : 0;
    return super.countNotEmptyCriteria() - nbDefaults;
  }

  protected buildFilter(): FilterFn<T>[] {
    const filterFns = super.buildFilter() || [];

    // Filter by status
    const statusIds = this.statusIds || (isNotNil(this.statusId) && [this.statusId]) || undefined;
    if (statusIds) {
      filterFns.push((entity) => statusIds.includes(entity.statusId));
    }

    // Filter on levels
    const levelIds = this.levelIds || (isNotNil(this.levelId) && [this.levelId]) || undefined;
    if (levelIds) {
      filterFns.push((entity) => levelIds.includes(entity.levelId));
    }

    // Filter included/excluded ids
    if (isNotEmptyArray(this.includedIds)) {
      filterFns.push((entity) => isNotNil(entity.id) && this.includedIds.includes(entity.id));
    }
    if (isNotEmptyArray(this.excludedIds)) {
      filterFns.push((entity) => isNil(entity.id) || !this.excludedIds.includes(entity.id));
    }

    const searchTextFilter = EntityUtils.searchTextFilter(this.searchAttribute, this.searchText);
    if (searchTextFilter) filterFns.push(searchTextFilter);

    if (this.searchJoin && isNotEmptyArray(this.searchJoinLevelIds)) {
      const searchJoinLevelPath = uncapitalizeFirstLetter(this.searchJoin) + '.levelId';
      filterFns.push((entity) => {
        const levelId = getPropertyByPath(entity, searchJoinLevelPath);
        if (isNil(levelId)) {
          console.warn('[referential-filter] Unable to filter entities, because missing the attribute: ' + searchJoinLevelPath);
          return true; // Keep the item, when missing levelId
        }
        return this.searchJoinLevelIds.includes(levelId);
      });
    }

    return filterFns;
  }
}

@EntityClass({typename: 'ReferentialFilterVO'})
export class ReferentialFilter
  extends BaseReferentialFilter<ReferentialFilter, Referential> {

  static TYPENAME = 'ReferentialVO';
  static fromObject: (source: any, opts?: any) => ReferentialFilter;

  level?: ReferentialRef;

  constructor() {
    super(ReferentialFilter.TYPENAME);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);

    target.levelIds = target.levelIds || this.level && isNotNil(this.level.id) && [this.level.id] || undefined;
    if (opts && opts.minify) {
      delete target.level;
    }
    return target;
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.level = source.level && ReferentialRef.fromObject(source.level);
  }
}
