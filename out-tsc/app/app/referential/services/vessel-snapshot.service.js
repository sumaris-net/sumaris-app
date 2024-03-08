import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { gql } from '@apollo/client/core';
import { ErrorCodes } from './errors';
import { BaseGraphqlService, ConfigService, EntitiesStorage, firstNotNilPromise, GraphqlService, isEmptyArray, isNotNil, JobUtils, LocalSettingsService, NetworkService, ReferentialRef, ReferentialUtils, StatusIds, } from '@sumaris-net/ngx-components';
import { ReferentialFragments } from './referential.fragments';
import { merge } from 'rxjs';
import { VesselSnapshot } from './model/vessel-snapshot.model';
import { environment } from '@environments/environment';
import { VesselSnapshotFilter } from './filter/vessel.filter';
import { ProgramLabel } from '@app/referential/services/model/model.enum';
import { VESSEL_CONFIG_OPTIONS, VESSEL_FEATURE_NAME } from '@app/vessel/services/config/vessel.config';
import { debounceTime, filter, map } from 'rxjs/operators';
import { SAVE_AS_OBJECT_OPTIONS } from '@app/data/services/model/data-entity.model';
import { mergeLoadResult } from '@app/shared/functions';
export const VesselSnapshotFragments = {
    lightVesselSnapshot: gql `
    fragment LightVesselSnapshotFragment on VesselSnapshotVO {
      id: vesselId
      name
      exteriorMarking
      registrationCode
      intRegistrationCode
      updateDate
      vesselType {
        ...LightReferentialFragment
      }
      vesselStatusId
    }
  `,
    lightVesselSnapshotWithPort: gql `
    fragment LightVesselSnapshotWithPortFragment on VesselSnapshotVO {
      id: vesselId
      name
      exteriorMarking
      registrationCode
      intRegistrationCode
      startDate
      endDate
      updateDate
      basePortLocation {
        ...LocationFragment
      }
      vesselType {
        ...LightReferentialFragment
      }
      vesselStatusId
    }
  `,
    vesselSnapshot: gql `
    fragment VesselSnapshotFragment on VesselSnapshotVO {
      id: vesselId
      name
      exteriorMarking
      registrationCode
      intRegistrationCode
      startDate
      endDate
      updateDate
      basePortLocation {
        ...LocationFragment
      }
      vesselType {
        ...LightReferentialFragment
      }
      vesselStatusId
    }
  `,
};
const QUERIES = {
    // Load all
    loadAll: gql `query VesselSnapshots($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: VesselFilterVOInput){
    data: vesselSnapshots(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...LightVesselSnapshotFragment
    }
  }
  ${VesselSnapshotFragments.lightVesselSnapshot}
  ${ReferentialFragments.lightReferential}`,
    // Load all with total
    loadAllWithTotal: gql `query VesselSnapshotsWithTotal($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: VesselFilterVOInput){
    data: vesselSnapshots(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...LightVesselSnapshotFragment
    }
    total: vesselSnapshotsCount(filter: $filter)
  }
  ${VesselSnapshotFragments.lightVesselSnapshot}
  ${ReferentialFragments.lightReferential}`,
    // Load one item
    load: gql `query VesselSnapshot($vesselId: Int, $vesselFeaturesId: Int) {
    data: vesselSnapshots(filter: {vesselId: $vesselId, vesselFeaturesId: $vesselFeaturesId}) {
      ...LightVesselSnapshotFragment
    }
  }
  ${VesselSnapshotFragments.lightVesselSnapshot}
  ${ReferentialFragments.lightReferential}`,
    // Load all WITH base port location
    loadAllWithPort: gql `query VesselSnapshotsWithPort($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: VesselFilterVOInput){
    data: vesselSnapshots(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...LightVesselSnapshotWithPortFragment
    }
  }
  ${VesselSnapshotFragments.lightVesselSnapshotWithPort}
  ${ReferentialFragments.location}
  ${ReferentialFragments.lightReferential}`,
    // Load all WITH base port location AND total
    loadAllWithPortAndTotal: gql `query VesselSnapshotsWithPortAndTotal($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: VesselFilterVOInput){
    data: vesselSnapshots(offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter){
      ...LightVesselSnapshotWithPortFragment
    }
    total: vesselSnapshotsCount(filter: $filter)
  }
  ${VesselSnapshotFragments.lightVesselSnapshotWithPort}
  ${ReferentialFragments.location}
  ${ReferentialFragments.lightReferential}`
};
let VesselSnapshotService = class VesselSnapshotService extends BaseGraphqlService {
    constructor(graphql, network, entities, configService, settings) {
        super(graphql, environment);
        this.graphql = graphql;
        this.network = network;
        this.entities = entities;
        this.configService = configService;
        this.settings = settings;
        this.defaultFilter = null;
        this.defaultLoadOptions = null;
        this.suggestLengthThreshold = 0;
        this.enableSearchRegistrationByPrefix = VESSEL_CONFIG_OPTIONS.VESSEL_FILTER_SEARCH_REGISTRATION_CODE_AS_PREFIX.defaultValue;
    }
    get onConfigOrSettingsChanges() {
        return merge(this.configService.config, this.settings.onChange);
    }
    ngOnStart() {
        return __awaiter(this, void 0, void 0, function* () {
            console.info('[vessel-snapshot-service] Starting service...');
            // Restoring local settings
            yield Promise.all([
                this.settings.ready(),
                this.configService.ready()
            ]);
            yield this.initDefaults();
            // Listen for config or settings changes, then update defaults
            this.registerSubscription(this.onConfigOrSettingsChanges
                .pipe(filter(() => this.started), debounceTime(1000))
                .subscribe(() => this.initDefaults()));
        });
    }
    /**
     * Load many vessels
     *
     * @param offset
     * @param size
     * @param sortBy
     * @param sortDirection
     * @param filter
     * @param opts
     */
    loadAll(offset, size, sortBy, sortDirection, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.started)
                yield this.ready();
            filter = this.asFilter(Object.assign(Object.assign({}, this.defaultFilter), filter));
            opts = Object.assign(Object.assign({}, this.defaultLoadOptions), opts);
            const variables = {
                offset: offset || 0,
                size: size || 100,
                sortBy: sortBy || ((filter === null || filter === void 0 ? void 0 : filter.searchAttributes) && (filter === null || filter === void 0 ? void 0 : filter.searchAttributes[0])) || VesselSnapshotFilter.DEFAULT_SEARCH_ATTRIBUTES[0],
                sortDirection: sortDirection || 'asc'
            };
            const debug = this._debug && (!opts || opts.debug !== false);
            const now = debug && Date.now();
            if (debug)
                console.debug('[vessel-snapshot-service] Loading vessel snapshots using options:', variables);
            const withTotal = (!opts || opts.withTotal !== false);
            let res;
            // Offline: use local store
            const forceOffline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only') || (isNotNil(filter.vesselId) && filter.vesselId < 0);
            const offline = forceOffline || (filter.synchronizationStatus && filter.synchronizationStatus !== 'SYNC');
            if (offline) {
                res = yield this.entities.loadAll(VesselSnapshot.TYPENAME, Object.assign(Object.assign({}, variables), { filter: filter === null || filter === void 0 ? void 0 : filter.asFilterFn() }));
            }
            else {
                // Online: use GraphQL
                const query = withTotal
                    ? ((opts === null || opts === void 0 ? void 0 : opts.withBasePortLocation) ? QUERIES.loadAllWithPortAndTotal : QUERIES.loadAllWithTotal)
                    : ((opts === null || opts === void 0 ? void 0 : opts.withBasePortLocation) ? QUERIES.loadAllWithPort : QUERIES.loadAll);
                res = yield this.graphql.query({
                    query,
                    variables: Object.assign(Object.assign({}, variables), { filter: filter === null || filter === void 0 ? void 0 : filter.asPodObject() }),
                    error: { code: ErrorCodes.LOAD_VESSELS_ERROR, message: 'VESSEL.ERROR.LOAD_ERROR' },
                    fetchPolicy: opts && opts.fetchPolicy || undefined /*use default*/
                });
                // Add local temporary vessels
                const needLocalTemporaryVessel = this.settings.hasOfflineFeature(VESSEL_FEATURE_NAME)
                    && (isEmptyArray(filter === null || filter === void 0 ? void 0 : filter.statusIds) || filter.statusIds.includes(StatusIds.TEMPORARY));
                if (needLocalTemporaryVessel) {
                    const temporaryFilter = filter ? filter.clone() : new VesselSnapshotFilter();
                    temporaryFilter.statusIds = [StatusIds.TEMPORARY];
                    const localRes = yield this.entities.loadAll(VesselSnapshot.TYPENAME, Object.assign(Object.assign({}, variables), { filter: temporaryFilter.asFilterFn() }));
                    // Add to result
                    if (localRes.total) {
                        res = mergeLoadResult(res, localRes);
                    }
                }
            }
            const entities = (!opts || opts.toEntity !== false) ?
                ((res === null || res === void 0 ? void 0 : res.data) || []).map(VesselSnapshot.fromObject) :
                ((res === null || res === void 0 ? void 0 : res.data) || []);
            const total = (res === null || res === void 0 ? void 0 : res.total) || entities.length;
            res = { total, data: entities };
            // Add fetch more capability, if total was fetched
            if (withTotal) {
                const nextOffset = offset + entities.length;
                if (nextOffset < res.total) {
                    res.fetchMore = () => this.loadAll(nextOffset, size, sortBy, sortDirection, filter, opts);
                }
            }
            if (debug)
                console.debug(`[vessel-snapshot-service] Vessels loaded in ${Date.now() - now}ms`);
            return res;
        });
    }
    suggest(value, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ReferentialUtils.isNotEmpty(value))
                return { data: [value] };
            // Make sure service has been started, before using defaults (e.g. minSearchTextLength)
            if (!this.started)
                yield this.ready();
            const searchText = (typeof value === 'string' && value !== '*') && value || undefined;
            // Not enough character to launch the search
            if ((searchText && searchText.length || 0) < this.suggestLengthThreshold)
                return { data: undefined };
            let searchAttributes = filter.searchAttributes;
            // Exclude search on name, when search by prefix is enabled (by config)
            if (this.enableSearchRegistrationByPrefix) {
                if (searchText && !searchText.startsWith('*') && searchAttributes && searchAttributes[0] !== 'name') {
                    searchAttributes = searchAttributes.filter(attr => attr !== 'name');
                }
            }
            return this.loadAll(0, !value ? 30 : 20, undefined, undefined, Object.assign(Object.assign({}, filter), { searchText,
                searchAttributes }), {
                fetchPolicy: 'cache-first'
            });
        });
    }
    load(id, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug(`[vessel-snapshot-service] Loading vessel snapshot #${id}`);
            // Offline mode
            const offline = (id < 0) || (this.network.offline && (!opts || opts.fetchPolicy !== 'network-only'));
            if (offline) {
                const data = yield this.entities.load(id, VesselSnapshot.TYPENAME);
                if (!data)
                    throw { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' };
                return ((!opts || opts.toEntity !== false) ? VesselSnapshot.fromObject(data) : data) || null;
            }
            const { data } = yield this.graphql.query({
                query: QUERIES.load,
                variables: {
                    vesselId: id,
                    vesselFeaturesId: null
                },
                fetchPolicy: opts && opts.fetchPolicy || undefined
            });
            const res = data && data[0];
            return res && ((!opts || opts.toEntity !== false) ? VesselSnapshot.fromObject(res) : res) || null;
        });
    }
    watchAllLocally(offset, size, sortBy, sortDirection, filter, opts) {
        filter = this.asFilter(filter);
        const variables = {
            offset: offset || 0,
            size: size || 100,
            sortBy: sortBy || 'exteriorMarking',
            sortDirection: sortDirection || 'asc',
            filter: filter === null || filter === void 0 ? void 0 : filter.asFilterFn()
        };
        if (this._debug)
            console.debug('[vessel-snapshot-service] Loading local vessel snapshots using options:', variables);
        return this.entities.watchAll(VesselSnapshot.TYPENAME, variables, opts)
            .pipe(map(({ data, total }) => {
            const entities = (data || []).map(VesselSnapshot.fromObject);
            return { data: entities, total };
        }));
    }
    /**
     * Save into the local storage
     *
     * @param entity
     */
    saveLocally(entity) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._debug)
                console.debug('[vessel-snapshot-service] [offline] Saving vesselSnapshot locally...', entity);
            const json = entity.asObject(SAVE_AS_OBJECT_OPTIONS);
            // Save locally
            return yield this.entities.save(json, { entityName: VesselSnapshot.TYPENAME });
        });
    }
    /**
     * Delete vesselSnapshot locally (from the entity storage)
     */
    deleteLocally(filter) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!filter)
                throw new Error('Missing arguments \'filter\'');
            const dataFilter = this.asFilter(filter);
            const variables = {
                filter: dataFilter && dataFilter.asFilterFn()
            };
            try {
                // Find vessel snapshot to delete
                const res = yield this.entities.loadAll(VesselSnapshot.TYPENAME, variables, { fullLoad: false });
                const ids = (res && res.data || []).map(o => o.id);
                if (isEmptyArray(ids))
                    return undefined; // Skip
                // Apply deletion
                return yield this.entities.deleteMany(ids, { entityName: VesselSnapshot.TYPENAME });
            }
            catch (err) {
                console.error(`[vessel-snapshot-service] Failed to delete vessel snapshot ${JSON.stringify(filter)}`, err);
                throw err;
            }
        });
    }
    executeImport(filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const maxProgression = opts && opts.maxProgression || 100;
            filter = Object.assign(Object.assign({}, filter), { statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY], 
                // Force the use of the specific program, used for vessels
                program: ReferentialRef.fromObject({ label: ProgramLabel.SIH }) });
            console.info('[vessel-snapshot-service] Importing vessels (snapshot)...');
            const res = yield JobUtils.fetchAllPages((offset, size) => this.loadAll(offset, size, 'id', null, filter, {
                debug: false,
                fetchPolicy: 'no-cache',
                withBasePortLocation: true,
                withTotal: (offset === 0),
                toEntity: false
            }), {
                progression: opts === null || opts === void 0 ? void 0 : opts.progression,
                maxProgression: maxProgression * 0.9,
                logPrefix: '[vessel-snapshot-service]'
            });
            // Save locally
            yield this.entities.saveAll(res.data, { entityName: VesselSnapshot.TYPENAME });
        });
    }
    asFilter(source) {
        return VesselSnapshotFilter.fromObject(source);
    }
    getDisplayAttributes(fieldName, defaultAttributes) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Make sure defaults have been loaded
            if (!this.started)
                yield this.ready();
            const baseAttributes = this.settings.getFieldDisplayAttributes(fieldName || 'vesselSnapshot', defaultAttributes || VesselSnapshotFilter.DEFAULT_SEARCH_ATTRIBUTES);
            const displayAttributes = ((_a = this.defaultLoadOptions) === null || _a === void 0 ? void 0 : _a.withBasePortLocation)
                ? baseAttributes.concat(this.settings.getFieldDisplayAttributes('location').map(key => 'basePortLocation.' + key))
                : baseAttributes;
            return displayAttributes;
        });
    }
    getAutocompleteFieldOptions(fieldName, defaultAttributes) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const baseAttributes = this.settings.getFieldDisplayAttributes(fieldName || 'vesselSnapshot', defaultAttributes || VesselSnapshotFilter.DEFAULT_SEARCH_ATTRIBUTES);
            const displayAttributes = ((_a = this.defaultLoadOptions) === null || _a === void 0 ? void 0 : _a.withBasePortLocation)
                ? baseAttributes.concat(this.settings.getFieldDisplayAttributes('location').map(key => 'basePortLocation.' + key))
                : baseAttributes;
            return {
                showAllOnFocus: false,
                suggestFn: (value, filter) => this.suggest(value, filter),
                attributes: displayAttributes,
                filter: Object.assign(Object.assign({}, this.defaultFilter), { statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY], searchAttributes: baseAttributes }),
                suggestLengthThreshold: this.suggestLengthThreshold,
                mobile: this.settings.mobile
            };
        });
    }
    /* -- protected methods -- */
    initDefaults() {
        return __awaiter(this, void 0, void 0, function* () {
            // DEBUG
            console.debug('[vessel-snapshot-service] Init defaults load options');
            const config = yield firstNotNilPromise(this.configService.config);
            const withBasePortLocation = config.getPropertyAsBoolean(VESSEL_CONFIG_OPTIONS.VESSEL_BASE_PORT_LOCATION_VISIBLE);
            // Set default filter (registration location, vessel type)
            const defaultRegistrationLocationId = config.getPropertyAsInt(VESSEL_CONFIG_OPTIONS.VESSEL_FILTER_DEFAULT_COUNTRY_ID);
            const defaultVesselTypeId = config.getPropertyAsInt(VESSEL_CONFIG_OPTIONS.VESSEL_FILTER_DEFAULT_TYPE_ID);
            const settingsAttributes = this.settings.getFieldDisplayAttributes('vesselSnapshot', VesselSnapshotFilter.DEFAULT_SEARCH_ATTRIBUTES);
            // Update default filter
            this.defaultFilter = Object.assign(Object.assign({}, this.defaultFilter), { searchAttributes: settingsAttributes, registrationLocation: isNotNil(defaultRegistrationLocationId) ? { id: defaultRegistrationLocationId } : undefined, vesselTypeId: isNotNil(defaultVesselTypeId) ? defaultVesselTypeId : undefined });
            // Update default options
            this.defaultLoadOptions = Object.assign(Object.assign({}, this.defaultLoadOptions), { withBasePortLocation });
            this.suggestLengthThreshold = config.getPropertyAsInt(VESSEL_CONFIG_OPTIONS.VESSEL_FILTER_MIN_LENGTH);
            this.enableSearchRegistrationByPrefix = config.getPropertyAsBoolean(VESSEL_CONFIG_OPTIONS.VESSEL_FILTER_SEARCH_REGISTRATION_CODE_AS_PREFIX);
        });
    }
};
VesselSnapshotService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [GraphqlService,
        NetworkService,
        EntitiesStorage,
        ConfigService,
        LocalSettingsService])
], VesselSnapshotService);
export { VesselSnapshotService };
//# sourceMappingURL=vessel-snapshot.service.js.map