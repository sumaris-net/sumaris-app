import { Injectable, Injector } from '@angular/core';
import {
  AppFormUtils,
  BaseEntityGraphqlSubscriptions,
  chainPromises,
  DateUtils,
  EntitiesServiceWatchOptions,
  EntitiesStorage,
  Entity,
  EntitySaveOptions,
  EntityServiceLoadOptions,
  EntityUtils,
  firstNotNilPromise,
  FormErrors,
  FormErrorTranslator,
  FormErrorTranslatorOptions,
  fromDateISOString,
  IEntitiesService,
  IEntityService,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  JobUtils,
  LoadResult,
  LocalSettingsService,
  MINIFY_ENTITY_FOR_POD,
  NetworkService,
  Person,
  ProgressBarService,
  toBoolean,
  toDateISOString,
  toNumber,
} from '@sumaris-net/ngx-components';
import { BehaviorSubject, EMPTY, firstValueFrom, Observable } from 'rxjs';
import { Landing } from './landing.model';
import { FetchPolicy, gql } from '@apollo/client/core';
import { filter, map } from 'rxjs/operators';
import { BaseRootEntityGraphqlMutations } from '@app/data/services/root-data-service.class';
import { Sample } from '../sample/sample.model';
import { VesselSnapshotFragments } from '@app/referential/services/vessel-snapshot.service';
import { RootDataEntityUtils } from '@app/data/services/model/root-data-entity.model';

