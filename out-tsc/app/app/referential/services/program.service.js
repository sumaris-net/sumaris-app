import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable, Injector } from '@angular/core';
import { gql } from '@apollo/client/core';
import { map, mergeMap } from 'rxjs/operators';
import { ErrorCodes } from './errors';
import { ReferentialFragments } from './referential.fragments';
import { AccountService, EntitiesStorage, EntityUtils, isNil, isNotNil, NetworkService, StatusIds, } from '@sumaris-net/ngx-components';
import { CacheService } from 'ionic-cache';
import { ReferentialRefService } from './referential-ref.service';
import { Program, ProgramPerson } from './model/program.model';
import { ReferentialService } from './referential.service';
import { ProgramFragments } from './program.fragments';
import { ProgramRefService } from './program-ref.service';
import { BaseReferentialService } from './base-referential-service.class';
import { StrategyRefService } from './strategy-ref.service';
import { ProgramFilter } from './filter/program.filter';
import { ProgramPrivilegeIds } from '@app/referential/services/model/model.enum';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
const ProgramQueries = {
    // Load by id
    load: gql `query Program($id: Int, $label: String){
    data: program(id: $id, label: $label){
      ...ProgramFragment
    }
  }
  ${ProgramFragments.program}
  ${ReferentialFragments.lightReferential}
  ${ReferentialFragments.lightPerson}`,
    // Load all query
    loadAll: gql `query Programs($filter: ProgramFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: programs(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...LightProgramFragment
    }
  }
  ${ProgramFragments.lightProgram}`,
    // Load all query (with total)
    loadAllWithTotal: gql `query ProgramsWithTotal($filter: ProgramFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: programs(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...LightProgramFragment
    }
    total: programsCount(filter: $filter)
  }
  ${ProgramFragments.lightProgram}`
};
const ProgramMutations = {
    save: gql `mutation SaveProgram($data: ProgramVOInput!, $options: ProgramSaveOptionsInput!){
    data: saveProgram(program: $data, options: $options){
      ...ProgramFragment
    }
  }
  ${ProgramFragments.program}
  ${ReferentialFragments.lightReferential}
  ${ReferentialFragments.lightPerson}`,
    delete: gql `mutation DeletePrograms($ids:[Int]){
    deleteReferentials(entityName: "Program", ids: $ids)
  }`
};
let ProgramService = class ProgramService extends BaseReferentialService {
    constructor(injector, network, accountService, referentialService, referentialRefService, programRefService, strategyRefService, cache, entities) {
        super(injector, Program, ProgramFilter, {
            queries: ProgramQueries,
            mutations: ProgramMutations
        });
        this.network = network;
        this.accountService = accountService;
        this.referentialService = referentialService;
        this.referentialRefService = referentialRefService;
        this.programRefService = programRefService;
        this.strategyRefService = strategyRefService;
        this.cache = cache;
        this.entities = entities;
        if (this._debug)
            console.debug('[program-service] Creating service');
    }
    /**
     * Load programs
     *
     * @param offset
     * @param size
     * @param sortBy
     * @param sortDirection
     * @param dataFilter
     * @param opts
     */
    watchAll(offset, size, sortBy, sortDirection, dataFilter, opts) {
        const variables = {
            offset: offset || 0,
            size: size || 100,
            sortBy: sortBy || 'label',
            sortDirection: sortDirection || 'asc',
            filter: dataFilter
        };
        const now = Date.now();
        if (this._debug)
            console.debug('[program-service] Watching programs using options:', variables);
        const withTotal = (!opts || opts.withTotal !== false);
        const query = withTotal ? ProgramQueries.loadAllWithTotal : ProgramQueries.loadAll;
        return this.mutableWatchQuery({
            queryName: withTotal ? 'LoadAllWithTotal' : 'LoadAll',
            arrayFieldName: 'data',
            totalFieldName: withTotal ? 'total' : undefined,
            query,
            variables,
            error: { code: ErrorCodes.LOAD_PROGRAMS_ERROR, message: 'PROGRAM.ERROR.LOAD_PROGRAMS_ERROR' },
            fetchPolicy: opts && opts.fetchPolicy || undefined
        })
            .pipe(map(({ data, total }) => {
            const entities = (data || []).map(Program.fromObject);
            if (this._debug)
                console.debug(`[program-service] Programs loaded in ${Date.now() - now}ms`, entities);
            return {
                data: entities,
                total
            };
        }));
    }
    /**
     * Load programs
     *
     * @param offset
     * @param size
     * @param sortBy
     * @param sortDirection
     * @param dataFilter
     * @param opts
     */
    loadAll(offset, size, sortBy, sortDirection, dataFilter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            dataFilter = this.asFilter(dataFilter);
            const variables = {
                offset: offset || 0,
                size: size || 100,
                sortBy: sortBy || 'label',
                sortDirection: sortDirection || 'asc'
            };
            const debug = this._debug && (!opts || opts.debug !== false);
            const now = debug && Date.now();
            if (debug)
                console.debug('[program-service] Loading programs... using options:', variables);
            let res;
            // Offline mode
            const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
            if (offline) {
                console.warn('[program-service] Remove this local entities call. Use ProgramRefService instead !');
                res = yield this.entities.loadAll(Program.TYPENAME, Object.assign(Object.assign({}, variables), { filter: dataFilter && dataFilter.asFilterFn() }));
            }
            // Online mode
            else {
                const query = opts && opts.query
                    || opts && opts.withTotal && ProgramQueries.loadAllWithTotal
                    || ProgramQueries.loadAll;
                res = yield this.graphql.query({
                    query,
                    variables: Object.assign(Object.assign({}, variables), { filter: dataFilter && dataFilter.asPodObject() }),
                    error: { code: ErrorCodes.LOAD_PROGRAMS_ERROR, message: 'PROGRAM.ERROR.LOAD_PROGRAMS_ERROR' },
                    fetchPolicy: opts && opts.fetchPolicy || undefined
                });
            }
            const entities = (!opts || opts.toEntity !== false) ?
                (res && res.data || []).map(Program.fromObject) :
                (res && res.data || []);
            if (debug)
                console.debug(`[program-service] Programs loaded in ${Date.now() - now}ms`, entities);
            return {
                data: entities,
                total: res && res.total
            };
        });
    }
    existsByLabel(label, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNil(label))
                return false;
            return yield this.referentialRefService.existsByLabel(label, Object.assign(Object.assign({}, filter), { entityName: 'Program' }), opts);
        });
    }
    save(entity, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            opts = Object.assign({ withStrategies: false }, opts);
            const options = {
                awaitRefetchQueries: opts.awaitRefetchQueries,
                refetchQueries: opts.refetchQueries,
                update: opts.update
            };
            if (!this.mutations.save) {
                if (!this.mutations.saveAll)
                    throw new Error('Not implemented');
                const data = yield this.saveAll([entity], options);
                return data && data[0];
            }
            // Fill default properties
            this.fillDefaultProperties(entity);
            // Transform into json
            const json = this.asObject(entity);
            const isNew = this.isNewFn(json);
            const now = Date.now();
            if (this._debug)
                console.debug(this._logPrefix + `Saving ${this._logTypeName}...`, json);
            yield this.graphql.mutate({
                mutation: this.mutations.save,
                refetchQueries: this.getRefetchQueriesForMutation(options),
                awaitRefetchQueries: options && options.awaitRefetchQueries,
                variables: {
                    data: json,
                    options: {
                        withStrategies: opts.withStrategies,
                        withDepartmentsAndPersons: opts.withDepartmentsAndPersons
                    }
                },
                error: { code: ErrorCodes.SAVE_PROGRAM_ERROR, message: 'ERROR.SAVE_PROGRAM_ERROR' },
                update: (cache, { data }) => {
                    // Update entity
                    const savedEntity = data && data.data;
                    this.copyIdAndUpdateDate(savedEntity, entity);
                    // Insert into the cache
                    if (isNew && this.watchQueriesUpdatePolicy === 'update-cache') {
                        this.insertIntoMutableCachedQueries(cache, {
                            queries: this.getLoadQueries(),
                            data: savedEntity
                        });
                    }
                    if (options && options.update) {
                        options.update(cache, { data });
                    }
                    if (this._debug)
                        console.debug(this._logPrefix + `${entity.__typename} saved in ${Date.now() - now}ms`, entity);
                }
            });
            return entity;
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
    deleteAll(entities, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // Avoid any deletion (need more control, to check if there is linked data, etc.)
            throw new Error('Not implemented yet!');
        });
    }
    canUserWrite(entity, opts) {
        return this.accountService.isAdmin()
            // Check program managers (if entity exists)
            || (isNotNil(entity.id) && this.hasPrivilege(entity, this.accountService.person, ProgramPrivilegeIds.MANAGER));
    }
    listenChanges(id, opts) {
        return this.referentialService.listenChanges(id, Object.assign(Object.assign({}, opts), { entityName: Program.ENTITY_NAME }))
            .pipe(mergeMap(data => this.load(id, Object.assign(Object.assign({}, opts), { fetchPolicy: 'network-only' }))));
    }
    copyIdAndUpdateDate(source, target) {
        EntityUtils.copyIdAndUpdateDate(source, target);
        // Update persons
        if (target.persons && source.persons) {
            target.persons.forEach(targetPerson => {
                targetPerson.programId = source.id;
                const sourcePerson = source.persons.find(p => ProgramPerson.equals(p, targetPerson));
                EntityUtils.copyIdAndUpdateDate(sourcePerson, targetPerson);
            });
        }
        // Update strategies
        if (target.strategies && source.strategies) {
            target.strategies.forEach(entity => {
                // Make sure tp copy programId (need by equals)
                entity.programId = source.id;
            });
        }
    }
    /* -- protected methods -- */
    asObject(source, opts) {
        return source.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS));
    }
    fillDefaultProperties(program) {
        program.statusId = isNotNil(program.statusId) ? program.statusId : StatusIds.ENABLE;
        // Update strategies
        (program.strategies || []).forEach(strategy => {
            strategy.statusId = isNotNil(strategy.statusId) ? strategy.statusId : StatusIds.ENABLE;
            // Force a valid programId
            // (because a bad copy can leave an old value)
            strategy.programId = isNotNil(program.id) ? program.id : undefined;
        });
    }
    hasPrivilege(program, person, privilegeId) {
        var _a;
        if (!program || !person || isNil(person.id) || isNil(privilegeId))
            return false; // Skip
        // Lookup on person's privileges
        return (program.persons || [])
            .some(p => p.person.id === person.id && p.privilege.id === privilegeId)
            // Lookup on department's privileges
            || (isNotNil((_a = person.department) === null || _a === void 0 ? void 0 : _a.id) && (program.departments || [])
                .some(d => d.department.id === person.department.id && d.privilege.id === privilegeId));
    }
};
ProgramService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [Injector,
        NetworkService,
        AccountService,
        ReferentialService,
        ReferentialRefService,
        ProgramRefService,
        StrategyRefService,
        CacheService,
        EntitiesStorage])
], ProgramService);
export { ProgramService };
//# sourceMappingURL=program.service.js.map