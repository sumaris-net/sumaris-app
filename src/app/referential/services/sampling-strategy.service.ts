import { Injectable, Injector } from '@angular/core';
import { FetchPolicy, gql } from '@apollo/client/core';
import { ReferentialFragments } from './referential.fragments';
import {
  AccountService,
  ConfigService,
  DateUtils,
  EntitiesStorage,
  EntitySaveOptions,
  EntityServiceLoadOptions,
  firstArrayValue,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNilOrNaN,
  isNotNil,
  LoadResult,
  NetworkService,
  ReferentialRef
} from '@sumaris-net/ngx-components';
import { CacheService } from 'ionic-cache';
import { SortDirection } from '@angular/material/sort';
import { StrategyFragments } from './strategy.fragments';
import { StrategyService } from './strategy.service';
import { Observable, timer } from 'rxjs';
import { map, mergeMap, startWith, switchMap } from 'rxjs/operators';
import { ParameterLabelGroups } from './model/model.enum';
import { PmfmService } from './pmfm.service';
import { ReferentialRefService } from './referential-ref.service';
import { SamplingStrategy, StrategyEffort } from './model/sampling-strategy.model';
import { BaseReferentialService } from './base-referential-service.class';
import { Moment } from 'moment';
import { StrategyFilter } from '@app/referential/services/filter/strategy.filter';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { ExtractionCacheDurationType } from '@app/extraction/type/extraction-type.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { Program } from '@app/referential/services/model/program.model';

const SamplingStrategyQueries = {
  loadAll: gql`query DenormalizedStrategies($filter: StrategyFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: strategies(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...SamplingStrategyRefFragment
    }
    total: strategiesCount(filter: $filter)
  }
  ${StrategyFragments.samplingStrategyRef}
  ${StrategyFragments.appliedStrategy}
  ${StrategyFragments.appliedPeriod}
  ${StrategyFragments.lightPmfmStrategy}
  ${StrategyFragments.strategyDepartment}
  ${StrategyFragments.taxonNameStrategy}
  ${ReferentialFragments.lightPmfm}
  ${ReferentialFragments.referential}
  ${ReferentialFragments.taxonName}`,

  loadAllWithTotal: gql`query DenormalizedStrategiesWithTotal($filter: StrategyFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: strategies(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...SamplingStrategyRefFragment
    }
    total: strategiesCount(filter: $filter)
  }
  ${StrategyFragments.samplingStrategyRef}
  ${StrategyFragments.appliedStrategy}
  ${StrategyFragments.appliedPeriod}
  ${StrategyFragments.lightPmfmStrategy}
  ${StrategyFragments.strategyDepartment}
  ${StrategyFragments.taxonNameStrategy}
  ${ReferentialFragments.lightPmfm}
  ${ReferentialFragments.referential}
  ${ReferentialFragments.taxonName}`,

  loadEffort: gql`query StrategyEffort($ids: [String!]!,
    $offset: Int, $size: Int, $sortBy: String, $sortDirection: String,
    $cacheDuration: String) {
    data: extraction(
      type: {format: "strat"},
      offset: $offset,
      size: $size,
      sortBy: $sortBy,
      sortDirection: $sortDirection,
      cacheDuration: $cacheDuration,
      filter: {
        sheetName: "SM",
        criteria: [
          {sheetName: "ST", name: "strategy_id", operator: "IN", values: $ids}
        ]
      }
    )
  }`
};

@Injectable({providedIn: 'root'})
export class SamplingStrategyService extends BaseReferentialService<SamplingStrategy, StrategyFilter> {

  constructor(
    injector: Injector,
    protected network: NetworkService,
    protected accountService: AccountService,
    protected cache: CacheService,
    protected entities: EntitiesStorage,
    protected configService: ConfigService,
    protected strategyService: StrategyService,
    protected pmfmService: PmfmService,
    protected referentialRefService: ReferentialRefService
  ) {
    super(injector, SamplingStrategy, StrategyFilter,
      {
        queries: SamplingStrategyQueries
      });
  }

