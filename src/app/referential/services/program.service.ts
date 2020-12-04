import {Injectable} from "@angular/core";
import gql from "graphql-tag";
import {BehaviorSubject, defer, Observable, of} from "rxjs";
import {filter, map} from "rxjs/operators";
import {AcquisitionLevelCodes} from "./model/model.enum";
import {
  BaseEntityService,
  EntityUtils,
  environment,
  IReferentialRef, isNil,
  isNotNil,
  LoadResult,
  ReferentialRef,
  EntitiesService
} from "../../core/core.module";
import {ErrorCodes} from "./errors";
import {ReferentialFragments} from "./referential.fragments";
import {StrategyFragments} from "./strategy.service";
import {GraphqlService} from "../../core/services/graphql.service";
import {
  EntityService,
  EntityServiceLoadOptions,
  fetchAllPagesWithProgress, FilterFn
} from "../../shared/services/entity-service.class";
import {TaxonGroupIds, TaxonGroupRef, TaxonNameRef} from "./model/taxon.model";
import {isNilOrBlank, isNotEmptyArray, propertiesPathComparator, suggestFromArray} from "../../shared/functions";
import {CacheService} from "ionic-cache";
import {ReferentialRefFilter, ReferentialRefService} from "./referential-ref.service";
import {firstNotNilPromise} from "../../shared/observables";
import {AccountService} from "../../core/services/account.service";
import {NetworkService} from "../../core/services/network.service";
import {FetchPolicy, WatchQueryFetchPolicy} from "apollo-client";
import {EntitiesStorage} from "../../core/services/entities-storage.service";
import {
  NOT_MINIFY_OPTIONS,
  ReferentialAsObjectOptions,
  ReferentialUtils,
  SAVE_AS_OBJECT_OPTIONS
} from "../../core/services/model/referential.model";
import {StatusIds} from "../../core/services/model/model.enum";
import {Program} from "./model/program.model";

import {PmfmStrategy} from "./model/pmfm-strategy.model";
import {IWithProgramEntity} from "../../data/services/model/model.utils";
import {SortDirection} from "@angular/material/sort";


export class ProgramFilter {
  searchText?: string;
  searchAttribute?: string;
  statusIds?: number[];

  static searchFilter<T extends Program | IReferentialRef>(f: ProgramFilter): FilterFn<T>{
    const filterFns: FilterFn<T>[] = [];

    // Filter by status
    if (f.statusIds) {
      //filterFns.push((entity) => !!f.statusIds.find(v => entity.statusId === v));
    }

    if (f.searchText) {
      const searchTextFilter = EntityUtils.searchTextFilter<T>(f.searchAttribute || ['label', 'name'], f.searchText);
      if (searchTextFilter) filterFns.push(searchTextFilter);
    }

    if (!filterFns.length) return undefined;

    return (entity) => !filterFns.find(fn => !fn(entity));
  }
}

export interface ProgramServiceLoadOption extends EntityServiceLoadOptions {
  withStrategy?: boolean;
  toEntity?: boolean;
}

export interface ProgramServiceSaveOption {
  withStrategy?: boolean;
  enableOptimisticResponse?: boolean; // True by default
}

