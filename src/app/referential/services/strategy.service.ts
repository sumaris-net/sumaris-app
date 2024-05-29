import { Injectable, Injector } from '@angular/core';
import { FetchPolicy, gql, StoreObject } from '@apollo/client/core';
import { ReferentialFragments } from './referential.fragments';
import {
  AccountService,
  BaseEntityGraphqlMutations,
  BaseEntityGraphqlQueries,
  BaseEntityGraphqlSubscriptions,
  chainPromises,
  ConfigService,
  Configuration,
  CORE_CONFIG_OPTIONS,
  DateUtils,
  EntitiesServiceLoadOptions,
  EntitiesServiceWatchOptions,
  EntitiesStorage,
  EntityAsObjectOptions,
  EntitySaveOptions,
  EntityUtils,
  firstNotNilPromise,
  fromDateISOString,
  IReferentialRef,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNilOrNaN,
  isNotEmptyArray,
  isNotNil,
  JsonUtils,
  LoadResult,
  NetworkService,
  Referential,
  ReferentialRef,
  ReferentialUtils,
  toNumber,
} from '@sumaris-net/ngx-components';
import { CacheService } from 'ionic-cache';
import { ErrorCodes } from './errors';

import { AppliedPeriod, AppliedStrategy, Strategy, StrategyDepartment, TaxonNameStrategy } from './model/strategy.model';
import { SortDirection } from '@angular/material/sort';
import { ReferentialRefService } from './referential-ref.service';
import { StrategyFragments } from './strategy.fragments';
import { BaseReferentialService, IReferentialEntityService } from './base-referential-service.class';
import { Pmfm } from './model/pmfm.model';
import { ProgramRefService } from './program-ref.service';
import { StrategyRefService } from './strategy-ref.service';
import { ReferentialRefFilter } from './filter/referential-ref.filter';
import { StrategyFilter } from '@app/referential/services/filter/strategy.filter';
import { PmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { ProgramService } from '@app/referential/services/program.service';
import { Program } from '@app/referential/services/model/program.model';
import { COPY_LOCALLY_AS_OBJECT_OPTIONS } from '@app/data/services/model/data-entity.model';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { Moment } from 'moment';

const FindStrategyNextLabel: any = gql`
  query StrategyNextLabelQuery($programId: Int!, $labelPrefix: String, $nbDigit: Int) {
    data: strategyNextLabel(programId: $programId, labelPrefix: $labelPrefix, nbDigit: $nbDigit)
  }
`;

const FindStrategyNextSampleLabel: any = gql`
  query StrategyNextSampleLabelQuery($strategyLabel: String!, $labelSeparator: String, $nbDigit: Int) {
    data: strategyNextSampleLabel(strategyLabel: $strategyLabel, labelSeparator: $labelSeparator, nbDigit: $nbDigit)
  }
`;

const LoadAllAnalyticReferencesQuery: any = gql`
  query AnalyticReferencesQuery($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput) {
    data: analyticReferences(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter) {
      ...LightReferentialFragment
    }
  }
  ${ReferentialFragments.lightReferential}
`;
const LoadAllAnalyticReferencesWithTotalQuery: any = gql`
  query AnalyticReferencesQuery($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput) {
    data: analyticReferences(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter) {
      ...LightReferentialFragment
    }
    total: analyticReferencesCount(filter: $filter)
  }
  ${ReferentialFragments.lightReferential}
`;

const FindStrategiesReferentials: any = gql`
  query StrategiesReferentials(
    $programId: Int!
    $locationClassification: LocationClassificationEnum
    $entityName: String
    $offset: Int
    $size: Int
    $sortBy: String
    $sortDirection: String
  ) {
    data: strategiesReferentials(
      programId: $programId
      locationClassification: $locationClassification
      entityName: $entityName
      offset: $offset
      size: $size
      sortBy: $sortBy
      sortDirection: $sortDirection
    ) {
      ...LightReferentialFragment
    }
  }
  ${ReferentialFragments.lightReferential}
`;

const StrategyQueries: BaseEntityGraphqlQueries & { loadAllFull: any } = {
  load: gql`
    query Strategy($id: Int!) {
      data: strategy(id: $id) {
        ...StrategyFragment
      }
    }
    ${StrategyFragments.strategy}
    ${StrategyFragments.appliedStrategy}
    ${StrategyFragments.appliedPeriod}
    ${StrategyFragments.strategyDepartment}
    ${StrategyFragments.pmfmStrategy}
    ${StrategyFragments.taxonGroupStrategy}
    ${StrategyFragments.taxonNameStrategy}
    ${ReferentialFragments.lightReferential}
    ${ReferentialFragments.pmfm}
    ${ReferentialFragments.parameter}
    ${ReferentialFragments.referential}
    ${ReferentialFragments.taxonName}
  `,

  loadAll: gql`
    query Strategies($filter: StrategyFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: strategies(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...LightStrategyFragment
      }
    }
    ${StrategyFragments.lightStrategy}
    ${StrategyFragments.appliedStrategy}
    ${StrategyFragments.appliedPeriod}
    ${ReferentialFragments.lightReferential}
  `,

  loadAllWithTotal: gql`
    query StrategiesWithTotal($filter: StrategyFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: strategies(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...LightStrategyFragment
      }
      total: strategiesCount(filter: $filter)
    }
    ${StrategyFragments.lightStrategy}
    ${StrategyFragments.appliedStrategy}
    ${StrategyFragments.appliedPeriod}
    ${ReferentialFragments.lightReferential}
  `,

  loadAllFull: gql`
    query Strategies($filter: StrategyFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: strategies(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...StrategyFragment
      }
    }
    ${StrategyFragments.strategy}
    ${StrategyFragments.appliedStrategy}
    ${StrategyFragments.appliedPeriod}
    ${StrategyFragments.strategyDepartment}
    ${StrategyFragments.pmfmStrategy}
    ${StrategyFragments.taxonGroupStrategy}
    ${StrategyFragments.taxonNameStrategy}
    ${ReferentialFragments.lightReferential}
    ${ReferentialFragments.pmfm}
    ${ReferentialFragments.parameter}
    ${ReferentialFragments.referential}
    ${ReferentialFragments.taxonName}
  `,

  countAll: gql`
    query StrategyCount($filter: StrategyFilterVOInput!) {
      total: strategiesCount(filter: $filter)
    }
  `,
};

const StrategyMutations: BaseEntityGraphqlMutations = {
  save: gql`
    mutation SaveStrategy($data: StrategyVOInput!) {
      data: saveStrategy(strategy: $data) {
        ...StrategyFragment
      }
    }
    ${StrategyFragments.strategy}
    ${StrategyFragments.appliedStrategy}
    ${StrategyFragments.appliedPeriod}
    ${StrategyFragments.pmfmStrategy}
    ${StrategyFragments.strategyDepartment}
    ${StrategyFragments.taxonGroupStrategy}
    ${StrategyFragments.taxonNameStrategy}
    ${ReferentialFragments.lightReferential}
    ${ReferentialFragments.pmfm}
    ${ReferentialFragments.parameter}
    ${ReferentialFragments.referential}
    ${ReferentialFragments.taxonName}
  `,

  delete: gql`
    mutation DeleteAllStrategies($id: Int!) {
      deleteStrategy(id: $id)
    }
  `,
};

const StrategySubscriptions: BaseEntityGraphqlSubscriptions = {
  listenChanges: gql`
    subscription UpdateReferential($id: Int!, $interval: Int) {
      data: updateReferential(entityName: "Strategy", id: $id, interval: $interval) {
        ...LightReferentialFragment
      }
    }
    ${ReferentialFragments.lightReferential}
  `,
};

export interface StrategyServiceWatchOptions extends EntitiesServiceWatchOptions {}
export interface StrategyServiceLoadOptions extends EntitiesServiceLoadOptions {}

@Injectable({ providedIn: 'root' })
export class StrategyService
  extends BaseReferentialService<Strategy, StrategyFilter, number, StrategyServiceWatchOptions, StrategyServiceLoadOptions>
  implements IReferentialEntityService<Strategy, StrategyFilter, number, StrategyServiceLoadOptions>
{
  $dbTimeZone = new BehaviorSubject<string>(null);

  get dbTimeZone(): string {
    return this.$dbTimeZone.value || DateUtils.moment().tz();
  }

  constructor(
    injector: Injector,
    protected network: NetworkService,
    protected accountService: AccountService,
    protected cache: CacheService,
    protected entities: EntitiesStorage,
    protected translate: TranslateService,
    protected programService: ProgramService,
    protected programRefService: ProgramRefService,
    protected strategyRefService: StrategyRefService,
    protected referentialRefService: ReferentialRefService,
    protected configService: ConfigService
  ) {
    super(injector, Strategy, StrategyFilter, {
      queries: StrategyQueries,
      mutations: StrategyMutations,
      subscriptions: StrategySubscriptions,
    });

    this.configService.config.subscribe((config) => this.onConfigChanged(config));
  }

  async getDateRangeByLabel(label: string): Promise<{ startDate: Moment; endDate: Moment }> {
    const strategy = await this.loadByLabel(label);
    return strategy.appliedStrategies.reduce(
      (res1, appliedStrategy) =>
        appliedStrategy.appliedPeriods.reduce((res2, period) => {
          res2.startDate = DateUtils.min(res2.startDate, period.startDate).clone();
          res2.endDate = DateUtils.max(res2.endDate, period.endDate).clone();
          return res2;
        }, res1),
      { startDate: undefined, endDate: undefined }
    );
  }

  private onConfigChanged(config: Configuration) {
    const dbTimeZone = config.getProperty(CORE_CONFIG_OPTIONS.DB_TIMEZONE);
    this.$dbTimeZone.next(dbTimeZone);
  }

  async existsByLabel(
    label: string,
    opts?: {
      programId?: number;
      excludedIds?: number[];
      fetchPolicy?: FetchPolicy;
    }
  ): Promise<boolean> {
    if (isNilOrBlank(label)) throw new Error("Missing argument 'label' ");

    const filter: Partial<StrategyFilter> = {
      label,
      levelId: opts && isNotNil(opts.programId) ? opts.programId : undefined,
      excludedIds: opts && isNotNil(opts.excludedIds) ? opts.excludedIds : undefined,
    };
    const { total } = await this.graphql.query<{ total: number }>({
      query: this.queries.countAll,
      variables: { filter },
      error: { code: ErrorCodes.LOAD_STRATEGY_ERROR, message: 'ERROR.LOAD_ERROR' },
      fetchPolicy: (opts && opts.fetchPolicy) || undefined,
    });
    return toNumber(total, 0) > 0;
  }

  async computeNextLabel(programId: number, labelPrefix?: string, nbDigit?: number): Promise<string> {
    if (this._debug) console.debug(`[strategy-service] Loading strategy next label for prefix ${labelPrefix}...`);

    const res = await this.graphql.query<{ data: string }>({
      query: FindStrategyNextLabel,
      variables: {
        programId,
        labelPrefix,
        nbDigit,
      },
      error: { code: ErrorCodes.LOAD_PROGRAM_ERROR, message: 'PROGRAM.STRATEGY.ERROR.LOAD_STRATEGY_LABEL_ERROR' },
      fetchPolicy: 'network-only',
    });
    return res && res.data;
  }

  async computeNextSampleTagId(strategyLabel: string, labelSeparator?: string, nbDigit?: number): Promise<string> {
    if (this._debug) console.debug(`[strategy-service] Loading strategy next sample label...`);

    const res = await this.graphql.query<{ data: string }>({
      query: FindStrategyNextSampleLabel,
      variables: {
        strategyLabel,
        labelSeparator,
        nbDigit,
      },
      error: { code: ErrorCodes.LOAD_PROGRAM_ERROR, message: 'PROGRAM.STRATEGY.ERROR.LOAD_STRATEGY_SAMPLE_LABEL_ERROR' },
      fetchPolicy: 'network-only',
    });
    return res && res.data;
  }

  async loadByLabel(label: string) {
    const filter = StrategyFilter.fromObject({ label });
    const result = await this.loadAll(0, 1, 'id', 'asc', filter);
    return (isNotEmptyArray(result.data) && result.data[0]) || null;
  }

  async loadStrategiesReferentials<T extends IReferentialRef = ReferentialRef>(
    programId: number,
    entityName: string,
    locationClassification?: string,
    offset?: number,
    size?: number,
    sortBy?: string,
    sortDirection?: SortDirection
  ): Promise<T[]> {
    if (this._debug) console.debug(`[strategy-service] Loading strategies referential (predoc) for ${entityName}...`);

    const res = await this.graphql.query<LoadResult<T>>({
      query: FindStrategiesReferentials,
      variables: {
        programId,
        locationClassification,
        entityName,
        offset: offset || 0,
        size: size || 100,
        sortBy: sortBy || 'label',
        sortDirection: sortDirection || 'asc',
      },
      error: { code: ErrorCodes.LOAD_PROGRAM_ERROR, message: 'PROGRAM.STRATEGY.ERROR.LOAD_STRATEGY_SAMPLE_LABEL_ERROR' },
      fetchPolicy: 'network-only',
    });

    return (res?.data || []) as T[];
  }

  async loadAllAnalyticReferences(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: Partial<ReferentialRefFilter>,
    opts?: {
      withTotal?: boolean;
      toEntity?: boolean;
    }
  ): Promise<LoadResult<ReferentialRef>> {
    filter = ReferentialRefFilter.fromObject(filter);
    const variables: any = {
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || 'label',
      sortDirection: sortDirection || 'asc',
      filter: filter && filter.asPodObject(),
    };

    const now = this._debug && Date.now();
    if (this._debug) console.debug(`[strategy-service] Loading analytic references...`, variables);

    const withTotal = !opts || opts.withTotal !== false;
    const query = withTotal ? LoadAllAnalyticReferencesWithTotalQuery : LoadAllAnalyticReferencesQuery;
    const { data, total } = await this.graphql.query<LoadResult<any>>({
      query,
      variables,
      error: { code: ErrorCodes.LOAD_STRATEGY_ANALYTIC_REFERENCES_ERROR, message: 'PROGRAM.STRATEGY.ERROR.LOAD_STRATEGY_ANALYTIC_REFERENCES_ERROR' },
      fetchPolicy: 'cache-first',
    });

    const entities = !opts || opts.toEntity !== false ? data && data.map(ReferentialRef.fromObject) : (data as ReferentialRef[]);

    const res: LoadResult<ReferentialRef> = {
      data: entities,
      total,
    };

    // Add fetch more capability, if total was fetched
    if (withTotal) {
      const nextOffset = offset + entities.length;
      if (nextOffset < total) {
        res.fetchMore = () => this.loadAllAnalyticReferences(nextOffset, size, sortBy, sortDirection, filter, opts);
      }
    }

    if (this._debug) console.debug(`[strategy-service] Analytic references loaded in ${Date.now() - now}ms`);

    return res;
  }

  async suggestAnalyticReferences(
    value: any,
    filter?: ReferentialRefFilter,
    sortBy?: keyof Referential,
    sortDirection?: SortDirection
  ): Promise<LoadResult<ReferentialRef>> {
    if (ReferentialUtils.isNotEmpty(value)) return { data: [value] };
    value = (typeof value === 'string' && value !== '*' && value) || undefined;
    return this.loadAllAnalyticReferences(0, !value ? 30 : 10, sortBy, sortDirection, { ...filter, searchText: value }, { withTotal: true });
  }

  canUserWrite(data?: Strategy, opts?: { program: Program }): boolean {
    // user is admin: ok
    if (this.accountService.isAdmin()) return true;

    // Check if user is a program manager (if given)
    if (ReferentialUtils.isNotEmpty(opts?.program)) {
      // TODO check in strategy's managers
      return this.programService.canUserWrite(opts.program);
    }

    //const isNew = (!data || isNil(data.id);
    return this.accountService.isSupervisor();
  }

  copyIdAndUpdateDate(source: Strategy, target: Strategy) {
    EntityUtils.copyIdAndUpdateDate(source, target);

    // Make sure tp copy programId (need by equals)
    target.programId = source.programId;

    // Applied strategies
    if (source.appliedStrategies && target.appliedStrategies) {
      target.appliedStrategies.forEach((targetAppliedStrategy) => {
        // Make sure to copy strategyId (need by equals)
        targetAppliedStrategy.strategyId = source.id;

        // Copy id and update date
        const savedAppliedStrategy = (source.appliedStrategies || []).find((as) => targetAppliedStrategy.equals(as));
        EntityUtils.copyIdAndUpdateDate(savedAppliedStrategy, targetAppliedStrategy);
      });
    }

    // Pmfm strategies
    if (source.pmfms && target.pmfms) {
      target.pmfms.forEach((targetPmfmStrategy) => {
        // Make sure to copy strategyId (need by equals)
        targetPmfmStrategy.strategyId = source.id;

        // Copy id and update date
        const savedPmfmStrategy = source.pmfms.find((srcPmfmStrategy) => targetPmfmStrategy.equals(srcPmfmStrategy));
        EntityUtils.copyIdAndUpdateDate(savedPmfmStrategy, targetPmfmStrategy);

        // Copy pmfm
        targetPmfmStrategy.pmfm = Pmfm.fromObject(savedPmfmStrategy?.pmfm) || targetPmfmStrategy.pmfm;
      });
    }
  }

  async saveAll(
    data: Strategy[],
    opts?: EntitySaveOptions & {
      clearCache?: boolean;
    }
  ): Promise<Strategy[]> {
    if (!data) return data;

    // Clear cache (once)
    if (!opts || opts.clearCache !== false) {
      await this.clearCache();
    }

    return chainPromises(data.map((entity) => () => this.save(entity, { ...opts, clearCache: false })));
  }

  async save(
    entity: Strategy,
    opts?: EntitySaveOptions & {
      clearCache?: boolean;
    }
  ): Promise<Strategy> {
    // Clear cache
    if (!opts || opts.clearCache !== false) {
      await this.clearCache();
    }

    return super.save(entity, {
      ...opts,
      refetchQueries: this._mutableWatchQueries.filter(
        (query) => query.query === this.queries.loadAllWithTotal || query.query === this.queries.loadAllWithTotal
      ),
      awaitRefetchQueries: true,
    });
  }

  async cloneToYear(source: Strategy, year: number, newLabel?: string): Promise<Strategy> {
    if (!source || isNil(source.programId)) throw Error('Missing strategy or strategy.programId, or newLabel argument');
    if (isNilOrNaN(year) || typeof year !== 'number' || year < 1970) throw Error('Missing or invalid year argument (should be YYYY format)');
    newLabel = newLabel || (source.label && `${source.label} (bis)`);
    if (isNilOrBlank(newLabel)) throw Error('Missing strategy.label or newLabel argument');

    const target = new Strategy();

    target.label = newLabel;
    target.name = newLabel;
    target.description = newLabel;
    target.analyticReference = source.analyticReference;
    target.programId = source.programId;

    const dbTimeZone = await firstNotNilPromise(this.$dbTimeZone, { stop: this.stopSubject });

    target.appliedStrategies = (source.appliedStrategies || []).map((sourceAppliedStrategy) => {
      const targetAppliedStrategy = new AppliedStrategy();
      targetAppliedStrategy.id = undefined;
      targetAppliedStrategy.updateDate = undefined;
      targetAppliedStrategy.location = sourceAppliedStrategy.location;
      targetAppliedStrategy.appliedPeriods = (sourceAppliedStrategy.appliedPeriods || []).map((sourceAppliedPeriod) => {
        // DEBUG
        console.debug(`[strategy-service] Duplicate applied period, into year ${year}`, sourceAppliedPeriod);

        return AppliedPeriod.fromObject({
          acquisitionNumber: sourceAppliedPeriod.acquisitionNumber,
          startDate: sourceAppliedPeriod.startDate
            ?.clone()
            // Keep DB local time, because the DB can use a local time - fix ObsBio-79
            .tz(dbTimeZone, true)
            .year(year),
          endDate: sourceAppliedPeriod.endDate
            ?.clone()
            // Keep the local time, because the DB can use a local time - fix ObsBio-79
            .tz(dbTimeZone, true)
            .year(year),
        });
      });
      return targetAppliedStrategy;
    });

    target.pmfms =
      (source.pmfms &&
        source.pmfms.map((pmfmStrategy) => {
          const pmfmStrategyCloned = pmfmStrategy.clone();
          pmfmStrategyCloned.id = undefined;
          pmfmStrategyCloned.strategyId = undefined;
          return PmfmStrategy.fromObject(pmfmStrategyCloned);
        })) ||
      [];
    target.departments =
      (source.departments &&
        source.departments.map((department) => {
          const departmentCloned = department.clone();
          departmentCloned.id = undefined;
          departmentCloned.strategyId = undefined;
          return StrategyDepartment.fromObject(departmentCloned);
        })) ||
      [];
    target.taxonNames =
      (source.taxonNames &&
        source.taxonNames.map((taxonNameStrategy) => {
          const taxonNameStrategyCloned = taxonNameStrategy.clone();
          taxonNameStrategyCloned.strategyId = undefined;
          return TaxonNameStrategy.fromObject(taxonNameStrategyCloned);
        })) ||
      [];
    target.id = undefined;
    target.updateDate = undefined;
    target.comments = source.comments;
    target.creationDate = undefined;
    target.statusId = source.statusId;
    target.validityStatusId = source.validityStatusId;
    target.levelId = source.levelId;
    target.parentId = source.parentId;
    target.entityName = source.entityName;
    target.denormalizedPmfms = undefined;
    target.gears = undefined;
    target.taxonGroups = undefined;

    return target;
  }

  async clearCache() {
    // Make sure to clean all strategy references (.e.g Pmfm cache, etc)
    await Promise.all([this.programRefService.clearCache(), this.strategyRefService.clearCache()]);
  }

  async duplicateByIds(ids: number[], opts?: { year?: number; program?: Program }) {
    if (isEmptyArray(ids)) throw Error('Required not empty array of ids');

    const dbTimeZone = await firstNotNilPromise(this.$dbTimeZone, { stop: this.stopSubject, timeout: 2000 });

    // Load entities
    const { data: sources } = await this.loadAll(
      0,
      ids.length,
      'creationDate',
      'asc',
      <Partial<StrategyFilter>>{
        includedIds: ids,
      },
      {
        withTotal: false,
        query: StrategyQueries.loadAllFull,
      }
    );

    if (!sources.length) throw Error('COMMON.NO_RESULT');
    const year = opts?.year;

    // Duplicate json
    const targets = sources
      .map((source) => {
        const target = source.asObject({ ...COPY_LOCALLY_AS_OBJECT_OPTIONS, ...opts, minify: false });
        // Keep program Id
        target.programId = source.programId;

        // Change year
        if (year > 0) {
          target.appliedStrategies
            ?.flatMap((as) => as.appliedPeriods || [])
            .forEach((ap) => {
              ap.startDate = fromDateISOString(ap.startDate)
                ?.clone()
                // Keep DB local time, because the DB can use a local time - fix ObsBio-79
                .tz(dbTimeZone, true)
                .year(year)
                .toISOString();
              ap.endDate = fromDateISOString(ap.endDate)
                ?.clone()
                // Keep the local time, because the DB can use a local time - fix ObsBio-79
                .tz(dbTimeZone, true)
                .year(year)
                .toISOString();
            });
        }
        return target;
      })
      .map(Strategy.fromObject);

    return await this.saveAll(targets);
  }

  async exportToJsonByIds(ids: number[], opts?: { keepRemoteId: boolean; program?: Program }) {
    if (isEmptyArray(ids)) throw Error('Required not empty array of ids');

    // Load entities
    const { data } = await this.loadAll(
      0,
      ids.length,
      'creationDate',
      'asc',
      <Partial<StrategyFilter>>{
        includedIds: ids,
      },
      {
        withTotal: false,
        query: StrategyQueries.loadAllFull,
      }
    );

    if (!data.length) throw Error('COMMON.NO_RESULT');

    // To json
    const jsonArray = data.map((entity) => entity.asObject({ ...COPY_LOCALLY_AS_OBJECT_OPTIONS, ...opts, minify: false }));

    const program = opts.program || (await this.programRefService.load(data[0].programId));
    const filename = this.translate.instant('PROGRAM.STRATEGY.DOWNLOAD_MANY_JSON_FILENAME', {
      programLabel: program?.label,
    });

    // Export to file
    JsonUtils.exportToFile(jsonArray, { filename });
  }

  async downloadAsJson(entity: Strategy, opts?: { keepRemoteId: boolean; program?: Program }) {
    if (!entity) throw new Error("Missing required 'entity' argument");
    if (isNilOrNaN(entity.programId)) throw new Error("Missing required 'entity.programId'");

    // Convert strategy into JSON
    const json = Strategy.fromObject(entity).asObject({ ...COPY_LOCALLY_AS_OBJECT_OPTIONS, ...opts, minify: false });
    delete json.denormalizedPmfms; // Not used, because we already have pmfms

    const program = opts.program || (await this.programRefService.load(entity.programId));
    const filename = this.translate.instant('PROGRAM.STRATEGY.DOWNLOAD_JSON_FILENAME', {
      programLabel: program?.label,
      label: entity.label,
    });

    // Export to file
    JsonUtils.exportToFile(json, { filename });
  }

  protected asObject(entity: Strategy, opts?: EntityAsObjectOptions): StoreObject {
    const target: any = super.asObject(entity, opts);

    (target.pmfms || []).forEach((pmfmStrategy) => {
      pmfmStrategy.pmfmId = toNumber(pmfmStrategy.pmfm && pmfmStrategy.pmfm.id, pmfmStrategy.pmfmId);
      delete pmfmStrategy.pmfm;
    });

    return target;
  }
}
