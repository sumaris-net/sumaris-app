import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable, Injector } from '@angular/core';
import { gql } from '@apollo/client/core';
import { ReferentialFragments } from './referential.fragments';
import { AccountService, ConfigService, DateUtils, EntitiesStorage, firstArrayValue, isEmptyArray, isNil, isNilOrBlank, isNilOrNaN, isNotNil, NetworkService, ReferentialRef, } from '@sumaris-net/ngx-components';
import { CacheService } from 'ionic-cache';
import { StrategyFragments } from './strategy.fragments';
import { StrategyService } from './strategy.service';
import { timer } from 'rxjs';
import { map, mergeMap, startWith, switchMap } from 'rxjs/operators';
import { Parameters } from './model/model.enum';
import { PmfmService } from './pmfm.service';
import { ReferentialRefService } from './referential-ref.service';
import { SamplingStrategy, StrategyEffort } from './model/sampling-strategy.model';
import { BaseReferentialService } from './base-referential-service.class';
import { StrategyFilter } from '@app/referential/services/filter/strategy.filter';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
const SamplingStrategyQueries = {
    loadAll: gql `
    query DenormalizedStrategies($filter: StrategyFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: strategies(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
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
    ${ReferentialFragments.lightReferential}
    ${ReferentialFragments.taxonName}
  `,
    loadAllWithTotal: gql `
    query DenormalizedStrategiesWithTotal($filter: StrategyFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: strategies(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
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
    ${ReferentialFragments.lightReferential}
    ${ReferentialFragments.taxonName}
  `,
    loadEffort: gql `
    query StrategyEffort($ids: [String!]!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $cacheDuration: String) {
      data: extraction(
        type: { format: "strat" }
        offset: $offset
        size: $size
        sortBy: $sortBy
        sortDirection: $sortDirection
        cacheDuration: $cacheDuration
        filter: { sheetName: "SM", criteria: [{ sheetName: "ST", name: "strategy_id", operator: "IN", values: $ids }] }
      )
    }
  `,
};
let SamplingStrategyService = class SamplingStrategyService extends BaseReferentialService {
    constructor(injector, network, accountService, cache, entities, configService, strategyService, pmfmService, referentialRefService) {
        super(injector, SamplingStrategy, StrategyFilter, {
            queries: SamplingStrategyQueries
        });
        this.network = network;
        this.accountService = accountService;
        this.cache = cache;
        this.entities = entities;
        this.configService = configService;
        this.strategyService = strategyService;
        this.pmfmService = pmfmService;
        this.referentialRefService = referentialRefService;
    }
    watchAll(offset, size, sortBy, sortDirection, filter, opts) {
        // Call normal watch all
        return super.watchAll(offset, size, sortBy, sortDirection, filter, Object.assign({ fetchPolicy: 'network-only' }, opts))
            .pipe(
        // Then fill parameter groups
        mergeMap(res => this.fillParameterGroups(res.data).then(_ => res)), 
        // Then fill efforts (but NOT wait end, before return a value - using startWith)
        switchMap(res => timer(100)
            .pipe(map(_ => res))
            .pipe(
        // DEBUG
        //tap(_ => console.debug('[sampling-strategy-service] timer reach !')),
        mergeMap((_) => this.fillEfforts(res.data).then(() => res)), startWith(res))));
    }
    loadAll(offset, size, sortBy, sortDirection, filter, opts) {
        const _super = Object.create(null, {
            loadAll: { get: () => super.loadAll }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield _super.loadAll.call(this, offset, size, sortBy, sortDirection, filter, opts);
            // Fill entities (parameter groups, effort, etc)
            return this.fillEntities(res, opts);
        });
    }
    deleteAll(entities, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.strategyService.deleteAll(entities, options);
        });
    }
    load(id, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.strategyService.load(id, Object.assign(Object.assign({}, opts), { toEntity: false }));
            const entity = (!opts || opts.toEntity !== false) ? SamplingStrategy.fromObject(data) : data;
            yield this.fillEntities({ data: [entity] }, Object.assign({ withEffort: true, withParameterGroups: false }, opts));
            return entity;
        });
    }
    computeNextSampleTagId(strategyLabel, separator, nbDigit) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.strategyService.computeNextSampleTagId(strategyLabel, separator, nbDigit);
        });
    }
    loadAnalyticReferenceByLabel(label) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNilOrBlank(label))
                return undefined;
            try {
                const res = yield this.strategyService.loadAllAnalyticReferences(0, 1, 'label', 'desc', { label });
                return firstArrayValue(res && res.data || []);
            }
            catch (err) {
                console.error('Error while loading analyticReference by label', err);
                return ReferentialRef.fromObject({ label });
            }
        });
    }
    canUserWrite(data, opts) {
        return this.strategyService.canUserWrite(data, opts);
    }
    save(entity, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const isNew = isNil(entity.id);
            console.debug('[sampling-strategy-service] Saving sampling strategy...');
            yield this.strategyService.save(entity, Object.assign(Object.assign({}, opts), { update: (cache, { data }) => {
                    const savedEntity = data && data.data;
                    // Copy id
                    this.copyIdAndUpdateDate(savedEntity, entity);
                    // Update query cache
                    if (isNew && this.watchQueriesUpdatePolicy === 'update-cache') {
                        this.insertIntoMutableCachedQueries(cache, {
                            queries: this.getLoadQueries(),
                            data: entity.asObject(Object.assign(Object.assign({}, NOT_MINIFY_OPTIONS), { keepEffort: true }))
                        });
                    }
                } }));
            // Update entity effort
            if (!isNew) {
                yield this.fillEntities({ data: [entity] }, opts);
            }
            return entity;
        });
    }
    duplicateAllToYear(sources, year) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isEmptyArray(sources))
                return [];
            if (isNilOrNaN(year) || typeof year !== 'number' || year < 1970)
                throw Error('Missing or invalid year argument (should be YYYY format)');
            // CLear cache (only once)
            yield this.strategyService.clearCache();
            const savedEntities = [];
            // WARN: do not use a Promise.all, because parallel execution not working (label computation need series execution)
            for (const source of sources) {
                const newLabelPrefix = year.toString().substring(2) + source.label.substring(2, 9);
                const newLabel = yield this.strategyService.computeNextLabel(source.programId, newLabelPrefix, 3);
                const target = yield this.strategyService.cloneToYear(source, year, newLabel);
                const targetAsSampling = SamplingStrategy.fromObject(target.asObject());
                const savedEntity = yield this.save(targetAsSampling, { clearCache: false /*already done once*/ });
                savedEntities.push(savedEntity);
            }
            return savedEntities;
        });
    }
    /* -- protected -- */
    watchPmfmIdsByParameterLabels(parameterLabels) {
        return this.referentialRefService.watchAll(0, 1000, 'id', 'asc', {
            entityName: 'Pmfm',
            levelLabels: parameterLabels
        }, {
            withTotal: false
        }).pipe(map((res) => (res.data || []).map(p => p.id)));
    }
    loadStrategyEffortByDate(programLabel, strategyLabel, date, opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!programLabel || !strategyLabel || !date)
                throw new Error('Missing a required argument');
            const { data } = yield this.loadAll(0, 1, 'label', 'asc', {
                label: strategyLabel,
                levelLabel: programLabel
            }, {
                withEffort: opts === null || opts === void 0 ? void 0 : opts.withRealized,
                withTotal: false,
                withParameterGroups: false,
                fetchPolicy: 'cache-first'
            });
            const strategy = firstArrayValue(data);
            if (strategy && strategy.effortByQuarter) {
                const effortByQuarter = strategy.effortByQuarter[date === null || date === void 0 ? void 0 : date.quarter()];
                // Check same year
                if (effortByQuarter && ((_a = effortByQuarter.startDate) === null || _a === void 0 ? void 0 : _a.year()) === (date === null || date === void 0 ? void 0 : date.year())) {
                    return effortByQuarter;
                }
            }
            return undefined; // No effort at this date
        });
    }
    fillEntities(res, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!res || isEmptyArray(res.data))
                return res;
            const jobs = [];
            // Fill parameters groups
            if (!opts || opts.withParameterGroups !== false) {
                jobs.push(this.fillParameterGroups(res.data));
            }
            // Fill strategy efforts
            if (!opts || opts.withEffort !== false) {
                jobs.push(this.fillEfforts(res.data, opts)
                    .catch(err => {
                    console.error('Error while computing effort: ' + err && err.message || err, err);
                    res.errors = (res.errors || []).concat(err);
                }));
            }
            // Wait jobs end
            if (jobs.length)
                yield Promise.all(jobs);
            return res;
        });
    }
    /**
     * Fill parameterGroups attribute, on each denormalized strategy
     *
     * @param entities
     */
    fillParameterGroups(entities) {
        return __awaiter(this, void 0, void 0, function* () {
            // DEBUG
            //console.debug('[sampling-strategy-service] Fill parameters groups...');
            const parameterLabelGroups = Parameters.getSampleParameterLabelGroups({
                excludedGroups: ['TAG_ID', 'DRESSING', 'PRESERVATION']
            });
            const groupKeys = Object.keys(parameterLabelGroups);
            const pmfmIdsMap = yield this.pmfmService.loadIdsGroupByParameterLabels(parameterLabelGroups);
            entities.forEach(s => {
                const pmfms = s.pmfms;
                s.parameterGroups = (pmfms && groupKeys || []).reduce((res, groupKey) => pmfms.some(p => { var _a; return pmfmIdsMap[groupKey].includes(p.pmfmId) || (((_a = p.parameter) === null || _a === void 0 ? void 0 : _a.label) && p.parameter.label.includes(groupKey)); }) ? res.concat(groupKey) : res, []);
            });
        });
    }
    fillEfforts(entities, opts) {
        return __awaiter(this, void 0, void 0, function* () {
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
                size: 1000,
                sortBy: 'start_date',
                sortDirection: 'asc',
                cacheDuration
            };
            console.debug('[sampling-strategy-service] Fill efforts using variables:', variables);
            const { data } = yield this.graphql.query({
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
                    });
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
                        }
                    }
                }
                else {
                    console.warn(`[sampling-strategy-service] An effort has unknown strategy '${effort.strategyLabel}'. Skipping. Please check GraphQL query 'extraction' of type 'strat'.`);
                }
            });
            console.debug(`[sampling-strategy-service] Efforts filled in ${Date.now() - now}ms`);
        });
    }
};
SamplingStrategyService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [Injector,
        NetworkService,
        AccountService,
        CacheService,
        EntitiesStorage,
        ConfigService,
        StrategyService,
        PmfmService,
        ReferentialRefService])
], SamplingStrategyService);
export { SamplingStrategyService };
//# sourceMappingURL=sampling-strategy.service.js.map