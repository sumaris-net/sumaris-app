import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable, InjectionToken } from '@angular/core';
import { AccountService, AppFormUtils, arrayDistinct, BaseGraphqlService, EntitiesStorage, EntityUtils, firstNotNilPromise, FormErrorTranslator, GraphqlService, isEmptyArray, isNil, isNotEmptyArray, isNotNil, JobUtils, NetworkService, removeDuplicatesFromArray, toNumber, } from '@sumaris-net/ngx-components';
import { Trip } from '../trip/trip.model';
import { environment } from '@environments/environment';
import { combineLatest, EMPTY } from 'rxjs';
import { filter, first, map, throttleTime } from 'rxjs/operators';
import { gql } from '@apollo/client/core';
import { ReferentialFragments } from '@app/referential/services/referential.fragments';
import { PhysicalGearFilter } from './physical-gear.filter';
import moment from 'moment';
import { TripFilter } from '@app/trip/trip/trip.filter';
import { DataErrorCodes } from '@app/data/services/errors';
import { mergeLoadResult } from '@app/shared/functions';
import { VesselSnapshotFragments } from '@app/referential/services/vessel-snapshot.service';
import { ProgramFragments } from '@app/referential/services/program.fragments';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { ProgressionModel } from '@app/shared/progression/progression.model';
import { PhysicalGearValidatorService } from '@app/trip/physicalgear/physicalgear.validator';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { MEASUREMENT_VALUES_PMFM_ID_REGEXP, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { DataEntityUtils } from '@app/data/services/model/data-entity.model';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { PhysicalGearFragments } from "@app/trip/common/data.fragments";
const Queries = {
    loadAll: gql `
    query PhysicalGears($filter: PhysicalGearFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: physicalGears(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...PhysicalGearFragment
      }
    }
    ${PhysicalGearFragments.physicalGear}
    ${ReferentialFragments.lightReferential}
    ${ReferentialFragments.lightDepartment}
  `,
    load: gql `
    query PhysicalGear($id: Int!) {
      data: physicalGear(id: $id) {
        ...PhysicalGearFragment
      }
    }
    ${PhysicalGearFragments.physicalGear}
    ${ReferentialFragments.lightReferential}
    ${ReferentialFragments.lightDepartment}
  `,
    loadAllWithTrip: gql `
    query PhysicalGearsWithTrip($filter: PhysicalGearFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: physicalGears(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...PhysicalGearFragment
        trip {
          departureDateTime
          returnDateTime
          program {
            ...ProgramRefFragment
          }
          vesselSnapshot {
            ...LightVesselSnapshotFragment
          }
        }
      }
    }
    ${PhysicalGearFragments.physicalGear}
    ${ReferentialFragments.lightReferential}
    ${ReferentialFragments.lightDepartment}
    ${ReferentialFragments.lightDepartment}
    ${VesselSnapshotFragments.lightVesselSnapshot}
    ${ProgramFragments.programRef}
  `,
};
const sortByTripDateFn = (n1, n2) => {
    const d1 = n1.trip && (n1.trip.returnDateTime || n1.trip.departureDateTime);
    const d2 = n2.trip && (n2.trip.returnDateTime || n2.trip.departureDateTime);
    return d1.isSame(d2) ? 0 : (d1.isAfter(d2) ? 1 : -1);
};
export const PHYSICAL_GEAR_DATA_SERVICE_TOKEN = new InjectionToken('PhysicalGearDataService');
let PhysicalGearService = class PhysicalGearService extends BaseGraphqlService {
    constructor(graphql, network, accountService, entities, validatorService, programRefService, formErrorTranslator) {
        super(graphql, environment);
        this.graphql = graphql;
        this.network = network;
        this.accountService = accountService;
        this.entities = entities;
        this.validatorService = validatorService;
        this.programRefService = programRefService;
        this.formErrorTranslator = formErrorTranslator;
        this.loading = false;
        this._logPrefix = '[physical-gear-service] ';
        // -- For DEV only
        this._debug = !environment.production;
    }
    watchAll(offset, size, sortBy, sortDirection, dataFilter, opts) {
        if (!dataFilter || (isNil(dataFilter.parentGearId) && (isNil(dataFilter.program) || (isNil(dataFilter.vesselId) && isNil(dataFilter.startDate))))) {
            console.warn('[physical-gear-service] Missing physical gears filter. At least \'parentGearId\', or \'program\' and \'vesselId\' or \'startDate\'. Skipping.');
            return EMPTY;
        }
        dataFilter = this.asFilter(dataFilter);
        // Fix sortBy
        sortBy = sortBy !== 'id' ? sortBy : 'rankOrder';
        sortBy = sortBy !== 'label' ? sortBy : 'gear.label';
        const forceOffline = this.network.offline
            || (isNotNil(dataFilter.tripId) && dataFilter.tripId < 0)
            || (isNotNil(dataFilter.parentGearId) && dataFilter.parentGearId < 0);
        ;
        const offline = forceOffline || (opts === null || opts === void 0 ? void 0 : opts.withOffline) || false;
        const online = !forceOffline;
        const offline$ = offline && this.watchAllLocally(offset, size, sortBy, sortDirection, dataFilter, Object.assign(Object.assign({}, opts), { toEntity: false, distinctBy: undefined }));
        const online$ = online && this.watchAllRemotely(offset, size, sortBy, sortDirection, dataFilter, Object.assign(Object.assign({}, opts), { toEntity: false, distinctBy: undefined }));
        // Merge local and remote
        const res = (offline$ && online$)
            ? combineLatest([offline$, online$])
                .pipe(map(([res1, res2]) => mergeLoadResult(res1, res2)))
            : (offline$ || online$);
        return res.pipe(map(res => this.applyWatchOptions(res, offset, size, sortBy, sortDirection, dataFilter, opts)));
    }
    deleteAll(data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            console.error('PhysicalGearService.deleteAll() not implemented yet');
        });
    }
    saveAll(data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            console.error('PhysicalGearService.saveAll() not implemented yet !');
            return data;
        });
    }
    watchAllRemotely(offset, size, sortBy, sortDirection, dataFilter, opts) {
        if (!dataFilter || (isNil(dataFilter.parentGearId) && (isNil(dataFilter.program) || (isNil(dataFilter.vesselId) && isNil(dataFilter.startDate))))) {
            console.warn('[physical-gear-service] Missing physical gears filter. Expected at least \'parentGearId\', or \'program\' and \'vesselId\' or \'startDate\'. Skipping.');
            return EMPTY;
        }
        const variables = {
            offset: offset || 0,
            size: size >= 0 ? size : 100,
            sortBy: (sortBy !== 'id' && sortBy !== 'lastUsed' && sortBy) || 'rankOrder',
            sortDirection: sortDirection || 'desc',
            filter: dataFilter.asPodObject()
        };
        let now = this._debug && Date.now();
        if (this._debug)
            console.debug('[physical-gear-service] Loading physical gears... using options:', variables);
        const withTrip = dataFilter && dataFilter.vesselId && isNil(dataFilter.tripId);
        const query = (opts === null || opts === void 0 ? void 0 : opts.query) || (withTrip ? Queries.loadAllWithTrip : Queries.loadAll);
        return this.graphql.watchQuery({
            query,
            variables,
            error: { code: DataErrorCodes.LOAD_ENTITIES_ERROR, message: 'ERROR.LOAD_ENTITIES_ERROR' },
            fetchPolicy: opts && opts.fetchPolicy || undefined
        })
            .pipe(throttleTime(200), // avoid multiple call
        filter(() => !this.loading), map(({ data, total }) => {
            if (now) {
                console.debug(`[physical-gear-service] Loaded ${data.length} physical gears in ${Date.now() - now}ms`);
                now = undefined;
            }
            return {
                data,
                total: total || data.length
            };
        }), map(res => this.applyWatchOptions(res, offset, size, sortBy, sortDirection, dataFilter, opts)));
    }
    /**
     * Get physical gears, from trips data, and imported gears (offline mode)
     *
     * @param offset
     * @param size
     * @param sortBy
     * @param sortDirection
     * @param dataFilter
     * @param opts
     */
    watchAllLocally(offset, size, sortBy, sortDirection, dataFilter, opts) {
        if (!dataFilter || (isNil(dataFilter.parentGearId) && isNil(dataFilter.vesselId))) {
            console.warn('[physical-gear-service] Missing physical gears filter. Expected at least \'vesselId\' or \'parentGearId\'. Skipping.');
            return EMPTY;
        }
        const withTrip = isNil(dataFilter.tripId);
        const fromTrip$ = this.watchAllLocallyFromTrips(offset, size, sortBy, sortDirection, dataFilter, Object.assign(Object.assign({}, opts), { toEntity: false, distinctBy: undefined }));
        // Then, search from predoc (physical gears imported by the offline mode, into the local storage)
        const variables = {
            offset: offset || 0,
            size,
            sortBy: (sortBy !== 'id' && sortBy !== 'lastUsed' && sortBy) || 'rankOrder',
            sortDirection: sortDirection || 'desc',
            filter: dataFilter.asFilterFn()
        };
        if (this._debug)
            console.debug('[physical-gear-service] Loading physical gears locally... using variables:', variables);
        const fromStorage$ = this.entities.watchAll(PhysicalGear.TYPENAME, variables, { fullLoad: opts && opts.fullLoad });
        const res = (fromTrip$ && fromStorage$)
            // Merge local and remote
            ? combineLatest([fromTrip$, fromStorage$])
                .pipe(map(([res1, res2]) => mergeLoadResult(res1, res2)))
            : (fromTrip$ || fromStorage$);
        return res.pipe(map(res => this.applyWatchOptions(res, offset, size, sortBy, sortDirection, dataFilter, opts)));
    }
    watchAllLocallyFromTrips(offset, size, sortBy, sortDirection, dataFilter, opts) {
        if (!dataFilter || (isNil(dataFilter.tripId) && (isNil(dataFilter.vesselId) || isNil(dataFilter.program)))) {
            console.warn('[physical-gear-service] Trying to load gears from trips without [vesselId, program] or without [tripdId]. Skipping.');
            return EMPTY;
        }
        const tripFilter = TripFilter.fromObject(dataFilter && {
            id: dataFilter.tripId,
            vesselId: dataFilter.vesselId,
            startDate: dataFilter.startDate,
            endDate: dataFilter.endDate,
            program: dataFilter.program,
            excludedIds: isNotNil(dataFilter.excludeTripId) ? [dataFilter.excludeTripId] : undefined
        });
        size = size >= 0 ? size : 100;
        const variables = {
            offset: offset || 0,
            size,
            sortBy: 'id',
            sortDirection: sortDirection || 'desc',
            filter: tripFilter.asFilterFn()
        };
        if (this._debug)
            console.debug('[physical-gear-service] Loading physical gears, from local trips... using variables:', variables);
        const withTrip = isNil(dataFilter.tripId);
        return this.entities.watchAll(Trip.TYPENAME, variables, { fullLoad: true }) // FullLoad is needed to get gears
            .pipe(
        // Need only one iteration
        first(), 
        // Get trips array
        map(res => res && res.data || []), 
        // Extract physical gears, from trip
        map(trips => trips.reduce((res, trip) => res.concat((trip.gears || [])
            .map(gear => (Object.assign(Object.assign({}, gear), { 
            // Add metadata on trip, if need
            trip: withTrip ? {
                id: trip.id,
                program: trip.program,
                departureDateTime: trip.departureDateTime,
                returnDateTime: trip.returnDateTime
            } : undefined })))), [])), 
        // Return as load result
        map(data => ({ data, total: data.length })), map(res => this.applyWatchOptions(res, offset, size, sortBy, sortDirection, dataFilter, opts)));
    }
    applyWatchOptions({ data, total }, offset, size, sortBy, sortDirection, filter, opts) {
        const toEntity = (!opts || opts.toEntity !== false);
        let entities = toEntity ?
            (data || []).map(source => PhysicalGear.fromObject(source, opts))
            : (data || []);
        // Sort by trip dates
        const withTrip = isNil(filter.tripId);
        // Remove duplicated gears
        if (isNotEmptyArray(opts === null || opts === void 0 ? void 0 : opts.distinctBy)) {
            // Sort by trip dates desc, to keep newer
            if (toEntity && withTrip)
                entities.sort(sortByTripDateFn).reverse();
            entities = arrayDistinct(entities, opts === null || opts === void 0 ? void 0 : opts.distinctBy);
        }
        // Sort
        if (sortBy) {
            entities = toEntity ? entities : entities.slice(); // Make sure to source array, as it can be a readonly array
            if (sortBy === 'lastUsed') {
                if (toEntity && withTrip) {
                    entities.sort(sortByTripDateFn);
                    if (sortDirection === 'desc') {
                        entities.reverse();
                    }
                }
            }
            else {
                EntityUtils.sort(entities, sortBy, sortDirection);
            }
        }
        return { data: entities, total };
    }
    load(id, tripId, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNil(id))
                throw new Error('Missing argument \'id\' ');
            const now = this._debug && Date.now();
            if (this._debug)
                console.debug(`[physical-gear-service] Loading physical gear #${id}...`);
            this.loading = true;
            try {
                let json;
                const offline = this.network.offline || id < 0;
                // Load locally
                if (offline) {
                    // Watch on storage
                    json = yield this.entities.load(id, PhysicalGear.TYPENAME);
                    if (!json) {
                        // If not on storage, watch on trip
                        const trip = yield this.entities.load(tripId, Trip.TYPENAME);
                        if (trip && trip.gears) {
                            json = trip.gears.find(g => g.id === id);
                        }
                    }
                    if (!json)
                        throw { code: DataErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR' };
                }
                // Load from pod
                else {
                    const res = yield this.graphql.query({
                        query: Queries.load,
                        variables: { id },
                        error: { code: DataErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR' }
                    });
                    json = res && res.data;
                }
                // Transform to entity
                const data = (!opts || opts.toEntity !== false)
                    ? PhysicalGear.fromObject(json)
                    : json;
                if (data && this._debug)
                    console.debug(`[physical-gear-service] Physical gear #${id} loaded in ${Date.now() - now}ms`, data);
                return data;
            }
            finally {
                this.loading = false;
            }
        });
    }
    loadAll(offset, size, sortBy, sortDirection, dataFilter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            return firstNotNilPromise(this.watchAll(offset, size, sortBy, sortDirection, dataFilter, opts));
        });
    }
    loadAllByParentId(filter, opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // If we know the local trip, load it
            if (isNotNil(filter.tripId) && filter.tripId < 0) {
                const trip = yield this.entities.load(filter.tripId, Trip.TYPENAME);
                return (_a = (trip.gears || []).find(g => g.id === filter.parentGearId)) === null || _a === void 0 ? void 0 : _a.children;
            }
            const res = yield this.loadAll(0, 100, 'rankOrder', 'asc', filter, opts);
            return res === null || res === void 0 ? void 0 : res.data;
        });
    }
    controlAllByTrip(trip, opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const maxProgression = toNumber(opts === null || opts === void 0 ? void 0 : opts.maxProgression, 100);
            opts = Object.assign(Object.assign({}, opts), { maxProgression });
            opts.progression = opts.progression || new ProgressionModel({ total: maxProgression });
            const endProgression = opts.progression.current + maxProgression;
            try {
                const entities = trip.gears;
                if (isEmptyArray(entities))
                    return undefined; // Skip if empty
                // Prepare control options
                opts = yield this.fillControlOptionsForTrip(trip.id, opts);
                const progressionStep = maxProgression / entities.length; // 2 steps by gear: control, then save
                let errorsById = null;
                // For each entity
                for (const entity of entities) {
                    const errors = yield this.control(entity, opts);
                    // Control failed: save error
                    if (errors) {
                        errorsById = errorsById || {};
                        errorsById[entity.id] = errors;
                        // translate, and update the entity
                        const errorMessage = this.formErrorTranslator.translateErrors(errors, opts.translatorOptions);
                        DataEntityUtils.markAsInvalid(entity, errorMessage);
                    }
                    // OK succeed: mark as controlled
                    else {
                        DataEntityUtils.markAsControlled(entity);
                    }
                    if ((_a = opts.progression) === null || _a === void 0 ? void 0 : _a.cancelled)
                        return; // Cancel
                    opts.progression.increment(progressionStep);
                }
                return errorsById;
            }
            catch (err) {
                console.error(err && err.message || err);
                throw err;
            }
            finally {
                if (opts.progression.current < endProgression) {
                    opts.progression.current = endProgression;
                }
            }
        });
    }
    control(entity, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = this._debug && Date.now();
            if (this._debug)
                console.debug(`[physical-gear-service] Control #${entity.id}...`, entity);
            // Prepare control options
            opts = yield this.fillControlOptionsForGear(entity, opts);
            // Make sure to convert ALL pmfms to form (sometime we convert only required pmfms - e.g. see optimization in the physical gear table)
            if (MeasurementValuesUtils.isMeasurementFormValues(entity.measurementValues)) {
                entity.measurementValues.__typename = undefined;
                entity.measurementValues = MeasurementValuesUtils.normalizeValuesToForm(entity.measurementValues, opts.pmfms, { keepSourceObject: true, onlyExistingPmfms: true });
            }
            // Create validator
            const form = this.validatorService.getFormGroup(entity, opts);
            if (!form.valid) {
                // Wait end of validation (e.g. async validators)
                yield AppFormUtils.waitWhilePending(form);
                // Get form errors
                if (form.invalid) {
                    const errors = AppFormUtils.getFormErrors(form);
                    console.info(`[physical-gear-service] Control #${entity.id} [INVALID] in ${Date.now() - now}ms`, errors);
                    return errors;
                }
            }
        });
    }
    executeImport(filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const maxProgression = opts && opts.maxProgression || 100;
            filter = Object.assign({ startDate: moment().add(-1, 'month') }, filter);
            console.info('[physical-gear-service] Importing physical gears...');
            const res = yield JobUtils.fetchAllPages((offset, size) => this.loadAll(offset, size, 'id', null, filter, {
                fetchPolicy: 'no-cache',
                distinctByRankOrder: true,
                toEntity: false,
                query: Queries.loadAllWithTrip
            }), {
                progression: opts === null || opts === void 0 ? void 0 : opts.progression,
                maxProgression: maxProgression * 0.9,
                logPrefix: this._logPrefix,
                fetchSize: 100
            });
            // Save result locally
            yield this.entities.saveAll(res.data, { entityName: PhysicalGear.TYPENAME, reset: true });
        });
    }
    asFilter(filter) {
        return PhysicalGearFilter.fromObject(filter);
    }
    translateControlPath(path, opts) {
        opts = opts || {};
        opts.i18nPrefix = opts.i18nPrefix || 'TRIP.PHYSICAL_GEAR.EDIT.';
        // Translate PMFM field
        if (MEASUREMENT_VALUES_PMFM_ID_REGEXP.test(path) && opts.pmfms) {
            const pmfmId = parseInt(path.split('.').pop());
            const pmfm = opts.pmfms.find(p => p.id === pmfmId);
            return PmfmUtils.getPmfmName(pmfm);
        }
        // Default translation
        return this.formErrorTranslator.translateControlPath(path, opts);
    }
    /* -- protected methods -- */
    fillValidatorOptionsForTrip(tripId, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            opts = opts || {};
            // Check program filled
            if (!opts.program)
                throw new Error('Missing program in options. Unable to control trip\'s physical gears');
            const allowChildren = opts === null || opts === void 0 ? void 0 : opts.program.getPropertyAsBoolean(ProgramProperties.TRIP_PHYSICAL_GEAR_ALLOW_CHILDREN);
            return Object.assign(Object.assign({ acquisitionLevel: AcquisitionLevelCodes.PHYSICAL_GEAR, withChildren: allowChildren, minChildrenCount: allowChildren && (opts === null || opts === void 0 ? void 0 : opts.program.getPropertyAsInt(ProgramProperties.TRIP_PHYSICAL_GEAR_MIN_CHILDREN_COUNT)) }, opts), { withMeasurementValues: true });
        });
    }
    fillControlOptionsForTrip(tripId, opts) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            // Fill options need by the operation validator
            opts = yield this.fillValidatorOptionsForTrip(tripId, opts);
            // Prepare pmfms (the full list, not filtered by gearId)
            if (!opts.initialPmfms) {
                const programLabel = (_a = opts.program) === null || _a === void 0 ? void 0 : _a.label;
                const acquisitionLevel = AcquisitionLevelCodes.PHYSICAL_GEAR;
                opts.initialPmfms = programLabel && (yield this.programRefService.loadProgramPmfms(programLabel, { acquisitionLevel })) || [];
            }
            // Prepare children pmfms (the full list, not filtered by gearId)
            if (opts.withChildren && !opts.initialChildrenPmfms) {
                const programLabel = (_b = opts.program) === null || _b === void 0 ? void 0 : _b.label;
                const acquisitionLevel = AcquisitionLevelCodes.CHILD_PHYSICAL_GEAR;
                opts.initialChildrenPmfms = programLabel && (yield this.programRefService.loadProgramPmfms(programLabel, { acquisitionLevel })) || [];
            }
            // Prepare error translator
            if (!opts.translatorOptions) {
                opts.translatorOptions = {
                    controlPathTranslator: {
                        translateControlPath: (path) => this.translateControlPath(path, { pmfms: opts.initialPmfms })
                    }
                };
            }
            return opts;
        });
    }
    fillControlOptionsForGear(entity, opts) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            opts = opts || {};
            opts = yield this.fillControlOptionsForTrip(entity.tripId, opts);
            // Fill acquisition level
            const isChild = isNotNil(toNumber(entity.parentId, (_a = entity.parent) === null || _a === void 0 ? void 0 : _a.id));
            opts.withChildren = opts.withChildren && !isChild;
            opts.acquisitionLevel = isChild ? AcquisitionLevelCodes.CHILD_PHYSICAL_GEAR : AcquisitionLevelCodes.PHYSICAL_GEAR;
            // Filter pmfms for the operation's gear
            const initialPmfms = isChild ? opts.initialChildrenPmfms : opts.initialPmfms;
            const gearId = (_b = entity.gear) === null || _b === void 0 ? void 0 : _b.id;
            if (isNotNil(gearId)) {
                opts.pmfms = initialPmfms
                    .filter(p => isEmptyArray(p.gearIds) || p.gearIds.includes(gearId));
            }
            else {
                opts.pmfms = (initialPmfms || []);
            }
            // Filter children pmfms, for children gears
            const childrenGearIds = opts.withChildren ? removeDuplicatesFromArray((entity.children || []).map(child => { var _a; return (_a = child.gear) === null || _a === void 0 ? void 0 : _a.id; })) : undefined;
            if (isNotEmptyArray(childrenGearIds) && opts.initialChildrenPmfms) {
                opts.childrenPmfms = opts.initialChildrenPmfms
                    .filter(p => isEmptyArray(p.gearIds) || p.gearIds.some(id => childrenGearIds.includes(id)));
            }
            else {
                opts.childrenPmfms = (opts.initialChildrenPmfms || []);
            }
            return opts;
        });
    }
};
PhysicalGearService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [GraphqlService,
        NetworkService,
        AccountService,
        EntitiesStorage,
        PhysicalGearValidatorService,
        ProgramRefService,
        FormErrorTranslator])
], PhysicalGearService);
export { PhysicalGearService };
//# sourceMappingURL=physicalgear.service.js.map