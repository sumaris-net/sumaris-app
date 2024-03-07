import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable, Injector } from '@angular/core';
import { gql } from '@apollo/client/core';
import { ReferentialFragments } from './referential.fragments';
import { AccountService, ConfigService, CORE_CONFIG_OPTIONS, DateUtils, EntitiesStorage, EntityUtils, firstNotNilPromise, isEmptyArray, isNil, isNilOrBlank, isNilOrNaN, isNotEmptyArray, isNotNil, JsonUtils, NetworkService, ReferentialRef, ReferentialUtils, toNumber, } from '@sumaris-net/ngx-components';
import { CacheService } from 'ionic-cache';
import { ErrorCodes } from './errors';
import { AppliedPeriod, AppliedStrategy, Strategy, StrategyDepartment, TaxonNameStrategy } from './model/strategy.model';
import { ReferentialRefService } from './referential-ref.service';
import { StrategyFragments } from './strategy.fragments';
import { BaseReferentialService } from './base-referential-service.class';
import { Pmfm } from './model/pmfm.model';
import { ProgramRefService } from './program-ref.service';
import { StrategyRefService } from './strategy-ref.service';
import { ReferentialRefFilter } from './filter/referential-ref.filter';
import { StrategyFilter } from '@app/referential/services/filter/strategy.filter';
import { PmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { ProgramService } from '@app/referential/services/program.service';
import { COPY_LOCALLY_AS_OBJECT_OPTIONS } from '@app/data/services/model/data-entity.model';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
const FindStrategyNextLabel = gql `
  query StrategyNextLabelQuery($programId: Int!, $labelPrefix: String, $nbDigit: Int) {
    data: strategyNextLabel(programId: $programId, labelPrefix: $labelPrefix, nbDigit: $nbDigit)
  }
`;
const FindStrategyNextSampleLabel = gql `
  query StrategyNextSampleLabelQuery($strategyLabel: String!, $labelSeparator: String, $nbDigit: Int){
    data: strategyNextSampleLabel(strategyLabel: $strategyLabel, labelSeparator: $labelSeparator, nbDigit: $nbDigit)
  }
`;
const LoadAllAnalyticReferencesQuery = gql `query AnalyticReferencesQuery($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
    data: analyticReferences(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...LightReferentialFragment
    }
  }
  ${ReferentialFragments.lightReferential}`;
const LoadAllAnalyticReferencesWithTotalQuery = gql `query AnalyticReferencesQuery($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput){
  data: analyticReferences(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
    ...LightReferentialFragment
  }
  total: analyticReferencesCount(filter: $filter)
}
${ReferentialFragments.lightReferential}`;
const FindStrategiesReferentials = gql `
  query StrategiesReferentials($programId: Int!, $locationClassification: LocationClassificationEnum, $entityName: String, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: strategiesReferentials(programId: $programId, locationClassification: $locationClassification, entityName: $entityName, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...LightReferentialFragment
    }
  }
  ${ReferentialFragments.lightReferential}
`;
const StrategyQueries = {
    load: gql `query Strategy($id: Int!) {
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
  ${ReferentialFragments.taxonName}`,
    loadAll: gql `query Strategies($filter: StrategyFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: strategies(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...LightStrategyFragment
    }
  }
  ${StrategyFragments.lightStrategy}
  ${StrategyFragments.appliedStrategy}
  ${StrategyFragments.appliedPeriod}
  ${ReferentialFragments.lightReferential}`,
    loadAllWithTotal: gql `query StrategiesWithTotal($filter: StrategyFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: strategies(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...LightStrategyFragment
    }
    total: strategiesCount(filter: $filter)
  }
  ${StrategyFragments.lightStrategy}
  ${StrategyFragments.appliedStrategy}
  ${StrategyFragments.appliedPeriod}
  ${ReferentialFragments.lightReferential}`,
    loadAllFull: gql `query Strategies($filter: StrategyFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: strategies(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...LightStrategyFragment
    }
  }
  ${StrategyFragments.lightStrategy}
  ${StrategyFragments.appliedStrategy}
  ${StrategyFragments.appliedPeriod}
  ${StrategyFragments.lightPmfmStrategy}
  ${StrategyFragments.strategyDepartment}
  ${StrategyFragments.taxonGroupStrategy}
  ${StrategyFragments.taxonNameStrategy}
  ${ReferentialFragments.lightReferential}
  ${ReferentialFragments.lightPmfm}
  ${ReferentialFragments.taxonName}`,
    loadAllFullWithTotal: gql `query StrategiesWithTotal($filter: StrategyFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: strategies(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...LightStrategyFragment
    }
    total: strategiesCount(filter: $filter)
  }
  ${StrategyFragments.lightStrategy}
  ${StrategyFragments.appliedStrategy}
  ${StrategyFragments.appliedPeriod}
  ${StrategyFragments.lightPmfmStrategy}
  ${StrategyFragments.strategyDepartment}
  ${StrategyFragments.taxonGroupStrategy}
  ${StrategyFragments.taxonNameStrategy}
  ${ReferentialFragments.lightReferential}
  ${ReferentialFragments.lightPmfm}
  ${ReferentialFragments.taxonName}`,
    count: gql `query StrategyCount($filter: StrategyFilterVOInput!) {
      total: strategiesCount(filter: $filter)
    }`
};
const StrategyMutations = {
    save: gql `mutation SaveStrategy($data: StrategyVOInput!){
    data: saveStrategy(strategy: $data){
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
  ${ReferentialFragments.taxonName}`,
    delete: gql `mutation DeleteAllStrategies($id:Int!){
    deleteStrategy(id: $id)
  }`,
};
const StrategySubscriptions = {
    listenChanges: gql `subscription UpdateReferential($id: Int!, $interval: Int){
    data: updateReferential(entityName: "Strategy", id: $id, interval: $interval) {
      ...LightReferentialFragment
    }
  }
  ${ReferentialFragments.lightReferential}`
};
let StrategyService = class StrategyService extends BaseReferentialService {
    constructor(injector, network, accountService, cache, entities, translate, programService, programRefService, strategyRefService, referentialRefService, configService) {
        super(injector, Strategy, StrategyFilter, {
            queries: StrategyQueries,
            mutations: StrategyMutations,
            subscriptions: StrategySubscriptions
        });
        this.network = network;
        this.accountService = accountService;
        this.cache = cache;
        this.entities = entities;
        this.translate = translate;
        this.programService = programService;
        this.programRefService = programRefService;
        this.strategyRefService = strategyRefService;
        this.referentialRefService = referentialRefService;
        this.configService = configService;
        this.$dbTimeZone = new BehaviorSubject(null);
        this.configService.config.subscribe(config => this.onConfigChanged(config));
    }
    get dbTimeZone() {
        return this.$dbTimeZone.value || DateUtils.moment().tz();
    }
    getDateRangeByLabel(label) {
        return __awaiter(this, void 0, void 0, function* () {
            const strategy = yield this.loadByLabel(label);
            return strategy.appliedStrategies
                .reduce((res1, appliedStrategy) => appliedStrategy.appliedPeriods.reduce((res2, period) => {
                res2.startDate = DateUtils.min(res2.startDate, period.startDate).clone();
                res2.endDate = DateUtils.max(res2.endDate, period.endDate).clone();
                return res2;
            }, res1), { startDate: undefined, endDate: undefined });
        });
    }
    onConfigChanged(config) {
        const dbTimeZone = config.getProperty(CORE_CONFIG_OPTIONS.DB_TIMEZONE);
        this.$dbTimeZone.next(dbTimeZone);
    }
    existsByLabel(label, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNilOrBlank(label))
                throw new Error('Missing argument \'label\' ');
            const filter = {
                label,
                levelId: opts && isNotNil(opts.programId) ? opts.programId : undefined,
                excludedIds: opts && isNotNil(opts.excludedIds) ? opts.excludedIds : undefined,
            };
            const { total } = yield this.graphql.query({
                query: StrategyQueries.count,
                variables: { filter },
                error: { code: ErrorCodes.LOAD_STRATEGY_ERROR, message: 'ERROR.LOAD_ERROR' },
                fetchPolicy: opts && opts.fetchPolicy || undefined
            });
            return toNumber(total, 0) > 0;
        });
    }
    computeNextLabel(programId, labelPrefix, nbDigit) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._debug)
                console.debug(`[strategy-service] Loading strategy next label for prefix ${labelPrefix}...`);
            const res = yield this.graphql.query({
                query: FindStrategyNextLabel,
                variables: {
                    programId,
                    labelPrefix,
                    nbDigit
                },
                error: { code: ErrorCodes.LOAD_PROGRAM_ERROR, message: 'PROGRAM.STRATEGY.ERROR.LOAD_STRATEGY_LABEL_ERROR' },
                fetchPolicy: 'network-only'
            });
            return res && res.data;
        });
    }
    computeNextSampleTagId(strategyLabel, labelSeparator, nbDigit) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._debug)
                console.debug(`[strategy-service] Loading strategy next sample label...`);
            const res = yield this.graphql.query({
                query: FindStrategyNextSampleLabel,
                variables: {
                    strategyLabel,
                    labelSeparator,
                    nbDigit
                },
                error: { code: ErrorCodes.LOAD_PROGRAM_ERROR, message: 'PROGRAM.STRATEGY.ERROR.LOAD_STRATEGY_SAMPLE_LABEL_ERROR' },
                fetchPolicy: 'network-only'
            });
            return res && res.data;
        });
    }
    loadByLabel(label) {
        return __awaiter(this, void 0, void 0, function* () {
            const filter = StrategyFilter.fromObject({ label });
            const result = yield this.loadAll(0, 1, 'id', 'asc', filter);
            return isNotEmptyArray(result.data) && result.data[0] || null;
        });
    }
    loadStrategiesReferentials(programId, entityName, locationClassification, offset, size, sortBy, sortDirection) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._debug)
                console.debug(`[strategy-service] Loading strategies referential (predoc) for ${entityName}...`);
            const res = yield this.graphql.query({
                query: FindStrategiesReferentials,
                variables: {
                    programId,
                    locationClassification,
                    entityName,
                    offset: offset || 0,
                    size: size || 100,
                    sortBy: sortBy || 'label',
                    sortDirection: sortDirection || 'asc'
                },
                error: { code: ErrorCodes.LOAD_PROGRAM_ERROR, message: 'PROGRAM.STRATEGY.ERROR.LOAD_STRATEGY_SAMPLE_LABEL_ERROR' },
                fetchPolicy: 'network-only'
            });
            return ((res === null || res === void 0 ? void 0 : res.data) || []);
        });
    }
    loadAllAnalyticReferences(offset, size, sortBy, sortDirection, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            filter = ReferentialRefFilter.fromObject(filter);
            const variables = {
                offset: offset || 0,
                size: size || 100,
                sortBy: sortBy || 'label',
                sortDirection: sortDirection || 'asc',
                filter: filter && filter.asPodObject()
            };
            const now = this._debug && Date.now();
            if (this._debug)
                console.debug(`[strategy-service] Loading analytic references...`, variables);
            const withTotal = (!opts || opts.withTotal !== false);
            const query = withTotal ? LoadAllAnalyticReferencesWithTotalQuery : LoadAllAnalyticReferencesQuery;
            const { data, total } = yield this.graphql.query({
                query,
                variables,
                error: { code: ErrorCodes.LOAD_STRATEGY_ANALYTIC_REFERENCES_ERROR, message: 'PROGRAM.STRATEGY.ERROR.LOAD_STRATEGY_ANALYTIC_REFERENCES_ERROR' },
                fetchPolicy: 'cache-first'
            });
            const entities = (!opts || opts.toEntity !== false)
                ? data && data.map(ReferentialRef.fromObject)
                : data;
            const res = {
                data: entities,
                total
            };
            // Add fetch more capability, if total was fetched
            if (withTotal) {
                const nextOffset = offset + entities.length;
                if (nextOffset < total) {
                    res.fetchMore = () => this.loadAllAnalyticReferences(nextOffset, size, sortBy, sortDirection, filter, opts);
                }
            }
            if (this._debug)
                console.debug(`[strategy-service] Analytic references loaded in ${Date.now() - now}ms`);
            return res;
        });
    }
    suggestAnalyticReferences(value, filter, sortBy, sortDirection) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ReferentialUtils.isNotEmpty(value))
                return { data: [value] };
            value = (typeof value === 'string' && value !== '*') && value || undefined;
            return this.loadAllAnalyticReferences(0, !value ? 30 : 10, sortBy, sortDirection, Object.assign(Object.assign({}, filter), { searchText: value }), { withTotal: true });
        });
    }
    canUserWrite(data, opts) {
        // user is admin: ok
        if (this.accountService.isAdmin())
            return true;
        // Check if user is a program manager (if given)
        if (ReferentialUtils.isNotEmpty(opts === null || opts === void 0 ? void 0 : opts.program)) {
            // TODO check in strategy's managers
            return this.programService.canUserWrite(opts.program);
        }
        //const isNew = (!data || isNil(data.id);
        return this.accountService.isSupervisor();
    }
    copyIdAndUpdateDate(source, target) {
        EntityUtils.copyIdAndUpdateDate(source, target);
        // Make sure tp copy programId (need by equals)
        target.programId = source.programId;
        // Applied strategies
        if (source.appliedStrategies && target.appliedStrategies) {
            target.appliedStrategies.forEach(targetAppliedStrategy => {
                // Make sure to copy strategyId (need by equals)
                targetAppliedStrategy.strategyId = source.id;
                // Copy id and update date
                const savedAppliedStrategy = (source.appliedStrategies || []).find(as => targetAppliedStrategy.equals(as));
                EntityUtils.copyIdAndUpdateDate(savedAppliedStrategy, targetAppliedStrategy);
            });
        }
        // Pmfm strategies
        if (source.pmfms && target.pmfms) {
            target.pmfms.forEach(targetPmfmStrategy => {
                // Make sure to copy strategyId (need by equals)
                targetPmfmStrategy.strategyId = source.id;
                // Copy id and update date
                const savedPmfmStrategy = source.pmfms.find(srcPmfmStrategy => targetPmfmStrategy.equals(srcPmfmStrategy));
                EntityUtils.copyIdAndUpdateDate(savedPmfmStrategy, targetPmfmStrategy);
                // Copy pmfm
                targetPmfmStrategy.pmfm = Pmfm.fromObject(savedPmfmStrategy === null || savedPmfmStrategy === void 0 ? void 0 : savedPmfmStrategy.pmfm) || targetPmfmStrategy.pmfm;
            });
        }
    }
    saveAll(data, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data)
                return data;
            // Clear cache (once)
            if (!opts || opts.clearCache !== false) {
                yield this.clearCache();
            }
            return yield Promise.all(data.map(entity => this.save(entity, Object.assign(Object.assign({}, opts), { clearCache: true }))));
        });
    }
    save(entity, opts) {
        const _super = Object.create(null, {
            save: { get: () => super.save }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // Clear cache
            if (!opts || opts.clearCache !== false) {
                yield this.clearCache();
            }
            return _super.save.call(this, entity, Object.assign(Object.assign({}, opts), { refetchQueries: this._mutableWatchQueries
                    .filter(query => query.query === this.queries.loadAllWithTotal || query.query === this.queries.loadAllWithTotal), awaitRefetchQueries: true }));
        });
    }
    duplicateAllToYear(sources, year) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isEmptyArray(sources))
                return [];
            if (isNilOrNaN(year) || typeof year !== 'number' || year < 1970)
                throw Error('Missing or invalid year argument (should be YYYY format)');
            // CLear cache (only once)
            yield this.clearCache();
            const savedEntities = [];
            // WARN: do not use a Promise.all, because parallel execution not working (label computation need series execution)
            for (const source of sources) {
                const duplicatedSource = yield this.cloneToYear(source, year);
                const savedEntity = yield this.save(duplicatedSource, { clearCache: false /*already done*/ });
                savedEntities.push(savedEntity);
            }
            return savedEntities;
        });
    }
    cloneToYear(source, year, newLabel) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!source || isNil(source.programId))
                throw Error('Missing strategy or strategy.programId, or newLabel argument');
            if (isNilOrNaN(year) || typeof year !== 'number' || year < 1970)
                throw Error('Missing or invalid year argument (should be YYYY format)');
            newLabel = newLabel || source.label && `${source.label} (bis)`;
            if (isNilOrBlank(newLabel))
                throw Error('Missing strategy.label or newLabel argument');
            const target = new Strategy();
            target.label = newLabel;
            target.name = newLabel;
            target.description = newLabel;
            target.analyticReference = source.analyticReference;
            target.programId = source.programId;
            const dbTimeZone = yield firstNotNilPromise(this.$dbTimeZone, { stop: this.stopSubject });
            target.appliedStrategies = (source.appliedStrategies || []).map(sourceAppliedStrategy => {
                const targetAppliedStrategy = new AppliedStrategy();
                targetAppliedStrategy.id = undefined;
                targetAppliedStrategy.updateDate = undefined;
                targetAppliedStrategy.location = sourceAppliedStrategy.location;
                targetAppliedStrategy.appliedPeriods = (sourceAppliedStrategy.appliedPeriods || []).map(sourceAppliedPeriod => {
                    var _a, _b;
                    // DEBUG
                    //console.debug(`[strategy-service] Duplicate applied period, into year ${year}`, sourceAppliedPeriod);
                    return ({
                        acquisitionNumber: sourceAppliedPeriod.acquisitionNumber,
                        startDate: (_a = sourceAppliedPeriod.startDate) === null || _a === void 0 ? void 0 : _a.clone().tz(dbTimeZone).year(year),
                        endDate: (_b = sourceAppliedPeriod.endDate) === null || _b === void 0 ? void 0 : _b.clone().tz(dbTimeZone).year(year)
                    });
                })
                    .map(AppliedPeriod.fromObject);
                return targetAppliedStrategy;
            });
            target.pmfms = source.pmfms && source.pmfms.map(pmfmStrategy => {
                const pmfmStrategyCloned = pmfmStrategy.clone();
                pmfmStrategyCloned.id = undefined;
                pmfmStrategyCloned.strategyId = undefined;
                return PmfmStrategy.fromObject(pmfmStrategyCloned);
            }) || [];
            target.departments = source.departments && source.departments.map(department => {
                const departmentCloned = department.clone();
                departmentCloned.id = undefined;
                departmentCloned.strategyId = undefined;
                return StrategyDepartment.fromObject(departmentCloned);
            }) || [];
            target.taxonNames = source.taxonNames && source.taxonNames.map(taxonNameStrategy => {
                const taxonNameStrategyCloned = taxonNameStrategy.clone();
                taxonNameStrategyCloned.strategyId = undefined;
                return TaxonNameStrategy.fromObject(taxonNameStrategyCloned);
            }) || [];
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
        });
    }
    clearCache() {
        return __awaiter(this, void 0, void 0, function* () {
            // Make sure to clean all strategy references (.e.g Pmfm cache, etc)
            yield Promise.all([
                this.programRefService.clearCache(),
                this.strategyRefService.clearCache()
            ]);
        });
    }
    downloadAsJsonByIds(ids, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isEmptyArray(ids))
                throw Error('Required not empty array of ids');
            // Load entities
            const { data } = yield this.loadAll(0, ids.length, 'creationDate', 'asc', {
                includedIds: ids
            }, {
                withTotal: false,
                query: StrategyQueries.loadAllFull
            });
            if (!data.length)
                throw Error('COMMON.NO_RESULT');
            // To json
            const jsonArray = data.map(entity => entity.asObject(Object.assign(Object.assign(Object.assign({}, COPY_LOCALLY_AS_OBJECT_OPTIONS), opts), { minify: false })));
            const program = opts.program || (yield this.programRefService.load(data[0].programId));
            const filename = this.translate.instant('PROGRAM.STRATEGY.DOWNLOAD_MANY_JSON_FILENAME', {
                programLabel: program === null || program === void 0 ? void 0 : program.label
            });
            // Export to file
            JsonUtils.exportToFile(jsonArray, { filename });
        });
    }
    downloadAsJson(entity, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!entity)
                throw new Error('Missing required \'entity\' argument');
            if (isNilOrNaN(entity.programId))
                throw new Error('Missing required \'entity.programId\'');
            // Convert strategy into JSON
            const json = Strategy.fromObject(entity)
                .asObject(Object.assign(Object.assign(Object.assign({}, COPY_LOCALLY_AS_OBJECT_OPTIONS), opts), { minify: false }));
            delete json.denormalizedPmfms; // Not used, because we already have pmfms
            const program = opts.program || (yield this.programRefService.load(entity.programId));
            const filename = this.translate.instant('PROGRAM.STRATEGY.DOWNLOAD_JSON_FILENAME', {
                programLabel: program === null || program === void 0 ? void 0 : program.label,
                label: entity.label
            });
            // Export to file
            JsonUtils.exportToFile(json, { filename });
        });
    }
    /* -- protected functions -- */
    asObject(entity, opts) {
        const target = super.asObject(entity, opts);
        (target.pmfms || []).forEach(pmfmStrategy => {
            pmfmStrategy.pmfmId = toNumber(pmfmStrategy.pmfm && pmfmStrategy.pmfm.id, pmfmStrategy.pmfmId);
            delete pmfmStrategy.pmfm;
        });
        return target;
    }
};
StrategyService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [Injector,
        NetworkService,
        AccountService,
        CacheService,
        EntitiesStorage,
        TranslateService,
        ProgramService,
        ProgramRefService,
        StrategyRefService,
        ReferentialRefService,
        ConfigService])
], StrategyService);
export { StrategyService };
//# sourceMappingURL=strategy.service.js.map