export const ProgramFragments = {
  lightProgram: gql`
    fragment LightProgramFragment on ProgramVO {
      id
      label
      name
      description
      comments
      updateDate
      creationDate
      statusId
      properties
    }
    `,
  programRef: gql`
    fragment ProgramRefFragment on ProgramVO {
      id
      label
      name
      description
      comments
      updateDate
      creationDate
      statusId
      properties
      strategies {
        ...StrategyRefFragment
      }
    }`,
  program: gql`
    fragment ProgramFragment on ProgramVO {
      id
      label
      name
      description
      comments
      updateDate
      creationDate
      statusId
      properties
      taxonGroupType {
        ...ReferentialFragment
      }
      gearClassification {
        ...ReferentialFragment
      }
      locationClassifications {
        ...ReferentialFragment
      }
      locations {
        ...ReferentialFragment
      }
      strategies {
        ...StrategyFragment
      }
    }
    `,


  pmfmStrategyRef: gql`
    fragment PmfmStrategyRefFragment on PmfmStrategyVO {
      id
      pmfmId
      parameterId
      matrixId
      fractionId
      methodId
      label
      name
      unitLabel
      type
      minValue
      maxValue
      maximumNumberDecimals
      defaultValue
      acquisitionNumber
      isMandatory
      rankOrder
      acquisitionLevel
      gearIds
      taxonGroupIds
      referenceTaxonIds
      qualitativeValues {
        id
        label
        name
        statusId
        entityName
        __typename
      }
      __typename
  }`,
  pmfmStrategy: gql`
    fragment PmfmStrategyFragment on PmfmStrategyVO {
      id
      acquisitionLevel
      rankOrder
      isMandatory
      acquisitionNumber
      defaultValue
      pmfmId
      pmfm {
        ...PmfmFragment
      }
      parameterId
      matrixId
      fractionId
      methodId
      gearIds
      taxonGroupIds
      referenceTaxonIds
      strategyId
      __typename
  }`,
  taxonGroupStrategy: gql`
    fragment TaxonGroupStrategyFragment on TaxonGroupStrategyVO {
      strategyId
      priorityLevel
      taxonGroup {
          id
          label
          name
          entityName
          taxonNames {
              ...TaxonNameFragment
          }
      }
      __typename
    }
  `,
  taxonNameStrategy: gql`
    fragment TaxonNameStrategyFragment on TaxonNameStrategyVO {
      strategyId
      priorityLevel
      taxonName {
          ...TaxonNameFragment
      }
      __typename
    }
  `
};
const LoadRefQuery: any = gql`
  query ProgramRef($id: Int, $label: String){
      program(id: $id, label: $label){
        ...ProgramRefFragment
      }
  }
  ${ProgramFragments.programRef}
  ${StrategyFragments.strategyRef}
  ${StrategyFragments.appliedStrategy}
  ${StrategyFragments.appliedPeriod}
  ${ProgramFragments.pmfmStrategyRef}
  ${StrategyFragments.strategyDepartment}
  ${ProgramFragments.taxonGroupStrategy}
  ${ProgramFragments.taxonNameStrategy}
  ${ReferentialFragments.referential}
  ${ReferentialFragments.taxonName}
`;

const LoadQuery: any = gql`
  query Program($id: Int, $label: String){
      program(id: $id, label: $label){
        ...ProgramFragment
      }
  }
  ${ProgramFragments.program}
  ${StrategyFragments.strategy}
  ${StrategyFragments.appliedStrategy}
  ${StrategyFragments.appliedPeriod}
  ${ProgramFragments.pmfmStrategy}
  ${StrategyFragments.strategyDepartment}
  ${ProgramFragments.taxonGroupStrategy}
  ${ProgramFragments.taxonNameStrategy}
  ${ReferentialFragments.referential}
  ${ReferentialFragments.pmfm}
  ${ReferentialFragments.taxonName}
`;

const LoadAllQuery: any = gql`
  query Programs($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ProgramFilterVOInput){
    programs(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...LightProgramFragment
    }
  }
  ${ProgramFragments.lightProgram}
`;

const LoadAllWithTotalQuery: any = gql`
  query ProgramsWithTotal($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ProgramFilterVOInput){
    programs(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...LightProgramFragment
    }
    referentialsCount(entityName: "Program")
  }
  ${ProgramFragments.lightProgram}
`;


const LoadAllRefWithTotalQuery: any = gql`
  query Programs($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ProgramFilterVOInput){
    programs(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...ProgramRefFragment
    }
    referentialsCount(entityName: "Program")
  }
  ${ProgramFragments.programRef}
  ${StrategyFragments.strategyRef}
  ${StrategyFragments.appliedStrategy}
  ${StrategyFragments.appliedPeriod}
  ${ProgramFragments.pmfmStrategyRef}
  ${StrategyFragments.strategyDepartment}
  ${ProgramFragments.taxonGroupStrategy}
  ${ProgramFragments.taxonNameStrategy}
  ${ReferentialFragments.referential}
  ${ReferentialFragments.taxonName}
`;