import { SortDirection } from '@angular/material/sort';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { ReferentialFragments } from '@app/referential/services/referential.fragments';
import { LandingFilter } from './landing.filter';
import {
  DataEntityAsObjectOptions,
  DataEntityUtils,
  MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE,
  SERIALIZE_FOR_OPTIMISTIC_RESPONSE,
} from '@app/data/services/model/data-entity.model';
import { TripFragments, TripService } from '@app/trip/trip/trip.service';
import { Trip } from '@app/trip/trip/trip.model';
import { DataErrorCodes } from '@app/data/services/errors';
import { ObservedLocation } from '@app/trip/observedlocation/observed-location.model';
import { MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';

import { TripFilter } from '@app/trip/trip/trip.filter';
import { Moment } from 'moment';
import { ImageAttachment } from '@app/data/image/image-attachment.model';
import { RootDataSynchroService } from '@app/data/services/root-data-synchro-service.class';
import { ObservedLocationFilter } from '@app/trip/observedlocation/observed-location.filter';
import { Program, ProgramUtils } from '@app/referential/services/model/program.model';
import { LandingValidatorOptions, LandingValidatorService } from '@app/trip/landing/landing.validator';
import { IProgressionOptions } from '@app/data/services/data-quality-service.class';
import { MEASUREMENT_VALUES_PMFM_ID_REGEXP } from '@app/data/measurement/measurement.model';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { ProgressionModel } from '@app/shared/progression/progression.model';
import { OBSERVED_LOCATION_FEATURE_NAME } from '@app/trip/trip.config';
import { AcquisitionLevelCodes, PmfmIds, QualitativeValueIds } from '@app/referential/services/model/model.enum';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { DataCommonFragments, DataFragments } from '@app/trip/common/data.fragments';
import { VesselSnapshotFilter } from '@app/referential/services/filter/vessel.filter';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { DataStrategyResolution } from '@app/data/form/data-editor.utils';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';

export declare interface LandingSaveOptions extends EntitySaveOptions {
  observedLocationId?: number;
  tripId?: number;

  enableOptimisticResponse?: boolean;
}

export type LandingServiceLoadOptions = EntityServiceLoadOptions;

export declare interface LandingServiceWatchOptions extends EntitiesServiceWatchOptions {
  computeRankOrder?: boolean;
  fullLoad?: boolean;
  toEntity?: boolean;
  withTotal?: boolean;
  mapFn?: (landings: Landing[]) => Landing[];
}

export declare interface LandingControlOptions extends LandingValidatorOptions, IProgressionOptions {
  translatorOptions?: FormErrorTranslatorOptions;
}

export const LandingFragments = {
  lightLanding: gql`
    fragment LightLandingFragment on LandingVO {
      id
      program {
        id
        label
      }
      dateTime
      location {
        ...LocationFragment
      }
      creationDate
      updateDate
      controlDate
      validationDate
      qualificationDate
      comments
      rankOrder
      observedLocationId
      tripId
      saleIds
      vesselSnapshot {
        ...VesselSnapshotFragment
      }
      recorderDepartment {
        ...LightDepartmentFragment
      }
      recorderPerson {
        ...LightPersonFragment
      }
      measurementValues
      samplesCount
    }
    ${DataCommonFragments.location}
    ${DataCommonFragments.lightDepartment}
    ${DataCommonFragments.lightPerson}
    ${VesselSnapshotFragments.vesselSnapshot}
    ${ReferentialFragments.lightReferential}
  `,

  landing: gql`
    fragment LandingFragment on LandingVO {
      id
      program {
        id
        label
      }
      dateTime
      location {
        ...LocationFragment
      }
      creationDate
      updateDate
      controlDate
      validationDate
      qualificationDate
      comments
      rankOrder
      observedLocationId
      tripId
      trip {
        ...EmbeddedLandedTripFragment
      }
      vesselSnapshot {
        ...VesselSnapshotFragment
      }
      recorderDepartment {
        ...LightDepartmentFragment
      }
      recorderPerson {
        ...LightPersonFragment
      }
      observers {
        ...LightPersonFragment
      }
      measurementValues
      samples {
        ...SampleFragment
      }
      samplesCount
    }
  `,
};

const LandingQueries = {
  load: gql`
    query Landing($id: Int!) {
      data: landing(id: $id) {
        ...LandingFragment
      }
    }
    ${LandingFragments.landing}
    ${DataCommonFragments.location}
    ${DataCommonFragments.lightDepartment}
    ${DataCommonFragments.lightPerson}
    ${VesselSnapshotFragments.vesselSnapshot}
    ${DataFragments.sample}
    ${TripFragments.embeddedLandedTrip}
  `,

  loadAll: gql`
    query LightLandings($filter: LandingFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: landings(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...LightLandingFragment
      }
    }
    ${LandingFragments.lightLanding}
  `,

  loadAllWithTotal: gql`
    query LightLandingsWithTotal($filter: LandingFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: landings(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...LightLandingFragment
      }
      total: landingsCount(filter: $filter)
    }
    ${LandingFragments.lightLanding}
  `,

  loadAllFullWithTotal: gql`
    query Landings($filter: LandingFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: landings(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        ...LandingFragment
      }
      total: landingsCount(filter: $filter)
    }
    ${LandingFragments.landing}
    ${DataCommonFragments.location}
    ${DataCommonFragments.lightDepartment}
    ${DataCommonFragments.lightPerson}
    ${VesselSnapshotFragments.vesselSnapshot}
    ${DataFragments.sample}
    ${TripFragments.embeddedLandedTrip}
  `,

  loadNearbyTripDates: gql`
    query LandingNearbyTripDates($filter: TripFilterVOInput!, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
      data: trips(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection) {
        id
        departureDateTime
      }
    }
  `,
};

const LandingMutations: BaseRootEntityGraphqlMutations = {
  save: gql`
    mutation SaveLanding($data: LandingVOInput!) {
      data: saveLanding(landing: $data) {
        ...LandingFragment
      }
    }
    ${LandingFragments.landing}
    ${DataCommonFragments.location}
    ${DataCommonFragments.lightDepartment}
    ${DataCommonFragments.lightPerson}
    ${VesselSnapshotFragments.vesselSnapshot}
    ${DataFragments.sample}
    ${TripFragments.embeddedLandedTrip}
  `,

  saveAll: gql`
    mutation SaveLandings($data: [LandingVOInput!]!) {
      data: saveLandings(landings: $data) {
        ...LandingFragment
      }
    }
    ${LandingFragments.landing}
    ${DataCommonFragments.location}
    ${DataCommonFragments.lightDepartment}
    ${DataCommonFragments.lightPerson}
    ${VesselSnapshotFragments.vesselSnapshot}
    ${DataFragments.sample}
    ${TripFragments.embeddedLandedTrip}
  `,

  terminate: gql`
    mutation TerminateLanding($data: LandingVOInput!) {
      data: controlLanding(landing: $data) {
        ...LightLandingFragment
      }
    }
    ${LandingFragments.lightLanding}
  `,

  deleteAll: gql`
    mutation DeleteLandings($ids: [Int!]!) {
      deleteLandings(ids: $ids)
    }
  `,
};

const LandingSubscriptions: BaseEntityGraphqlSubscriptions = {
  listenChanges: gql`
    subscription UpdateLanding($id: Int!, $interval: Int) {
      data: updateLanding(id: $id, interval: $interval) {
        ...LandingFragment
      }
    }
    ${LandingFragments.landing}
    ${DataCommonFragments.location}
    ${DataCommonFragments.lightDepartment}
    ${DataCommonFragments.lightPerson}
    ${VesselSnapshotFragments.vesselSnapshot}
    ${DataFragments.sample}
    ${TripFragments.embeddedLandedTrip}
    ${ReferentialFragments.metier}
    ${DataFragments.fishingArea}
  `,
};

const sortByDateOrIdFn = (n1: Landing, n2: Landing) =>
  n1.dateTime.isSame(n2.dateTime) ? (n1.id === n2.id ? 0 : Math.abs(n1.id) > Math.abs(n2.id) ? 1 : -1) : n1.dateTime.isAfter(n2.dateTime) ? 1 : -1;

const sortByAscRankOrder = (n1: Landing, n2: Landing) => (n1.rankOrder === n2.rankOrder ? 0 : n1.rankOrder > n2.rankOrder ? 1 : -1);

const sortByDescRankOrder = (n1: Landing, n2: Landing) => (n1.rankOrder === n2.rankOrder ? 0 : n1.rankOrder > n2.rankOrder ? -1 : 1);

@Injectable({ providedIn: 'root' })
export class LandingService
  extends RootDataSynchroService<Landing, LandingFilter, number, LandingServiceWatchOptions, LandingServiceLoadOptions>
  implements IEntitiesService<Landing, LandingFilter, LandingServiceWatchOptions>, IEntityService<Landing>
{
  constructor(
    injector: Injector,
    protected network: NetworkService,
    protected entities: EntitiesStorage,
    protected programRefService: ProgramRefService,
    protected strategyRefService: StrategyRefService,
    protected tripService: TripService,
    protected validatorService: LandingValidatorService,
    protected progressBarService: ProgressBarService,
    protected formErrorTranslator: FormErrorTranslator,
    protected settings: LocalSettingsService
  ) {
    super(injector, Landing, LandingFilter, {
      queries: LandingQueries,
      mutations: LandingMutations,
      subscriptions: LandingSubscriptions,
    });

    // /!\ should be same as observed location service
    this._featureName = OBSERVED_LOCATION_FEATURE_NAME;

    this._logPrefix = '[landing-service] ';
  }

  hasSampleWithTagId(landingIds: number[]): Promise<boolean> {
    // TODO
    console.warn('TODO: implement LandingService.hasSampleWithTagId()');
    return Promise.resolve(false);
  }

  async loadAllByObservedLocation(
    filter?: (LandingFilter | any) & { observedLocationId: number },
    opts?: LandingServiceWatchOptions
  ): Promise<LoadResult<Landing>> {
    return firstValueFrom(this.watchAllByObservedLocation(filter, opts));
  }

  watchAllByObservedLocation(
    filter?: (LandingFilter | any) & { observedLocationId: number },
    opts?: LandingServiceWatchOptions
  ): Observable<LoadResult<Landing>> {
    return this.watchAll(0, -1, null, null, filter, opts);
  }

  watchAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    dataFilter?: Partial<LandingFilter>,
    opts?: LandingServiceWatchOptions
  ): Observable<LoadResult<Landing>> {
    dataFilter = this.asFilter(dataFilter);

    //if (!dataFilter || dataFilter.isEmpty()) {
    //console.warn('[landing-service] Trying to load landing without \'filter\'. Skipping.');
    //return EMPTY;
    //}

    // Load offline
    const offline =
      this.network.offline ||
      (dataFilter &&
        ((dataFilter.synchronizationStatus && dataFilter.synchronizationStatus !== 'SYNC') ||
          EntityUtils.isLocalId(dataFilter.observedLocationId) ||
          EntityUtils.isLocalId(dataFilter.tripId))) ||
      false;
    if (offline) {
      return this.watchAllLocally(offset, size, sortBy, sortDirection, dataFilter, opts);
    }

    // Fix sortBy (id -> rankOrder)
    let afterSortBy = sortBy;
    sortBy = (sortBy !== 'id' && sortBy) || 'dateTime';
    if (sortBy === 'vessel') {
      sortBy = 'vesselSnapshot.' + this.settings.getFieldDisplayAttributes('vesselSnapshot', VesselSnapshotFilter.DEFAULT_SEARCH_ATTRIBUTES)[0];

      // If fetching all rows: do NOT sort on pod
      if (size === -1) {
        afterSortBy = sortBy;
        sortBy = 'dateTime';
      } else {
        console.warn(
          this._logPrefix +
            `Pod sorting on '${sortBy}' can be long... Please make sure you need a page size=${size}, instead of all rows (that allow to sort in App side)`
        );
      }
    }

    const groupByVessel = dataFilter?.groupByVessel === true;
    if (groupByVessel || size === -1) {
      // sortBy = 'dateTime';
      // sortDirection = 'desc';
      size = 1000;
    }

    const variables: any = {
      offset: offset || 0,
      size: size || 20,
      sortBy,
      sortDirection: sortDirection || 'asc',
      filter: dataFilter && dataFilter.asPodObject(),
    };

    let now = this._debug && Date.now();
    if (this._debug) console.debug('[landing-service] Watching landings... using variables:', variables);

    const fullLoad = opts && opts.fullLoad === true; // false by default
    const withTotal = !opts || opts.withTotal !== false;
    const query = fullLoad ? LandingQueries.loadAllFullWithTotal : withTotal ? this.queries.loadAllWithTotal : this.queries.loadAll;

    return this.mutableWatchQuery<LoadResult<any>>({
      queryName: withTotal ? 'LoadAllWithTotal' : 'LoadAll',
      query,
      arrayFieldName: 'data',
      totalFieldName: withTotal ? 'total' : undefined,
      insertFilterFn: dataFilter?.asFilterFn(),
      variables,
      error: { code: DataErrorCodes.LOAD_ENTITIES_ERROR, message: 'ERROR.LOAD_ENTITIES_ERROR' },
      fetchPolicy: (opts && opts.fetchPolicy) || 'cache-and-network',
    }).pipe(
      // Skip update during load()
      filter(() => !this.loading),
      map(({ data, total }) => {
        let entities = !opts || opts.toEntity !== false ? (data || []).map(Landing.fromObject) : ((data || []) as Landing[]);
        if (this._debug) {
          if (now) {
            console.debug(`[landing-service] Loaded {${entities.length || 0}} landings in ${Date.now() - now}ms`, entities);
            now = undefined;
          }
        }

        // Group by vessel (keep last landing)
        if (isNotEmptyArray(entities) && groupByVessel) {
          const landingByVesselMap = new Map<number, Landing>();
          entities.forEach((landing) => {
            const existingLanding = landingByVesselMap.get(landing.vesselSnapshot.id);
            if (!existingLanding || fromDateISOString(existingLanding.dateTime).isBefore(landing.dateTime)) {
              landingByVesselMap.set(landing.vesselSnapshot.id, landing);
            }
          });
          entities = Array.from(landingByVesselMap.values());
          total = entities.length;
        }

        // Compute rankOrder, by tripId or observedLocationId
        if (!opts || opts.computeRankOrder !== false) {
          this.computeRankOrderAndSort(entities, offset, total, afterSortBy, sortDirection, dataFilter as LandingFilter);
        }

        if (opts?.mapFn) {
          entities = opts.mapFn(entities);
        }

        return { data: entities, total };
      })
    );
  }

  async loadAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: Partial<LandingFilter>,
    opts?: LandingServiceWatchOptions
  ): Promise<LoadResult<Landing>> {
    const offlineData = this.network.offline || (filter && filter.synchronizationStatus && filter.synchronizationStatus !== 'SYNC') || false;
    if (offlineData) {
      return await this.loadAllLocally(offset, size, sortBy, sortDirection, filter, opts);
    }

    return firstNotNilPromise(this.watchAll(offset, size, sortBy, sortDirection, filter, opts));
  }

  async loadAllLocally(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: Partial<LandingFilter>,
    opts?: LandingServiceWatchOptions & {
      fullLoad?: boolean;
    }
  ): Promise<LoadResult<Landing>> {
    filter = this.asFilter(filter);

    const variables = {
      offset: offset || 0,
      size: size >= 0 ? size : 1000,
      sortBy: (sortBy !== 'id' && sortBy) || 'endDateTime',
      sortDirection: sortDirection || 'asc',
      filter: filter.asFilterFn(),
    };

    const res = await this.entities.loadAll('LandingVO', variables, { fullLoad: opts && opts.fullLoad });
    const entities = !opts || opts.toEntity !== false ? (res.data || []).map((json) => this.fromObject(json)) : ((res.data || []) as Landing[]);

    return { data: entities, total: res.total };
  }

  async load(id: number, options?: EntityServiceLoadOptions): Promise<Landing> {
    if (isNil(id)) throw new Error("Missing argument 'id'");

    const now = Date.now();
    if (this._debug) console.debug(`[landing-service] Loading landing {${id}}...`);
    this.loading = true;

    try {
      let data: any;

      // If local entity
      if (id < 0) {
        data = await this.entities.load<Landing>(id, Landing.TYPENAME);
      } else {
        // Load remotely
        const res = await this.graphql.query<{ data: any }>({
          query: this.queries.load,
          variables: { id },
          error: { code: DataErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR' },
          fetchPolicy: (options && options.fetchPolicy) || undefined,
        });
        data = res && res.data;
      }

      // Transform to entity
      const entity = data && Landing.fromObject(data);
      if (entity && this._debug) console.debug(`[landing-service] landing #${id} loaded in ${Date.now() - now}ms`, entity);
      entity.trip = Trip.fromObject(data.trip);
      return entity;
    } finally {
      this.loading = false;
    }
  }

  async saveAll(entities: Landing[], opts?: LandingSaveOptions): Promise<Landing[]> {
    // Filter dividers
    entities = entities.filter((entity) => isNotNil(entity.id));

    if (!entities) return entities;

    const localEntities = entities.filter(
      (entity) =>
        entity &&
        (entity.id < 0 ||
          (entity.synchronizationStatus && entity.synchronizationStatus !== 'SYNC') ||
          (opts?.observedLocationId && opts.observedLocationId < 0))
    );

    if (isNotEmptyArray(localEntities)) {
      return this.saveAllLocally(localEntities, opts);
    }

    const json = entities.map((entity) => {
      // Fill default properties (as recorder department and person)
      this.fillDefaultProperties(entity, opts);
      // Reset quality properties
      this.resetQualityProperties(entity);
      return this.asObject(entity, MINIFY_ENTITY_FOR_POD);
    });

    const now = Date.now();
    if (this._debug) console.debug('[landing-service] Saving landings...', json);

    await this.graphql.mutate<LoadResult<any>>({
      mutation: this.mutations.saveAll,
      variables: {
        data: json,
      },
      error: { code: DataErrorCodes.SAVE_ENTITIES_ERROR, message: 'ERROR.SAVE_ENTITIES_ERROR' },
      update: (proxy, { data }) => {
        if (this._debug) console.debug(`[landing-service] Landings saved remotely in ${Date.now() - now}ms`);

        // For each result, copy ID+updateDate to source entity
        // Then filter to keep only new landings (need to cache update)
        const newSavedLandings = ((data.data && entities) || [])
          .map((entity) => {
            const savedEntity = data.data.find((obj) => entity.equals(obj));
            const isNew = isNil(entity.id);
            this.copyIdAndUpdateDate(savedEntity, entity);
            return isNew ? savedEntity : null;
          })
          .filter(isNotNil);

        // Add to cache
        if (isNotEmptyArray(newSavedLandings)) {
          this.insertIntoMutableCachedQueries(proxy, {
            queries: this.getLoadQueries(),
            data: newSavedLandings,
          });
        }
      },
    });

    return entities;
  }

  async saveAllLocally(entities: Landing[], opts?: LandingSaveOptions): Promise<Landing[]> {
    if (!entities) return entities;

    if (this._debug) console.debug(`[landing-service] Saving ${entities.length} landings locally...`);
    const jobsFactories = (entities || []).map((entity) => () => this.saveLocally(entity, { ...opts }));
    return chainPromises<Landing>(jobsFactories);
  }

  async save(entity: Landing, opts?: LandingSaveOptions): Promise<Landing> {
    const isNew = isNil(entity.id);

    // If parent is a local entity: force to save locally
    // If is a local entity: force a local save
    const offline = entity.observedLocationId < 0 || RootDataEntityUtils.isLocal(entity);
    if (offline) {
      return await this.saveLocally(entity, opts);
    }

    const now = Date.now();
    if (this._debug) console.debug('[landing-service] Saving a landing...', entity);

    // Prepare to save
    this.fillDefaultProperties(entity, opts);

    // Reset quality properties
    this.resetQualityProperties(entity);

    // When offline, provide an optimistic response
    const offlineResponse =
      !opts || opts.enableOptimisticResponse !== false
        ? async (context) => {
            // Make sure to fill id, with local ids
            await this.fillOfflineDefaultProperties(entity);

            // For the query to be tracked (see tracked query link) with a unique serialization key
            context.tracked = !entity.synchronizationStatus || entity.synchronizationStatus === 'SYNC';
            if (isNotNil(entity.id)) context.serializationKey = `${Landing.TYPENAME}:${entity.id}`;

            return { data: [this.asObject(entity, SERIALIZE_FOR_OPTIMISTIC_RESPONSE)] };
          }
        : undefined;

    // Transform into json
    const json = this.asObject(entity, MINIFY_ENTITY_FOR_POD);
    //if (this._debug)
    console.debug('[landing-service] Saving landing (minified):', json);

    await this.graphql.mutate<{ data: any }>({
      mutation: this.mutations.save,
      variables: {
        data: json,
      },
      offlineResponse,
      error: { code: DataErrorCodes.SAVE_ENTITIES_ERROR, message: 'ERROR.SAVE_ENTITIES_ERROR' },
      update: async (proxy, { data }) => {
        const savedEntity = data && data.data;

        // Local entity: save it
        if (savedEntity.id < 0) {
          if (this._debug) console.debug('[landing-service] [offline] Saving landing locally...', savedEntity);

          // Save response locally
          await this.entities.save<Landing>(savedEntity);
        }

        // Update the entity and update GraphQL cache
        else {
          // Remove existing entity from the local storage
          if (entity.id < 0 && (savedEntity.id > 0 || savedEntity.updateDate)) {
            if (this._debug) console.debug(`[landing-service] Deleting landing {${entity.id}} from local storage`);
            await this.entities.delete(entity);
          }

          this.copyIdAndUpdateDate(savedEntity, entity);

          if (this._debug) console.debug(`[landing-service] Landing saved remotely in ${Date.now() - now}ms`, entity);

          // Add to cache
          if (isNew) {
            // Cache load by parent
            this.insertIntoMutableCachedQueries(proxy, {
              queries: this.getLoadQueries(),
              data: savedEntity,
            });
          }
        }
      },
    });

    return entity;
  }

  /**
   * Delete landing locally (from the entity storage)
   *
   * @param filter (required observedLocationId)
   */
  async deleteLocally(filter: Partial<LandingFilter> & { observedLocationId: number }): Promise<Landing[]> {
    if (!filter || isNil(filter.observedLocationId)) throw new Error("Missing arguments 'filter.observedLocationId'");

    const dataFilter = this.asFilter(filter);
    const variables = {
      filter: dataFilter && dataFilter.asFilterFn(),
    };

    try {
      // Find landing to delete
      const res = await this.entities.loadAll<Landing>(Landing.TYPENAME, variables, { fullLoad: false });
      const ids = ((res && res.data) || []).map((o) => o.id);
      if (isEmptyArray(ids)) return undefined; // Skip

      // Apply deletion
      return await this.entities.deleteMany(ids, { entityName: Landing.TYPENAME });
    } catch (err) {
      console.error(`[landing-service] Failed to delete landings ${JSON.stringify(filter)}`, err);
      throw err;
    }
  }

  /**
   * Load many local landings
   */
  watchAllLocally(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    dataFilter?: LandingFilter | any,
    opts?: LandingServiceWatchOptions
  ): Observable<LoadResult<Landing>> {
    dataFilter = LandingFilter.fromObject(dataFilter);

    if (!dataFilter || dataFilter.isEmpty()) {
      console.warn("[landing-service] Trying to watch landings without 'filter': skipping.");
      return EMPTY;
    }
    if (isNotNil(dataFilter.observedLocationId) && dataFilter.observedLocationId >= 0)
      throw new Error("Invalid 'filter.observedLocationId': must be a local ID (id<0)!");
    if (isNotNil(dataFilter.tripId) && dataFilter.tripId >= 0) throw new Error("Invalid 'filter.tripId': must be a local ID (id<0)!");

    const variables = {
      offset: offset || 0,
      size: size >= 0 ? size : 20,
      sortBy: (sortBy !== 'id' && sortBy) || (opts && opts.trash ? 'updateDate' : 'dateTime'),
      sortDirection: sortDirection || (opts && opts.trash ? 'desc' : 'asc'),
      trash: (opts && opts.trash) || false,
      filter: dataFilter.asFilterFn(),
    };

    const entityName =
      !dataFilter.synchronizationStatus || dataFilter.synchronizationStatus !== 'SYNC'
        ? Landing.TYPENAME // Local entities
        : EntitiesStorage.REMOTE_PREFIX + Landing.TYPENAME; // Remote entities

    if (this._debug) console.debug(`[landing-service] Loading ${entityName} locally... using options:`, variables);
    return this.entities.watchAll<Landing>(entityName, variables, { fullLoad: opts?.fullLoad }).pipe(
      map(({ data, total }) => {
        const entities = !opts || opts.toEntity !== false ? (data || []).map(Landing.fromObject) : ((data || []) as Landing[]);
        total = total || entities.length;

        // Compute rankOrder, by tripId or observedLocationId
        if (!opts || opts.computeRankOrder !== false) {
          this.computeRankOrderAndSort(entities, offset, total, sortBy, sortDirection, dataFilter);
        }

        return {
          data: entities,
          total,
        };
      })
    );
  }

  async deleteAll(entities: Landing[], options?: any): Promise<any> {
    // Get local entity ids, then delete id
    const localIds = entities?.filter(EntityUtils.isLocal).map((t) => t.id);
    if (isNotEmptyArray(localIds)) {
      if (this._debug) console.debug('[landing-service] Deleting landings locally... ids:', localIds);
      await this.entities.deleteMany<Landing>(localIds, { entityName: Landing.TYPENAME });
    }

    const ids = entities.filter(EntityUtils.isRemote).map((t) => t.id);
    if (isEmptyArray(ids)) return; // stop, if nothing else to do

    const now = Date.now();
    if (this._debug) console.debug('[landing-service] Deleting landings... ids:', ids);

    await this.graphql.mutate<any>({
      mutation: this.mutations.deleteAll,
      variables: {
        ids,
      },
      update: (proxy) => {
        // Remove from cache
        this.removeFromMutableCachedQueriesByIds(proxy, { queries: this.getLoadQueries(), ids });

        if (this._debug) console.debug(`[landing-service] Landings deleted in ${Date.now() - now}ms`);
      },
    });
  }

  listenChanges(
    id: number,
    opts?: {
      interval?: number;
      fetchPolicy: FetchPolicy;
    }
  ): Observable<Landing> {
    if (isNil(id)) throw new Error("Missing argument 'id'");

    // Should not need to watch local entity
    if (EntityUtils.isLocalId(id)) {
      return EMPTY;
    }

    if (this._debug) console.debug(`[landing-service] [WS] Listening changes for trip {${id}}...`);

    return this.graphql
      .subscribe<{ data: any }, { id: number; interval: number }>({
        query: this.subscriptions.listenChanges,
        fetchPolicy: (opts && opts.fetchPolicy) || undefined,
        variables: { id, interval: toNumber(opts && opts.interval, 10) },
        error: {
          code: DataErrorCodes.SUBSCRIBE_ENTITY_ERROR,
          message: 'ERROR.SUBSCRIBE_ENTITY_ERROR',
        },
      })
      .pipe(
        map(({ data }) => {
          const entity = data && Landing.fromObject(data);
          if (entity && this._debug) console.debug(`[landing-service] Landing {${id}} updated on server!`, entity);
          return entity;
        })
      );
  }

  translateControlPath(path, opts?: { i18nPrefix?: string; pmfms?: IPmfm[] }): string {
    opts = { i18nPrefix: 'LANDING.EDIT.', ...opts };
    // Translate PMFM field
    if (MEASUREMENT_VALUES_PMFM_ID_REGEXP.test(path) && opts.pmfms) {
      const pmfmId = parseInt(path.split('.').pop());
      const pmfm = opts.pmfms.find((p) => p.id === pmfmId);
      return PmfmUtils.getPmfmName(pmfm);
    }
    // Default translation
    return this.formErrorTranslator.translateControlPath(path, opts);
  }

  async synchronizeById(id: number): Promise<Landing> {
    const entity = await this.load(id);

    if (!entity || entity.id >= 0) return; // skip

    return await this.synchronize(entity);
  }

  async synchronize(entity: Landing, opts?: LandingSaveOptions): Promise<Landing> {
    opts = {
      enableOptimisticResponse: false, // Optimistic response not need
      ...opts,
    };

    const localId = entity?.id;
    if (isNil(localId) || localId >= 0) throw new Error('Entity must be a local entity');
    if (this.network.offline) throw new Error('Could not synchronize if network if offline');

    // Clone (to keep original entity unchanged)
    entity = entity instanceof Entity ? entity.clone() : entity;
    entity.synchronizationStatus = 'SYNC';
    entity.id = undefined;

    // Synchronize trip
    if (EntityUtils.isLocalId(entity.tripId)) {
      // Load the local trip
      const trip = await this.tripService.load(entity.tripId, { fullLoad: true, rankOrderOnPeriod: false });

      // Link to parent observed location
      trip.observedLocationId = entity.observedLocationId;

      // Copy vessel from landing (Could be different if Vessel has been synchronized previously, without updating the trip).
      trip.vesselSnapshot = entity.vesselSnapshot;

      // Synchronize the trip
      const savedTrip = await this.tripService.synchronize(trip, { withLanding: false, withOperation: false, withOperationGroup: true });

      entity.tripId = savedTrip.id;
    }
    entity.trip = undefined;

    try {
      entity = await this.save(entity, opts);

      // Check return entity has a valid id
      if (isNil(entity.id) || entity.id < 0) {
        throw { code: DataErrorCodes.SYNCHRONIZE_ENTITY_ERROR };
      }
    } catch (err) {
      throw {
        ...err,
        code: DataErrorCodes.SYNCHRONIZE_ENTITY_ERROR,
        message: 'ERROR.SYNCHRONIZE_ENTITY_ERROR',
        context: entity.asObject(MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE),
      };
    }

    try {
      if (this._debug) console.debug(`[landing-service] Deleting landing {${entity.id}} from local storage`);
      await this.entities.deleteById(localId, { entityName: ObservedLocation.TYPENAME });
    } catch (err) {
      console.error(`[landing-service] Failed to locally delete landing {${entity.id}}`, err);
      // Continue
    }
    return entity;
  }

  async control(entity: Landing, opts?: LandingControlOptions): Promise<FormErrors> {
    const now = this._debug && Date.now();

    const maxProgression = toNumber(opts?.maxProgression, 100);
    opts = { ...opts, maxProgression };
    opts.progression = opts.progression || new ProgressionModel({ total: maxProgression });

    const progressionStep = maxProgression / 3;

    if (this._debug) console.debug(`[landing-service] Control {${entity.id}} ...`);

    opts = await this.fillControlOptions(entity, opts);

    const form = this.validatorService.getFormGroup(entity, { ...opts, withMeasurements: true });

    if (!form.valid) {
      // Wait end of validation (e.g. async validators)
      await AppFormUtils.waitWhilePending(form);

      // Get form errors
      if (form.invalid) {
        const errors: FormErrors = AppFormUtils.getFormErrors(form);

        if (this._debug) console.debug(`[landing-service] Control {${entity.id}} [INVALID] in ${Date.now() - now}ms`, errors);

        return errors;
      }
    }

    if (this._debug) console.debug(`[landing-service] Control {${entity.id}} [OK] in ${Date.now() - now}ms`);

    if (opts?.progression) opts.progression.increment(progressionStep);

    // Also control trip
    if (isNotNil(entity.tripId)) {
      const trip = await this.tripService.load(entity.tripId, { isLandedTrip: true });

      // Should never occur
      if (isNil(trip)) return undefined;

      // control the trip
      const errors = await this.tripService.control(trip, {
        progression: opts?.progression,
        maxProgression: opts?.maxProgression - progressionStep,
      });

      if (errors) {
        return {
          trip: errors?.details?.errors,
        };
      }

      // terminate the trip
      if (isNil(trip.controlDate)) await this.tripService.terminate(trip);
    } else if (opts?.progression) opts.progression.increment(progressionStep);

    return undefined; // No error
  }

  async controlAllByObservedLocation(observedLocation: ObservedLocation, opts?: LandingControlOptions) {
    const maxProgression = toNumber(opts?.maxProgression, 100);
    opts = {
      ...opts,
      maxProgression,
    };
    opts.progression = opts.progression || new ProgressionModel({ total: maxProgression });
    const endProgression = opts.progression.current + maxProgression;

    // Increment
    this.progressBarService.increase();

    try {
      let { data } = await this.loadAllByObservedLocation(
        LandingFilter.fromObject({
          observedLocationId: observedLocation.id,
        }),
        { fetchPolicy: 'no-cache' } // TODO BLA
      );

      // Filter dividers
      data = data.filter((entity) => isNotNil(entity.id));

      // Do not control PETS
      data = data.filter((entity) => !PmfmValueUtils.equals(entity.measurementValues[PmfmIds.SPECIES_LIST_ORIGIN], QualitativeValueIds.PETS));

      if (isEmptyArray(data)) return undefined;
      const progressionStep = maxProgression / data.length / 2; // 2 steps by landing: control, then save

      let errorsById: FormErrors = null;

      let observedCount = 0;

      for (const entity of data) {
        opts = await this.fillControlOptions(entity, opts);

        const errors = await this.control(entity, { ...opts, maxProgression: progressionStep });
        if (errors) {
          errorsById = errorsById || {};
          errorsById[entity.id] = errors;

          const errorMessage = this.formErrorTranslator.translateErrors(errors, opts.translatorOptions);
          entity.controlDate = null;
          entity.qualificationComments = errorMessage;

          if (opts.progression?.cancelled) return; // Cancel

          // Save entity
          await this.save(entity);
        } else {
          if (opts.progression?.cancelled) return; // Cancel
          // Need to exclude data that already validated (else got exception when pod control already validated data)
          if (isNil(entity.validationDate)) await this.terminate(entity);
        }

        // increment, after save/terminate
        opts.progression.increment(progressionStep);

        // Count observed species
        observedCount += +toBoolean(entity.measurementValues[PmfmIds.IS_OBSERVED]);
      }

      let errorObservation = null;

      if (opts?.program) {
        const minObservedCount = opts.program.getPropertyAsInt(ProgramProperties.LANDING_MIN_OBSERVED_SPECIES_COUNT);
        const maxObservedCount = opts.program.getPropertyAsInt(ProgramProperties.LANDING_MAX_OBSERVED_SPECIES_COUNT);

        // Error if observed count is not in range
        if (observedCount < minObservedCount || observedCount > maxObservedCount) {
          errorObservation = {
            observedCount,
            minObservedCount,
            maxObservedCount,
          };
        }
      }

      return errorsById || errorObservation ? { landings: errorsById, observations: errorObservation } : null;
    } catch (err) {
      console.error((err && err.message) || err);
      throw err;
    } finally {
      this.progressBarService.decrease();
      if (opts.progression.current < endProgression) {
        opts.progression.current = endProgression;
      }
    }
  }

  async executeImport(
    filter?: Partial<LandingFilter>,
    opts?: {
      progression?: BehaviorSubject<number>;
      maxProgression?: number;
    }
  ) {
    const now = this._debug && Date.now();
    const maxProgression = (opts && opts.maxProgression) || 100;

    filter = {
      startDate: DateUtils.moment().startOf('day').add(-15, 'day'),
      ...filter,
    };

    console.info('[landing-service] Importing remote landings...', filter);

    const { data } = await JobUtils.fetchAllPages<any>(
      (offset, size) =>
        this.loadAll(offset, size, 'id', null, filter, {
          fetchPolicy: 'no-cache', // Skip cache
          fullLoad: false,
          toEntity: false,
        }),
      {
        progression: opts?.progression,
        maxProgression: maxProgression * 0.9,
        logPrefix: this._logPrefix,
        fetchSize: 5,
      }
    );

    // Save locally
    await this.entities.saveAll(data || [], {
      entityName: EntitiesStorage.REMOTE_PREFIX + Landing.TYPENAME,
      reset: true,
    });

    if (this._debug) console.debug(`[landing-service] Importing remote landings [OK] in ${Date.now() - now}ms`, data);
  }

  copyIdAndUpdateDate(source: Landing | undefined, target: Landing) {
    if (!source) return;

    // DEBUG
    //console.debug('[landing-service] copyIdAndUpdateDate', source, target);

    super.copyIdAndUpdateDate(source, target);

    // Update samples (recursively)
    if (target.samples && source.samples) {
      this.copyIdAndUpdateDateOnSamples(source, source.samples, target.samples);
    }

    // Update trip
    if (target.trip && source.trip) {
      // DEBUG
      //console.debug('[landing-service] copyIdAndUpdateDate -> trip', source.trip, target.trip);

      this.copyIdAndUpdateDateOnTrip(target, source.trip as Trip, target.trip as Trip);
    }
  }

  /**
   * Workaround to avoid integrity constraints on TRIP.DEPARTURE_DATE_TIME: we add a 1s delay, if another trip exists on same date
   *
   * @param entity
   */
  async fixLandingTripDate(entity: Landing) {
    if (!entity) throw new Error('Invalid landing');

    const observedLocationId = entity.observedLocationId;
    const vesselId = entity.vesselSnapshot?.id;
    const program = entity.program;
    const trip = entity.trip as Trip;
    const tripId = toNumber(trip?.id, entity.tripId);
    const departureDateTime = fromDateISOString(trip.departureDateTime || entity.dateTime);

    // Skip if no trip or no observed location
    // or if trip already saved remotely
    if (!trip || isNil(observedLocationId) || EntityUtils.isRemoteId(tripId)) return;

    if (isNil(vesselId) || !program || isNil(departureDateTime)) {
      throw new Error('Invalid landing: missing vessel, program or dateTime');
    }

    const offline =
      this.network.offline || EntityUtils.isLocalId(entity.id) || EntityUtils.isLocalId(observedLocationId) || EntityUtils.isLocalId(tripId) || false;

    let otherDepartureDateTimes: Moment[];
    if (offline) {
      const { data: landings } = await this.loadAllByObservedLocation(
        { observedLocationId, vesselId, program },
        { computeRankOrder: false, fetchPolicy: 'no-cache', toEntity: false, withTotal: false }
      );

      // Workaround to avoid integrity constraints on TRIP.DEPARTURE_DATE_TIME: we add a 1s delay, if another trip exists on same date
      otherDepartureDateTimes = (landings || [])
        .filter((l) => l.id !== entity.id && l.trip && l.trip.id !== entity.trip.id)
        .map((l) => (l.trip as Trip).departureDateTime)
        .map(fromDateISOString);
    } else {
      const tripFilter = TripFilter.fromObject(<TripFilter>{
        program,
        observedLocationId,
        vesselId,
        excludedIds: isNotNil(tripId) ? [tripId] : undefined,
      });

      const { data: trips } = await this.tripService.loadAll(0, 999, 'id', 'asc', tripFilter, {
        query: LandingQueries.loadNearbyTripDates,
        // CLT - We need to use 'no-cache' fetch policy in order to transform mutable watch query into ordinary query since mutable queries doesn't manage correctly updates and cache.
        // They doesn't wait server result to return client side result.
        fetchPolicy: 'no-cache',
        withTotal: false,
      });
      otherDepartureDateTimes = (trips || [])
        .filter((t) => t.id !== entity.trip.id)
        .map((t) => t.departureDateTime)
        .map(fromDateISOString);
    }

    const hasDuplicate = otherDepartureDateTimes.some((d) => DateUtils.isSame(d, departureDateTime));
    if (hasDuplicate) {
      // Compute max(existing date)
      const maxDatetime = otherDepartureDateTimes.reduce(DateUtils.max, null);
      // Apply 1s to the max(existing date)
      trip.departureDateTime = maxDatetime.add(1, 'seconds');
      console.info(
        "[landing-service] Trip's departureDateTime has been changed, to avoid integrity constraint error. New date is: " +
          toDateISOString(trip.departureDateTime)
      );
    }
  }

  /* -- protected methods -- */

  /**
   * List of importation jobs.
   *
   * @protected
   * @param opts
   */
  protected getImportJobs(
    filter: Partial<LandingFilter>,
    opts: {
      maxProgression: undefined;
      program?: Program;
      acquisitionLevels?: string[];
    }
  ): Observable<number>[] {
    const offlineFilter = this.settings.getOfflineFeature(this.featureName)?.filter;
    if (!filter) {
      const observedLocationFilter = ObservedLocationFilter.fromObject(offlineFilter);
      filter = ObservedLocationFilter.toLandingFilter(observedLocationFilter);
    }

    filter = this.asFilter(filter);

    const programLabel = filter?.program?.label;
    if (programLabel) {
      return [
        // Store program to opts, for other services (e.g. used by OperationService)
        JobUtils.defer((o) =>
          this.programRefService.loadByLabel(programLabel, { fetchPolicy: 'network-only' }).then((program) => {
            opts.program = program;
            opts.acquisitionLevels = ProgramUtils.getAcquisitionLevels(program);
          })
        ),

        ...super.getImportJobs(filter, opts),

        // Landing (historical data)
        JobUtils.defer((o) => this.executeImport(filter, o), opts),
      ];
    } else {
      return super.getImportJobs(null, opts);
    }
  }

  /**
   * Save into the local storage
   *
   * @param entity
   * @param opts
   */
  protected async saveLocally(entity: Landing, opts?: LandingSaveOptions): Promise<Landing> {
    if (EntityUtils.isRemoteId(entity.observedLocationId)) throw new Error('Must be linked to a local observed location');

    // Fill default properties (as recorder department and person)
    this.fillDefaultProperties(entity, opts);

    // Make sure to fill id, with local ids
    await this.fillOfflineDefaultProperties(entity);

    const json = this.asObject(entity, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE);
    if (this._debug) console.debug('[landing-service] [offline] Saving landing locally...', json);

    // Save response locally
    await this.entities.save(json);

    return entity;
  }

  protected asObject(source: Landing, opts?: DataEntityAsObjectOptions): any {
    opts = { ...MINIFY_OPTIONS, ...opts };
    const target: any = source.asObject(opts);

    if (opts.minify && !opts.keepEntityName && !opts.keepTypename) {
      // Clean vessel features object, before saving
      //copy.vesselSnapshot = {id: entity.vesselSnapshot && entity.vesselSnapshot.id};

      // Comment because need to keep recorder person
      target.recorderPerson =
        source.recorderPerson &&
        <Person>{
          id: source.recorderPerson.id,
          firstName: source.recorderPerson.firstName,
          lastName: source.recorderPerson.lastName,
        };

      // Keep id only, on recorder department
      target.recorderDepartment = (source.recorderDepartment && { id: source.recorderDepartment && source.recorderDepartment.id }) || undefined;

      // Fill trip properties
      const targetTrip = target.trip;
      if (targetTrip) {
        // Fill defaults
        targetTrip.departureDateTime = targetTrip.departureDateTime || target.dateTime;
        targetTrip.returnDateTime = targetTrip.returnDateTime || targetTrip.departureDateTime || target.dateTime;
        targetTrip.departureLocation = targetTrip.departureLocation || target.location;
        targetTrip.returnLocation = targetTrip.returnLocation || targetTrip.departureLocation || target.location;

        // Always override recorder department/person
        targetTrip.program = target.program;
        targetTrip.vesselSnapshot = target.vesselSnapshot;
        targetTrip.recorderDepartment = target.recorderDepartment;
        targetTrip.recorderPerson = target.recorderPerson;
      }
    }

    return target;
  }

  protected fillDefaultProperties(entity: Landing, opts?: Partial<LandingSaveOptions>) {
    super.fillDefaultProperties(entity);

    // Fill parent id, if not already set
    if (!entity.tripId && !entity.observedLocationId && opts) {
      entity.observedLocationId = opts.observedLocationId;
      entity.tripId = opts.tripId;
    }

    // Make sure to set all samples attributes
    (entity.samples || []).forEach((s) => {
      // Always fill label
      if (isNilOrBlank(s.label)) {
        s.label = `#${s.rankOrder}`;
      }
    });

    // Measurement: compute rankOrder
    // fillRankOrder(entity.measurements); // todo ? use measurements instead of measurementValues
  }

  protected async fillOfflineDefaultProperties(entity: Landing) {
    const isNew = isNil(entity.id);

    // If new, generate a local id
    if (isNew) {
      entity.id = await this.entities.nextValue(entity);
    }

    // Fill default synchronization status
    entity.synchronizationStatus = entity.synchronizationStatus || 'DIRTY';

    // Fill all sample ids
    const samples = (entity.samples && EntityUtils.listOfTreeToArray(entity.samples)) || [];
    await EntityUtils.fillLocalIds(samples, (_, count) => this.entities.nextValues(Sample.TYPENAME, count));
  }

  protected async fillControlOptions(entity: Landing, opts?: LandingControlOptions): Promise<LandingControlOptions> {
    opts = opts || { strategy: null };

    // If program is not filled by a parent (an ObservedLocation)
    const programLabel = (entity.program && entity.program.label) || null;
    if (opts.program?.label !== programLabel) {
      opts.program = await this.programRefService.loadByLabel(programLabel);
    }

    // Load the strategy from measurementValues (if exists)
    if (!opts.strategy) {
      const strategyResolution = opts.program.getProperty(ProgramProperties.DATA_STRATEGY_RESOLUTION) as DataStrategyResolution;
      switch (strategyResolution) {
        case 'user-select': {
          const strategyLabel = entity.measurementValues?.[PmfmIds.STRATEGY_LABEL];
          if (isNotNilOrBlank(strategyLabel)) {
            opts.strategy = await this.strategyRefService.loadByLabel(strategyLabel, { programId: opts.program?.id });
          }
          break;
        }
        case 'spatio-temporal':
          opts.strategy = await this.strategyRefService.loadByFilter({
            programId: opts?.program.id,
            acquisitionLevel: AcquisitionLevelCodes.LANDING,
            startDate: entity.dateTime,
            location: (entity.observedLocation as ObservedLocation)?.location || entity.location,
          });
          break;
        case 'last':
          opts.strategy = await this.strategyRefService.loadByFilter({
            programId: opts?.program.id,
            acquisitionLevel: AcquisitionLevelCodes.LANDING,
          });
          break;
      }
      if (!opts.strategy && strategyResolution !== 'none') {
        console.warn(this._logPrefix + 'No strategy loaded from landing #' + entity.id);
      }
    }

    if (!opts?.translatorOptions) {
      opts.translatorOptions = {
        controlPathTranslator: {
          translateControlPath: (path) => this.translateControlPath(path, { pmfms: opts.strategy?.denormalizedPmfms }),
        },
      };
    }

    return opts as LandingControlOptions;
  }

  /**
   * Copy Id and update, in sample tree (recursively)
   *
   * @param sources
   * @param targets
   */
  protected copyIdAndUpdateDateOnSamples(savedLanding: Landing, sources: (Sample | any)[], targets: Sample[]) {
    // Update samples
    if (sources && targets) {
      const operationId = savedLanding.samples[0]?.operationId;
      targets.forEach((target) => {
        // Set the landing id (required by equals function) => Obsolete : there is no more direct link between sample and landing
        target.landingId = savedLanding.id;
        // INFO CLT: Fix on sample to landing link. We use operation to link sample to landing (see issue #IMAGINE-569)
        // Set the operation id (required by equals function)
        target.operationId = operationId;

        const source = sources.find((s) => target.equals(s));
        EntityUtils.copyIdAndUpdateDate(source, target);
        RootDataEntityUtils.copyControlAndValidationDate(source, target);

        // Copy parent Id (need for link to parent)
        target.parentId = source?.parentId;
        target.parent = null;

        // Apply to children
        if (target.children && target.children.length) {
          this.copyIdAndUpdateDateOnSamples(savedLanding, sources, target.children); // recursive call
        }

        // Update images
        if (target.images && source.images) {
          this.copyIdAndUpdateDateOnImages(source.images, target.images); // recursive call
        }
      });
    }
  }

  /**
   * Copy Id and update, on images
   *
   * @param sources
   * @param targets
   */
  protected copyIdAndUpdateDateOnImages(sources: (ImageAttachment | any)[], targets: ImageAttachment[]) {
    if (sources && targets && sources.length === targets.length && sources.length > 0) {
      sources.forEach((source, index) => {
        // Find by index, as order should not be changed during saving
        const target = targets[index];

        EntityUtils.copyIdAndUpdateDate(source, target);
        DataEntityUtils.copyControlDate(source, target);
        DataEntityUtils.copyQualificationDateAndFlag(source, target);
      });
    }
  }

  copyIdAndUpdateDateOnTrip(savedLanding: Landing, source: Trip | undefined, target: Trip) {
    this.tripService.copyIdAndUpdateDate(source, target);
    savedLanding.tripId = target.id;
  }

  protected computeRankOrderAndSort(data: Landing[], offset: number, total: number, sortBy: string, sortDirection: string, filter?: LandingFilter) {
    // DEBUG
    console.debug('[landing-service] Computing rankOrder, then sort by ' + sortBy);

    // Compute rankOrder, by tripId or observedLocationId
    if (filter && (isNotNil(filter.tripId) || isNotNil(filter.observedLocationId))) {
      const asc = !sortDirection || sortDirection === 'asc';
      let rankOrder = asc ? 1 + offset : total - offset - data.length + 1;
      // apply a sorted copy (do NOT change original order), then compute rankOrder
      data
        .slice()
        .sort(sortByDateOrIdFn)
        .forEach((o) => (o.rankOrder = rankOrder++));

      // Sort by rankOrder (even if 'id' because never used)
      if (!sortBy || sortBy === 'rankOrder' || sortBy === 'id' || sortBy === 'dateTime') {
        data.sort(asc ? sortByAscRankOrder : sortByDescRankOrder);
      }
    }
  }
}