  watchAll(offset: number, size: number, sortBy?: string, sortDirection?: SortDirection, filter?: StrategyFilter,
           opts?: {
             fetchPolicy?: FetchPolicy;
             withTotal?: boolean;
             withEffort?: boolean;
             toEntity?: boolean;
          }): Observable<LoadResult<SamplingStrategy>> {
    // Call normal watch all
    return super.watchAll(offset, size, sortBy, sortDirection, filter, {
      fetchPolicy: 'network-only',
      ...opts
    })
      .pipe(
        // Then fill parameter groups
        mergeMap(res => this.fillParameterGroups(res.data).then(_ => res)),

        // Then fill efforts (but NOT wait end, before return a value - using startWith)
        switchMap(res => timer(100)
          .pipe(map(_ => res))
          .pipe(
            // DEBUG
            //tap(_ => console.debug('[sampling-strategy-service] timer reach !')),

            mergeMap((_) => this.fillEfforts(res.data).then(_ => res)),
            startWith(res as LoadResult<SamplingStrategy>)
          )
        )
      );
  }

  async loadAll(offset: number, size: number, sortBy?: string, sortDirection?: SortDirection,
                filter?: Partial<StrategyFilter>,
           opts?: { fetchPolicy?: FetchPolicy; withTotal?: boolean; withEffort?: boolean; withParameterGroups?: boolean; toEntity?: boolean; }
  ): Promise<LoadResult<SamplingStrategy>> {
    const res = await super.loadAll(offset, size, sortBy, sortDirection, filter, opts);

    // Fill entities (parameter groups, effort, etc)
    return this.fillEntities(res, opts);
  }

  async deleteAll(entities: SamplingStrategy[], options?: any): Promise<any> {
    return this.strategyService.deleteAll(entities, options);
  }

  async load(id: number, opts?: EntityServiceLoadOptions & { query?: any; toEntity?: boolean;
    withParameterGroups?: boolean;
    withEffort?: boolean;
  }): Promise<SamplingStrategy> {
    const data = await this.strategyService.load(id, { ...opts, toEntity: false});

    const entity = (!opts || opts.toEntity!== false) ? SamplingStrategy.fromObject(data) : data as SamplingStrategy;

    await this.fillEntities({data: [entity]}, {
      withEffort: true,
      withParameterGroups: false,
      ...opts
    });

    return entity;
  }

  async computeNextSampleTagId(strategyLabel: string, separator?: string, nbDigit?: number): Promise<string> {
    return this.strategyService.computeNextSampleTagId(strategyLabel, separator, nbDigit);
  }

  async loadAnalyticReferenceByLabel(label: string): Promise<ReferentialRef> {
    if (isNilOrBlank(label)) return undefined;
    try {
      const res = await this.strategyService.loadAllAnalyticReferences(0, 1, 'label', 'desc', { label });
      return firstArrayValue(res && res.data || []);
    } catch (err) {
      console.error('Error while loading analyticReference by label', err);
      return ReferentialRef.fromObject({label: label});
    }
  }

  canUserWrite(data?: Strategy, opts?: {program: Program}) {
    return this.strategyService.canUserWrite(data, opts);
  }

  async save(entity: SamplingStrategy, opts?: EntitySaveOptions & {
    clearCache?: boolean;
    withEffort?: boolean;
  }): Promise<SamplingStrategy> {
    const isNew = isNil(entity.id);

    console.debug('[sampling-strategy-service] Saving sampling strategy...');

    await this.strategyService.save(entity, {
      ...opts,
      update: (cache, { data }) => {
        const savedEntity = data && data.data;

        // Copy id
        this.copyIdAndUpdateDate(savedEntity, entity);

        // Update query cache
        if (isNew && this.watchQueriesUpdatePolicy === 'update-cache') {
          this.insertIntoMutableCachedQueries(cache, {
            queries: this.getLoadQueries(),
            data: entity.asObject({...NOT_MINIFY_OPTIONS, keepEffort: true})
          });
        }
      }
    });

    // Update entity effort
    if (!isNew) {
      await this.fillEntities({data : [entity]}, opts)
    }

    return entity;
  }

