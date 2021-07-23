import {Injectable} from "@angular/core";
import {FetchPolicy, gql} from "@apollo/client/core";
import {ReferentialFragments} from "./referential.fragments";
import {GraphqlService}  from "@sumaris-net/ngx-components";
import {CacheService} from "ionic-cache";
import {AccountService}  from "@sumaris-net/ngx-components";
import {NetworkService}  from "@sumaris-net/ngx-components";
import {EntitiesStorage}  from "@sumaris-net/ngx-components";
import {PlatformService}  from "@sumaris-net/ngx-components";
import {SortDirection} from "@angular/material/sort";
import {StrategyFragments} from "./strategy.fragments";
import {LoadResult} from "@sumaris-net/ngx-components";
import {StrategyService} from "./strategy.service";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
import {firstArrayValue, isEmptyArray, isNotNil} from "@sumaris-net/ngx-components";
import {ParameterLabelGroups, PmfmLabelPatterns} from './model/model.enum';
import {ConfigService}  from "@sumaris-net/ngx-components";
import {PmfmService} from "./pmfm.service";
import {ReferentialRefService} from "./referential-ref.service";
import {mergeMap} from "rxjs/operators";
import {DateUtils} from "@sumaris-net/ngx-components";
import {SamplingStrategy, StrategyEffort} from "./model/sampling-strategy.model";
import {BaseReferentialService} from "./base-referential-service.class";
import {Moment} from "moment";
import {StrategyFilter} from '@app/referential/services/filter/strategy.filter';

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
  ${StrategyFragments.taxonGroupStrategy}
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
  ${StrategyFragments.taxonGroupStrategy}
  ${StrategyFragments.taxonNameStrategy}
  ${ReferentialFragments.lightPmfm}
  ${ReferentialFragments.referential}
  ${ReferentialFragments.taxonName}
  `,
  loadEffort: gql`query StrategyEffort($extractionType: String!,
    $offset: Int, $size: Int, $sortBy: String, $sortDirection: String,
    $viewSheetName: String!, $filterSheetName: String!,
    $columnName: String!, $operator: String!, $values: [String!]!) {
    data: extraction(
      type: {label: $extractionType},
      offset: $offset,
      size: $size,
      sortBy: $sortBy,
      sortDirection: $sortDirection,
      filter: {
        sheetName: $viewSheetName,
        criteria: [
          {sheetName: $filterSheetName, name: $columnName, operator: $operator, values: $values}
        ]
      }
    )
  }`
};

@Injectable({providedIn: 'root'})
export class SamplingStrategyService extends BaseReferentialService<SamplingStrategy, StrategyFilter> {

  constructor(
    graphql: GraphqlService,
    platform: PlatformService,
    protected network: NetworkService,
    protected accountService: AccountService,
    protected cache: CacheService,
    protected entities: EntitiesStorage,
    protected configService: ConfigService,
    protected strategyService: StrategyService,
    protected pmfmService: PmfmService,
    protected referentialRefService: ReferentialRefService
  ) {
    super(graphql, platform, SamplingStrategy, StrategyFilter,
      {
        queries: SamplingStrategyQueries
      });
  }

  watchAll(offset: number, size: number, sortBy?: string, sortDirection?: SortDirection, filter?: StrategyFilter,
           opts?: {
             fetchPolicy?: FetchPolicy;
             withTotal: boolean;
             withEffort?: boolean;
             toEntity?: boolean;
          }): Observable<LoadResult<SamplingStrategy>> {
    // Call normal watch all
    return super.watchAll(offset, size, sortBy, sortDirection, filter, opts)
      // Then fill content, using additional queries (effort, parameter groups, etc)
      .pipe(
        mergeMap(res => this.fillEntities(res, opts)
      ));
  }

  async loadAll(offset: number, size: number, sortBy?: string, sortDirection?: SortDirection,
                filter?: Partial<StrategyFilter>,
           opts?: { fetchPolicy?: FetchPolicy; withTotal: boolean; withEffort?: boolean; withParameterGroups?: boolean; toEntity?: boolean; }
  ): Promise<LoadResult<SamplingStrategy>> {
    const res = await super.loadAll(offset, size, sortBy, sortDirection, filter, opts);

    // Fill entities (parameter groups, effort, etc)
    return this.fillEntities(res, opts);
  }

  async deleteAll(entities: SamplingStrategy[], options?: any): Promise<any> {
    return this.strategyService.deleteAll(entities, options);
  }

  async computeNextSampleTagId(strategyLabel: string, separator?: string, nbDigit?: number): Promise<string> {
    return this.strategyService.computeNextSampleTagId(strategyLabel, separator, nbDigit);
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

  async hasEffort(samplingStrategy: SamplingStrategy, opts?: {
    fetchPolicy?: FetchPolicy;
  }): Promise<boolean> {
    await this.fillEfforts([samplingStrategy], opts);
    return samplingStrategy.hasRealizedEffort;
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
      fetchPolicy: "cache-first"
    });
    const strategy = firstArrayValue(data);
    if (strategy && strategy.effortByQuarter) {
      const effortByQuarter = strategy.effortByQuarter[date.quarter()];
      // Check same year
      if (effortByQuarter && effortByQuarter.startDate.year() === date.year()) {
        return effortByQuarter;
      }
    }
    return undefined; // No effort at this date
  }

  async fillEntities(res: LoadResult<SamplingStrategy>, opts?: {
    fetchPolicy?: FetchPolicy; withEffort?: boolean; withParameterGroups?: boolean;
  }): Promise<LoadResult<SamplingStrategy>> {
    if (!res) return res;

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
    await Promise.all(jobs);

    return res;
  }

  /**
   * Fill parameterGroups attribute, on each denormalized strategy
   * @param entities
   */
  protected async fillParameterGroups(entities: SamplingStrategy[]): Promise<void> {

    const parameterListKeys = Object.keys(ParameterLabelGroups).filter(p => p !== 'TAG_ID' && p !== 'DRESSING'); // AGE, SEX, MATURITY, etc
    const pmfmIdsMap = await this.pmfmService.loadIdsGroupByParameterLabels(ParameterLabelGroups);

    entities.forEach(s => {
      const pmfms = s.pmfms;
      s.parameterGroups = (pmfms && parameterListKeys || []).reduce((res, key) => {
        return pmfms.findIndex(p => pmfmIdsMap[key].includes(p.pmfmId) || (p.parameter && p.parameter.label && p.parameter.label.includes(key))) !== -1 ? res.concat(key) : res;
      }, []);
    });
  }

  async fillEfforts(entities: SamplingStrategy[], opts?: {
    fetchPolicy?: FetchPolicy;
  }): Promise<void> {
    if (isEmptyArray(entities)) return; // Skip is empty

    console.debug(`[denormalized-strategy-service] Loading effort of ${entities.length} strategies...`);
    const {data} = await this.graphql.query<{data: { strategy: string; startDate: string; endDate: string; expectedEffort}[]}>({
      query: SamplingStrategyQueries.loadEffort,
      variables: {
        extractionType: "strat",
        viewSheetName: "SM",
        offset: 0,
        size: 1000, // All rows
        sortBy: "start_date",
        sortDirection: "asc",
        filterSheetName: "ST",
        columnName: "strategy_id",
        operator: "IN",
        values: entities.filter(s => s.id).map(s => s.id.toString())
      },
      fetchPolicy: opts && opts.fetchPolicy || 'network-only'
    });

    // Add effort to entities
    (data || []).map(StrategyEffort.fromObject).forEach(effort => {
      const strategy = entities.find(s => s.label === effort.strategyLabel);
      if (strategy) {
        strategy.efforts = strategy.efforts || [];
        strategy.efforts.push(effort);
        if (isNotNil(effort.quarter)) {
          strategy.effortByQuarter = strategy.effortByQuarter || {};
          const existingEffort = strategy.effortByQuarter[effort.quarter];
          // Set the quarter's effort
          if (!existingEffort) {
            // Do a copy, to be able to increment if more than one effort by quarter
            strategy.effortByQuarter[effort.quarter] = effort.clone();
          }
          // More than one effort, on this quarter
          else {
            // Merge properties
            existingEffort.startDate = DateUtils.min(existingEffort.startDate, effort.startDate);
            existingEffort.endDate = DateUtils.max(existingEffort.endDate, effort.endDate);
            existingEffort.expectedEffort += effort.expectedEffort;
            existingEffort.realizedEffort += effort.realizedEffort;
          }
        }
      }
      else {
        console.warn(`[denormalized-strategy-service] An effort has unknown strategy '${effort.strategyLabel}'. Skipping. Please check GraphQL query 'extraction' of type 'strat'.`);
      }
    });

  }
}