const SaveQuery: any = gql`
  mutation SaveProgram($program:ProgramVOInput){
    saveProgram(program: $program){
      ...ProgramFragment
    }
  }
  ${ProgramFragments.program}
  ${StrategyFragments.strategy}
  ${StrategyFragments.appliedStrategy}
  ${StrategyFragments.appliedPeriod}
  ${ProgramFragments.pmfmStrategy}
  ${StrategyFragments.strategyDepartment}
  ${ProgramFragments.taxonGroupStrategy}
  ${ProgramFragments.taxonNameStrategy}
  ${ReferentialFragments.referential}
  ${ReferentialFragments.pmfm}
  ${ReferentialFragments.taxonName}
`;

const ProgramCacheKeys = {
  CACHE_GROUP: 'program',

  PROGRAM_BY_LABEL: 'programByLabel',
  PMFMS: 'programPmfms',
  GEARS: 'programGears',
  TAXON_GROUPS: 'programTaxonGroups',
  TAXON_GROUP_ENTITIES: 'programTaxonGroupEntities',
  TAXON_NAME_BY_GROUP: 'programTaxonNameByGroup',
  TAXON_NAMES: 'taxonNameByGroup'
};

@Injectable({providedIn: 'root'})
export class ProgramService extends BaseEntityService
  implements EntitiesService<Program, ProgramFilter>,
    EntityService<Program, ProgramServiceLoadOption> {


  constructor(
    protected graphql: GraphqlService,
    protected network: NetworkService,
    protected accountService: AccountService,
    protected referentialRefService: ReferentialRefService,
    protected cache: CacheService,
    protected entities: EntitiesStorage
  ) {
    super(graphql);
    if (this._debug) console.debug('[program-service] Creating service');
  }

  /**
   * Load programs
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param dataFilter
   */
  watchAll(offset: number,
           size: number,
           sortBy?: string,
           sortDirection?: SortDirection,
           dataFilter?: ProgramFilter,
           opts?: {
             fetchPolicy?: WatchQueryFetchPolicy;
             withTotal?: boolean;
           }): Observable<LoadResult<Program>> {

    const variables: any = {
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || 'label',
      sortDirection: sortDirection || 'asc',
      filter: dataFilter
    };
    const now = Date.now();
    if (this._debug) console.debug("[program-service] Watching programs using options:", variables);

    const query = (!opts || opts.withTotal !== false) ? LoadAllWithTotalQuery : LoadAllQuery;
    return this.graphql.watchQuery<{ programs: any[], referentialsCount?: number }>({
      query,
      variables,
      error: {code: ErrorCodes.LOAD_PROGRAMS_ERROR, message: "PROGRAM.ERROR.LOAD_PROGRAMS_ERROR"},
      fetchPolicy: opts && opts.fetchPolicy || undefined
    })
      .pipe(
        map(res => {
            const data = (res && res.programs || []).map(Program.fromObject);
            if (this._debug) console.debug(`[program-service] Programs loaded in ${Date.now() - now}ms`, data);
            return {
              data: data,
              total: res.referentialsCount
            };
          }
        )
      );
  }

  /**
   * Load programs
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param dataFilter
   */
  async loadAll(offset: number,
           size: number,
           sortBy?: string,
           sortDirection?: SortDirection,
           dataFilter?: ProgramFilter,
           opts?: {
             query?: any,
             fetchPolicy: FetchPolicy;
             withTotal?: boolean;
             toEntity?: boolean;
             debug?: boolean;
           }): Promise<LoadResult<Program>> {

    const variables: any = {
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || 'label',
      sortDirection: sortDirection || 'asc',
      filter: dataFilter
    };
    const debug = this._debug && (!opts || opts.debug !== false);
    const now = debug && Date.now();
    if (debug) console.debug("[program-service] Loading programs... using options:", variables);

    let loadResult: { programs: any[], referentialsCount?: number };

    // Offline mode
    const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
    if (offline) {
      loadResult = await this.entities.loadAll('ProgramVO',
        {
          ...variables,
          filter: EntityUtils.searchTextFilter('label', dataFilter.searchText)
        }
      ).then(res => {
        return {
          programs: res && res.data,
          referentialsCount: res && res.total
        };
      });
    }

    // Online mode
    else {
      const query = opts && opts.query || opts && opts.withTotal && LoadAllWithTotalQuery || LoadAllQuery;
      loadResult = await this.graphql.query<{ programs: any[], referentialsCount?: number }>({
        query,
        variables,
        error: {code: ErrorCodes.LOAD_PROGRAMS_ERROR, message: "PROGRAM.ERROR.LOAD_PROGRAMS_ERROR"},
        fetchPolicy: opts && opts.fetchPolicy || undefined
      });
    }

    const data = (!opts || opts.toEntity !== false) ?
      (loadResult && loadResult.programs || []).map(Program.fromObject) :
      (loadResult && loadResult.programs || []) as Program[];
    if (debug) console.debug(`[program-service] Programs loaded in ${Date.now() - now}ms`);
    return {
      data: data,
      total: loadResult.referentialsCount
    };

  }

  async saveAll(entities: Program[], options?: any): Promise<Program[]> {
    if (!entities) return entities;
    return await Promise.all(entities.map((program) => this.save(program, options)));
  }

  deleteAll(data: Program[], options?: any): Promise<any> {
    throw new Error("Not implemented yet");
  }

  /**
   * Watch program by label
   * @param label
   * @param toEntity
   */
  watchByLabel(label: string, opts?: {
    toEntity?: boolean;
    debug?: boolean;
    query?: any
  }): Observable<Program> {

    let now;
    const cacheKey = [ProgramCacheKeys.PROGRAM_BY_LABEL, label].join('|');
    return this.cache.loadFromObservable(cacheKey,
      defer(() => {
        const debug = this._debug && (!opts || opts !== false);
        now = debug && Date.now();
        if (now) console.debug(`[program-service] Loading program {${label}}...`);
        let $loadResult: Observable<{ program: any }>;

        if (this.network.offline) {
          $loadResult = this.entities.watchAll<Program>('ProgramVO', {
            filter: (p) => p.label ===  label
          })
          .pipe(
            map(res => {
              return {program: res && res.data && res.data.length && res.data[0] || undefined};
            }));
        }
        else {
          const query = opts && opts.query || LoadRefQuery;
          $loadResult = this.graphql.watchQuery<{ program: any }>({
            query: query,
            variables: {
              label
            },
            error: {code: ErrorCodes.LOAD_PROGRAM_ERROR, message: "PROGRAM.ERROR.LOAD_PROGRAM_ERROR"}
          });
        }
        return $loadResult.pipe(filter(isNotNil));
      }),
      ProgramCacheKeys.CACHE_GROUP
    )
      .pipe(
        map(({program}) => {
          if (now) {
            console.debug(`[program-service] Loading program {${label}} [OK] in ${Date.now() - now}ms`);
            now = undefined;
          }
          return (!opts || opts.toEntity !== false) ? Program.fromObject(program) : program;
        })
      );
  }

  async existsByLabel(label: string): Promise<Boolean> {
    if (isNilOrBlank(label)) return false;

    const program = await this.loadByLabel(label, {toEntity: false});
    return ReferentialUtils.isNotEmpty(program);
  }

  async loadByLabel(label: string, opts?: {
    toEntity?: boolean;
  }): Promise<Program> {

    if (this._debug) console.debug(`[program-service] Loading program {${label}}...`);
    const cacheKey = [ProgramCacheKeys.PROGRAM_BY_LABEL, label].join('|');

    const res = await this.cache.getOrSetItem<{ program: any }>(cacheKey,
      () => this.graphql.query<{ program: any }>({
          query: LoadRefQuery,
          variables: {
            label: label
          },
          error: {code: ErrorCodes.LOAD_PROGRAM_ERROR, message: "PROGRAM.ERROR.LOAD_PROGRAM_ERROR"}
        }), ProgramCacheKeys.CACHE_GROUP);
    const program = res && res.program || undefined;
    if (this._debug) console.debug(`[program-service] Program loaded {${label}}`, program);
    return (!opts || opts.toEntity !== false) ? Program.fromObject(program) : program;
  }

  /**
   * Watch program pmfms
   */
  watchProgramPmfms(programLabel: string, options: {
    acquisitionLevel: string;
    gearId?: number;
    taxonGroupId?: number;
    referenceTaxonId?: number;
  }, debug?: boolean): Observable<PmfmStrategy[]> {

    const cacheKey = [ProgramCacheKeys.PMFMS, programLabel, JSON.stringify(options)].join('|');

    return this.cache.loadFromObservable(cacheKey,
      this.watchByLabel(programLabel, {toEntity: false, debug: false}) // Watch the program
          .pipe(
            map(program => {
                // TODO: select valid strategy (from date and location)
                const strategy = program && program.strategies && program.strategies[0];

                const pmfmIds = []; // used to avoid duplicated pmfms
                const res = (strategy && strategy.pmfmStrategies || [])
                  // Filter on acquisition level and gear
                  .filter(p =>
                    pmfmIds.indexOf(p.pmfmId) === -1
                    && (
                      !options || (
                        (!options.acquisitionLevel || p.acquisitionLevel === options.acquisitionLevel)
                        // Filter on gear (if PMFM has gears = compatible with all gears)
                        && (!options.gearId || !p.gearIds || !p.gearIds.length || p.gearIds.findIndex(id => id === options.gearId) !== -1)
                        // Filter on taxon group
                        && (!options.taxonGroupId || !p.taxonGroupIds || !p.taxonGroupIds.length || p.taxonGroupIds.findIndex(g => g === options.taxonGroupId) !== -1)
                        // Filter on reference taxon
                        && (!options.referenceTaxonId || !p.referenceTaxonIds || !p.referenceTaxonIds.length || p.referenceTaxonIds.findIndex(g => g === options.referenceTaxonId) !== -1)
                        // Add to list of IDs
                        && pmfmIds.push(p.pmfmId)
                      )
                    ))

                  // Sort on rank order
                  .sort((p1, p2) => p1.rankOrder - p2.rankOrder);

                if (debug) console.debug(`[program-service] PMFM for ${options.acquisitionLevel} (filtered):`, res);

                // TODO: translate name/label using translate service ?
                return res;
              }
            )),
      ProgramCacheKeys.CACHE_GROUP
    )
    .pipe(
      map(res => res && res.map(PmfmStrategy.fromObject)),
      filter(isNotNil)
    );
  }

  /**
   * Load program pmfms
   */
  loadProgramPmfms(programLabel: string, options?: {
    acquisitionLevel: string;
    gearId?: number;
    taxonGroupId?: number;
    referenceTaxonId?: number;
  }, debug?: boolean): Promise<PmfmStrategy[]> {

    return firstNotNilPromise(
      this.watchProgramPmfms(programLabel, options, debug)
    );
  }

  /**
   * Watch program gears
   */
  watchGears(programLabel: string): Observable<ReferentialRef[]> {
    const cacheKey = [ProgramCacheKeys.GEARS, programLabel].join('|');
    return this.cache.loadFromObservable(cacheKey,
      this.watchByLabel(programLabel, {toEntity: false}) // Load the program
        .pipe(
          map(program => {
            // TODO: select valid strategy (from date and location)
            const strategy = program && program.strategies && program.strategies[0];
            const gears = (strategy && strategy.gears || []);
            if (this._debug) console.debug(`[program-service] Found ${gears.length} gears on program {${program.label}}`);
            return gears;
          })
        ),
        ProgramCacheKeys.CACHE_GROUP
    )
    // Convert into model (after cache)
    .pipe(map(res => res.map(ReferentialRef.fromObject)));
  }

  /**
   * Load program gears
   */
  loadGears(programLabel: string): Promise<ReferentialRef[]> {
    return firstNotNilPromise(this.watchGears(programLabel));
  }

  /**
   * Watch program taxon groups
   * TODO: add an 'options' argument (with date/time and location), to be able to select the strategy
   */
  watchTaxonGroups(programLabel: string, opts?: { toEntity?: boolean; }): Observable<TaxonGroupRef[]> {
    const cacheKey = [ProgramCacheKeys.TAXON_GROUPS, programLabel].join('|');
    const $res = this.cache.loadFromObservable(cacheKey,
      this.watchByLabel(programLabel, {toEntity: false})
        .pipe(
          map(program => {
            // TODO: select the valid strategy (from date and location)
            // For now: select the first one
            const strategy = program && program.strategies && program.strategies[0];

            const res = (strategy && strategy.taxonGroups || [])

              // Sort taxonGroupStrategies, on priorityLevel
               .sort(propertiesPathComparator(
                 ['priorityLevel', 'taxonGroup.label', 'taxonGroup.name'],
                 // Use default values, because priorityLevel can be null in the DB
                 [1, 'ZZZ', 'ZZZ'])
               )
              .map(v => v.taxonGroup);
            if (this._debug) console.debug(`[program-service] Found ${res.length} taxon groups on program {${program}}`);
            return res;
          })
        ),
        ProgramCacheKeys.CACHE_GROUP
    )

    // Convert into model, after cache (convert by default)
    if (!opts || opts.toEntity !== false) {
      return $res.pipe(map(res => res.map(TaxonGroupRef.fromObject)));
    }
    return $res;
  }

  /**
   * Load program taxon groups
   */
  async loadTaxonGroups(programLabel: string, opts?: { toEntity?: boolean; }): Promise<TaxonGroupRef[]> {
    const mapCacheKey = [ProgramCacheKeys.TAXON_GROUP_ENTITIES, programLabel].join('|');
    const res = await this.cache.getOrSetItem(mapCacheKey,
      () => this.watchTaxonGroups(programLabel, {toEntity: true}).toPromise(),
      ProgramCacheKeys.CACHE_GROUP);

    // Convert to entity, after cache (convert by default)
    if (!opts || opts.toEntity !== false) {
      return res.map(TaxonGroupRef.fromObject);
    }

    return res;
  }

  /**
   * Suggest program taxon groups
   */
  async suggestTaxonGroups(value: any, filter?: Partial<ReferentialRefFilter & { program: string; }>): Promise<IReferentialRef[]> {
    // Search on program's taxon groups
    if (filter && isNotNil(filter.program)) {
      const programItems = await this.loadTaxonGroups(filter.program);
      if (isNotEmptyArray(programItems)) {
        return suggestFromArray(programItems, value, {
          searchAttribute: filter.searchAttribute
        });
      }
    }

    // If nothing found in program, or species defined
    return await this.referentialRefService.suggest(value, {
      ...filter,
      entityName: 'TaxonGroup',
      levelId: TaxonGroupIds.FAO
    });
  }

  /**
   * Load program taxon groups
   */
  async suggestTaxonNames(value: any, options: {
    program?: string;
    levelId?: number;
    levelIds?: number[]
    searchAttribute?: string;
    taxonGroupId?: number;
  }): Promise<TaxonNameRef[]> {

    // Search on taxon group's taxon'
    if (isNotNil(options.program) && isNotNil(options.taxonGroupId)) {

      // Get map from program
      const taxonNamesByTaxonGroupId = await this.loadTaxonNamesByTaxonGroupIdMap(options.program);
      const values = taxonNamesByTaxonGroupId[options.taxonGroupId];
      if (isNotEmptyArray(values)) {

        // All values
        if (isNilOrBlank(options.searchAttribute)) return values;

        // Text search
        return suggestFromArray<TaxonNameRef>(values, value, {
          searchAttribute: options.searchAttribute
        });
      }
    }

    // If nothing found in program: search on taxonGroup
    const res = await this.referentialRefService.suggestTaxonNames(value, {
      levelId: options.levelId,
      levelIds: options.levelIds,
      taxonGroupId: options.taxonGroupId,
      searchAttribute: options.searchAttribute
    });

    // If there result, use it
    if (res && res.length) return res;

    // Then, retry in all taxon (without taxon groups - Is the link taxon<->taxonGroup missing ?)
    if (isNotNil(options.taxonGroupId)) {
      return await this.referentialRefService.suggestTaxonNames(value, {
        levelId: options.levelId,
        levelIds: options.levelIds,
        searchAttribute: options.searchAttribute
      });
    }

    // Nothing found
    return [];
  }

  async loadTaxonNamesByTaxonGroupIdMap(program: string): Promise<{ [key: number]: TaxonNameRef[] } | undefined> {
    const mapCacheKey = [ProgramCacheKeys.TAXON_NAME_BY_GROUP, program].join('|');

    return await this.cache.getOrSetItem(mapCacheKey,
      async (): Promise<{ [key: number]: TaxonNameRef[] }> => {
      const taxonGroups = await this.loadTaxonGroups(program);
      return (taxonGroups || []).reduce((res, taxonGroup) => {
        if (isNotEmptyArray(taxonGroup.taxonNames)) {
          res[taxonGroup.id] = taxonGroup.taxonNames;
          //empty = false;
        }
        return res;
      }, {});
    }, ProgramCacheKeys.CACHE_GROUP);
  }

  async load(id: number, options?: EntityServiceLoadOptions): Promise<Program> {

    if (this._debug) console.debug(`[program-service] Loading program {${id}}...`);

    // LoadQuery return program with strategies
    const res = await this.graphql.query<{ program: any }>({
      query: LoadQuery,
      variables: {
        id: id
      },
      error: {code: ErrorCodes.LOAD_PROGRAM_ERROR, message: "PROGRAM.ERROR.LOAD_PROGRAM_ERROR"}
    });
    return res && res.program && Program.fromObject(res.program);
  }

  async delete(data: Program, options?: any): Promise<any> {
    // TODO
    throw new Error("TODO: implement programService.delete()");
  }


  async save(data: Program, options?: any): Promise<Program> {
    if (!data) return data;

    // Clean cache
    this.clearCache();

    // Fill default properties
    this.fillDefaultProperties(data);
    const json = this.asObject(data, SAVE_AS_OBJECT_OPTIONS);

    const now = Date.now();
    if (this._debug) console.debug("[program-service] Saving program...", json);

    const res = await this.graphql.mutate<{ saveProgram: Program }>({
      mutation: SaveQuery,
      variables: {
        program: json
      },
      error: {code: ErrorCodes.SAVE_PROGRAM_ERROR, message: "PROGRAM.ERROR.SAVE_PROGRAM_ERROR"}
    });
    const savedProgram = res && res.saveProgram;
    this.copyIdAndUpdateDate(savedProgram, data);

    //if (this._debug)
      console.debug(`[pogram-service] Program saved and updated in ${Date.now() - now}ms`, data);

    return data;
  }

  listenChanges(id: number, options?: any): Observable<Program | undefined> {
    // TODO
    console.warn("TODO: implement listen changes on program");
    return of();
  }

  canUserWrite(data: IWithProgramEntity<any>): boolean {
    if (!data) return false;

    // If the user is the recorder: can write
    if (data.recorderPerson && this.accountService.isLogin() && this.accountService.account.asPerson().equals(data.recorderPerson)) {
      return true;
    }

    // TODO: check rights on program (need model changes)

    // Check same department
    return this.accountService.canUserWriteDataForDepartment(data.recorderDepartment);
  }

  executeImport(opts?: {
    maxProgression?: number;
  }): Observable<number>{

    const maxProgression = opts && opts.maxProgression || 100;
    const progression = new BehaviorSubject<number>(0);
    this.doExecuteImport(progression, maxProgression)
      .then(() => progression.complete())
      .catch(err => progression.error(err));
    return progression;
  }

  /* -- protected methods -- */

  protected asObject(source: Program, opts?: ReferentialAsObjectOptions): any {
    return source.asObject(
      <ReferentialAsObjectOptions>{
        ...opts,
        ...NOT_MINIFY_OPTIONS, // Force NOT minify, because program is a referential that can be minify in just an ID
      });
  }

  protected async doExecuteImport(progression: BehaviorSubject<number>,
                                  maxProgression: number,
                                  opts?: {
                                    acquisitionLevels?: string[];
                                  }) {

    const acquisitionLevels: string[] = opts && opts.acquisitionLevels || Object.keys(AcquisitionLevelCodes).map(key => AcquisitionLevelCodes[key]);

    const stepCount = 2;
    const progressionStep = maxProgression ? maxProgression / stepCount : undefined;
    const progressionRest = progressionStep && (maxProgression - progressionStep * stepCount) || undefined;

    const now = Date.now();
    console.info("[program-service] Importing programs...");

    try {
      // Clear cache
      await this.clearCache();

      // Step 1. load all programs
      const programLabels: string[] = [];
      const loadFilter = {
        statusIds:  [StatusIds.ENABLE, StatusIds.TEMPORARY]
      };
      const res = await fetchAllPagesWithProgress((offset, size) =>
          this.loadAll(offset, size, 'id', 'asc', loadFilter, {
            debug: false,
            query: LoadAllRefWithTotalQuery, // Need fragment ProgramRefFragment
            fetchPolicy: "network-only",
            toEntity: false
          }),
        progression,
        progressionStep,
        (page) => {
          const labels = (page && page.data || []).map(p => p.label) as string[];
          programLabels.push(...labels);
        },
        '[program-service]'
      );
      progression.next(progression.getValue() + progressionStep);

      // Step 2. Saving locally
      await this.entities.saveAll(res.data, {entityName: 'ProgramVO'});
      progression.next(progression.getValue() + progressionStep);

      // Make sure to fill the progression at least once
      if (progressionRest) {
        progression.next(progression.getValue() + progressionRest);
      }
      else if (isNil(progressionStep) && isNotNil(maxProgression)) {
        progression.next(progression.getValue() + maxProgression);
      }

      console.info(`[program-service] Successfully import programs in ${Date.now() - now}ms`);
    }
    catch (err) {
      console.error(`[program-service] Error during programs importation (at step #${progressionStep && progression.getValue() / progressionStep || '?'})`, err);
      throw err;
    }
  }

  protected fillDefaultProperties(program: Program) {
    program.statusId = isNotNil(program.statusId) ? program.statusId : StatusIds.ENABLE;

    // Update strategies
    (program.strategies || []).forEach(strategy => {

      strategy.statusId = isNotNil(strategy.statusId) ? strategy.statusId : StatusIds.ENABLE;

      // Force a valid programId
      // (because a bad copy can leave an old value)
      strategy.programId = isNotNil(program.id) ? program.id : undefined;
    });

  }

  protected copyIdAndUpdateDate(source: Program, target: Program) {
    EntityUtils.copyIdAndUpdateDate(source, target);

    // Update strategies
    if (target.strategies && source.strategies) {
      target.strategies.forEach(entity => {

        // Make sure tp copy programId (need by equals)
        entity.programId = source.id;

        const savedStrategy = source.strategies.find(json => entity.equals(json));
        EntityUtils.copyIdAndUpdateDate(savedStrategy, entity);

        // Update pmfm strategy (id)
        if (savedStrategy.pmfmStrategies && savedStrategy.pmfmStrategies.length > 0) {

          entity.pmfmStrategies.forEach(targetPmfmStrategy => {

            // Make sure to copy strategyId (need by equals)
            targetPmfmStrategy.strategyId = savedStrategy.id;

            const savedPmfmStrategy = entity.pmfmStrategies.find(srcPmfmStrategy => targetPmfmStrategy.equals(srcPmfmStrategy));
            targetPmfmStrategy.id = savedPmfmStrategy.id;
          });
        }

      });
    }

  }

  protected async clearCache() {
    console.info("[program-service] Clearing program cache...");
    await this.cache.clearGroup(ProgramCacheKeys.CACHE_GROUP);
  }
}
