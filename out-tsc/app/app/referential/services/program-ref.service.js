import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable, Injector } from '@angular/core';
import { gql } from '@apollo/client/core';
import { defer, merge, mergeMap, Subject, tap } from 'rxjs';
import { distinctUntilChanged, filter, finalize, map } from 'rxjs/operators';
import { ErrorCodes } from './errors';
import { ReferentialFragments } from './referential.fragments';
import { AccountService, arrayDistinct, ConfigService, EntitiesStorage, firstArrayValue, firstNotNilPromise, isNil, isNilOrBlank, isNotEmptyArray, isNotNil, JobUtils, NetworkService, PersonUtils, propertiesPathComparator, ReferentialRef, ReferentialUtils, StatusIds, suggestFromArray, Toasts, } from '@sumaris-net/ngx-components';
import { TaxonGroupRef, TaxonGroupTypeIds } from './model/taxon-group.model';
import { CacheService } from 'ionic-cache';
import { ReferentialRefService } from './referential-ref.service';
import { Program } from './model/program.model';
import { DenormalizedPmfmStrategy } from './model/pmfm-strategy.model';
import { StrategyFragments } from './strategy.fragments';
import { ProgramFragments } from './program.fragments';
import { PmfmService } from './pmfm.service';
import { BaseReferentialService } from './base-referential-service.class';
import { ProgramFilter } from './filter/program.filter';
import { environment } from '@environments/environment';
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { TaxonNameRefService } from '@app/referential/services/taxon-name-ref.service';
import { DenormalizedPmfmStrategyFilter } from '@app/referential/services/filter/pmfm-strategy.filter';
import { StrategyFilter } from '@app/referential/services/filter/strategy.filter';
import { ProgramPrivilegeEnum } from '@app/referential/services/model/model.enum';
import { ProgramPrivilegeUtils } from '@app/referential/services/model/model.utils';
import { DataEntityUtils } from '@app/data/services/model/data-entity.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { DATA_CONFIG_OPTIONS } from '@app/data/data.config';
export const ProgramRefQueries = {
    // Load by id, with only properties
    loadLight: gql `
    query ProgramRef($id: Int, $label: String) {
      data: program(id: $id, label: $label) {
        ...LightProgramFragment
      }
    }
    ${ProgramFragments.lightProgram}
  `,
    // Load by id or label
    load: gql `
    query ProgramRef($id: Int, $label: String) {
      data: program(id: $id, label: $label) {
        ...ProgramRefFragment
      }
    }
    ${ProgramFragments.programRef}
  `,
    // Load by id or label, with strategies
    loadWithStrategies: gql `
    query ProgramRef($id: Int, $label: String, $strategyFilter: StrategyFilterVOInput) {
      data: program(id: $id, label: $label) {
        ...ProgramRefFragment
        strategies(filter: $strategyFilter) {
          ...StrategyRefFragment
        }
      }
    }
    ${ProgramFragments.programRef}
    ${StrategyFragments.strategyRef}
    ${StrategyFragments.denormalizedPmfmStrategy}
    ${StrategyFragments.taxonGroupStrategy}
    ${StrategyFragments.taxonNameStrategy}
    ${ReferentialFragments.lightReferential}
    ${ReferentialFragments.taxonName}
  `,
    // Load all query
    loadAll: gql `
    query Programs($filter: ProgramFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: programs(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...ProgramRefFragment
      }
    }
    ${ProgramFragments.programRef}
  `,
    // Load all query (with total)
    loadAllWithTotal: gql `
    query Programs($filter: ProgramFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: programs(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...ProgramRefFragment
      }
      total: programsCount(filter: $filter)
    }
    ${ProgramFragments.programRef}
  `,
    // Load all query with strategies
    loadAllWithStrategies: gql `
    query Programs(
      $filter: ProgramFilterVOInput!
      $strategyFilter: StrategyFilterVOInput
      $offset: Int
      $size: Int
      $sortBy: String
      $sortDirection: String
    ) {
      data: programs(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...ProgramRefFragment
        strategies(filter: $strategyFilter) {
          ...StrategyRefFragment
        }
      }
    }
    ${ProgramFragments.programRef}
    ${StrategyFragments.strategyRef}
    ${StrategyFragments.denormalizedPmfmStrategy}
    ${StrategyFragments.taxonGroupStrategy}
    ${StrategyFragments.taxonNameStrategy}
    ${ReferentialFragments.lightReferential}
    ${ReferentialFragments.taxonName}
  `,
    // Load all query (with total, and strategies)
    loadAllWithStrategiesAndTotal: gql `
    query Programs(
      $filter: ProgramFilterVOInput!
      $strategyFilter: StrategyFilterVOInput
      $offset: Int
      $size: Int
      $sortBy: String
      $sortDirection: String
    ) {
      data: programs(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...ProgramRefFragment
        strategies(filter: $strategyFilter) {
          ...StrategyRefFragment
        }
      }
      total: programsCount(filter: $filter)
    }
    ${ProgramFragments.programRef}
    ${StrategyFragments.strategyRef}
    ${StrategyFragments.denormalizedPmfmStrategy}
    ${StrategyFragments.taxonGroupStrategy}
    ${StrategyFragments.taxonNameStrategy}
    ${ReferentialFragments.lightReferential}
    ${ReferentialFragments.taxonName}
  `,
};
const ProgramRefSubscriptions = {
    listenChanges: gql `subscription UpdateProgram($id: Int!, $interval: Int){
    data: updateProgram(id: $id, interval: $interval) {
      ...LightProgramFragment
    }
  }
  ${ProgramFragments.lightProgram}`,
    listenAuthorizedPrograms: gql `subscription UpdateAuthorizedPrograms($interval: Int){
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
let ProgramRefService = class ProgramRefService extends BaseReferentialService {
    constructor(injector, network, accountService, cache, entities, configService, pmfmService, networkService, taxonNameRefService, referentialRefService, toastController, strategyRefService, translate) {
        super(injector, Program, ProgramFilter, {
            queries: ProgramRefQueries,
            subscriptions: ProgramRefSubscriptions
        });
        this.network = network;
        this.accountService = accountService;
        this.cache = cache;
        this.entities = entities;
        this.configService = configService;
        this.pmfmService = pmfmService;
        this.networkService = networkService;
        this.taxonNameRefService = taxonNameRefService;
        this.referentialRefService = referentialRefService;
        this.toastController = toastController;
        this.strategyRefService = strategyRefService;
        this.translate = translate;
        this._subscriptionCache = {};
        this._listenAuthorizedSubscription = null;
        this._enableQualityProcess = false;
        this._accessNotSelfDataDepartmentIds = [];
        this._accessNotSelfDataMinProfile = 'ADMIN';
        this._debug = !environment.production;
        this._logPrefix = '[program-ref-service] ';
        this.configService.config.subscribe(config => this.onConfigChanged(config));
        this.start();
    }
    get enableQualityProcess() {
        return this._enableQualityProcess;
    }
    ngOnStart() {
        const _super = Object.create(null, {
            ngOnStart: { get: () => super.ngOnStart }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.ngOnStart.call(this);
            this.registerSubscription(merge(this.networkService.onNetworkStatusChanges, this.accountService.onLogin, this.accountService.onLogout)
                .pipe(map(_ => this.networkService.online
                && this.accountService.isLogin()
                // Skip if admin (can see all programs)
                && !this.accountService.isAdmin()), distinctUntilChanged())
                .subscribe((onlineAndLogin) => {
                if (onlineAndLogin) {
                    this.startListenAuthorizedProgram();
                }
                else {
                    this.stopListenAuthorizedProgram();
                }
            }));
        });
    }
    canUserWrite(data, opts) {
        console.warn('Make no sense to write using the ProgramRefService. Please use the ProgramService instead.');
        return false;
    }
    canUserWriteEntity(entity, opts) {
        var _a, _b;
        if (!entity)
            return false;
        // Validator and Manager can write data
        // (IMAGINE - issue #465)
        if (this.hasUpperOrEqualPrivilege(opts === null || opts === void 0 ? void 0 : opts.program, ProgramPrivilegeEnum.VALIDATOR)) {
            return true;
        }
        // If user has observer privileges and the option to allow observer to write data is enabled
        // OBSERVER = User has write access to program
        if (this.hasUpperOrEqualPrivilege(opts === null || opts === void 0 ? void 0 : opts.program, ProgramPrivilegeEnum.OBSERVER)) {
            // If the user is the recorder: can write
            if (entity.recorderPerson && ReferentialUtils.equals(this.accountService.person, entity.recorderPerson)) {
                return true;
            }
            // Check if declared as observers (in data)
            if (DataEntityUtils.isWithObservers(entity)
                && ((_a = opts === null || opts === void 0 ? void 0 : opts.program) === null || _a === void 0 ? void 0 : _a.getPropertyAsBoolean(ProgramProperties.DATA_OBSERVERS_CAN_WRITE))
                && ((_b = entity.observers) === null || _b === void 0 ? void 0 : _b.some(o => ReferentialUtils.equals(o, this.accountService.person)))) {
                return true;
            }
            // Check can write data's department
            if (this.canUserWriteDataForDepartment(entity.recorderDepartment)) {
                return true;
            }
        }
        return false;
    }
    canUserWriteDataForDepartment(recorderDepartment) {
        if (ReferentialUtils.isEmpty(recorderDepartment))
            return this.accountService.isAdmin();
        // Should be login, and status ENABLE
        const account = this.accountService.account;
        if ((account === null || account === void 0 ? void 0 : account.statusId) !== StatusIds.ENABLE)
            return false; // Should never occur, because account if watched elsewhere
        if (ReferentialUtils.isEmpty(account.department)) {
            console.warn('User account has no department! Unable to check write right against recorderDepartment');
            return false;
        }
        // Should have min role to access not self data
        if (!this.accountService.hasMinProfile(this._accessNotSelfDataMinProfile)) {
            return false;
        }
        // Same recorder department: OK, user can write
        if (account.department.id === recorderDepartment.id) {
            return true;
        }
        // Not same department: should be inside a department that can access not self data
        return this._accessNotSelfDataDepartmentIds.includes(account.department.id);
    }
    canUserValidate(program) {
        if (!this._enableQualityProcess)
            return false; // Quality process disabled
        // Manager
        if (this.hasExactPrivilege(program, ProgramPrivilegeEnum.MANAGER)) {
            return true;
        }
        // Supervisor profile + Validator privilege
        return this.accountService.isSupervisor()
            && (!program || this.hasUpperOrEqualPrivilege(program, ProgramPrivilegeEnum.VALIDATOR));
    }
    canUserQualify(program) {
        if (!this._enableQualityProcess)
            return false; // Quality process disabled
        // Manager
        if (this.hasExactPrivilege(program, ProgramPrivilegeEnum.MANAGER)) {
            return true;
        }
        // Supervisor profile (TODO replace with a new Qualifier profile?)
        //  + Qualifier privilege
        return this.accountService.isSupervisor()
            && this.hasUpperOrEqualPrivilege(program, ProgramPrivilegeEnum.QUALIFIER);
    }
    loadAll(offset, size, sortBy, sortDirection, filter, opts) {
        const _super = Object.create(null, {
            loadAll: { get: () => super.loadAll }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // Use search attribute as default sort, is set
            sortBy = sortBy || (filter === null || filter === void 0 ? void 0 : filter.searchAttribute)
                || (filter === null || filter === void 0 ? void 0 : filter.searchAttributes) && filter.searchAttributes.length && filter.searchAttributes[0]
                || 'label';
            const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
            if (offline) {
                return this.loadAllLocally(offset, size, sortBy, sortDirection, filter, opts);
            }
            // Call inherited function
            return _super.loadAll.call(this, offset, size, sortBy, sortDirection, filter, opts);
        });
    }
    loadAllLocally(offset, size, sortBy, sortDirection, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
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
            const { data, total } = yield this.entities.loadAll(Program.TYPENAME, variables);
            const entities = (!opts || opts.toEntity !== false) ?
                (data || []).map(Program.fromObject) :
                (data || []);
            const res = { data: entities, total };
            // Add fetch more function
            const nextOffset = (offset || 0) + entities.length;
            if (nextOffset < total) {
                res.fetchMore = () => this.loadAllLocally(nextOffset, size, sortBy, sortDirection, filter, opts);
            }
            return res;
        });
    }
    /**
     * Watch program by label
     *
     * @param label
     * @param opts
     */
    watchByLabel(label, opts) {
        const toEntity = ((opts === null || opts === void 0 ? void 0 : opts.toEntity) !== false) ? Program.fromObject : (data) => data;
        // Use cache (enable by default, if no custom query)
        if (!opts || (opts.cache !== false && !opts.query)) {
            const cacheKey = [ProgramRefCacheKeys.PROGRAM_BY_LABEL, label, JSON.stringify({ withStrategies: opts === null || opts === void 0 ? void 0 : opts.withStrategies, strategyFilter: opts === null || opts === void 0 ? void 0 : opts.strategyFilter })].join('|');
            // FIXME - BLA - using loadFromDelayedObservable() as a workaround for offline mode+mobile, when cache is empty. Avoid to get an empty result
            return this.cache.loadFromDelayedObservable(cacheKey, defer(() => this.watchByLabel(label, Object.assign(Object.assign({}, opts), { cache: false, toEntity: false }))), ProgramRefCacheKeys.CACHE_GROUP)
                .pipe(map(toEntity));
        }
        // Debug
        const debug = this._debug && (!opts || opts.debug !== false);
        let startTime = debug && Date.now();
        if (debug)
            console.debug(`[program-ref-service] Watching program {${label}}...`);
        let res;
        const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
        if (offline) {
            const strategyFilter = StrategyFilter.fromObject(opts === null || opts === void 0 ? void 0 : opts.strategyFilter);
            res = this.entities.watchAll(Program.TYPENAME, {
                size: 1,
                filter: (p) => p.label === label
            }).pipe(map(({ data }) => firstArrayValue(data)), map(program => {
                const filterFn = strategyFilter === null || strategyFilter === void 0 ? void 0 : strategyFilter.asFilterFn();
                if (filterFn) {
                    // /!\ Make sure to clone the strategy, to keep cache object unchanged
                    program = Object.assign(Object.assign({}, program), { strategies: (program.strategies || []).filter(filterFn) });
                }
                return program;
            }));
        }
        else {
            //const query = opts && opts.query || (opts?.withStrategies ? ProgramRefQueries.loadWithStrategies : ProgramRefQueries.load);
            const query = opts && opts.query || ProgramRefQueries.load;
            res = this.graphql.watchQuery({
                query,
                variables: {
                    label,
                    //strategyFilter: opts?.withStrategies && strategyFilter?.asPodObject()
                },
                // Important: do NOT using cache here, as default (= 'no-cache')
                // because cache is manage by Ionic cache (easier to clean)
                fetchPolicy: opts && opts.fetchPolicy || 'no-cache',
                error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' }
            }).pipe(map(({ data }) => data), mergeMap((program) => __awaiter(this, void 0, void 0, function* () {
                if (program && (opts === null || opts === void 0 ? void 0 : opts.withStrategies)) {
                    const strategy = yield this.strategyRefService.loadByFilter(Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.strategyFilter), { programId: program.id }), { toEntity: false, cache: undefined, failIfMissing: false, fullLoad: true });
                    // /!\ Make sure to clone the strategy, to keep cache object unchanged
                    program = Object.assign(Object.assign({}, program), { strategies: strategy && [strategy] || [] });
                }
                return program;
            })));
        }
        return res.pipe(filter(isNotNil), map(toEntity), 
        // DEBUG
        tap(_ => {
            if (startTime) {
                console.debug(`[program-ref-service] Watching program {${label}} [OK] in ${Date.now() - startTime}ms`);
                startTime = undefined;
            }
        }));
    }
    existsByLabel(label) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNilOrBlank(label))
                return false;
            const program = yield this.loadByLabel(label, { toEntity: false });
            return ReferentialUtils.isNotEmpty(program);
        });
    }
    loadByLabel(label, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNilOrBlank(label))
                throw new Error('Missing \'label\' argument');
            const cacheKey = [ProgramRefCacheKeys.PROGRAM_BY_LABEL, label].join('|');
            // Use cache (enable by default, if no custom query)
            if (!opts || (!opts.query && opts.cache !== false && opts.fetchPolicy !== 'no-cache' && opts.fetchPolicy !== 'network-only')) {
                return this.cache.getOrSetItem(cacheKey, () => this.loadByLabel(label, Object.assign(Object.assign({}, opts), { cache: false, toEntity: false })), ProgramRefCacheKeys.CACHE_GROUP)
                    .then(data => (!opts || opts.toEntity !== false) ? Program.fromObject(data) : data);
            }
            let data;
            if (this._debug)
                console.debug(`[program-ref-service] Loading program {${label}}...`);
            // If offline mode
            const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
            if (offline) {
                data = yield this.entities.loadAll(Program.TYPENAME, {
                    offset: 0, size: 1,
                    filter: (p) => p.label === label
                }).then(res => firstArrayValue(res && res.data));
            }
            else {
                const query = opts && opts.query || this.queries.load;
                const res = yield this.graphql.query({
                    query,
                    variables: { label },
                    error: { code: ErrorCodes.LOAD_PROGRAM_ERROR, message: 'PROGRAM.ERROR.LOAD_PROGRAM_ERROR' }
                });
                data = res && res.data;
            }
            // Convert to entity (if need)
            const entity = (!opts || opts.toEntity !== false)
                ? Program.fromObject(data)
                : data;
            if (this._debug)
                console.debug(`[program-ref-service] Program loaded {${label}}`, entity);
            return entity;
        });
    }
    loadAllByLabels(labels, opts) {
        return Promise.all(arrayDistinct(labels).map(label => this.loadByLabel(label, opts))).then(programs => programs.filter(isNotNil));
    }
    /**
     * Watch program pmfms
     */
    watchProgramPmfms(programLabel, opts, debug) {
        // Use cache (enable by default)
        if (!opts || opts.cache !== false) {
            const cacheKey = [ProgramRefCacheKeys.PMFMS, programLabel, JSON.stringify(Object.assign(Object.assign({}, opts), { cache: undefined, toEntity: undefined }))].join('|');
            return this.cache.loadFromObservable(cacheKey, defer(() => this.watchProgramPmfms(programLabel, Object.assign(Object.assign({}, opts), { cache: false, toEntity: false }))), ProgramRefCacheKeys.CACHE_GROUP)
                .pipe(map(data => (!opts || opts.toEntity !== false)
                ? (data || []).map(DenormalizedPmfmStrategy.fromObject)
                : (data || [])));
        }
        const acquisitionLevels = (opts === null || opts === void 0 ? void 0 : opts.acquisitionLevels) || ((opts === null || opts === void 0 ? void 0 : opts.acquisitionLevel) && [opts.acquisitionLevel]);
        // DEBUG
        //console.debug(`[program-ref-service] Watching '${programLabel}' pmfms...`, acquisitionLevels);
        // Watch the program
        return this.watchByLabel(programLabel, { toEntity: false, withStrategies: true, strategyFilter: opts && {
                includedIds: isNotNil(opts.strategyId) ? [opts.strategyId] : undefined,
                label: opts.strategyLabel,
                acquisitionLevels
            } })
            .pipe(map(program => program.strategies || []), 
        // Filter strategy's pmfms
        map(strategies => {
            const filterFn = DenormalizedPmfmStrategyFilter.fromObject(opts).asFilterFn();
            if (!filterFn)
                throw new Error('Missing opts to filter pmfm (.e.g opts.acquisitionLevel)!');
            return strategies
                .flatMap(strategy => ((strategy === null || strategy === void 0 ? void 0 : strategy.denormalizedPmfms) || [])
                .filter(filterFn));
        }), 
        // Merge duplicated pmfms (make to a unique pmfm, by id)
        map(pmfms => pmfms.reduce((res, p) => {
            const index = res.findIndex(other => other.id === p.id);
            if (index !== -1) {
                console.debug('[program-ref-service] Merging duplicated pmfms:', res[index], p);
                res[index] = DenormalizedPmfmStrategy.merge(res[index], p);
                return res;
            }
            return res.concat(p);
        }, [])), 
        // Sort on rank order (asc)
        map(data => data.sort((p1, p2) => p1.rankOrder - p2.rankOrder)), map(data => {
            if (debug)
                console.debug(`[program-ref-service] PMFM for ${opts.acquisitionLevel} (filtered):`, data);
            // Convert into entities
            return (!opts || opts.toEntity !== false)
                ? data.map(DenormalizedPmfmStrategy.fromObject)
                : data;
        }));
    }
    /**
     * Load program pmfms
     */
    loadProgramPmfms(programLabel, options, debug) {
        // DEBUG
        if (options)
            console.debug(`[program-ref-service] Loading ${programLabel} PMFMs on ${options.acquisitionLevel}`);
        return firstNotNilPromise(this.watchProgramPmfms(programLabel, options, debug));
    }
    /**
     * Watch program gears
     */
    watchGears(programLabel, opts) {
        // Use cache (enable by default)
        if (!opts || opts.cache !== false) {
            const cacheKey = [ProgramRefCacheKeys.GEARS, programLabel, JSON.stringify(Object.assign(Object.assign({}, opts), { cache: undefined, toEntity: undefined }))].join('|');
            return this.cache.loadFromObservable(cacheKey, defer(() => this.watchGears(programLabel, Object.assign(Object.assign({}, opts), { cache: false, toEntity: false }))), ProgramRefCacheKeys.CACHE_GROUP)
                .pipe(map(data => (!opts || opts.toEntity !== false)
                ? (data || []).map(ReferentialRef.fromObject)
                : (data || [])));
        }
        // Load the program, with strategies
        const acquisitionLevels = (opts === null || opts === void 0 ? void 0 : opts.acquisitionLevels) || ((opts === null || opts === void 0 ? void 0 : opts.acquisitionLevel) && [opts.acquisitionLevel]);
        return this.watchByLabel(programLabel, { toEntity: false, withStrategies: true, strategyFilter: opts && {
                includedIds: isNotNil(opts.strategyId) ? [opts.strategyId] : undefined,
                label: opts.strategyLabel,
                acquisitionLevels
            } })
            .pipe(map(program => program.strategies || []), 
        // get all gears
        map(strategies => arrayDistinct(strategies.flatMap(strategy => strategy.gears || []), 'id')), map(data => {
            if (this._debug)
                console.debug(`[program-ref-service] Found ${data.length} gears on program {${programLabel}}`);
            // Convert into entities
            return (!opts || opts.toEntity !== false)
                ? data.map(ReferentialRef.fromObject)
                : data;
        }));
    }
    /**
     * Load program gears
     */
    loadGears(programLabel, opts) {
        return firstNotNilPromise(this.watchGears(programLabel, opts));
    }
    /**
     * Watch program taxon groups
     */
    watchTaxonGroups(programLabel, opts) {
        // Use cache (enable by default)
        if (!opts || opts.cache !== false) {
            const cacheKey = [ProgramRefCacheKeys.TAXON_GROUPS, programLabel, JSON.stringify(Object.assign(Object.assign({}, opts), { cache: undefined, toEntity: undefined }))].join('|');
            return this.cache.loadFromObservable(cacheKey, defer(() => this.watchTaxonGroups(programLabel, Object.assign(Object.assign({}, opts), { cache: false, toEntity: false }))), ProgramRefCacheKeys.CACHE_GROUP)
                .pipe(map(data => (!opts || opts.toEntity !== false)
                ? (data || []).map(TaxonGroupRef.fromObject)
                : (data || [])));
        }
        // Watch program
        const acquisitionLevels = (opts === null || opts === void 0 ? void 0 : opts.acquisitionLevels) || ((opts === null || opts === void 0 ? void 0 : opts.acquisitionLevel) && [opts.acquisitionLevel]);
        return this.watchByLabel(programLabel, { toEntity: false, withStrategies: true, strategyFilter: opts && {
                includedIds: isNotNil(opts.strategyId) ? [opts.strategyId] : undefined,
                label: opts.strategyLabel,
                acquisitionLevels
            } })
            .pipe(
        // Get strategies
        map(program => (program.strategies || [])), 
        // Get taxon groups strategies
        map(strategies => arrayDistinct(strategies.flatMap(strategy => strategy.taxonGroups || []), ['priorityLevel', 'taxonGroup.id'])), 
        // Sort taxonGroupStrategies, on priorityLevel
        map(data => data.sort(propertiesPathComparator(['priorityLevel', 'taxonGroup.label', 'taxonGroup.name'], 
        // Use default values, because priorityLevel can be null in the DB
        [1, 'ZZZ', 'ZZZ']))
            // Merge priority into taxonGroup
            .map(v => (Object.assign(Object.assign({}, v.taxonGroup), { priority: v.priorityLevel })))), map(data => {
            if (this._debug)
                console.debug(`[program-ref-service] Found ${data.length} taxon groups on program {${programLabel}}`);
            // Convert into entities
            return (!opts || opts.toEntity !== false)
                ? data.map(TaxonGroupRef.fromObject)
                : data;
        }));
    }
    /**
     * Load program taxon groups
     */
    loadTaxonGroups(programLabel, opts) {
        return firstNotNilPromise(this.watchTaxonGroups(programLabel, opts));
    }
    /**
     * Suggest program taxon groups
     */
    suggestTaxonGroups(value, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            // Search on program's taxon groups
            if (filter && isNotNil(filter.program)) {
                const programItems = yield this.loadTaxonGroups(filter.program, { toEntity: false });
                if (isNotEmptyArray(programItems)) {
                    return suggestFromArray(programItems, value, {
                        searchAttributes: filter.searchAttributes || ['priority', 'label', 'name']
                    });
                }
            }
            // If nothing found in program, or species defined
            return this.referentialRefService.suggest(value, Object.assign(Object.assign({}, filter), { entityName: 'TaxonGroup', levelId: TaxonGroupTypeIds.FAO }));
        });
    }
    /**
     * Load program taxon groups
     */
    suggestTaxonNames(value, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            // Search on taxon group's taxon'
            if (isNotNil(opts.programLabel) && isNotNil(opts.taxonGroupId)) {
                // Get map from program
                const taxonNamesByTaxonGroupId = yield this.loadTaxonNamesByTaxonGroupIdMap(opts.programLabel);
                const values = taxonNamesByTaxonGroupId[opts.taxonGroupId];
                if (isNotEmptyArray(values)) {
                    // All values
                    if (isNilOrBlank(opts.searchAttribute))
                        return { data: values };
                    // Text search
                    return suggestFromArray(values, value, {
                        searchAttribute: opts.searchAttribute
                    });
                }
            }
            // If nothing found in program: search by taxonGroup
            const res = yield this.taxonNameRefService.suggest(value, {
                levelId: opts.levelId,
                levelIds: opts.levelIds,
                taxonGroupId: opts.taxonGroupId,
                searchAttribute: opts.searchAttribute
            });
            // If there result, use it
            if (res && isNotEmptyArray(res.data) || res.total > 0)
                return res;
            // Then, retry in all taxon (without taxon groups - Is the link taxon<->taxonGroup missing ?)
            if (isNotNil(opts.taxonGroupId)) {
                return this.taxonNameRefService.suggest(value, {
                    levelId: opts.levelId,
                    levelIds: opts.levelIds,
                    searchAttribute: opts.searchAttribute
                });
            }
            // Nothing found
            return { data: [] };
        });
    }
    loadTaxonNamesByTaxonGroupIdMap(programLabel, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!opts || opts.cache !== false) {
                const mapCacheKey = [ProgramRefCacheKeys.TAXON_NAME_BY_GROUP, programLabel].join('|');
                return this.cache.getOrSetItem(mapCacheKey, () => this.loadTaxonNamesByTaxonGroupIdMap(programLabel, Object.assign(Object.assign({}, opts), { cache: false, toEntity: false })), ProgramRefCacheKeys.CACHE_GROUP);
            }
            const taxonGroups = yield this.loadTaxonGroups(programLabel, opts);
            return (taxonGroups || []).reduce((res, taxonGroup) => {
                if (isNotEmptyArray(taxonGroup.taxonNames)) {
                    res[taxonGroup.id] = taxonGroup.taxonNames;
                    //empty = false;
                }
                return res;
            }, {});
        });
    }
    executeImport(filter, opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const maxProgression = opts && opts.maxProgression || 100;
            const now = this._debug && Date.now();
            console.info('[program-ref-service] Importing programs...');
            try {
                // Clear cache
                yield this.clearCache();
                // Create search filter
                filter = Object.assign(Object.assign({}, filter), { acquisitionLevelLabels: opts === null || opts === void 0 ? void 0 : opts.acquisitionLevels, statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY] });
                const strategyFilter = isNotEmptyArray(filter.strategyIds) ? StrategyFilter.fromObject({ includedIds: filter.strategyIds })
                    // By default, all strategies of imported programs
                    : null;
                // If strategy are filtered, import only ONE program - fix issue IMAGINE (avoid to import all DB programs)
                if (strategyFilter) {
                    filter.label = filter.label || ((_a = opts === null || opts === void 0 ? void 0 : opts.program) === null || _a === void 0 ? void 0 : _a.label);
                }
                // Keep other programs, when ONLY ONE program is imported here
                // (e.g. imported from another offline feature)
                const resetLocalStorage = isNil(filter.label);
                // Step 1. load all programs, with strategies
                const importedProgramLabels = [];
                const { data } = yield JobUtils.fetchAllPages((offset, size) => this.loadAll(offset, size, 'id', 'asc', filter, {
                    query: (offset === 0) ? ProgramRefQueries.loadAllWithStrategiesAndTotal : ProgramRefQueries.loadAllWithStrategies,
                    variables: {
                        strategyFilter: strategyFilter === null || strategyFilter === void 0 ? void 0 : strategyFilter.asPodObject()
                    },
                    fetchPolicy: 'no-cache',
                    toEntity: false
                }), {
                    progression: opts === null || opts === void 0 ? void 0 : opts.progression,
                    maxProgression: maxProgression * 0.9,
                    onPageLoaded: ({ data }) => {
                        const labels = (data || []).map(p => p.label);
                        importedProgramLabels.push(...labels);
                    },
                    logPrefix: '[program-ref-service]',
                    fetchSize: 5 /* limit to 5 program, because a program graph it can be huge ! */
                });
                // Step 2. Saving locally
                yield this.entities.saveAll(data || [], {
                    entityName: Program.TYPENAME,
                    reset: resetLocalStorage
                });
                if (this._debug)
                    console.debug(`[program-ref-service] Importing programs [OK] in ${Date.now() - now}ms`, data);
            }
            catch (err) {
                console.error('[program-ref-service] Error during programs importation', err);
                throw err;
            }
        });
    }
    listenChanges(id, opts) {
        const cacheKey = [ProgramRefCacheKeys.PROGRAM_BY_ID, id].join('|');
        let cache = this._subscriptionCache[cacheKey];
        if (!cache) {
            // DEBUG
            //console.debug(`[program-ref-service] Starting program {${id}} changes`);
            const subject = new Subject();
            cache = {
                subject,
                subscription: super.listenChanges(id, opts).subscribe(subject)
            };
            this._subscriptionCache[cacheKey] = cache;
        }
        return cache.subject.asObservable()
            .pipe(finalize(() => {
            // DEBUG
            //console.debug(`[program-ref-service] Finalize program {${id}} changes (${cache.subject.observers.length} observers)`);
            // Wait 100ms (to avoid to recreate if new subscription comes less than 100ms after)
            setTimeout(() => {
                var _a;
                if (((_a = cache.subject.observers) === null || _a === void 0 ? void 0 : _a.length) > 0)
                    return; // Skip if has observers
                // DEBUG
                //console.debug(`[program-ref-service] Closing program {${id}} changes listener`);
                this._subscriptionCache[cacheKey] = undefined;
                cache.subject.complete();
                cache.subject.unsubscribe();
                cache.subscription.unsubscribe();
            }, 100);
        }));
    }
    clearCache() {
        return __awaiter(this, void 0, void 0, function* () {
            console.info('[program-ref-service] Clearing program cache...');
            yield this.cache.clearGroup(ProgramRefCacheKeys.CACHE_GROUP);
        });
    }
    hasExactPrivilege(program, privilege) {
        // Lookup on person's privileges
        return ProgramPrivilegeUtils.hasExactPrivilege(program === null || program === void 0 ? void 0 : program.privileges, privilege);
        // TODO check program department privileges ? Or fill privileges on POD, with Program2Department
    }
    hasUpperOrEqualPrivilege(program, privilege) {
        // Lookup on person's privileges
        return ProgramPrivilegeUtils.hasUpperOrEqualsPrivilege(program === null || program === void 0 ? void 0 : program.privileges, privilege);
        // TODO check program department privileges ? Or fill privileges on POD, with Program2Department
    }
    /* -- protected methods -- */
    onConfigChanged(config) {
        var _a;
        // const dbTimeZone = config.getProperty(CORE_CONFIG_OPTIONS.DB_TIMEZONE);
        this._enableQualityProcess = config.getPropertyAsBoolean(DATA_CONFIG_OPTIONS.QUALITY_PROCESS_ENABLE);
        this._accessNotSelfDataDepartmentIds = config.getPropertyAsNumbers(DATA_CONFIG_OPTIONS.ACCESS_NOT_SELF_DATA_DEPARTMENT_IDS) || [];
        this._accessNotSelfDataMinProfile = PersonUtils.roleToProfile((_a = config.getProperty(DATA_CONFIG_OPTIONS.ACCESS_NOT_SELF_DATA_ROLE)) === null || _a === void 0 ? void 0 : _a.replace(/^ROLE_/, ''), 'ADMIN');
    }
    startListenAuthorizedProgram(opts) {
        var _a;
        if (this._listenAuthorizedSubscription)
            this.stopListenAuthorizedProgram();
        console.debug(`${this._logPrefix}Watching authorized programs...`);
        const variables = {
            interval: Math.max(10, (opts === null || opts === void 0 ? void 0 : opts.intervalInSeconds) || ((_a = environment['program']) === null || _a === void 0 ? void 0 : _a.listenIntervalInSeconds) || 10)
        };
        this._listenAuthorizedSubscription = this.graphql.subscribe({
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
        map(({ data }) => (data || []).map(p => p === null || p === void 0 ? void 0 : p.label).sort().join(',')), distinctUntilChanged())
            .subscribe((programLabels) => __awaiter(this, void 0, void 0, function* () {
            console.info(`${this._logPrefix}Authorized programs changed to: ${programLabels}`);
            yield Promise.all([
                // Clear all program/strategies cache
                this.graphql.clearCache(),
                this.strategyRefService.clearCache(),
                // Clear cache (e.g. used by autocomplete fields)
                this.clearCache()
            ]);
            this.showToast({ message: 'PROGRAM.INFO.AUTHORIZED_PROGRAMS_UPDATED', type: 'info' });
        }));
        this._listenAuthorizedSubscription.add(() => console.debug(`${this._logPrefix}Stop watching authorized programs`));
        this.registerSubscription(this._listenAuthorizedSubscription);
        return this._listenAuthorizedSubscription;
    }
    stopListenAuthorizedProgram() {
        if (this._listenAuthorizedSubscription) {
            this.unregisterSubscription(this._listenAuthorizedSubscription);
            this._listenAuthorizedSubscription.unsubscribe();
            this._listenAuthorizedSubscription = null;
        }
    }
    showToast(opts) {
        return Toasts.show(this.toastController, this.translate, opts);
    }
};
ProgramRefService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [Injector,
        NetworkService,
        AccountService,
        CacheService,
        EntitiesStorage,
        ConfigService,
        PmfmService,
        NetworkService,
        TaxonNameRefService,
        ReferentialRefService,
        ToastController,
        StrategyRefService,
        TranslateService])
], ProgramRefService);
export { ProgramRefService };
//# sourceMappingURL=program-ref.service.js.map