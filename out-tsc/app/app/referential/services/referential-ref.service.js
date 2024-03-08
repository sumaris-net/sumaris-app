import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { gql } from '@apollo/client/core';
import { map } from 'rxjs/operators';
import { ErrorCodes } from './errors';
import { AccountService, BaseGraphqlService, chainPromises, ConfigService, EntitiesStorage, firstNotNilPromise, fromDateISOString, GraphqlService, isEmptyArray, isNotNil, JobUtils, NetworkService, ReferentialRef, ReferentialUtils, StatusIds, } from '@sumaris-net/ngx-components';
import { ReferentialService } from './referential.service';
import { AcquisitionLevelCodes, FractionIdGroups, LocationLevelGroups, LocationLevelIds, MatrixIds, MethodIds, ModelEnumUtils, ParameterGroupIds, ParameterLabelGroups, PmfmIds, ProgramLabel, QualitativeValueIds, QualityFlagIds, TaxonGroupTypeIds, TaxonomicLevelIds, UnitIds, VesselTypeIds, } from './model/model.enum';
import { ReferentialFragments } from './referential.fragments';
import { environment } from '@environments/environment';
import { ReferentialRefFilter } from './filter/referential-ref.filter';
import { REFERENTIAL_CONFIG_OPTIONS } from './config/referential.config';
import { MetierService } from '@app/referential/services/metier.service';
import { WeightLengthConversionRefService } from '@app/referential/taxon-name/weight-length-conversion/weight-length-conversion-ref.service';
import { ProgramPropertiesUtils } from '@app/referential/services/config/program.config';
import { TEXT_SEARCH_IGNORE_CHARS_REGEXP } from '@app/referential/services/base-referential-service.class';
import { RoundWeightConversionRefService } from '@app/referential/taxon-group/round-weight-conversion/round-weight-conversion-ref.service';
import { TaxonNameRefService } from '@app/referential/services/taxon-name-ref.service';
import { TaxonGroupRefService } from '@app/referential/services/taxon-group-ref.service';
import { translateQualityFlag } from '@app/data/services/model/model.utils';
const ReferentialRefQueries = {
    lastUpdateDate: gql `
    query LastUpdateDate {
      lastUpdateDate
    }
  `,
    loadAll: gql `
    query ReferentialRefs($entityName: String, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: ReferentialFilterVOInput) {
      data: referentials(entityName: $entityName, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter) {
        ...LightReferentialFragment
      }
    }
    ${ReferentialFragments.lightReferential}
  `,
    loadAllWithTotal: gql `
    query ReferentialRefsWithTotal(
      $entityName: String
      $offset: Int
      $size: Int
      $sortBy: String
      $sortDirection: String
      $filter: ReferentialFilterVOInput
    ) {
      data: referentials(entityName: $entityName, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, filter: $filter) {
        ...LightReferentialFragment
      }
      total: referentialsCount(entityName: $entityName, filter: $filter)
    }
    ${ReferentialFragments.lightReferential}
  `,
    loadLevels: gql `
    query ReferentialLevels($entityName: String) {
      data: referentialLevels(entityName: $entityName) {
        ...LightReferentialFragment
      }
    }
    ${ReferentialFragments.lightReferential}
  `,
    countAll: gql `
    query ReferentialRefCount($entityName: String, $filter: ReferentialFilterVOInput) {
      total: referentialsCount(entityName: $entityName, filter: $filter)
    }
  `,
};
export const IMPORT_REFERENTIAL_ENTITIES = ['Location', 'Gear', 'Metier', 'MetierTaxonGroup', 'TaxonGroup', 'TaxonName', 'Department', 'QualityFlag', 'SaleType', 'VesselType'];
export const WEIGHT_CONVERSION_ENTITIES = ['WeightLengthConversion', 'RoundWeightConversion'];
let ReferentialRefService = class ReferentialRefService extends BaseGraphqlService {
    constructor(graphql, referentialService, metierService, taxonNameRefService, taxonGroupRefService, weightLengthConversionRefService, roundWeightConversionRefService, accountService, configService, network, entities) {
        super(graphql, environment);
        this.graphql = graphql;
        this.referentialService = referentialService;
        this.metierService = metierService;
        this.taxonNameRefService = taxonNameRefService;
        this.taxonGroupRefService = taxonGroupRefService;
        this.weightLengthConversionRefService = weightLengthConversionRefService;
        this.roundWeightConversionRefService = roundWeightConversionRefService;
        this.accountService = accountService;
        this.configService = configService;
        this.network = network;
        this.entities = entities;
        this.queries = ReferentialRefQueries;
        this.start();
    }
    ngOnStart() {
        const _super = Object.create(null, {
            ngOnStart: { get: () => super.ngOnStart }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.ngOnStart.call(this);
            const config = yield firstNotNilPromise(this.configService.config);
            this.updateModelEnumerations(config);
        });
    }
    /**
     * @param offset
     * @param size
     * @param sortBy
     * @param sortDirection
     * @param filter
     * @param opts
     */
    watchAll(offset, size, sortBy, sortDirection, filter, opts) {
        if (!filter || !filter.entityName) {
            console.error('[referential-ref-service] Missing filter.entityName');
            throw { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' };
        }
        const entityName = filter.entityName;
        filter = this.asFilter(filter);
        const variables = {
            entityName,
            offset: offset || 0,
            size: size || 100,
            sortBy: sortBy || filter.searchAttribute || 'label',
            sortDirection: sortDirection || 'asc'
        };
        let now = this._debug && Date.now();
        if (this._debug)
            console.debug(`[referential-ref-service] Watching ${entityName} items...`, variables);
        let res;
        if (this.network.offline) {
            res = this.entities.watchAll(entityName, Object.assign(Object.assign({}, variables), { filter: filter && filter.asFilterFn() }));
        }
        else {
            const withTotal = (!opts || opts.withTotal !== false);
            const query = withTotal ? this.queries.loadAllWithTotal : this.queries.loadAll;
            res = this.graphql.watchQuery({
                query,
                variables: Object.assign(Object.assign({}, variables), { filter: filter && filter.asPodObject() }),
                error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
                fetchPolicy: opts && opts.fetchPolicy || 'cache-first'
            });
        }
        return res
            .pipe(map(({ data, total }) => {
            const entities = (!opts || opts.toEntity !== false)
                ? (data || []).map(ReferentialRef.fromObject)
                : (data || []);
            if (now) {
                console.debug(`[referential-ref-service] References on ${entityName} loaded in ${Date.now() - now}ms`);
                now = undefined;
            }
            return {
                data: entities,
                total: total || entities.length
            };
        }));
    }
    loadAll(offset, size, sortBy, sortDirection, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
            if (offline) {
                return this.loadAllLocally(offset, size, sortBy, sortDirection, filter, opts);
            }
            const entityName = filter && filter.entityName;
            if (!entityName) {
                console.error('[referential-ref-service] Missing filter.entityName');
                throw { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' };
            }
            filter = this.asFilter(filter);
            const uniqueEntityName = entityName + (filter.searchJoin || '');
            const debug = this._debug && (!opts || opts.debug !== false);
            const variables = {
                entityName,
                offset: offset || 0,
                size: size || 100,
                sortBy: (sortBy || filter.searchAttribute || (filter.searchAttributes && filter.searchAttributes[0]) || 'label'),
                sortDirection: sortDirection || 'asc',
                filter: filter.asPodObject()
            };
            const now = debug && Date.now();
            if (debug)
                console.debug(`[referential-ref-service] Loading ${uniqueEntityName} items (ref)...`, variables);
            // Online mode: use graphQL
            const withTotal = !opts || opts.withTotal !== false; // default to true
            const query = withTotal ? this.queries.loadAllWithTotal : this.queries.loadAll;
            const { data, total } = yield this.graphql.query({
                query,
                variables,
                error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
                fetchPolicy: opts && opts.fetchPolicy || 'cache-first'
            });
            const entities = (!opts || opts.toEntity !== false) ?
                (data || []).map(ReferentialRef.fromObject) :
                (data || []);
            // Force entity name (if searchJoin)
            if (filter.entityName !== uniqueEntityName) {
                entities.forEach(item => item.entityName = uniqueEntityName);
            }
            const res = {
                data: entities,
                total
            };
            // Add fetch more capability, if total was fetched
            if (withTotal) {
                const nextOffset = (offset || 0) + entities.length;
                if (nextOffset < total) {
                    res.fetchMore = () => this.loadAll(nextOffset, size, sortBy, sortDirection, filter, opts);
                }
            }
            if (debug)
                console.debug(`[referential-ref-service] Loading ${uniqueEntityName} items (ref) [OK] ${entities.length} items, in ${Date.now() - now}ms`);
            return res;
        });
    }
    loadAllLocally(offset, size, sortBy, sortDirection, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!filter || !filter.entityName) {
                console.error('[referential-ref-service] Missing argument \'filter.entityName\'');
                throw { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' };
            }
            const uniqueEntityName = filter.entityName + (filter.searchJoin || '');
            filter = this.asFilter(filter);
            const variables = {
                entityName: filter.entityName,
                offset: offset || 0,
                size: size || 100,
                sortBy: sortBy || filter.searchAttribute
                    || filter.searchAttributes && filter.searchAttributes.length && filter.searchAttributes[0]
                    || 'label',
                sortDirection: sortDirection || 'asc',
                filter: filter.asFilterFn()
            };
            const { data, total } = yield this.entities.loadAll(uniqueEntityName + 'VO', variables);
            const entities = (!opts || opts.toEntity !== false) ?
                (data || []).map(ReferentialRef.fromObject) :
                (data || []);
            // Force entity name (if searchJoin)
            if (filter.entityName !== uniqueEntityName) {
                entities.forEach(item => item.entityName = uniqueEntityName);
            }
            const res = { data: entities, total };
            // Add fetch more function
            const nextOffset = (offset || 0) + entities.length;
            if (nextOffset < total) {
                res.fetchMore = () => this.loadAll(nextOffset, size, sortBy, sortDirection, filter, opts);
            }
            return res;
        });
    }
    countAll(filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(filter === null || filter === void 0 ? void 0 : filter.entityName)) {
                console.error('[referential-ref-service] Missing \'filter.entityName\'');
                throw { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' };
            }
            const offline = this.network.offline && (!opts || opts.fetchPolicy !== 'network-only');
            if (offline) {
                return this.countLocally(filter, opts);
            }
            filter = this.asFilter(filter);
            const { total } = yield this.graphql.query({
                query: this.queries.countAll,
                variables: {
                    entityName: filter.entityName,
                    filter: filter.asPodObject()
                },
                error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
                fetchPolicy: opts && opts.fetchPolicy || 'network-only'
            });
            return total;
        });
    }
    countLocally(filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(filter === null || filter === void 0 ? void 0 : filter.entityName)) {
                console.error('[referential-ref-service] Missing \'filter.entityName\'');
                throw { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' };
            }
            const uniqueEntityName = filter.entityName + (filter.searchJoin || '');
            filter = this.asFilter(filter);
            const variables = {
                entityName: filter.entityName,
                offset: 0,
                size: 0,
                filter: filter.asFilterFn()
            };
            const { total } = yield this.entities.loadAll(uniqueEntityName + 'VO', variables, { fullLoad: false });
            return total;
        });
    }
    existsByLabel(label, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!label) {
                console.error('[referential-service] Missing \'label\'');
                throw { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' };
            }
            const total = yield this.countAll(Object.assign(Object.assign({}, filter), { label }), opts);
            return total > 0;
        });
    }
    loadById(id, entityName, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.loadAll(0, 1, null, null, { includedIds: [id], entityName }, Object.assign(Object.assign({}, opts), { withTotal: false /*not need total*/ }));
            return (data === null || data === void 0 ? void 0 : data.length) ? data[0] : undefined;
        });
    }
    loadByLabel(label, entityName, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.loadAll(0, 1, null, null, { label, entityName }, Object.assign(Object.assign({}, opts), { withTotal: false /*not need total*/ }));
            return (data === null || data === void 0 ? void 0 : data.length) ? data[0] : undefined;
        });
    }
    loadAllByLabels(labels, entityName, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const items = yield Promise.all(labels.map(label => this.loadByLabel(label, entityName, filter, opts)
                .catch(err => {
                if (err && err.code === ErrorCodes.LOAD_REFERENTIAL_ERROR)
                    return undefined; // Skip if not found
                throw err;
            })));
            return items.filter(isNotNil);
        });
    }
    loadAllByIds(ids, entityName, sortBy, sortDirection, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isEmptyArray(ids))
                return [];
            const { data } = yield this.loadAll(0, ids.length, sortBy, sortDirection, Object.assign(Object.assign({}, filter), { entityName, includedIds: ids }), Object.assign(Object.assign({}, opts), { withTotal: false }));
            return data;
        });
    }
    suggest(value, filter, sortBy, sortDirection, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ReferentialUtils.isNotEmpty(value))
                return { data: [value] };
            // Replace '*' character by undefined
            if (!value || value === '*') {
                value = undefined;
            }
            // trim search text, and ignore some characters
            else if (value && typeof value === 'string') {
                value = value.trim().replace(TEXT_SEARCH_IGNORE_CHARS_REGEXP, '*');
            }
            return this.loadAll(0, !value ? 30 : 10, sortBy, sortDirection, Object.assign(Object.assign({}, filter), { searchText: value }), Object.assign({ withTotal: true /* Used by autocomplete */ }, opts));
        });
    }
    /**
     * Load entity levels
     */
    loadLevels(entityName, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            if (this._debug)
                console.debug(`[referential-ref-service] Loading levels for ${entityName}...`);
            const { data } = yield this.graphql.query({
                query: this.queries.loadLevels,
                variables: {
                    entityName
                },
                error: { code: ErrorCodes.LOAD_REFERENTIAL_LEVELS_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_LEVELS_ERROR' },
                fetchPolicy: options && options.fetchPolicy || 'cache-first'
            });
            const entities = (data || []).map(ReferentialRef.fromObject);
            if (this._debug)
                console.debug(`[referential-ref-service] Levels for ${entityName} loading in ${Date.now() - now}`, entities);
            return entities;
        });
    }
    saveAll(data, options) {
        throw new Error('Not implemented yet');
    }
    deleteAll(data, options) {
        throw new Error('Not implemented yet');
    }
    lastUpdateDate(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { lastUpdateDate } = yield this.graphql.query({
                    query: this.queries.lastUpdateDate,
                    variables: {},
                    fetchPolicy: opts && opts.fetchPolicy || 'network-only'
                });
                return fromDateISOString(lastUpdateDate);
            }
            catch (err) {
                console.error('[referential-ref] Cannot get remote lastUpdateDate: ' + (err && err.message || err), err);
                return undefined;
            }
        });
    }
    /**
     * Get referential references, group by level
     *
     * @param filter
     * @param groupBy
     * @param opts
     */
    loadAllGroupByLevels(filter, groupBy, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const entityName = filter && filter.entityName;
            const groupKeys = Object.keys(groupBy.levelIds || groupBy.levelLabels); // AGE, SEX, MATURITY, etc
            // Check arguments
            if (!entityName)
                throw new Error('Missing \'filter.entityName\' argument');
            if (isEmptyArray(groupKeys))
                throw new Error('Missing \'levelLabelsMap\' argument');
            if ((groupBy.levelIds && groupBy.levelLabels) || (!groupBy.levelIds && !groupBy.levelLabels)) {
                throw new Error('Invalid groupBy value: one (and only one) required: \'levelIds\' or \'levelLabels\'');
            }
            const debug = this._debug || (opts && opts.debug);
            const now = debug && Date.now();
            if (debug)
                console.debug(`[referential-ref-service] Loading grouped ${entityName}...`);
            const result = {};
            yield Promise.all(groupKeys.map(key => this.loadAll(0, 1000, 'id', 'asc', Object.assign(Object.assign({}, filter), { levelIds: groupBy.levelIds && groupBy.levelIds[key], levelLabels: groupBy.levelLabels && groupBy.levelLabels[key] }), Object.assign({ withTotal: false }, opts))
                .then(({ data }) => {
                result[key] = data || [];
            })));
            if (debug)
                console.debug(`[referential-ref-service] Grouped ${entityName} loaded in ${Date.now() - now}ms`, result);
            return result;
        });
    }
    executeImport(filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const entityNames = (opts === null || opts === void 0 ? void 0 : opts.entityNames) || IMPORT_REFERENTIAL_ENTITIES;
            const maxProgression = opts && opts.maxProgression || 100;
            const entityCount = entityNames.length;
            const entityMaxProgression = Math.round((maxProgression / entityNames.length) * 10000 - 0.5) / 10000;
            const now = Date.now();
            console.info(`[referential-ref-service] Starting importation of ${entityNames.length} referential...`);
            if (this._debug)
                console.debug(`[referential-ref-service] - with : {entityMaxProgression=${entityMaxProgression}, entityCount=${entityCount}, maxProgression=${maxProgression}`);
            const importedEntityNames = [];
            yield chainPromises(entityNames.map(entityName => () => this.executeImportEntity(Object.assign(Object.assign({}, filter), { entityName }), Object.assign(Object.assign({}, opts), { maxProgression: entityMaxProgression }))
                .then(() => importedEntityNames.push(entityName))));
            // Not all entity imported: error
            if (importedEntityNames.length < entityNames.length) {
                console.error(`[referential-ref-service] Importation failed in ${Date.now() - now}ms`);
                if (opts === null || opts === void 0 ? void 0 : opts.progression)
                    opts.progression.error({ code: ErrorCodes.IMPORT_REFERENTIAL_ERROR, message: 'ERROR.IMPORT_REFERENTIAL_ERROR' });
            }
            else {
                // Success
                console.info(`[referential-ref-service] Successfully import ${entityNames.length} referential in ${Date.now() - now}ms`);
            }
        });
    }
    executeImportEntity(filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const entityName = filter === null || filter === void 0 ? void 0 : filter.entityName;
            if (!entityName)
                throw new Error('Missing \'filter.entityName\'');
            const progression = opts === null || opts === void 0 ? void 0 : opts.progression;
            const maxProgression = (opts === null || opts === void 0 ? void 0 : opts.maxProgression) || 100;
            const logPrefix = this._debug && `[referential-ref-service] [${entityName}]`;
            const statusIds = (filter === null || filter === void 0 ? void 0 : filter.statusIds) || [StatusIds.ENABLE, StatusIds.TEMPORARY];
            try {
                const getLoadOptions = (offset) => ({
                    fetchPolicy: 'no-cache',
                    toEntity: false,
                    withTotal: offset === 0
                });
                let loadPageFn;
                switch (entityName) {
                    // Taxon name
                    case 'TaxonName':
                        loadPageFn = (offset, size) => this.taxonNameRefService
                            .loadAll(offset, size, 'id', null, {
                            statusIds: [StatusIds.ENABLE],
                            levelIds: [TaxonomicLevelIds.SPECIES, TaxonomicLevelIds.SUBSPECIES]
                        }, getLoadOptions(offset));
                        break;
                    // Taxon group
                    case 'TaxonGroup':
                        loadPageFn = (offset, size) => this.taxonGroupRefService
                            .loadAll(offset, size, 'id', null, Object.assign(Object.assign({}, filter), { statusIds, levelIds: [TaxonGroupTypeIds.FAO] }), getLoadOptions(offset));
                        break;
                    // Metier
                    case 'MetierTaxonGroup':
                        loadPageFn = (offset, size) => this.metierService.loadAll(offset, size, 'id', null, { entityName: 'Metier', statusIds, searchJoin: 'TaxonGroup' }, getLoadOptions(offset));
                        break;
                    // Locations
                    case 'Location':
                        filter = Object.assign(Object.assign({}, filter), { statusIds, 
                            //boundingBox: opts?.boundingBox,
                            levelIds: (opts === null || opts === void 0 ? void 0 : opts.locationLevelIds) || Object.keys(LocationLevelIds).reduce((res, item) => res.concat(LocationLevelIds[item]), []) });
                        break;
                    // WeightLengthConversion (RTP)
                    case 'WeightLengthConversion':
                        // TODO limit to program locationIds ? (if location class = SEA) and referenceTaxon from program (taxon groups) + referenceTaxons ?
                        loadPageFn = (offset, size) => this.weightLengthConversionRefService
                            .loadAll(offset, size, 'id', 'asc', { statusIds }, getLoadOptions(offset));
                        break;
                    // RoundWeightConversion
                    case 'RoundWeightConversion':
                        loadPageFn = (offset, size) => this.roundWeightConversionRefService
                            .loadAll(offset, size, 'id', 'asc', { statusIds,
                            // Limit to country from program (see trip service)
                            locationIds: opts === null || opts === void 0 ? void 0 : opts.countryIds
                        }, getLoadOptions(offset));
                        break;
                    // Other entities
                    default:
                        filter = Object.assign(Object.assign({}, filter), { statusIds });
                        break;
                }
                // Fallback load function
                if (!loadPageFn) {
                    loadPageFn = (offset, size) => this.referentialService.loadAll(offset, size, 'id', 'asc', filter, getLoadOptions(offset));
                }
                // Fetch all pages
                const { data } = yield JobUtils.fetchAllPages(loadPageFn, { progression, maxProgression, logPrefix });
                // Save locally
                yield this.entities.saveAll(data, {
                    entityName: entityName + 'VO',
                    reset: true
                });
            }
            catch (err) {
                const detailMessage = err && err.details && (err.details.message || err.details) || undefined;
                console.error(`[referential-ref-service] Failed to import ${entityName}: ${detailMessage || err && err.message || err}`);
                throw err;
            }
        });
    }
    asFilter(filter) {
        return ReferentialRefFilter.fromObject(filter);
    }
    loadQualityFlags() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: items } = yield this.loadAll(0, 100, 'id', 'asc', {
                entityName: 'QualityFlag',
                statusId: StatusIds.ENABLE
            }, {
                fetchPolicy: 'cache-first'
            });
            // Try to get i18n key instead of label
            items === null || items === void 0 ? void 0 : items.forEach(flag => flag.label = translateQualityFlag(flag.id) || flag.label);
            return items;
        });
    }
    updateModelEnumerations(config) {
        if (!config.properties) {
            console.warn('[referential-ref] No properties found in pod config! Skip model enumerations update');
            return;
        }
        console.info('[referential-ref] Updating model enumerations...');
        // Program
        ProgramLabel.SIH = config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PROGRAM_SIH_LABEL);
        // Program privilege
        /* TODO add enumeration options
        ProgramPrivilegeIds.MANAGER = ...
        ProgramPrivilegeIds.OBSERVER = ...
        */
        // Acquisition levels
        AcquisitionLevelCodes.TRIP = config.getProperty(REFERENTIAL_CONFIG_OPTIONS.ACQUISITION_LEVEL_TRIP_LABEL);
        AcquisitionLevelCodes.PHYSICAL_GEAR = config.getProperty(REFERENTIAL_CONFIG_OPTIONS.ACQUISITION_LEVEL_PHYSICAL_GEAR_LABEL);
        AcquisitionLevelCodes.OPERATION = config.getProperty(REFERENTIAL_CONFIG_OPTIONS.ACQUISITION_LEVEL_OPERATION_LABEL);
        // Location Levels
        LocationLevelIds.COUNTRY = config.getPropertyAsInt(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_COUNTRY_ID);
        LocationLevelIds.PORT = config.getPropertyAsInt(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_PORT_ID);
        LocationLevelIds.AUCTION = config.getPropertyAsInt(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_AUCTION_ID);
        // Location Levels > ICES
        LocationLevelIds.SUB_AREA_ICES = config.getPropertyAsInt(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_SUB_AREA_ICES_ID);
        LocationLevelIds.DIVISION_ICES = config.getPropertyAsInt(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_DIVISION_ICES_ID);
        LocationLevelIds.SUB_DIVISION_ICES = config.getPropertyAsInt(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_SUB_DIVISION_ICES_ID);
        LocationLevelIds.RECTANGLE_ICES = config.getPropertyAsInt(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_RECTANGLE_ICES_ID);
        // Location Levels > GFCM
        LocationLevelIds.SUB_AREA_GFCM = config.getPropertyAsInt(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_SUB_AREA_GFCM_ID);
        LocationLevelIds.DIVISION_GFCM = config.getPropertyAsInt(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_DIVISION_GFCM_ID);
        LocationLevelIds.SUB_DIVISION_GFCM = config.getPropertyAsInt(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_SUB_DIVISION_GFCM_ID);
        LocationLevelIds.RECTANGLE_GFCM = config.getPropertyAsInt(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_RECTANGLE_GFCM_ID);
        // Taxonomic Levels
        TaxonomicLevelIds.FAMILY = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.TAXONOMIC_LEVEL_FAMILY_ID);
        TaxonomicLevelIds.GENUS = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.TAXONOMIC_LEVEL_GENUS_ID);
        TaxonomicLevelIds.SPECIES = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.TAXONOMIC_LEVEL_SPECIES_ID);
        TaxonomicLevelIds.SUBSPECIES = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.TAXONOMIC_LEVEL_SUBSPECIES_ID);
        // Parameters Groups
        ParameterLabelGroups.TAG_ID = config.getPropertyAsStrings(REFERENTIAL_CONFIG_OPTIONS.PARAMETER_GROUP_TAG_ID_LABELS);
        ParameterLabelGroups.AGE = config.getPropertyAsStrings(REFERENTIAL_CONFIG_OPTIONS.PARAMETER_GROUP_AGE_LABELS);
        ParameterLabelGroups.SEX = config.getPropertyAsStrings(REFERENTIAL_CONFIG_OPTIONS.PARAMETER_GROUP_SEX_LABELS);
        ParameterLabelGroups.WEIGHT = config.getPropertyAsStrings(REFERENTIAL_CONFIG_OPTIONS.PARAMETER_GROUP_WEIGHT_LABELS);
        ParameterLabelGroups.LENGTH = config.getPropertyAsStrings(REFERENTIAL_CONFIG_OPTIONS.PARAMETER_GROUP_LENGTH_LABELS);
        ParameterLabelGroups.MATURITY = config.getPropertyAsStrings(REFERENTIAL_CONFIG_OPTIONS.PARAMETER_GROUP_MATURITY_LABELS);
        // Fractions Groups
        FractionIdGroups.CALCIFIED_STRUCTURE = config.getPropertyAsNumbers(REFERENTIAL_CONFIG_OPTIONS.FRACTION_GROUP_CALCIFIED_STRUCTURE_IDS);
        // PMFM
        // TODO generefy this, using Object.keys(PmfmIds) iteration
        PmfmIds.TRIP_PROGRESS = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_TRIP_PROGRESS);
        PmfmIds.TAG_ID = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_TAG_ID);
        PmfmIds.DRESSING = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_DRESSING);
        PmfmIds.PRESERVATION = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_PRESERVATION);
        PmfmIds.TRAWL_SIZE_CAT = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_TRAWL_SIZE_CAT_ID);
        PmfmIds.STRATEGY_LABEL = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_STRATEGY_LABEL_ID);
        PmfmIds.AGE = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_AGE_ID);
        PmfmIds.SEX = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_SEX_ID);
        PmfmIds.PACKAGING = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_PACKAGING_ID);
        PmfmIds.SIZE_CATEGORY = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_SIZE_CATEGORY_ID);
        PmfmIds.TOTAL_PRICE = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_TOTAL_PRICE_ID);
        PmfmIds.AVERAGE_PACKAGING_PRICE = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_AVERAGE_PACKAGING_PRICE_ID);
        PmfmIds.AVERAGE_WEIGHT_PRICE = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_AVERAGE_WEIGHT_PRICE_ID);
        PmfmIds.SALE_ESTIMATED_RATIO = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_SALE_ESTIMATED_RATIO_ID);
        PmfmIds.SALE_RANK_ORDER = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_SALE_RANK_ORDER_ID);
        PmfmIds.REFUSED_SURVEY = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_REFUSED_SURVEY_ID);
        PmfmIds.GEAR_LABEL = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_GEAR_LABEL_ID);
        PmfmIds.HAS_ACCIDENTAL_CATCHES = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_HAS_ACCIDENTAL_CATCHES_ID);
        PmfmIds.BATCH_CALCULATED_WEIGHT_LENGTH = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_BATCH_CALCULATED_WEIGHT_LENGTH_ID);
        PmfmIds.BATCH_CALCULATED_WEIGHT_LENGTH_SUM = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_BATCH_CALCULATED_WEIGHT_LENGTH_SUM_ID);
        PmfmIds.BATCH_SORTING = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_BATCH_SORTING_ID);
        PmfmIds.DISCARD_WEIGHT = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_DISCARD_WEIGHT_ID);
        PmfmIds.CATCH_WEIGHT = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_CATCH_WEIGHT_ID);
        PmfmIds.CHILD_GEAR = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_CHILD_GEAR_ID);
        PmfmIds.HULL_MATERIAL = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_HULL_MATERIAL_ID);
        PmfmIds.SELECTIVITY_DEVICE = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PMFM_SELECTIVITY_DEVICE_ID);
        // Methods
        MethodIds.UNKNOWN = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.METHOD_UNKNOWN_ID);
        MethodIds.MEASURED_BY_OBSERVER = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.METHOD_MEASURED_BY_OBSERVER_ID);
        MethodIds.OBSERVED_BY_OBSERVER = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.METHOD_OBSERVED_BY_OBSERVER_ID);
        MethodIds.ESTIMATED_BY_OBSERVER = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.METHOD_ESTIMATED_BY_OBSERVER_ID);
        MethodIds.CALCULATED = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.METHOD_CALCULATED_ID);
        MethodIds.CALCULATED_WEIGHT_LENGTH = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.METHOD_CALCULATED_WEIGHT_LENGTH_ID);
        MethodIds.CALCULATED_WEIGHT_LENGTH_SUM = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.METHOD_CALCULATED_WEIGHT_LENGTH_SUM_ID);
        // Matrix
        MatrixIds.INDIVIDUAL = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.FRACTION_INDIVIDUAL_ID);
        // Units
        UnitIds.NONE = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.UNIT_NONE_ID);
        // QualityFlag
        QualityFlagIds.NOT_COMPLETED = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.QUALITY_FLAG_NOT_COMPLETED_ID);
        QualityFlagIds.MISSING = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.QUALITY_FLAG_MISSING_ID);
        // ParameterGroups
        ParameterGroupIds.SURVEY = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.PARAMETER_GROUP_SURVEY_ID);
        // Qualitative value
        QualitativeValueIds.DISCARD_OR_LANDING.LANDING = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.QUALITATIVE_VALUE_LANDING_ID);
        QualitativeValueIds.DISCARD_OR_LANDING.DISCARD = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.QUALITATIVE_VALUE_DISCARD_ID);
        QualitativeValueIds.DRESSING.WHOLE = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.QUALITATIVE_VALUE_DRESSING_WHOLE_ID);
        QualitativeValueIds.PRESERVATION.FRESH = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.QUALITATIVE_VALUE_PRESERVATION_FRESH_ID);
        QualitativeValueIds.SIZE_UNLI_CAT.NONE = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.QUALITATIVE_VALUE_SIZE_UNLI_CAT_NONE_ID);
        QualitativeValueIds.BATCH_SORTING.BULK = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.QUALITATIVE_VALUE_SORTING_BULK_ID);
        QualitativeValueIds.BATCH_SORTING.NON_BULK = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.QUALITATIVE_VALUE_SORTING_NON_BULK_ID);
        QualitativeValueIds.SEX.UNSEXED = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.QUALITATIVE_VALUE_SEX_UNSEXED_ID);
        // Taxon group type
        TaxonGroupTypeIds.FAO = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.TAXON_GROUP_TYPE_FAO_ID);
        TaxonGroupTypeIds.NATIONAL_METIER = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.TAXON_GROUP_TYPE_NATIONAL_METIER_ID);
        TaxonGroupTypeIds.DCF_METIER_LVL_5 = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.TAXON_GROUP_TYPE_DCF_METIER_LVL_5_ID);
        // Vessel types
        VesselTypeIds.FISHING_VESSEL = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.VESSEL_TYPE_FISHING_VESSEL);
        VesselTypeIds.SCIENTIFIC_RESEARCH_VESSEL = +config.getProperty(REFERENTIAL_CONFIG_OPTIONS.VESSEL_TYPE_SCIENTIFIC_RESEARCH_VESSEL);
        // TODO: add other enumerations
        // Force an update default values (e.g. when using LocationLevelId)
        ModelEnumUtils.refreshDefaultValues();
        // Location level groups
        //  /!\ should be call AFTER ModelEnumUtils.refreshDefaultValues()
        if (config.hasProperty(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_LOCATIONS_AREA_IDS)) {
            LocationLevelGroups.FISHING_AREA = config.getPropertyAsNumbers(REFERENTIAL_CONFIG_OPTIONS.LOCATION_LEVEL_LOCATIONS_AREA_IDS);
        }
        if (config.hasProperty(REFERENTIAL_CONFIG_OPTIONS.WEIGHT_LENGTH_CONVERSION_AREA_IDS)) {
            LocationLevelGroups.WEIGHT_LENGTH_CONVERSION_AREA = config.getPropertyAsNumbers(REFERENTIAL_CONFIG_OPTIONS.WEIGHT_LENGTH_CONVERSION_AREA_IDS);
        }
        // Force update ProgramProperties default
        //  /!\ should be call AFTER overrides from config (e.g. in case an option use LocationLevelGroups.FISHING_AREA)
        ProgramPropertiesUtils.refreshDefaultValues();
    }
};
ReferentialRefService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [GraphqlService,
        ReferentialService,
        MetierService,
        TaxonNameRefService,
        TaxonGroupRefService,
        WeightLengthConversionRefService,
        RoundWeightConversionRefService,
        AccountService,
        ConfigService,
        NetworkService,
        EntitiesStorage])
], ReferentialRefService);
export { ReferentialRefService };
//# sourceMappingURL=referential-ref.service.js.map