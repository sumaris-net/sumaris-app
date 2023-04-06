import { Injectable, Injector } from '@angular/core';
import { FetchPolicy, gql, WatchQueryFetchPolicy } from '@apollo/client/core';
import { BehaviorSubject, defer, merge, Observable, Subject, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, finalize, map } from 'rxjs/operators';
import { ErrorCodes } from './errors';
import { ReferentialFragments } from './referential.fragments';
import {
  AccountService,
  arrayDistinct,
  BaseEntityGraphqlSubscriptions,
  ConfigService,
  EntitiesServiceLoadOptions,
  EntitiesStorage,
  firstArrayValue,
  firstNotNilPromise,
  IEntitiesService,
  IEntityService,
  IReferentialRef, isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  JobUtils,
  LoadResult,
  NetworkService,
  propertiesPathComparator,
  ReferentialRef,
  ReferentialUtils,
  ShowToastOptions,
  StatusIds,
  suggestFromArray,
  SuggestService,
  Toasts
} from '@sumaris-net/ngx-components';
import { TaxonGroupRef, TaxonGroupTypeIds } from './model/taxon-group.model';
import { CacheService } from 'ionic-cache';
import { ReferentialRefService } from './referential-ref.service';
import { Program } from './model/program.model';

import { DenormalizedPmfmStrategy } from './model/pmfm-strategy.model';
import { IWithProgramEntity } from '@app/data/services/model/model.utils';

import { StrategyFragments } from './strategy.fragments';
import { ProgramFragments } from './program.fragments';
import { PmfmService } from './pmfm.service';
import { BaseReferentialService } from './base-referential-service.class';
import { ProgramFilter } from './filter/program.filter';
import { ReferentialRefFilter } from './filter/referential-ref.filter';
import { environment } from '@environments/environment';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { OverlayEventDetail } from '@ionic/core';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { SortDirection } from '@angular/material/sort';
import { TaxonNameRefService } from '@app/referential/services/taxon-name-ref.service';
import { DenormalizedPmfmStrategyFilter } from '@app/referential/services/filter/pmfm-strategy.filter';
import { StrategyFilter } from '@app/referential/services/filter/strategy.filter';

export const ProgramRefQueries = {
  // Load by id, with only properties
  loadLight: gql`query ProgramRef($id: Int, $label: String){
        data: program(id: $id, label: $label){
          ...LightProgramFragment
        }
    }
    ${ProgramFragments.lightProgram}`,

  // Load by id or label
  load: gql`query ProgramRef($id: Int, $label: String){
        data: program(id: $id, label: $label){
          ...ProgramRefFragment
        }
    }
    ${ProgramFragments.programRef}`,

  // Load by id or label, with strategies
  loadWithStrategies: gql`query ProgramRef($id: Int, $label: String, $strategyFilter: StrategyFilterVOInput){
    data: program(id: $id, label: $label){
      ...ProgramRefFragment
      strategies(filter: $strategyFilter) {
        ...StrategyRefFragment
      }
    }
  }
  ${ProgramFragments.programRef}
  ${StrategyFragments.strategyRef}
  ${StrategyFragments.strategyDepartment}
  ${StrategyFragments.appliedStrategy}
  ${StrategyFragments.appliedPeriod}
  ${StrategyFragments.denormalizedPmfmStrategy}
  ${StrategyFragments.taxonGroupStrategy}
  ${StrategyFragments.taxonNameStrategy}
  ${ReferentialFragments.lightReferential}
  ${ReferentialFragments.taxonName}`,

  // Load all query
  loadAll: gql` query Programs($filter: ProgramFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: programs(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...ProgramRefFragment
    }
  }
  ${ProgramFragments.programRef}`,

  // Load all query (with total)
  loadAllWithTotal: gql` query Programs($filter: ProgramFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: programs(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...ProgramRefFragment
    }
    total: programsCount(filter: $filter)
  }
  ${ProgramFragments.programRef}`,

  // Load all query with strategies
  loadAllWithStrategies: gql` query Programs($filter: ProgramFilterVOInput!, $strategyFilter: StrategyFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: programs(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...ProgramRefFragment
      strategies(filter: $strategyFilter) {
        ...StrategyRefFragment
      }
    }
  }
  ${ProgramFragments.programRef}
  ${StrategyFragments.strategyRef}
  ${StrategyFragments.strategyDepartment}
  ${StrategyFragments.appliedStrategy}
  ${StrategyFragments.appliedPeriod}
  ${StrategyFragments.denormalizedPmfmStrategy}
  ${StrategyFragments.taxonGroupStrategy}
  ${StrategyFragments.taxonNameStrategy}
  ${ReferentialFragments.lightReferential}
  ${ReferentialFragments.taxonName}`,

  // Load all query (with total, and strategies)
  loadAllWithStrategiesAndTotal: gql` query Programs($filter: ProgramFilterVOInput!, $strategyFilter: StrategyFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: programs(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...ProgramRefFragment
      strategies(filter: $strategyFilter) {
        ...StrategyRefFragment
      }
    }
    total: programsCount(filter: $filter)
  }
  ${ProgramFragments.programRef}
  ${StrategyFragments.strategyRef}
  ${StrategyFragments.strategyDepartment}
  ${StrategyFragments.appliedStrategy}
  ${StrategyFragments.appliedPeriod}
  ${StrategyFragments.denormalizedPmfmStrategy}
  ${StrategyFragments.taxonGroupStrategy}
  ${StrategyFragments.taxonNameStrategy}
  ${ReferentialFragments.lightReferential}
  ${ReferentialFragments.taxonName}`
};