  async duplicateAllToYear(sources: SamplingStrategy[], year: number): Promise<Strategy[]> {

    if (isEmptyArray(sources)) return [];
    if (isNilOrNaN(year) || typeof year !== "number" || year < 1970) throw Error('Missing or invalid year argument (should be YYYY format)');

    // CLear cache (only once)
    await this.strategyService.clearCache();

    const savedEntities: Strategy[] = [];

    // WARN: do not use a Promise.all, because parallel execution not working (label computation need series execution)
    for (const source of sources) {
      const newLabelPrefix = year.toString().substring(2) + source.label.substring(2, 9);
      const newLabel = await this.strategyService.computeNextLabel(source.programId, newLabelPrefix, 3);

      const target = await this.strategyService.cloneToYear(source, year, newLabel);

      const targetAsSampling = SamplingStrategy.fromObject(target.asObject());

      const savedEntity = await this.save(targetAsSampling, {clearCache: false /*already done once*/})

      savedEntities.push(savedEntity);
    }

    return savedEntities;
  }

  /* -- protected -- */

  watchPmfmIdsByParameterLabels(parameterLabels: string[]): Observable<number[]> {
    return this.referentialRefService.watchAll(0, 1000, 'id', 'asc', {
      entityName: "Pmfm",
      levelLabels: parameterLabels
    }, {
      withTotal: false
    }).pipe(
      map((res) => {
        return (res.data || []).map(p => p.id);
      }));
  }

  async loadStrategyEffortByDate(programLabel: string, strategyLabel: string, date: Moment): Promise<StrategyEffort> {
    if (!programLabel || !strategyLabel || !date) throw new Error('Missing a required argument');

    const {data} = await this.loadAll(0, 1, 'label', 'asc', {
      label: strategyLabel,
      levelLabel: programLabel
    }, {
      withEffort: true,
      withTotal: false,
      withParameterGroups: false,
      fetchPolicy: 'cache-first'
    });
    const strategy = firstArrayValue(data);
    if (strategy && strategy.effortByQuarter) {
      const effortByQuarter = strategy.effortByQuarter[date?.quarter()];
      // Check same year
      if (effortByQuarter && effortByQuarter.startDate?.year() === date?.year()) {
        return effortByQuarter;
      }
    }
    return undefined; // No effort at this date
  }

  async fillEntities(res: LoadResult<SamplingStrategy>, opts?: {
    fetchPolicy?: FetchPolicy;
    withEffort?: boolean;
    withParameterGroups?: boolean;
    cache?: boolean;
  }): Promise<LoadResult<SamplingStrategy>> {
    if (!res || isEmptyArray(res.data)) return res;

    const jobs: Promise<void>[] = [];

    // Fill parameters groups
    if (!opts || opts.withParameterGroups !== false) {
      jobs.push(this.fillParameterGroups(res.data));
    }

    // Fill strategy efforts
    if (!opts || opts.withEffort !== false) {
      jobs.push(this.fillEfforts(res.data, opts)
        .catch(err => {
          console.error("Error while computing effort: " + err && err.message || err, err);
          res.errors = (res.errors || []).concat(err);
        })
      );
    }

    // Wait jobs end
    if (jobs.length) await Promise.all(jobs);

    return res;
  }

  /**
   * Fill parameterGroups attribute, on each denormalized strategy
   * @param entities
   */
  protected async fillParameterGroups(entities: SamplingStrategy[]) {

    // DEBUG
    console.debug('[sampling-strategy-service] Fill parameters groups...');

    const parameterListKeys = Object.keys(ParameterLabelGroups)
      // Exclude some special groups (DRESSING, TAG_ID) but  keep other (e.g. AGE, SEX, MATURITY, etc)
      .filter(p => !ParameterLabelGroups.TAG_ID.includes(p)
        && !ParameterLabelGroups.DRESSING.includes(p));
    const pmfmIdsMap = await this.pmfmService.loadIdsGroupByParameterLabels(ParameterLabelGroups);

    entities.forEach(s => {
      const pmfms = s.pmfms;
      s.parameterGroups = (pmfms && parameterListKeys || []).reduce((res, key) => {
        return pmfms.some(p => pmfmIdsMap[key].includes(p.pmfmId) || (p.parameter?.label && p.parameter.label.includes(key))) ? res.concat(key) : res;
      }, []);
    });
  }