const ProgramRefSubscriptions: BaseEntityGraphqlSubscriptions & { listenAuthorizedPrograms: any} = {
  listenChanges: gql`subscription UpdateProgram($id: Int!, $interval: Int){
    data: updateProgram(id: $id, interval: $interval) {
      ...LightProgramFragment
    }
  }
  ${ProgramFragments.lightProgram}`,

  listenAuthorizedPrograms: gql`subscription UpdateAuthorizedPrograms($interval: Int){
    data: authorizedPrograms(interval: $interval) {
      ...LightProgramFragment
    }
  }
  ${ProgramFragments.lightProgram}`

};

const ProgramRefCacheKeys = {
  CACHE_GROUP: 'program',

  PROGRAM_BY_ID: 'programById',
  PROGRAM_BY_LABEL: 'programByLabel',
  PMFMS: 'programPmfms',
  GEARS: 'programGears',
  TAXON_GROUPS: 'programTaxonGroups',
  TAXON_GROUP_ENTITIES: 'programTaxonGroupEntities',
  TAXON_NAME_BY_GROUP: 'programTaxonNameByGroup',
  TAXON_NAMES: 'taxonNameByGroup'
};

const noopFilter = (() => true);

@Injectable({providedIn: 'root'})
export class ProgramRefService
  extends BaseReferentialService<Program, ProgramFilter>
  implements IEntitiesService<Program, ProgramFilter>, IEntityService<Program>,
    SuggestService<Program, Partial<ProgramFilter>> {


  private _subscriptionCache: {[key: string]: {
      subject: Subject<Program>;
      subscription: Subscription;
    }} = {};
  private _listenAuthorizedSubscription: Subscription = null;

  constructor(
    injector: Injector,
    protected network: NetworkService,
    protected accountService: AccountService,
    protected cache: CacheService,
    protected entities: EntitiesStorage,
    protected configService: ConfigService,
    protected pmfmService: PmfmService,
    protected networkService: NetworkService,
    protected taxonNameRefService: TaxonNameRefService,
    protected referentialRefService: ReferentialRefService,
    protected toastController: ToastController,
    protected strategyRefService: StrategyRefService,
    protected translate: TranslateService
  ) {
    super(injector, Program, ProgramFilter,
      {
        queries: ProgramRefQueries,
        subscriptions: ProgramRefSubscriptions
      });

    this._debug = !environment.production;
    this._logPrefix = '[program-ref-service] ';

    this.start();
  }

  protected async ngOnStart(): Promise<void> {
    await super.ngOnStart();
    this.registerSubscription(
      merge(
        this.networkService.onNetworkStatusChanges,
        this.accountService.onLogin,
        this.accountService.onLogout
      )
        .pipe(
          map(_ => this.networkService.online
              && this.accountService.isLogin()
              // Skip if admin (can see all programs)
              && !this.accountService.isAdmin()
          ),
          distinctUntilChanged()
        )
        .subscribe((onlineAndLogin) => {
          if (onlineAndLogin) {
            this.startListenAuthorizedProgram();
          }
          else {
            this.stopListenAuthorizedProgram();
          }
        })
    );
  }

  canUserWrite(data: Program, opts?: any): boolean {
    console.warn('Make no sense to write using the ProgramRefService. Please use the ProgramService instead.');
    return false;
  }

  canUserWriteEntity(entity: IWithProgramEntity<any, any>, opts?: {program?: Program}): boolean {
    if (!entity) return false;

    // If the user is the recorder: can write
    if (entity.recorderPerson && ReferentialUtils.equals(this.accountService.person, entity.recorderPerson)) {
      return true;
    }

    // TODO: check rights on program (ProgramPerson, ProgramDepartment)
    // const program = opts?.program || load()
    console.warn('TODO: check rights on program (e.g. using ProgramPerson or ProgramDepartment)', opts?.program);

    // Check same department
    return this.accountService.canUserWriteDataForDepartment(entity.recorderDepartment);
  }

  async loadAll(offset: number, size: number, sortBy?: string, sortDirection?: SortDirection,
                filter?: Partial<ProgramFilter>,
                opts?: EntitiesServiceLoadOptions & {debug?: boolean}): Promise<LoadResult<Program>> {
    // Use search attribute as default sort, is set
    sortBy = sortBy || filter?.searchAttribute
      || filter?.searchAttributes && filter.searchAttributes.length && filter.searchAttributes[0]
      || 'label';

    const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
    if (offline) {
       return this.loadAllLocally(offset, size, sortBy, sortDirection, filter, opts);
    }

    // Call inherited function
    return super.loadAll(offset, size, sortBy, sortDirection, filter, opts);
  }


  protected async loadAllLocally(offset: number,
                                 size: number,
                                 sortBy?: string,
                                 sortDirection?: SortDirection,
                                 filter?: Partial<ProgramFilter>,
                                 opts?: {
                                   [key: string]: any;
                                   toEntity?: boolean;
                                 }): Promise<LoadResult<Program>> {

    filter = this.asFilter(filter);

    const variables = {
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || filter.searchAttribute
        || filter.searchAttributes && filter.searchAttributes.length && filter.searchAttributes[0]
        || 'label',
      sortDirection: sortDirection || 'asc',
      filter: filter.asFilterFn()
    };

    const {data, total} = await this.entities.loadAll(Program.TYPENAME, variables);

    const entities = (!opts || opts.toEntity !== false) ?
      (data || []).map(Program.fromObject) :
      (data || []) as Program[];

    const res: LoadResult<Program> = {data: entities, total};

    // Add fetch more function
    const nextOffset = (offset || 0) + entities.length;
    if (nextOffset < total) {
      res.fetchMore = () => this.loadAllLocally(nextOffset, size, sortBy, sortDirection, filter, opts);
    }

    return res;
  }

  /**
   * Watch program by label
   * @param label
   * @param opts
   */
  watchByLabel(label: string, opts?: {
    withStrategies?: boolean;
    strategyFilter?: Partial<StrategyFilter>;
    toEntity?: boolean;
    debug?: boolean;
    query?: any;
    cache?: boolean;
    fetchPolicy?: WatchQueryFetchPolicy;
  }): Observable<Program> {

    // Use cache (enable by default, if no custom query)
    if (!opts || (opts.cache !== false && !opts.query)) {
      const cacheKey = [ProgramRefCacheKeys.PROGRAM_BY_LABEL, label, opts && JSON.stringify({withStrategies: opts?.withStrategies, strategyFilter: opts?.strategyFilter})].join('|');
      // FIXME - BLA - using loadFromDelayedObservable() as a workaround for offline mode+mobile, when cache is empty. Avoid to get an empty result
      return this.cache.loadFromDelayedObservable(cacheKey,
          defer(() => this.watchByLabel(label, {...opts, cache: false, toEntity: false})),
          ProgramRefCacheKeys.CACHE_GROUP
        ).pipe(
          map(data => (!opts || opts.toEntity !== false) ? Program.fromObject(data) : data)
        );
    }

    // StrategyFilter
    const strategyFilter = StrategyFilter.fromObject(opts?.strategyFilter);
    // Debug
    const debug = this._debug && (!opts || opts.debug !== false);
    let now = debug && Date.now();
    if (debug) console.debug(`[program-ref-service] Watching program {${label}}...`);

    let res: Observable<any>;

    const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
    if (offline) {
      res = this.entities.watchAll<any>(Program.TYPENAME, {
        size: 1,
        filter: (p) => p.label === label
      }).pipe(
        map(res => firstArrayValue(res && res.data)),
        map(program => {
          const filterFn = strategyFilter && strategyFilter.asFilterFn();
          if (filterFn) {
            // /!\ Make sure to clone the strategy, to keep cache object unchanged
            program = {
              ...program,
              strategies: (program.strategies || []).filter(filterFn)
            };
          }
          return program;
        })
      );
    }
    else {
      const query = opts && opts.query || (opts?.withStrategies ? ProgramRefQueries.loadWithStrategies : ProgramRefQueries.load);
      res = this.graphql.watchQuery<{data: any}>({
        query,
        variables: {
          label,
          strategyFilter: opts?.withStrategies && strategyFilter?.asPodObject()
        },
        // Important: do NOT using cache here, as default (= 'no-cache')
        // because cache is manage by Ionic cache (easier to clean)
        fetchPolicy: opts && (opts.fetchPolicy as FetchPolicy) || 'no-cache',
        error: {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR'}
      }).pipe(map(res => res && res.data));
    }

    return res.pipe(
      filter(isNotNil),
      map(data => {
        const entity = (!opts || opts.toEntity !== false) ? Program.fromObject(data) : data;
        if (now) {
          console.debug(`[program-ref-service] Watching program {${label}} [OK] in ${Date.now() - now}ms`);
          now = undefined;
        }
        return entity;
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
    query?: any;
    cache?: boolean;
    fetchPolicy?: FetchPolicy;
  }): Promise<Program> {
    if (isNilOrBlank(label)) throw new Error('Missing \'label\' argument');
    const cacheKey = [ProgramRefCacheKeys.PROGRAM_BY_LABEL, label].join('|');

    // Use cache (enable by default, if no custom query)
    if (!opts || (!opts.query && opts.cache !== false && opts.fetchPolicy !== 'no-cache' && opts.fetchPolicy !== 'network-only')) {
      return this.cache.getOrSetItem<Program>(cacheKey,
        () => this.loadByLabel(label, {...opts, cache: false, toEntity: false}),
        ProgramRefCacheKeys.CACHE_GROUP)
        .then(data => (!opts || opts.toEntity !== false) ? Program.fromObject(data) : data);
    }

    let data: any;
    if (this._debug) console.debug(`[program-ref-service] Loading program {${label}}...`);

    // If offline mode
    const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
    if (offline) {
      data = await this.entities.loadAll<Program>(Program.TYPENAME, {
        offset: 0, size: 1,
        filter: (p) => p.label ===  label
      }).then(res => firstArrayValue(res && res.data));
    }
    else {
      const query = opts && opts.query || this.queries.load;
      const res = await this.graphql.query<{ data: any }>({
        query,
        variables: { label },
        error: {code: ErrorCodes.LOAD_PROGRAM_ERROR, message: "PROGRAM.ERROR.LOAD_PROGRAM_ERROR"}
      });
      data = res && res.data;
    }

    // Convert to entity (if need)
    const entity = (!opts || opts.toEntity !== false)
      ? Program.fromObject(data)
      : data as Program;

    if (this._debug) console.debug(`[program-ref-service] Program loaded {${label}}`, entity);
    return entity;
  }

  loadAllByLabels(labels: string[], opts?: {
    toEntity?: boolean;
    query?: any;
    cache?: boolean;
    fetchPolicy?: FetchPolicy;
  }) {
    return Promise.all(
      arrayDistinct(labels).map(label => this.loadByLabel(label, opts))
    ).then(programs => programs.filter(isNotNil));
  }

  /**
   * Watch program pmfms
   */
  watchProgramPmfms(programLabel: string, opts: {
    cache?: boolean;
    acquisitionLevel?: string;
    acquisitionLevels?: string[];
    strategyLabel?: string;
    gearId?: number;
    taxonGroupId?: number;
    referenceTaxonId?: number;
    toEntity?: boolean;
  }, debug?: boolean): Observable<DenormalizedPmfmStrategy[]> {

    // Use cache (enable by default)
    if (!opts || opts.cache !== false) {
      const cacheKey = [ProgramRefCacheKeys.PMFMS, programLabel, JSON.stringify({...opts, cache: undefined, toEntity: undefined})].join('|');
      return this.cache.loadFromObservable(cacheKey,
        defer(() => this.watchProgramPmfms(programLabel, {...opts, cache: false, toEntity: false})),
        ProgramRefCacheKeys.CACHE_GROUP)
        .pipe(
          map(data => (!opts || opts.toEntity !== false)
            ? (data || []).map(DenormalizedPmfmStrategy.fromObject)
            : (data || []) as DenormalizedPmfmStrategy[])
        );
    }

    // Watch the program
    const acquisitionLevels = opts?.acquisitionLevels || (opts?.acquisitionLevel && [opts.acquisitionLevel]);
    return this.watchByLabel(programLabel, {toEntity: false, withStrategies: true, strategyFilter: opts && {
        label: opts?.strategyLabel,
        acquisitionLevels
      }})
      .pipe(
        map(program => program.strategies || []),
        // Filter strategy's pmfms
        map(strategies => {
          const filterFn = DenormalizedPmfmStrategyFilter.fromObject(opts).asFilterFn();
          if (!filterFn) throw new Error('Missing opts to filter pmfm (.e.g opts.acquisitionLevel)!');
          return strategies
            .flatMap(strategy => (strategy?.denormalizedPmfms || [])
            .filter(filterFn));
        }),
        // Merge duplicated pmfms (make to a unique pmfm, by id)
        map(pmfms => pmfms.reduce((res, p) => {
            let index = res.findIndex(other => other.id === p.id);
            if (index !== -1) {
              res[index] = DenormalizedPmfmStrategy.merge(res[index], p);
              return res;
            }
            return res.concat(p);
          }, [])
        ),
        // Sort on rank order (asc)
        map(data => data.sort((p1, p2) => p1.rankOrder - p2.rankOrder)),
        map(data => {
          if (debug) console.debug(`[program-ref-service] PMFM for ${opts.acquisitionLevel} (filtered):`, data);

          // Convert into entities
          return (!opts || opts.toEntity !== false)
            ? data.map(DenormalizedPmfmStrategy.fromObject)
            : data as DenormalizedPmfmStrategy[];
        }
      )
    );
  }

  /**
   * Load program pmfms
   */
  loadProgramPmfms(programLabel: string, options?: {
    acquisitionLevel?: string;
    acquisitionLevels?: string[];
    strategyLabel?: string;
    gearId?: number;
    taxonGroupId?: number;
    referenceTaxonId?: number;
  }, debug?: boolean): Promise<DenormalizedPmfmStrategy[]> {
    // DEBUG
    if (options) console.debug(`[program-ref-service] Loading ${programLabel} PMFMs on ${options.acquisitionLevel}`);

    return firstNotNilPromise(this.watchProgramPmfms(programLabel, options, debug));
  }

  /**
   * Watch program gears
   */
  watchGears(programLabel: string, opts?: {
    acquisitionLevel?: string;
    acquisitionLevels?: string[];
    strategyLabel?: string;
    toEntity?: boolean;
    cache?: boolean;
  }): Observable<ReferentialRef[]> {

    // Use cache (enable by default)
    if (!opts || opts.cache !== false) {
      const cacheKey = [ProgramRefCacheKeys.GEARS, programLabel, JSON.stringify({...opts, cache: undefined, toEntity: undefined})].join('|');
      return this.cache.loadFromObservable(cacheKey,
        defer(() => this.watchGears(programLabel, {...opts, cache: false, toEntity: false})),
        ProgramRefCacheKeys.CACHE_GROUP)
        .pipe(
          map(data => (!opts || opts.toEntity !== false)
            ? (data || []).map(ReferentialRef.fromObject)
            : (data || []) as ReferentialRef[])
        );
    }

    // Load the program, with strategies
    const acquisitionLevels = opts?.acquisitionLevels || (opts?.acquisitionLevel && [opts.acquisitionLevel]);
    return this.watchByLabel(programLabel, {toEntity: false, withStrategies: true, strategyFilter: opts && {
      label: opts?.strategyLabel,
      acquisitionLevels
    }})
        .pipe(
          map(program => program.strategies || []),
          // get all gears
          map(strategies => arrayDistinct(strategies.flatMap(strategy => strategy.gears ||[]), 'id')),
          map(data => {
            if (this._debug) console.debug(`[program-ref-service] Found ${data.length} gears on program {${programLabel}}`);

            // Convert into entities
            return (!opts || opts.toEntity !== false)
              ? data.map(ReferentialRef.fromObject)
              : data as ReferentialRef[];
          })
        );
  }

  /**
   * Load program gears
   */
  loadGears(programLabel: string): Promise<ReferentialRef[]> {
    return firstNotNilPromise(this.watchGears(programLabel));
  }

  /**
   * Watch program taxon groups
   */
  watchTaxonGroups(programLabel: string, opts?: {
    acquisitionLevel?: string;
    acquisitionLevels?: string[];
    strategyLabel?: string;
    toEntity?: boolean;
    cache?:  boolean;
  }): Observable<TaxonGroupRef[]> {

    // Use cache (enable by default)
    if (!opts || opts.cache !== false) {
      const cacheKey = [ProgramRefCacheKeys.TAXON_GROUPS, programLabel, JSON.stringify({...opts, cache: undefined, toEntity: undefined})].join('|');
      return this.cache.loadFromObservable(cacheKey,
        defer(() => this.watchTaxonGroups(programLabel, {...opts, cache: false, toEntity: false})),
        ProgramRefCacheKeys.CACHE_GROUP)
        .pipe(
          map(data => (!opts || opts.toEntity !== false)
            ? (data || []).map(TaxonGroupRef.fromObject)
            : (data || []) as TaxonGroupRef[])
        );
    }

    // Watch program
    const acquisitionLevels = opts?.acquisitionLevels || (opts?.acquisitionLevel && [opts.acquisitionLevel]);
    return this.watchByLabel(programLabel, {toEntity: false, withStrategies: true, strategyFilter: opts && {
        label: opts?.strategyLabel,
        acquisitionLevels
      }})
      .pipe(
        // Get strategies
        map(program => (program.strategies || [])),
        // Get taxon groups strategies
        map(strategies => arrayDistinct(strategies.flatMap(strategy => strategy.taxonGroups || []), ['priorityLevel', 'taxonGroup.id'])),
          // Sort taxonGroupStrategies, on priorityLevel
        map(data => data.sort(propertiesPathComparator(
               ['priorityLevel', 'taxonGroup.label', 'taxonGroup.name'],
               // Use default values, because priorityLevel can be null in the DB
               [1, 'ZZZ', 'ZZZ'])
             )
            // Merge priority into taxonGroup
            .map(v => <any>{...v.taxonGroup, priority: v.priorityLevel})
        ),
        map(data => {
          if (this._debug) console.debug(`[program-ref-service] Found ${data.length} taxon groups on program {${programLabel}}`);

          // Convert into entities
          return (!opts || opts.toEntity !== false)
            ? data.map(TaxonGroupRef.fromObject)
            : data as TaxonGroupRef[];
        })
      );
  }

  /**
   * Load program taxon groups
   */
  loadTaxonGroups(programLabel: string, opts?: { toEntity?: boolean; }): Promise<TaxonGroupRef[]> {
    return firstNotNilPromise(this.watchTaxonGroups(programLabel, opts));
  }

  /**
   * Suggest program taxon groups
   */
  async suggestTaxonGroups(value: any, filter?: Partial<ReferentialRefFilter & { program: string; }>): Promise<LoadResult<IReferentialRef>> {
    // Search on program's taxon groups
    if (filter && isNotNil(filter.program)) {
      const programItems = await this.loadTaxonGroups(filter.program, {toEntity: false});
      if (isNotEmptyArray(programItems)) {
        return suggestFromArray(programItems, value, {
          searchAttributes: filter.searchAttributes || ['priority', 'label', 'name']
        });
      }
    }

    // If nothing found in program, or species defined
    return this.referentialRefService.suggest(value, {
      ...filter,
      entityName: 'TaxonGroup',
      levelId: TaxonGroupTypeIds.FAO
    });
  }

  /**
   * Load program taxon groups
   */
  async suggestTaxonNames(value: any, opts: {
    programLabel?: string;
    levelId?: number;
    levelIds?: number[]
    searchAttribute?: string;
    taxonGroupId?: number;
  }): Promise<LoadResult<TaxonNameRef>> {

    // Search on taxon group's taxon'
    if (isNotNil(opts.programLabel) && isNotNil(opts.taxonGroupId)) {

      // Get map from program
      const taxonNamesByTaxonGroupId = await this.loadTaxonNamesByTaxonGroupIdMap(opts.programLabel);
      const values = taxonNamesByTaxonGroupId[opts.taxonGroupId];
      if (isNotEmptyArray(values)) {

        // All values
        if (isNilOrBlank(opts.searchAttribute)) return {data: values};

        // Text search
        return suggestFromArray<TaxonNameRef>(values, value, {
          searchAttribute: opts.searchAttribute
        });
      }
    }

    // If nothing found in program: search by taxonGroup
    const res = await this.taxonNameRefService.suggest(value, {
      levelId: opts.levelId,
      levelIds: opts.levelIds,
      taxonGroupId: opts.taxonGroupId,
      searchAttribute: opts.searchAttribute
    });

    // If there result, use it
    if (res && isNotEmptyArray(res.data) || res.total > 0) return res;

    // Then, retry in all taxon (without taxon groups - Is the link taxon<->taxonGroup missing ?)
    if (isNotNil(opts.taxonGroupId)) {
      return this.taxonNameRefService.suggest(value, {
        levelId: opts.levelId,
        levelIds: opts.levelIds,
        searchAttribute: opts.searchAttribute
      });
    }

    // Nothing found
    return {data: []};
  }

  async loadTaxonNamesByTaxonGroupIdMap(programLabel: string, opts?: {
    cache?: boolean;
    toEntity?: boolean;
  }): Promise<{[key: number]: TaxonNameRef[]}> {

    if (!opts || opts.cache !== false) {
      const mapCacheKey = [ProgramRefCacheKeys.TAXON_NAME_BY_GROUP, programLabel].join('|');
      return this.cache.getOrSetItem(mapCacheKey,
        () => this.loadTaxonNamesByTaxonGroupIdMap(programLabel, {...opts, cache: false, toEntity: false}),
        ProgramRefCacheKeys.CACHE_GROUP);
    }

    const taxonGroups = await this.loadTaxonGroups(programLabel, opts);
    return (taxonGroups || []).reduce((res, taxonGroup) => {
      if (isNotEmptyArray(taxonGroup.taxonNames)) {
        res[taxonGroup.id] = taxonGroup.taxonNames;
        //empty = false;
      }
      return res;
    }, {});
  }

  async executeImport(filter: Partial<ProgramFilter>,
                      opts?: {
                        progression?: BehaviorSubject<number>;
                        maxProgression?: number;
                        acquisitionLevels?: string[];
                        program?: Program;
                        [key: string]: any;
                      }) {

    const maxProgression = opts && opts.maxProgression || 100;

    const now = this._debug && Date.now();
    console.info("[program-ref-service] Importing programs...");

    try {
      // Clear cache
      await this.clearCache();

      // Create search filter
      filter = {
        ...filter,
        acquisitionLevelLabels: opts?.acquisitionLevels,
        statusIds:  [StatusIds.ENABLE, StatusIds.TEMPORARY]
      };
      const strategyFilter = isNotEmptyArray(filter.strategyIds) ? StrategyFilter.fromObject({includedIds: filter.strategyIds})
        // By default, all strategies of imported programs
        : null;

      // If strategy are filtered, import only ONE program - fix issue IMAGINE (avoid to import all DB programs)
      if (strategyFilter) {
        filter.label = filter.label || opts?.program?.label
      }

      // Keep other programs, when ONLY ONE program is imported here
      // (e.g. imported from another offline feature)
      const resetLocalStorage = isNil(filter.label);

      // Step 1. load all programs, with strategies
      const importedProgramLabels = [];
      const {data} = await JobUtils.fetchAllPages<any>((offset, size) =>
          this.loadAll(offset, size, 'id', 'asc', filter, {
            query: (offset === 0) ? ProgramRefQueries.loadAllWithStrategiesAndTotal : ProgramRefQueries.loadAllWithStrategies,
            variables: {
              strategyFilter: strategyFilter?.asPodObject()
            },
            fetchPolicy: 'no-cache',
            toEntity: false
          }),
        {
          progression: opts?.progression,
          maxProgression: maxProgression * 0.9,
          onPageLoaded: ({data}) => {
            const labels = (data || []).map(p => p.label) as string[];
            importedProgramLabels.push(...labels);
          },
          logPrefix: '[program-ref-service]',
          fetchSize: 5 /* limit to 5 program, because a program graph it can be huge ! */
        }
      );

      // Step 2. Saving locally
      await this.entities.saveAll(data || [], {
        entityName: Program.TYPENAME,
        reset: resetLocalStorage
      });

      if (this._debug) console.debug(`[program-ref-service] Importing programs [OK] in ${Date.now() - now}ms`, data);

    }
    catch (err) {
      console.error("[program-ref-service] Error during programs importation", err);
      throw err;
    }
  }

  listenChanges(id: number, opts?: { interval?: number }): Observable<Program> {

    const cacheKey = [ProgramRefCacheKeys.PROGRAM_BY_ID, id].join('|');
    let cache = this._subscriptionCache[cacheKey];
    if (!cache) {
      // DEBUG
      //console.debug(`[program-ref-service] Starting program {${id}} changes`);

      const subject = new Subject<Program>();
      cache = {
        subject,
        subscription: super.listenChanges(id, opts).subscribe(subject)
      };
      this._subscriptionCache[cacheKey] = cache;
    }

    return cache.subject.asObservable()
      .pipe(
        finalize(() => {
          // DEBUG
          //console.debug(`[program-ref-service] Finalize program {${id}} changes (${cache.subject.observers.length} observers)`);

          // Wait 100ms (to avoid to recreate if new subscription comes less than 100ms after)
          setTimeout(() => {
            if (cache.subject.observers?.length > 0) return; // Skip if has observers
            // DEBUG
            //console.debug(`[program-ref-service] Closing program {${id}} changes listener`);
            this._subscriptionCache[cacheKey] = undefined;
            cache.subject.complete();
            cache.subject.unsubscribe();
            cache.subscription.unsubscribe();
          }, 100);
        })
      );
  }

  async clearCache() {
    console.info("[program-ref-service] Clearing program cache...");
    await this.cache.clearGroup(ProgramRefCacheKeys.CACHE_GROUP);
  }

  /* -- protected methods -- */

  protected startListenAuthorizedProgram(opts?: {intervalInSeconds?: number; }) {
    if (this._listenAuthorizedSubscription) this.stopListenAuthorizedProgram();

    console.debug(`${this._logPrefix}Watching authorized programs...`);

    const variables = {
      interval: Math.max(10, opts?.intervalInSeconds || environment.program?.listenIntervalInSeconds || 10)
    };

    this._listenAuthorizedSubscription = this.graphql.subscribe<{data: any}>({
      query: ProgramRefSubscriptions.listenAuthorizedPrograms,
      variables,
      error: {
        code: ErrorCodes.SUBSCRIBE_AUTHORIZED_PROGRAMS_ERROR,
        message: 'PROGRAM.ERROR.SUBSCRIBE_AUTHORIZED_PROGRAMS'
      }
    })
      .pipe(
        //takeUntil(this.accountService.onLogout),
        // Map to sorted labels
        map(({data}) => (data||[]).map(p => p?.label).sort().join(',')),
        distinctUntilChanged()
      )
      .subscribe(async (programLabels) => {
        console.info(`${this._logPrefix}Authorized programs changed to: ${programLabels}`);

        await Promise.all([
          // Clear all program/strategies cache
          this.graphql.clearCache(),
          this.strategyRefService.clearCache(),
          // Clear cache (e.g. used by autocomplete fields)
          this.clearCache()
        ]);

        this.showToast({message: 'PROGRAM.INFO.AUTHORIZED_PROGRAMS_UPDATED', type: 'info'});
      });

    this._listenAuthorizedSubscription.add(() => console.debug(`${this._logPrefix}Stop watching authorized programs`));
    this.registerSubscription(this._listenAuthorizedSubscription);

    return this._listenAuthorizedSubscription;
  }

  protected stopListenAuthorizedProgram() {
    if (this._listenAuthorizedSubscription) {
      this.unregisterSubscription(this._listenAuthorizedSubscription);
      this._listenAuthorizedSubscription.unsubscribe();
      this._listenAuthorizedSubscription = null;
    }
  }

  protected showToast<T = any>(opts: ShowToastOptions): Promise<OverlayEventDetail<T>> {
    return Toasts.show(this.toastController, this.translate, opts);
  }
}