  async fillEfforts(entities: SamplingStrategy[], opts?: {
    fetchPolicy?: FetchPolicy;
    cache?: boolean; // enable by default
    cacheDuration?: ExtractionCacheDurationType;
  }): Promise<void> {

    const withCache = (!opts || opts.cache !== false);
    const cacheDuration = withCache ? (opts && opts.cacheDuration || 'default') : undefined;

    const now = Date.now();
    console.debug(`[sampling-strategy-service] Fill efforts on ${entities.length} strategies... {cache: ${withCache}${withCache ? ', cacheDuration: \'' + cacheDuration + '\'' : ''}}`);

    const ids = (entities || [])
      .filter(s => isNotNil(s.id) && (!withCache || !s.hasRealizedEffort)) // Remove new, or existing efforts
      .map(s => s.id.toString());
    if (isEmptyArray(ids)) {
      console.debug(`[sampling-strategy-service] No effort to load: Skip`);
      return; // Skip is empty
    }

    const variables = {
      ids,
      offset: 0,
      size: 1000, // All rows
      sortBy: 'start_date',
      sortDirection: 'asc',
      cacheDuration
    };

    console.debug('[sampling-strategy-service] Fill efforts using variables:', variables);

    const {data} = await this.graphql.query<{data: { strategy: string; startDate: string; endDate: string; expectedEffort}[]}>({
      query: SamplingStrategyQueries.loadEffort,
      variables,
      fetchPolicy: opts && opts.fetchPolicy || 'no-cache'
    });

    entities.forEach(s => {
      // Clean existing efforts
      s.efforts = undefined;

      // Clean realized efforts
      // /!\ BUT keep expected effort (comes from strategies table)
      if (s.effortByQuarter) {
        [1, 2, 3, 4].map(quarter => s.effortByQuarter[quarter])
          .filter(isNotNil)
          .forEach(effort => {
            effort.realizedEffort = 0;
            effort.landingCount = 0;
          })
      }
    });

    // Add effort to entities
    (data || [])
      .map(StrategyEffort.fromObject)
      .forEach(effort => {
        const strategy = entities.find(s => s.label === effort.strategyLabel);
        if (strategy) {
          strategy.efforts = strategy.efforts || [];

          if (isNotNil(effort.quarter)) {
            strategy.effortByQuarter = strategy.effortByQuarter || {};
            const existingEffort = strategy.effortByQuarter[effort.quarter];

            // Set the quarter's effort
            if (!existingEffort) {
              // Do a copy, to be able to increment if more than one effort by quarter
              //strategy.effortByQuarter[effort.quarter] = effort.clone(); => Code disable since it keeps strategy efforts for deleted applied period efforts
            }
            // More than one effort, on this quarter
            else {
              effort.expectedEffort = existingEffort.expectedEffort; // Update efforts expected effort with last value from effortByQuarter.
              strategy.efforts.push(effort); // moved here from global loop in order to prevent copy of obsolete deleted efforts.
              // Merge properties
              existingEffort.startDate = DateUtils.min(existingEffort.startDate, effort.startDate);
              existingEffort.endDate = DateUtils.max(existingEffort.endDate, effort.endDate);
              existingEffort.realizedEffort += effort.realizedEffort;
              existingEffort.landingCount += effort.landingCount;
            }
          }
        }
        else {
          console.warn(`[sampling-strategy-service] An effort has unknown strategy '${effort.strategyLabel}'. Skipping. Please check GraphQL query 'extraction' of type 'strat'.`);
        }
      });

    console.debug(`[sampling-strategy-service] Efforts filled in ${Date.now() - now}ms`);

  }
}
