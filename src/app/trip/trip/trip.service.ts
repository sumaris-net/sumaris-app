import { Inject, Injectable, Injector, Optional } from '@angular/core';
import { gql } from '@apollo/client/core';
import { filter, map } from 'rxjs/operators';

import {
  APP_USER_EVENT_SERVICE,
  AppErrorWithDetails,
  AppFormUtils,
  BaseEntityGraphqlQueries,
  chainPromises,
  DateUtils,
  EntitiesServiceWatchOptions,
  EntitiesStorage,
  Entity,
  EntityServiceListenChangesOptions,
  EntityServiceLoadOptions,
  EntityUtils,
  FormErrorTranslator,
  GraphqlService,
  IEntitiesService,
  IEntityService,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  IUserEventService,
  JobUtils,
  LoadResult,
  LocalSettingsService,
  NetworkService,
  PersonService,
  removeDuplicatesFromArray,
  ShowToastOptions,
  splitById,
  splitByProperty,
  Toasts,
  toNumber,
} from '@sumaris-net/ngx-components';
import {
  COPY_LOCALLY_AS_OBJECT_OPTIONS,
  DataEntityAsObjectOptions,
  MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE,
  SAVE_AS_OBJECT_OPTIONS,
  SERIALIZE_FOR_OPTIMISTIC_RESPONSE,
} from '@app/data/services/model/data-entity.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { IProgressionOptions, IRootDataEntityQualityService } from '@app/data/services/data-quality-service.class';
import { OperationService } from '../operation/operation.service';
import { VesselSnapshotFragments, VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { IMPORT_REFERENTIAL_ENTITIES, ReferentialRefService, WEIGHT_CONVERSION_ENTITIES } from '@app/referential/services/referential-ref.service';
import { TripValidatorOptions, TripValidatorService } from './trip.validator';
import { Operation, OperationGroup, Trip } from './trip.model';
import { RootDataEntityUtils } from '@app/data/services/model/root-data-entity.model';
import { fillRankOrder, fillTreeRankOrder, SynchronizationStatusEnum } from '@app/data/services/model/model.utils';
import { SortDirection } from '@angular/material/sort';
import { OverlayEventDetail } from '@ionic/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastController } from '@ionic/angular';
import { TRIP_FEATURE_DEFAULT_PROGRAM_FILTER, TRIP_FEATURE_NAME } from '../trip.config';
import { IDataSynchroService, RootDataEntitySaveOptions, RootDataSynchroService } from '@app/data/services/root-data-synchro-service.class';
import { environment } from '@environments/environment';
import { Sample } from '../sample/sample.model';
import { DataErrorCodes } from '@app/data/services/errors';
import { VESSEL_FEATURE_NAME } from '@app/vessel/services/config/vessel.config';
import { TripFilter, TripSynchroImportFilter } from './trip.filter';
import { TrashRemoteService } from '@app/core/services/trash-remote.service';
import { PhysicalGearService } from '@app/trip/physicalgear/physicalgear.service';
import { Packet } from '@app/trip/packet/packet.model';
import { BaseRootEntityGraphqlMutations } from '@app/data/services/root-data-service.class';
import { TripErrorCodes } from '@app/trip/trip.errors';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { Program, ProgramUtils } from '@app/referential/services/model/program.model';
import { Geometries } from '@app/shared/geometries.utils';
import { BBox } from 'geojson';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { UserEvent, UserEventTypeEnum } from '@app/social/user-event/user-event.model';

import moment from 'moment';
import { ProgressionModel } from '@app/shared/progression/progression.model';
import {
  DataCommonFragments,
  DataFragments,
  ExpectedSaleFragments,
  OperationGroupFragment,
  PhysicalGearFragments,
  SaleFragments,
} from '@app/trip/common/data.fragments';

export const TripFragments = {
  lightTrip: gql`
    fragment LightTripFragment on TripVO {
      id
      program {
        id
        label
      }
      departureDateTime
      returnDateTime
      creationDate
      updateDate
      controlDate
      validationDate
      qualificationDate
      qualityFlagId
      comments
      departureLocation {
        ...LocationFragment
      }
      returnLocation {
        ...LocationFragment
      }
      vesselSnapshot {
        ...LightVesselSnapshotFragment
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
    }
    ${DataCommonFragments.location}
    ${DataCommonFragments.lightDepartment}
    ${DataCommonFragments.lightPerson}
    ${VesselSnapshotFragments.lightVesselSnapshot}
    ${DataCommonFragments.referential}
  `,

  trip: gql`fragment TripFragment on TripVO {
    id
    program {
      id
      label
    }
    departureDateTime
    returnDateTime
    creationDate
    updateDate
    controlDate
    validationDate
    qualificationDate
    qualityFlagId
    comments
    samplingStrata {
      ...LightReferentialFragment
      properties
    }
    vesselSnapshot {
      ...LightVesselSnapshotFragment
    }
    departureLocation {
      ...LocationFragment
    }
    returnLocation {
      ...LocationFragment
    }
    sale {
      ...TripSaleFragment
    }
    gears {
      ...PhysicalGearFragment
    }
    measurements {
      ...MeasurementFragment
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
    metiers {
      ...MetierFragment
    }
    fishingAreas {
      ...FishingAreaFragment
    }
  }
  ${DataCommonFragments.lightDepartment}
  ${DataCommonFragments.lightPerson}
  ${DataCommonFragments.measurement}
  ${DataCommonFragments.referential}
  ${DataCommonFragments.location}
  ${VesselSnapshotFragments.lightVesselSnapshot}
  ${PhysicalGearFragments.physicalGear}
  ${DataCommonFragments.metier},
  ${DataFragments.fishingArea},
  ${SaleFragments.tripSale}`,

  landedTrip: gql`
    fragment LandedTripFragment on TripVO {
      id
      program {
        id
        label
      }
      departureDateTime
      returnDateTime
      creationDate
      updateDate
      controlDate
      validationDate
      qualificationDate
      qualityFlagId
      comments
      landing {
        id
        rankOrder
      }
      observedLocationId
      departureLocation {
        ...LocationFragment
      }
      returnLocation {
        ...LocationFragment
      }
      vesselSnapshot {
        ...LightVesselSnapshotFragment
      }
      gears {
        ...PhysicalGearFragment
      }
      measurements {
        ...MeasurementFragment
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
      metiers {
        ...MetierFragment
      }
      operationGroups {
        ...OperationGroupFragment
      }
      expectedSale {
        ...ExpectedSaleFragment
      }
      fishingAreas {
        ...FishingAreaFragment
      }
    }
    ${DataCommonFragments.lightDepartment}
    ${DataCommonFragments.lightPerson}
    ${DataCommonFragments.measurement}
    ${DataCommonFragments.referential}
    ${DataCommonFragments.location}
    ${VesselSnapshotFragments.lightVesselSnapshot}
    ${DataCommonFragments.metier}
    ${PhysicalGearFragments.physicalGear}
    ${OperationGroupFragment.operationGroup}
    ${ExpectedSaleFragments.expectedSale}
    ${DataFragments.fishingArea}
  `,

  embeddedLandedTrip: gql`
    fragment EmbeddedLandedTripFragment on TripVO {
      id
      program {
        id
        label
      }
      departureDateTime
      returnDateTime
      creationDate
      updateDate
      controlDate
      validationDate
      qualificationDate
      qualityFlagId
      comments
      landing {
        id
        rankOrder
      }
      recorderDepartment {
        ...LightDepartmentFragment
      }
      recorderPerson {
        ...LightPersonFragment
      }
      metiers {
        ...MetierFragment
      }
      operationGroups {
        ...OperationGroupFragment
      }
      fishingAreas {
        ...FishingAreaFragment
      }
    }
    ${DataCommonFragments.metier}
    ${DataFragments.fishingArea}
    ${OperationGroupFragment.operationGroup}
  `,
};

export interface TripLoadOptions extends EntityServiceLoadOptions {
  isLandedTrip?: boolean;
  withOperation?: boolean;
  withOperationGroup?: boolean;
  withExpenses?: boolean;
  toEntity?: boolean;
  fullLoad?: boolean;
}

export interface TripSaveOptions extends RootDataEntitySaveOptions {
  withLanding?: boolean; // False by default
  withOperation?: boolean; // False by default
  withOperationGroup?: boolean; // False by default
  withExpenses?: boolean; // False by default
  enableOptimisticResponse?: boolean; // True by default
}

export interface TripServiceCopyOptions extends TripSaveOptions {
  keepRemoteId?: boolean;
  deletedFromTrash?: boolean;
  displaySuccessToast?: boolean;
}

export interface TripWatchOptions extends EntitiesServiceWatchOptions {
  query?: any;
}

export interface TripControlOptions extends TripValidatorOptions, IProgressionOptions {}

const TripQueries: BaseEntityGraphqlQueries & { loadLandedTrip: any } = {
  // Load a trip
  load: gql`
    query Trip($id: Int!) {
      data: trip(id: $id) {
        ...TripFragment
      }
    }
    ${TripFragments.trip}
  `,

  loadAll: gql`
    query Trips($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $trash: Boolean, $filter: TripFilterVOInput) {
      data: trips(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, trash: $trash) {
        ...LightTripFragment
      }
    }
    ${TripFragments.lightTrip}
  `,

  loadAllWithTotal: gql`
    query Trips($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $trash: Boolean, $filter: TripFilterVOInput) {
      data: trips(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, trash: $trash) {
        ...LightTripFragment
      }
      total: tripsCount(filter: $filter, trash: $trash)
    }
    ${TripFragments.lightTrip}
  `,

  // Load a landed trip
  loadLandedTrip: gql`
    query Trip($id: Int!) {
      data: trip(id: $id) {
        ...LandedTripFragment
      }
    }
    ${TripFragments.landedTrip}
  `,

  // Load a landed trip
  countAll: gql`
    query TripCount($trash: Boolean, $filter: TripFilterVOInput) {
      total: tripsCount(filter: $filter, trash: $trash)
    }
  `,
};

// Save a trip
const TripMutations = <BaseRootEntityGraphqlMutations & { saveLandedTrip: any }>{
  save: gql`
    mutation saveTrip($data: TripVOInput!, $options: TripSaveOptionsInput!) {
      data: saveTrip(trip: $data, options: $options) {
        ...TripFragment
      }
    }
    ${TripFragments.trip}
  `,

  // Save a landed trip
  saveLandedTrip: gql`
    mutation saveTrip($data: TripVOInput!, $options: TripSaveOptionsInput!) {
      data: saveTrip(trip: $data, options: $options) {
        ...LandedTripFragment
      }
    }
    ${TripFragments.landedTrip}
  `,

  // Delete
  deleteAll: gql`
    mutation DeleteTrips($ids: [Int]!) {
      deleteTrips(ids: $ids)
    }
  `,

  // Terminate
  terminate: gql`
    mutation ControlTrip($data: TripVOInput!) {
      data: controlTrip(trip: $data) {
        ...TripFragment
      }
    }
    ${TripFragments.trip}
  `,

  validate: gql`
    mutation ValidateTrip($data: TripVOInput!) {
      data: validateTrip(trip: $data) {
        ...TripFragment
      }
    }
    ${TripFragments.trip}
  `,

  qualify: gql`
    mutation QualifyTrip($data: TripVOInput!) {
      data: qualifyTrip(trip: $data) {
        ...TripFragment
      }
    }
    ${TripFragments.trip}
  `,

  unvalidate: gql`
    mutation UnvalidateTrip($data: TripVOInput!) {
      data: unvalidateTrip(trip: $data) {
        ...TripFragment
      }
    }
    ${TripFragments.trip}
  `,
};

const TripSubscriptions = {
  listenChanges: gql`
    subscription UpdateTrip($id: Int!, $interval: Int) {
      data: updateTrip(id: $id, interval: $interval) {
        ...LightTripFragment
      }
    }
    ${TripFragments.lightTrip}
  `,
};

export class TripComparators {
  static sortByDepartureDateFn(n1: Trip, n2: Trip): number {
    const d1 = n1.departureDateTime;
    const d2 = n2.departureDateTime;
    return d1.isSame(d2) ? 0 : d1.isAfter(d2) ? 1 : -1;
  }
}

@Injectable({ providedIn: 'root' })
export class TripService
  extends RootDataSynchroService<Trip, TripFilter, number, TripLoadOptions>
  implements
    IEntitiesService<Trip, TripFilter>,
    IEntityService<Trip, number, TripLoadOptions>,
    IRootDataEntityQualityService<Trip>,
    IDataSynchroService<Trip, TripFilter, number, TripLoadOptions>
{
  constructor(
    injector: Injector,
    protected graphql: GraphqlService,
    protected network: NetworkService,
    protected referentialRefService: ReferentialRefService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected personService: PersonService,
    protected entities: EntitiesStorage,
    protected operationService: OperationService,
    protected physicalGearService: PhysicalGearService,
    protected settings: LocalSettingsService,
    protected validatorService: TripValidatorService,
    protected trashRemoteService: TrashRemoteService,
    protected formErrorTranslator: FormErrorTranslator,
    @Inject(APP_USER_EVENT_SERVICE) @Optional() protected userEventService: IUserEventService<any, any>,
    @Optional() protected translate: TranslateService,
    @Optional() protected toastController: ToastController
  ) {
    super(injector, Trip, TripFilter, {
      queries: TripQueries,
      mutations: TripMutations,
      subscriptions: TripSubscriptions,
      defaultSortBy: 'departureDateTime',
      defaultSortDirection: 'asc',
    });

    this._featureName = TRIP_FEATURE_NAME;

    // Register user event actions
    if (userEventService) {
      userEventService.registerListener({
        accept: (e) => this.isDebugData(e),
        onReceived: (event) => {
          event.addAction({
            name: this.translate.instant('SOCIAL.USER_EVENT.BTN_COPY_TO_LOCAL'),
            color: 'success',
            iconRef: {
              matIcon: 'content_copy',
            },
            executeAction: async (e) => {
              // Fetch event's content, if not present
              if (!event.content) {
                event = await userEventService.load(e.id, { withContent: true });
              }
              const context = this.getEventContext(event);
              if (context) {
                await this.copyLocally(Trip.fromObject(context), { displaySuccessToast: true });
              } else {
                await this.showToast({ message: 'ERROR.LOAD_DATA_ERROR', type: 'error' });
              }
            },
          });
          return event;
        },
      });
    }

    // Register self (avoid loop dependency)
    operationService.tripService = this;

    // FOR DEV ONLY
    this._debug = !environment.production;
    if (this._debug) console.debug('[trip-service] Creating service');
  }

  getEventContext(event: UserEvent): any {
    const context = event.content?.context;
    if (context && typeof context === 'string') {
      try {
        return JSON.parse(context);
      } catch (e) {
        // Invalid JSON: continue
      }
    }
    return context;
  }

  isDebugData(event: UserEvent): boolean {
    return (
      event.type === UserEventTypeEnum.DEBUG_DATA &&
      // If content not fetched, use only the hasContent flag (BUT insecrued, because data can be NOT a Trip)
      ((!event.content && event.hasContent) ||
        // If content fetched, make sure data is a Trip
        this.getEventContext(event)?.__typename === Trip.TYPENAME)
    );
  }

  async loadAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: Partial<TripFilter>,
    opts?: EntityServiceLoadOptions & {
      query?: any;
      debug?: boolean;
      withTotal?: boolean;
    }
  ): Promise<LoadResult<Trip>> {
    const offlineData = this.network.offline || (filter && filter.synchronizationStatus && filter.synchronizationStatus !== 'SYNC') || false;
    if (offlineData) {
      return this.loadAllLocally(offset, size, sortBy, sortDirection, filter, opts);
    }

    return super.loadAll(offset, size, sortBy, sortDirection, filter, opts);
  }

  async loadAllLocally(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: Partial<TripFilter>,
    opts?: EntityServiceLoadOptions & {
      query?: any;
      debug?: boolean;
      withTotal?: boolean;
    }
  ): Promise<LoadResult<Trip>> {
    filter = this.asFilter(filter);

    const variables = {
      offset: offset || 0,
      size: size >= 0 ? size : 1000,
      sortBy: (sortBy !== 'id' && sortBy) || (opts && opts.trash ? 'updateDate' : 'endDateTime'),
      sortDirection: sortDirection || (opts && opts.trash ? 'desc' : 'asc'),
      trash: (opts && opts.trash) || false,
      filter: filter.asFilterFn(),
    };

    const res = await this.entities.loadAll<Trip>('TripVO', variables, { fullLoad: opts && opts.fullLoad });
    const entities = !opts || opts.toEntity !== false ? (res.data || []).map((json) => this.fromObject(json)) : ((res.data || []) as Trip[]);

    return { data: entities, total: res.total };
  }

  /**
   * Load many trips
   *
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param dataFilter
   * @param opts
   */
  watchAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    dataFilter?: Partial<TripFilter>,
    opts?: TripWatchOptions
  ): Observable<LoadResult<Trip>> {
    // Load offline
    const offline = this.network.offline || (dataFilter && dataFilter.synchronizationStatus && dataFilter.synchronizationStatus !== 'SYNC') || false;
    if (offline) {
      return this.watchAllLocally(offset, size, sortBy, sortDirection, dataFilter, opts);
    }

    dataFilter = this.asFilter(dataFilter);

    const variables: any = {
      offset: offset || 0,
      size: size || 20,
      sortBy: sortBy || (opts && opts.trash ? 'updateDate' : this.defaultSortBy),
      sortDirection: sortDirection || (opts && opts.trash ? 'desc' : this.defaultSortDirection),
      trash: opts?.trash || false,
      filter: dataFilter?.asPodObject(),
    };

    let now = this._debug && Date.now();
    if (this._debug) console.debug('[trip-service] Watching trips... using options:', variables);

    const withTotal = !opts || opts.withTotal !== false;
    const query = opts?.query || (withTotal ? this.queries.loadAllWithTotal : this.queries.loadAll);

    // fix sort by
    if (sortBy === 'recorderPerson') {
      sortBy = 'recorderPerson.lastName';
    }

    return this.mutableWatchQuery<LoadResult<Trip>>({
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
        const entities = !opts || opts.toEntity !== false ? (data || []).map((json) => this.fromObject(json)) : ((data || []) as Trip[]);

        if (now) {
          console.debug(`[trip-service] Loaded {${entities.length || 0}} trips in ${Date.now() - now}ms`, entities);
          now = undefined;
        }
        return { data: entities, total };
      })
    );
  }

  watchAllLocally(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    dataFilter?: Partial<TripFilter>,
    options?: TripWatchOptions
  ): Observable<LoadResult<Trip>> {
    dataFilter = this.asFilter(dataFilter);
    const variables: any = {
      offset: offset || 0,
      size: size || 20,
      sortBy: sortBy || 'departureDateTime',
      sortDirection: sortDirection || 'asc',
      trash: (options && options.trash) || false,
      filter: dataFilter && dataFilter.asFilterFn(),
    };

    if (this._debug) console.debug('[trip-service] Watching local trips... using options:', variables);

    return this.entities.watchAll<Trip>(Trip.TYPENAME, variables).pipe(
      map((res) => {
        const data = ((res && res.data) || []).map(Trip.fromObject);
        const total = res && isNotNil(res.total) ? res.total : undefined;
        return { data, total };
      })
    );
  }

  countAll(dataFilter?: Partial<TripFilter>, opts?: EntityServiceLoadOptions<Trip>): Promise<number> {
    // Load offline
    const offline = this.network.offline || (dataFilter && dataFilter.synchronizationStatus && dataFilter.synchronizationStatus !== 'SYNC') || false;
    if (offline) {
      return this.countAllLocally(dataFilter, opts);
    }

    return super.countAll(dataFilter, opts);
  }

  async countAllLocally(dataFilter?: Partial<TripFilter>, opts?: EntityServiceLoadOptions<Trip>): Promise<number> {
    return (await this.loadAllLocally(0, 0, null, null, dataFilter, { ...opts, withTotal: true }))?.total || 0;
  }

  async load(id: number, opts?: TripLoadOptions): Promise<Trip | null> {
    if (isNil(id)) throw new Error("Missing argument 'id'");

    // use landedTrip option if itself or withOperationGroups is present in service options
    const isLandedTrip = opts && (opts.isLandedTrip || opts.withOperationGroup);
    const isLocalTrip = id < 0;

    const now = this._debug && Date.now();
    if (this._debug) console.debug(`[trip-service] Loading trip #${id}...`);
    this.loading = true;

    try {
      let source: any;

      // If local entity
      if (isLocalTrip) {
        source = await this.entities.load<Trip>(id, Trip.TYPENAME, opts);
        if (!source) throw { code: DataErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR' };
      } else {
        const query = isLandedTrip ? TripQueries.loadLandedTrip : TripQueries.load;

        // Load remotely
        const { data } = await this.graphql.query<{ data: Trip }>({
          query,
          variables: { id },
          error: { code: DataErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR' },
          fetchPolicy: (opts && opts.fetchPolicy) || undefined,
        });
        source = data;
      }

      // Add operations
      if (opts?.withOperation) {
        source = { ...source }; // Copy because remote object is not extensible

        const { data } = await this.operationService.loadAllByTrip(
          { tripId: id },
          {
            fetchPolicy: (!isLocalTrip && 'network-only') || undefined,
            fullLoad: isLocalTrip,
          }
        );
        source.operations = isLocalTrip
          ? data
          : // Full load entities remotely
            await Promise.all(
              data.map(async (lightOperation) => {
                const fullOperation = await this.operationService.load(lightOperation.id);
                fullOperation.rankOrder = lightOperation.rankOrder; // Restore the computed rankOrder
                return fullOperation;
              })
            );
      }

      // Transform to entity
      const target = !opts || opts.toEntity !== false ? Trip.fromObject(source) : (source as Trip);

      if (target && this._debug) console.debug(`[trip-service] Trip #${id} loaded in ${Date.now() - now}ms`, target);
      return target;
    } finally {
      this.loading = false;
    }
  }

  async hasOfflineData(): Promise<boolean> {
    const result = await super.hasOfflineData();
    if (result) return result;

    const res = await this.entities.loadAll(Trip.TYPENAME, {
      offset: 0,
      size: 0,
    });
    return res && res.total > 0;
  }

  listenChanges(id: number, opts?: EntityServiceListenChangesOptions): Observable<Trip> {
    if (isNil(id)) throw new Error("Missing argument 'id' ");

    if (EntityUtils.isLocalId(id)) {
      if (this._debug) console.debug(this._logPrefix + `Listening for local changes on ${this._logTypeName} {${id}}...`);
      return this.entities.watchAll<Trip>(Trip.TYPENAME, { offset: 0, size: 1, filter: (t) => t.id === id }).pipe(
        map(({ data }) => {
          const json = isNotEmptyArray(data) && data[0];
          const entity = !opts || opts.toEntity !== false ? this.fromObject(json) : json;
          // Set an updateDate, to force update detection
          if (entity && this._debug) console.debug(this._logPrefix + `${this._logTypeName} {${id}} updated locally !`, entity);
          return entity;
        })
      );
    }

    return super.listenChanges(id, opts);
  }

  /**
   * Save many trips
   *
   * @param entities
   * @param opts
   */
  async saveAll(entities: Trip[], opts?: TripSaveOptions): Promise<Trip[]> {
    if (isEmptyArray(entities)) return entities;

    if (this._debug) console.debug(`[trip-service] Saving ${entities.length} trips...`);
    const jobsFactories = (entities || []).map((entity) => () => this.save(entity, { ...opts }));
    const result = await chainPromises<Trip>(jobsFactories);
    this.onSave.next(result);
    return result;
  }

  /**
   * Save many trips locally
   *
   * @param entities
   * @param opts
   */
  async saveAllLocally(entities: Trip[], opts?: TripSaveOptions): Promise<Trip[]> {
    if (!entities) return entities;

    if (this._debug) console.debug(`[landing-service] Saving ${entities.length} trips locally...`);
    const jobsFactories = (entities || []).map((entity) => () => this.saveLocally(entity, { ...opts }));
    return chainPromises<Trip>(jobsFactories);
  }

  /**
   * Save a trip
   *
   * @param entity
   * @param opts
   */
  async save(entity: Trip, opts?: TripSaveOptions): Promise<Trip> {
    // If is a local entity: force a local save
    if (RootDataEntityUtils.isLocal(entity)) {
      entity.updateDate = DateUtils.moment(); // Set a local time (need be EntityEditor.listenChanges())
      return this.saveLocally(entity, opts);
    }

    opts = {
      withLanding: false,
      withOperation: false,
      withOperationGroup: false,
      ...opts,
    };

    const now = Date.now();
    if (this._debug) console.debug('[trip-service] Saving trip...', entity);

    // Prepare to save
    this.fillDefaultProperties(entity);

    // Reset quality properties
    this.resetQualityProperties(entity);

    // Provide an optimistic response, if connection lost
    const offlineResponse =
      !opts || opts.enableOptimisticResponse !== false
        ? async (context) => {
            // Make sure to fill id, with local ids
            await this.fillOfflineDefaultProperties(entity);

            // For the query to be tracked (see tracked query link) with a unique serialization key
            context.tracked = !entity.synchronizationStatus || entity.synchronizationStatus === 'SYNC';
            if (isNotNil(entity.id)) context.serializationKey = `${Trip.TYPENAME}:${entity.id}`;

            return {
              data: [this.asObject(entity, SERIALIZE_FOR_OPTIMISTIC_RESPONSE)],
            };
          }
        : undefined;

    // Transform into json
    const json = this.asObject(entity, SAVE_AS_OBJECT_OPTIONS);
    if (this._debug) console.debug('[trip-service] Using minify object, to send:', json);

    const variables = {
      data: json,
      options: {
        withLanding: opts.withLanding,
        withOperation: opts.withOperation,
        withOperationGroup: opts.withOperationGroup,
      },
    };
    const mutation = opts.withLanding || opts.withOperationGroup ? TripMutations.saveLandedTrip : this.mutations.save;
    await this.graphql.mutate<{ data: any }>({
      mutation,
      variables,
      offlineResponse,
      refetchQueries: this.getRefetchQueriesForMutation(opts),
      awaitRefetchQueries: opts && opts.awaitRefetchQueries,
      error: { code: DataErrorCodes.SAVE_ENTITY_ERROR, message: 'ERROR.SAVE_ENTITY_ERROR' },
      update: async (cache, { data }, options) => {
        const savedEntity = data && data.data;

        // Local entity (optimistic response): save it
        if (savedEntity.id < 0) {
          if (this._debug) console.debug('[trip-service] [offline] Saving trip locally...', savedEntity);

          // Save response locally
          await this.entities.save<Trip>(savedEntity);
        }

        // Update the entity and update GraphQL cache
        else {
          // Remove existing entity from the local storage
          if (entity.id < 0 && (savedEntity.id > 0 || savedEntity.updateDate)) {
            if (this._debug) console.debug(`[trip-service] Deleting trip {${entity.id}} from local storage`);
            await this.entities.delete(entity);

            try {
              // Remove linked operations
              if (opts && opts.withOperation) {
                await this.operationService.deleteAllLocallyByFilter({ tripId: entity.id });
              }
            } catch (err) {
              console.error(`[trip-service] Failed to locally delete operations of trip {${entity.id}}`, err);
            }
          }

          // Copy id and update Date
          this.copyIdAndUpdateDate(savedEntity, entity, opts);

          // Insert into the cache
          if (RootDataEntityUtils.isNew(entity) && this.watchQueriesUpdatePolicy === 'update-cache') {
            this.insertIntoMutableCachedQueries(cache, {
              queries: this.getLoadQueries(),
              data: savedEntity,
            });
          }

          if (opts?.update) {
            opts.update(cache, { data }, options);
          }

          if (this._debug) console.debug(`[trip-service] Trip saved remotely in ${Date.now() - now}ms`, entity);
        }
      },
    });

    if (!opts || opts.emitEvent !== false) {
      this.onSave.next([entity]);
    }
    return entity;
  }

  async saveLocally(entity: Trip, opts?: TripSaveOptions): Promise<Trip> {
    if (entity.id >= 0) throw new Error('Must be a local entity');
    opts = {
      withLanding: false,
      withOperation: false,
      withOperationGroup: false,
      ...opts,
    };

    this.fillDefaultProperties(entity);

    // Reset quality properties
    this.resetQualityProperties(entity);

    // Make sure to fill id, with local ids
    await this.fillOfflineDefaultProperties(entity);

    // Reset synchro status
    entity.synchronizationStatus = SynchronizationStatusEnum.DIRTY;

    // Extract operations (saved just after)
    const operations = entity.operations;
    delete entity.operations;

    // Extract landing (saved just after)
    const landing = entity.landing;
    delete entity.landing;

    const jsonLocal = this.asObject(entity, { ...MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE, batchAsTree: false });
    if (this._debug) console.debug('[trip-service] [offline] Saving trip locally...', jsonLocal);

    // Save trip locally
    await this.entities.save(jsonLocal, { entityName: Trip.TYPENAME });

    // Save operations
    if (opts.withOperation && isNotEmptyArray(operations)) {
      // Link to physical gear id, using the rankOrder
      operations.forEach((o) => {
        o.id = null; // Clean ID, to force new ids
        o.updateDate = undefined;
        o.physicalGear = o.physicalGear && (entity.gears || []).find((g) => g.rankOrder === o.physicalGear.rankOrder);
        o.tripId = entity.id;
        o.vesselId = entity.vesselSnapshot?.id;
        o.programLabel = entity.program?.label;
      });

      // TODO: need to pass opts.trip ??
      entity.operations = await this.operationService.saveAll(operations, { tripId: entity.id, trip: entity });
    }

    if (opts.withLanding && landing) {
      entity.landing = landing;
      entity.landing.tripId = entity.id;
      entity.landing.observedLocationId = entity.observedLocationId;
      entity.landing.program = entity.program;
      entity.landing.vesselSnapshot = entity.vesselSnapshot;
      entity.landing.dateTime = entity.returnDateTime;
      entity.landing.observers = entity.observers;
      entity.landing.observedLocationId = entity.observedLocationId;
    }

    this.onSave.next([entity]);
    return entity;
  }

  async synchronize(entity: Trip, opts?: TripSaveOptions): Promise<Trip> {
    const isLandedTrip = isNotNil(entity.observedLocationId);
    opts = {
      withOperation: !isLandedTrip, // True by default
      withLanding: isLandedTrip && !!entity.landing,
      withOperationGroup: isLandedTrip,
      enableOptimisticResponse: false, // Optimistic response not need
      ...opts,
    };

    const localId = entity.id;
    if (isNil(localId) || localId >= 0) {
      throw new Error('Entity must be a local entity');
    }
    if (this.network.offline) {
      throw new Error('Cannot synchronize: app is offline');
    }

    // Clone (to keep original entity unchanged)
    entity = entity instanceof Entity ? entity.clone() : entity;
    entity.synchronizationStatus = 'SYNC';
    entity.id = undefined;

    const firstPassOperations: Operation[] = [];
    const childOperationsWithLocalParent: Operation[] = [];
    const parentOperationsWithLocalChild: Operation[] = [];

    if (opts.withOperation) {
      // Fill operations
      const { data: operations } = await this.operationService.loadAllByTrip({ tripId: +localId }, { fullLoad: true, computeRankOrder: false });

      //sort operations to saving in good order
      if (isNotEmptyArray(operations)) {
        operations.forEach((operation) => {
          if (operation.parentOperationId && operation.parentOperationId < 0) {
            childOperationsWithLocalParent.push(operation);
          } else if (operation.childOperationId && operation.childOperationId < 0) {
            parentOperationsWithLocalChild.push(operation);
          } else {
            // Can save this operation in the first pass (will be saved with the trip)
            firstPassOperations.push(operation);
          }
        });

        // Clean gears, to keep only :
        // - gears set manually, and not automatically (e.g. getOrAddGear() will marked as TEMPORARY)
        // - OR used gears
        entity.gears = (entity.gears || []).filter(
          (physicalGear) =>
            physicalGear.synchronizationStatus !== SynchronizationStatusEnum.TEMPORARY ||
            // IF temporary: check if used by an operation
            operations.some((o) => o.physicalGear.id === physicalGear.id)
        );
      }

      // Check no child operation without a local parent outside this trip
      if (childOperationsWithLocalParent.some((child) => !parentOperationsWithLocalChild.some((parent) => parent.id === child.parentOperationId))) {
        throw new Error('ERROR.SYNCHRONIZE_CHILD_BEFORE_PARENT_ERROR');
      }

      // Excludes operations that cannot be saved in the first pass
      entity.operations = firstPassOperations;
    }

    let packets;
    let expectedSaleProducts;

    if (opts.withOperationGroup) {
      // Remove local ids.
      packets = entity.operationGroups.reduce((res, operationGroup) => {
        operationGroup.id = undefined;
        operationGroup.packets.forEach((packet) => {
          res = res.concat([packet.clone()]);
          packet.id = undefined;
        });
        return res;
      }, []);

      //packet ids are needed to save expected sale product => it will be save later.
      expectedSaleProducts = entity.expectedSale.products;
      entity.expectedSale.products = [];
    }

    try {
      // Save trip (and operations or operation groups)
      entity = await this.save(entity, opts);

      // Check return entity has a valid id
      if (isNil(entity.id) || entity.id < 0) {
        throw { code: DataErrorCodes.SYNCHRONIZE_ENTITY_ERROR };
      }

      if (!opts || opts.emitEvent !== false) {
        this.onSynchronize.next({ localId, remoteEntity: entity });
      }
    } catch (err) {
      throw {
        ...err,
        code: DataErrorCodes.SYNCHRONIZE_ENTITY_ERROR,
        message: 'ERROR.SYNCHRONIZE_ENTITY_ERROR',
        context: entity.asObject(MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE),
      };
    }

    // Operations: second save to save parent then child
    if (opts.withOperation) {
      const parentOperationsByLocalId = splitById(parentOperationsWithLocalChild);
      const parentOperationsByChildLocalId = splitByProperty(parentOperationsWithLocalChild, 'childOperationId');

      // Save parent operations with a local child
      if (isNotEmptyArray(parentOperationsWithLocalChild)) {
        parentOperationsWithLocalChild.forEach((o) => (o.tripId = entity.id));
        await this.operationService.saveAll(parentOperationsWithLocalChild, { trip: entity });
      }

      // Update child with the remote parent id, then save it
      if (isNotEmptyArray(childOperationsWithLocalParent)) {
        childOperationsWithLocalParent.forEach((child) => {
          child.tripId = entity.id;
          const savedParent = parentOperationsByLocalId[child.parentOperationId];
          child.parentOperationId = savedParent.id;
          child.parentOperation = null;
          // remove from the maps
          delete parentOperationsByLocalId[child.parentOperationId];
          delete parentOperationsByChildLocalId[child.id];
        });
        await this.operationService.saveAll(childOperationsWithLocalParent, { trip: entity });
        // Add to entity operations
        entity.operations = [...entity.operations, ...childOperationsWithLocalParent];
      }

      // If still have some parent in the map, it means that their child are local, BUT in another trip
      // => Update outdated link to parent (replace local id by the remote id)
      const parentOperationLocalIdsWithoutChild = Object.keys(parentOperationsByLocalId).map((id) => +id);
      if (isNotEmptyArray(parentOperationLocalIdsWithoutChild)) {
        const localChildOperations = await Promise.all(
          Object.keys(parentOperationsByChildLocalId)
            .map((id) => +id)
            .map((childLocalId) => this.operationService.load(childLocalId, { fullLoad: true }))
        );
        const localChildOperationsToUpdate = localChildOperations
          .map((child) => {
            const parent = parentOperationsByLocalId[child.parentOperationId];
            if (!parent) return; // Skip if parent not found (e.g. changed without updating the parent operation)
            child.parentOperationId = parent.id;
            child.parentOperation = null; // Clean cache
            return child;
          })
          .filter(isNotNil);
        await this.operationService.saveAll(localChildOperationsToUpdate);
      }
    }

    // OperationGroups: Second save is only needed when expectedSale has some products
    if (opts.withOperationGroup && expectedSaleProducts) {
      const savedPackets = entity.operationGroups.reduce((res, operationGroup) => res.concat(operationGroup.packets), []);

      entity.expectedSale.products = expectedSaleProducts;

      savedPackets.forEach((savedPacket) => {
        const localPacket = packets.find((packet) => savedPacket.equals(packet));

        if (localPacket) {
          const product = entity.expectedSale.products.find((p) => p.batchId === localPacket.id);
          if (product) {
            product.batchId = savedPacket.id;
          }
        }
      });

      try {
        entity = await this.save(entity, opts);
      } catch (err) {
        console.error(`[trip-service] Failed to locally re save trip {${entity.id}} for expectedSale`, err);
        // Continue
      }
    }

    // Clean local trip
    try {
      if (this._debug) console.debug(`[trip-service] Deleting trip {${entity.id}} from local storage`);

      // Delete trip's operations
      if (opts.withOperation) {
        await this.operationService.deleteAllLocallyByFilter({ tripId: +localId });
      }

      // Delete trip
      await this.entities.deleteById(localId, { entityName: Trip.TYPENAME });
    } catch (err) {
      console.error(`[trip-service] Failed to locally delete trip {${entity.id}} and its operations`, err);
      // Continue
    }

    // Importing historical data (need to get parent operation in the local storage)
    try {
      const offlineFilter = this.settings.getOfflineFeature<TripSynchroImportFilter>(this.featureName)?.filter;
      const filter = TripSynchroImportFilter.toTripFilter(offlineFilter || {});

      // Force the data program, because user can fill data on many programs (e.g. PIFIL and ACOST) but have configured only once for offline data importation
      filter.program = entity.program;

      // Force the vessel
      filter.vesselId = toNumber(entity.vesselSnapshot?.id, filter.vesselId);

      // Prepare the start/end date
      if (offlineFilter?.periodDuration > 0 && offlineFilter.periodDurationUnit) {
        filter.startDate = DateUtils.moment()
          .utc(false)
          .startOf('day') // Reset time
          .add(-1 * offlineFilter.periodDuration, offlineFilter.periodDurationUnit); // Subtract the period, from now
      } else {
        filter.startDate = null;
      }
      // Make sure the period include the actual trip
      filter.startDate = DateUtils.min(entity.departureDateTime.clone().utc(false).startOf('day'), filter.startDate);
      filter.endDate = null;

      // Run importation
      await this.importHistoricalData(filter, {});
    } catch (err) {
      console.error(`[trip-service] Failed to import historical data`, err);
      // Continue, after warn
      this.showToast({ message: 'WARNING.SYNCHRONIZE_NO_HISTORICAL_DATA', type: 'warning' });
    }

    // Clear page history
    try {
      // FIXME: find a way o clean only synchronized data ?
      await this.settings.clearPageHistory();
    } catch (err) {
      /* Continue */
    }

    return entity;
  }

  /**
   * Control the validity of an trip
   *
   * @param entity
   * @param opts
   */
  async control(entity: Trip, opts?: TripControlOptions): Promise<AppErrorWithDetails> {
    const now = this._debug && Date.now();

    const maxProgression = toNumber(opts?.maxProgression, 100);
    opts = { ...opts, maxProgression };
    opts.progression = opts.progression || new ProgressionModel({ total: maxProgression });

    const progressionStep = maxProgression / 20;
    if (this._debug) console.debug(`[trip-service] Control {${entity.id}}...`, entity);

    const programLabel = (entity.program && entity.program.label) || null;
    if (!programLabel) throw new Error("Missing trip's program. Unable to control the trip");
    const program = await this.programRefService.loadByLabel(programLabel);

    const form = this.validatorService.getFormGroup(entity, {
      ...opts,
      program,
      isOnFieldMode: false, // Always disable 'on field mode'
      withMeasurements: true, // Need by full validation
    });

    if (!form.valid) {
      // Wait end of validation (e.g. async validators)
      await AppFormUtils.waitWhilePending(form);

      // Get form errors
      if (form.invalid) {
        const errors = AppFormUtils.getFormErrors(form);
        console.info(`[trip-service] Control #${entity.id} [INVALID] in ${Date.now() - now}ms`, errors);
        return {
          message: 'COMMON.FORM.HAS_ERROR',
          details: {
            errors,
          },
        };
      }
    }

    if (opts?.progression) opts.progression.increment(progressionStep);

    // If trip is valid: continue
    if (!opts || !opts.withOperationGroup) {
      // Control physical gears
      // FIXME remove this 'if' special case for APASE - this is a workaround for issue #409
      if (programLabel !== 'APASE') {
        const errors = await this.physicalGearService.controlAllByTrip(entity, {
          program,
          progression: opts?.progression,
          maxProgression: progressionStep,
        });

        if (errors) {
          return {
            message: 'TRIP.ERROR.INVALID_GEARS',
            details: {
              errors: {
                gears: errors,
              },
            },
          };
        }
      }

      // Control operations
      if (!opts || !opts.withOperationGroup) {
        const errors = await this.operationService.controlAllByTrip(entity, {
          program,
          progression: opts?.progression,
          maxProgression: maxProgression - progressionStep * 2,
        });
        if (errors) {
          return {
            message: 'TRIP.ERROR.INVALID_OPERATIONS',
            details: {
              errors: {
                operations: errors,
              },
            },
          };
        }
      }
    }

    if (this._debug) console.debug(`[trip-service] Control trip {${entity.id}} [OK] in ${Date.now() - now}ms`);

    return undefined;
  }

  async delete(data: Trip): Promise<any> {
    if (!data) return; // skip
    await this.deleteAll([data]);
  }

  /**
   * Delete many trips
   *
   * @param entities
   * @param opts
   */
  async deleteAll(
    entities: Trip[],
    opts?: {
      trash?: boolean; // True by default
    }
  ): Promise<any> {
    // Delete local entities
    const localEntities = entities?.filter(RootDataEntityUtils.isLocal);
    if (isNotEmptyArray(localEntities)) {
      return this.deleteAllLocally(localEntities, opts);
    }

    const remoteEntities = entities && entities.filter((t) => t.id >= 0);
    const ids = remoteEntities && remoteEntities.map((t) => t.id);
    if (isEmptyArray(ids)) return; // stop if empty

    const now = Date.now();
    if (this._debug) console.debug(`[trip-service] Deleting trips ids: {${ids.join(',')}`);

    await this.graphql.mutate<any>({
      mutation: this.mutations.deleteAll,
      variables: { ids },
      update: (proxy) => {
        // Update the cache
        this.removeFromMutableCachedQueriesByIds(proxy, {
          queryNames: ['loadAll', 'loadAllWithTotal'],
          ids,
        });

        if (this._debug) console.debug(`[trip-service] Trips deleted remotely in ${Date.now() - now}ms`);
        this.onDelete.next(remoteEntities);
      },
    });
  }

  /**
   * Delete many local entities
   *
   * @param entities
   * @param opts
   */
  async deleteAllLocally(
    entities: Trip[],
    opts?: {
      trash?: boolean; // True by default
    }
  ): Promise<any> {
    // Get local entities
    const localEntities = entities?.filter(RootDataEntityUtils.isLocal);

    // Delete, one by one
    await chainPromises((localEntities || []).map((entity) => () => this.deleteLocally(entity, opts)));
  }

  async deleteLocallyById(
    id: number,
    opts?: {
      trash?: boolean; // True by default
    }
  ): Promise<any> {
    const trip = await this.load(id);
    return this.deleteLocally(trip, opts);
  }

  async deleteLocally(
    entity: Trip,
    opts?: {
      trash?: boolean; // True by default
    }
  ): Promise<any> {
    const trash = !opts || opts?.trash !== false;
    const trashUpdateDate = trash && moment();
    if (this._debug) console.debug(`[trip-service] Deleting trip #${entity.id}... {trash: ${trash}`);

    try {
      // Load trip's operations
      const res = await this.operationService.loadAllByTrip({ tripId: entity.id }, { fullLoad: true, computeRankOrder: false });
      const operations = res && res.data;

      await this.entities.delete(entity, { entityName: Trip.TYPENAME });
      this.onDelete.next([entity]);

      if (isNotNil(operations)) {
        await this.operationService.deleteAll(operations, { trash: false });
      }

      if (trash) {
        // Fill trip's operation, before moving it to trash
        entity.operations = operations;

        const json = entity.asObject({ ...MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE, keepLocalId: false });

        // Force the updateDate
        json.updateDate = trashUpdateDate;

        // Add to trash
        await this.entities.saveToTrash(json, { entityName: Trip.TYPENAME });
      }
    } catch (err) {
      console.error('Error during trip deletion: ', err);
      throw { code: DataErrorCodes.DELETE_ENTITY_ERROR, message: 'ERROR.DELETE_ENTITY_ERROR' };
    }
    this.onDelete.next([entity]);
  }

  /**
   * Copy entities (local or remote) to the local storage
   *
   * @param entities
   * @param opts
   */
  copyAllLocally(entities: Trip[], opts?: TripServiceCopyOptions): Promise<Trip[]> {
    return chainPromises(entities.map((source) => () => this.copyLocally(source, opts)));
  }

  async copyLocallyById(id: number, opts?: TripLoadOptions & { displaySuccessToast?: boolean }): Promise<Trip> {
    const isLocalTrip = id < 0;

    // Load existing data
    const source = await this.load(id, { ...opts, fetchPolicy: 'network-only' });

    // Add operations
    if (!opts || opts.withOperation !== false) {
      const { data } = await this.operationService.loadAllByTrip(
        { tripId: id },
        {
          fetchPolicy: (!isLocalTrip && 'network-only') || undefined,
          fullLoad: isLocalTrip,
        }
      );

      source.operations = isLocalTrip
        ? data
        : // Full load entities remotely
          await Promise.all(data.map((lightOperation) => this.operationService.load(lightOperation.id)));
    }

    // Copy remote trip to local storage
    const target = await this.copyLocally(source, opts);

    return target;
  }

  /**
   * Copy an entity (local or remote) to the local storage
   *
   * @param source
   * @param opts
   */
  async copyLocally(source: Trip, opts?: TripServiceCopyOptions): Promise<Trip> {
    console.debug('[trip-service] Copy trip locally...', source);

    opts = {
      keepRemoteId: false,
      deletedFromTrash: false,
      withOperation: true, // Change default value to 'true'
      withOperationGroup: true, // Change default value to 'true'
      ...opts,
    };
    const isLocal = RootDataEntityUtils.isLocal(source);

    // Create a new entity (without id and updateDate)
    const json = this.asObject(source, { ...COPY_LOCALLY_AS_OBJECT_OPTIONS, keepRemoteId: opts.keepRemoteId });
    json.synchronizationStatus = SynchronizationStatusEnum.DIRTY; // To make sure it will be saved locally

    // Save
    const target = await this.saveLocally(Trip.fromObject(json), opts);

    // Remove from the local trash
    if (opts.deletedFromTrash) {
      if (isLocal) {
        await this.entities.deleteFromTrash(source, { entityName: Trip.TYPENAME });
      } else {
        await this.trashRemoteService.delete(Trip.ENTITY_NAME, source.id);
      }
    }

    if (opts.displaySuccessToast) {
      await this.showToast({ message: 'SOCIAL.USER_EVENT.INFO.COPIED_LOCALLY', type: 'info' });
    }

    return target;
  }

  copyIdAndUpdateDate(source: Trip | undefined, target: Trip, opts?: TripSaveOptions) {
    if (!source) return;

    // Update (id and updateDate)
    super.copyIdAndUpdateDate(source, target);

    // Update parent link
    target.observedLocationId = source.observedLocationId;
    if (opts && opts.withLanding && source.landing && target.landing) {
      EntityUtils.copyIdAndUpdateDate(source.landing, target.landing);
    }

    // Update sale
    if (source.sale && target.sale) {
      EntityUtils.copyIdAndUpdateDate(source.sale, target.sale);
      RootDataEntityUtils.copyControlAndValidationDate(source.sale, target.sale);

      // For a landedTrip with operationGroups, copy directly sale's product, a reload must be done after service call
      if (opts && opts.withLanding && source.sale.products) {
        target.sale.products = source.sale.products;
      }
    }

    // Update fishing areas
    if (target.fishingAreas && source.fishingAreas) {
      target.fishingAreas.forEach((entity) => {
        const savedFishingArea = source.fishingAreas.find((f) => entity.equals(f));
        EntityUtils.copyIdAndUpdateDate(savedFishingArea, entity);
      });
    }

    // Update gears (recursively)
    if (target.gears && source.gears) {
      this.copyIdAndUpdateDateOnGears(source.gears, target.gears, source);
    }

    // Update measurements
    if (target.measurements && source.measurements) {
      target.measurements.forEach((entity) => {
        const savedMeasurement = source.measurements.find((m) => entity.equals(m));
        EntityUtils.copyIdAndUpdateDate(savedMeasurement, entity);
      });
    }

    // Update operation groups
    if (source.operationGroups && target.operationGroups && opts && opts.withOperationGroup) {
      target.operationGroups.forEach((targetOperationGroup) => {
        const sourceOperationGroup = source.operationGroups.find((json) => targetOperationGroup.equals(json));
        EntityUtils.copyIdAndUpdateDate(sourceOperationGroup, targetOperationGroup);

        targetOperationGroup.physicalGearId = sourceOperationGroup.physicalGearId;

        // Operation group's measurements
        if (sourceOperationGroup && sourceOperationGroup.measurements && targetOperationGroup.measurements) {
          targetOperationGroup.measurements.forEach((targetMeasurement) => {
            const sourceMeasurement = sourceOperationGroup.measurements.find((m) => targetMeasurement.equals(m));
            EntityUtils.copyIdAndUpdateDate(sourceMeasurement, targetMeasurement);
          });
        }

        // Operation group's products
        if (sourceOperationGroup && sourceOperationGroup.products && targetOperationGroup.products) {
          targetOperationGroup.products.forEach((targetProduct) => {
            const sourceProduct = sourceOperationGroup.products.find((json) => targetProduct.equals(json));
            EntityUtils.copyIdAndUpdateDate(sourceProduct, targetProduct);
          });
        }

        // Operation group's samples (recursively)
        if (sourceOperationGroup && sourceOperationGroup.samples && targetOperationGroup.samples) {
          this.copyIdAndUpdateDateOnSamples(sourceOperationGroup.samples, targetOperationGroup.samples);
        }

        // Operation group's packets
        if (sourceOperationGroup && sourceOperationGroup.packets && targetOperationGroup.packets) {
          targetOperationGroup.packets.forEach((targetPacket) => {
            const sourcePacket = sourceOperationGroup.packets.find((json) => targetPacket.equals(json));
            EntityUtils.copyIdAndUpdateDate(sourcePacket, targetPacket);

            // Packet's compositions
            if (sourcePacket && sourcePacket.composition && targetPacket.composition) {
              targetPacket.composition.forEach((targetComposition) => {
                const sourceComposition = sourcePacket.composition.find((json) => targetComposition.equals(json));
                EntityUtils.copyIdAndUpdateDate(sourceComposition, targetComposition);
              });
            }
          });
        }
      });
    }
  }

  /**
   * Copy Id and update, in gear tree (recursively)
   *
   * @param sources
   * @param targets
   */
  protected copyIdAndUpdateDateOnGears(sources: (PhysicalGear | any)[], targets: PhysicalGear[], savedTrip: Trip, parentGear?: PhysicalGear) {
    // DEBUG
    //console.debug("[trip-service] Calling copyIdAndUpdateDateOnGears()");

    // Update gears
    if (sources && targets) {
      // Copy source, to be able to use splice() if array is a readonly (apollo cache)
      sources = [...sources];

      targets.forEach((target) => {
        // Set the trip id (required by equals function)
        target.tripId = savedTrip.id;
        // Try to set parent id (need by equals, when new entity)
        target.parentId = parentGear?.id || target.parentId;

        const index = sources.findIndex((json) => target.equals(json));
        if (index !== -1) {
          // Remove from sources list, as it has been found
          const source = sources.splice(index, 1)[0];

          EntityUtils.copyIdAndUpdateDate(source, target);
          RootDataEntityUtils.copyControlAndValidationDate(source, target);

          // Copy parent Id (need for link to parent)
          target.parentId = source.parentId;
          target.parent = null;
        } else {
          console.warn('Missing a gear, equals to this target: ', target);
        }

        // Update children
        if (target.children?.length) {
          this.copyIdAndUpdateDateOnGears(sources, target.children, savedTrip, target);
        }
      });
    }
  }

  /***
   * Add gear on trip from a physical gear of another trip
   * (used on new child operation when parent operation come from a different trip)
   * @param tripId
   * @param entity
   */
  async getOrAddGear(tripId: number, entity: PhysicalGear): Promise<PhysicalGear> {
    const now = Date.now();
    console.info('[operation-service] Get or add physical gear...');

    try {
      // Make sure to get an entity
      entity = PhysicalGear.fromObject(entity);

      // Load the trip
      const trip = await this.load(tripId);
      if (!trip) throw new Error(`Cannot find trip #${tripId}`); // Should never occur

      // Search if entity exists in the existing gears (e.g. if was copied just before)
      const existingGear = trip.gears?.find((gear) => PhysicalGear.equals(gear, entity, { withMeasurementValues: true, withRankOrder: false }));
      if (existingGear) {
        console.info('[operation-service] Find an existing physical gear. Will use it', existingGear);
        return existingGear;
      }

      // Mark as temporary (to force to clear unused gears, in save() )
      entity.synchronizationStatus = SynchronizationStatusEnum.TEMPORARY;

      // Compute new rankOrder, according to existing gears
      // RankOrder was compute for original trip, it can be used on actual trip and needed to be re-computed
      const maxRankOrder = (trip.gears || []).map((gear) => gear.rankOrder).reduce((max, rankOrder) => Math.max(max, rankOrder), 0);
      if (isNil(entity.rankOrder) || trip.gears?.some((gear) => gear.rankOrder === entity.rankOrder)) {
        entity.rankOrder = maxRankOrder + 1;
      }

      // Add it to the trip
      trip.gears = trip.gears || [];
      trip.gears.push(entity);

      // Save the full trip
      const savedTrip = await this.save(trip);

      // Return the saved gear
      const savedEntity = savedTrip.gears.find((g) => g.rankOrder === entity.rankOrder);

      // Check that the gear has been added
      if (!savedEntity) throw new Error('Cannot find expected physical gear, in the saved trip!');

      console.info(`[operation-service] Physical gear successfully added to trip, in ${Date.now() - now}ms`);

      return savedEntity.clone();
    } catch (err) {
      console.error(`[trip⁻service] Error while adding physical gear to trip: ${(err && err.message) || err}`, err);
      throw { code: TripErrorCodes.ADD_TRIP_GEAR_ERROR, message: 'TRIP.ERROR.ADD_GEAR' };
    }
  }

  translateFormPath(path: string, opts?: { i18nPrefix?: string; i18nSuffix?: string; pmfms?: IPmfm[] }): string {
    return super.translateFormPath(path, { i18nPrefix: 'TRIP.EDIT.', ...opts });
  }

  /* -- protected methods -- */

  protected asObject(entity: Trip, opts?: DataEntityAsObjectOptions & { batchAsTree?: boolean }): any {
    opts = { ...MINIFY_OPTIONS, ...opts };
    const copy: any = entity.asObject(opts);

    // Fill return date using departure date
    copy.returnDateTime = copy.returnDateTime || copy.departureDateTime;

    // Fill return location using departure location
    if (!copy.returnLocation || !copy.returnLocation.id) {
      copy.returnLocation = { ...copy.departureLocation };
    }

    // Full json optimisation
    if (opts.minify && !opts.keepEntityName && !opts.keepTypename) {
      // Clean vessel features object, before saving
      copy.vesselSnapshot = { id: entity.vesselSnapshot && entity.vesselSnapshot.id };
    }

    return copy;
  }

  protected fillDefaultProperties(entity: Trip) {
    super.fillDefaultProperties(entity);

    if (entity.operationGroups) {
      this.fillRecorderDepartment(entity.operationGroups, entity.recorderDepartment);
      entity.operationGroups.forEach((operationGroup) => {
        this.fillRecorderDepartment(operationGroup.products, entity.recorderDepartment);
        this.fillRecorderDepartment(operationGroup.packets, entity.recorderDepartment);
      });
    }
    // todo maybe others tables ?

    // Physical gears: compute rankOrder
    fillTreeRankOrder(entity.gears);

    // Measurement: compute rankOrder
    fillRankOrder(entity.measurements);
  }

  protected async fillOfflineDefaultProperties(entity: Trip) {
    await super.fillOfflineDefaultProperties(entity);

    // Fill gear ids
    if (isNotEmptyArray(entity.gears)) {
      const gears = EntityUtils.listOfTreeToArray(entity.gears);
      await EntityUtils.fillLocalIds(gears, (_, count) => this.entities.nextValues(PhysicalGear.TYPENAME, count));
      gears.forEach((g) => {
        g.tripId = entity.id;
        // Keep existing, if already set (e.g. getOrAddGear() can set )
        g.synchronizationStatus = g.synchronizationStatus || entity.synchronizationStatus;
      });
    }

    // Fill packets ids
    if (isNotEmptyArray(entity.operationGroups)) {
      await EntityUtils.fillLocalIds(entity.operationGroups, (_, count) => this.entities.nextValues(OperationGroup.TYPENAME, count));

      const packets = entity.operationGroups.reduce((res, operationGroup) => res.concat(operationGroup.packets.filter((packet) => !packet.id)), []);

      await EntityUtils.fillLocalIds(packets, (_, count) => this.entities.nextValues(Packet.TYPENAME, count));
    }
  }

  /**
   * List of importation jobs.
   *
   * @protected
   * @param filter
   * @param opts
   */
  protected getImportJobs(
    filter: Partial<TripFilter>,
    opts: {
      maxProgression: number;
      program?: Program;
      boundingBox?: BBox;
      locationLevelIds?: number[];
      countryIds?: number[];
      entityNames?: string[];
      acquisitionLevels?: string[];
      vesselIds?: number[];
      [key: string]: any;
    }
  ): Observable<number>[] {
    const synchroFilter = this.settings.getOfflineFeature<TripSynchroImportFilter>(this.featureName)?.filter;
    filter = filter || TripSynchroImportFilter.toTripFilter(synchroFilter);
    filter = this.asFilter(filter);

    let programLabel = filter?.program?.label;
    const vesselIds = filter?.vesselIds || opts?.vesselIds;
    const operationFilter = TripFilter.toOperationFilter({ ...filter, vesselIds });
    const gearFilter = TripFilter.toPhysicalGearFilter({ ...filter, vesselIds });

    return [
      // Store program to opts, for other services (e.g. used by OperationService)
      JobUtils.defer(async (o) => {
        // No program: Try to find one (and only one) for this user
        if (isNilOrBlank(programLabel)) {
          console.warn('[trip-service] [import] Trying to find a unique program to configure the import...');
          const { data: programs, total: programCount } = await this.programRefService.loadAll(
            0,
            1,
            null,
            null,
            TRIP_FEATURE_DEFAULT_PROGRAM_FILTER,
            { fetchPolicy: 'no-cache', withTotal: true }
          );
          if (programCount === 1) {
            programLabel = programs[0]?.label;
          } else {
            console.warn(`[trip-service] [import] No unique program found, but found ${programCount} program(s)`);
          }
        }

        // No program
        if (isNilOrBlank(programLabel)) {
          console.warn('[trip-service] [import] Cannot reducing importation (no program): can be long!');
          opts.entityNames = [...IMPORT_REFERENTIAL_ENTITIES, ...WEIGHT_CONVERSION_ENTITIES];
        }

        // Fill options using program
        else {
          console.debug(`[trip-service] [import] Reducing importation to program {${programLabel}}`);
          const program = await this.programRefService.loadByLabel(programLabel, { fetchPolicy: 'network-only' });
          opts.program = program;
          opts.acquisitionLevels = ProgramUtils.getAcquisitionLevels(program);

          // Import weight conversion entities, if enable on program
          const enableWeightConversion = program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_LENGTH_WEIGHT_CONVERSION_ENABLE);
          if (enableWeightConversion) {
            console.debug('[trip-service] [import] WeightLengthConversion - import enabled (by program)');
            opts.entityNames = [...IMPORT_REFERENTIAL_ENTITIES, ...WEIGHT_CONVERSION_ENTITIES];

            // Limit round weight, to the default country location id
            const countryId = program.getPropertyAsInt(ProgramProperties.TRIP_BATCH_ROUND_WEIGHT_CONVERSION_COUNTRY_ID);
            if (isNotNilOrBlank(countryId)) {
              console.debug('[trip-service] [import] RoundWeightConversion - country id: ' + countryId);
              opts.countryIds = opts.countryIds || [];
              if (!opts.countryIds.includes(countryId)) opts.countryIds.push(countryId);
            }
          }

          // Limit locations (e.g. rectangle)
          opts.locationLevelIds = program.getPropertyAsNumbers(ProgramProperties.TRIP_OFFLINE_IMPORT_LOCATION_LEVEL_IDS);
          // Compute location levels ids, bases on known program's properties
          if (isEmptyArray(opts.locationLevelIds)) {
            opts.locationLevelIds = removeDuplicatesFromArray([
              ...program.getPropertyAsNumbers(ProgramProperties.TRIP_LOCATION_LEVEL_IDS),
              ...program.getPropertyAsNumbers(ProgramProperties.TRIP_OPERATION_FISHING_AREA_LOCATION_LEVEL_IDS),
            ]);
          }
          if (isNotEmptyArray(opts.locationLevelIds))
            console.debug('[trip-service] [import] Locations, having level ids: ' + opts.locationLevelIds.join(','));

          // Bounding box
          opts.boundingBox = Geometries.parseAsBBox(program.getProperty(ProgramProperties.TRIP_POSITION_BOUNDING_BOX));
          if (Geometries.isNotNilBBox(opts.boundingBox)) console.debug('[trip-service] [import] Bounding box: ' + opts.boundingBox.join(','));
        }

        // Vessels
        opts.vesselIds = vesselIds;
      }),

      ...super.getImportJobs(filter, opts),

      // Historical data (if enable)
      ...((operationFilter.startDate &&
        gearFilter.startDate &&
        isNotEmptyArray(vesselIds) && [
          // Import pending operations
          JobUtils.defer((o) => this.operationService.executeImport(operationFilter, o), opts),

          // Import physical gears
          JobUtils.defer((o) => this.physicalGearService.executeImport(gearFilter, o), opts),
        ]) ||
        []),
    ];
  }

  /**
   * Reimport historical gears, or pending operations (parent OP without child)
   *
   * @param filter
   * @param opts
   * @protected
   */
  protected async importHistoricalData(
    filter?: Partial<TripFilter>,
    opts?: {
      progression?: BehaviorSubject<number>;
      maxProgression?: number;
    }
  ): Promise<void> {
    const maxProgression = (opts && opts.maxProgression) || 100;
    opts = {
      maxProgression,
      ...opts,
    };
    opts.progression = opts.progression || new BehaviorSubject<number>(0);

    const offlineFilter = this.settings.getOfflineFeature<TripSynchroImportFilter>(this.featureName)?.filter;
    filter = filter || TripSynchroImportFilter.toTripFilter(offlineFilter);
    filter = this.asFilter(filter);

    const programLabel = filter?.program?.label;

    if (isNotNilOrBlank(programLabel)) {
      console.info('[trip-service] Importing historical data, from filter: ', filter);

      // Import pending operations
      const operationFilter = TripFilter.toOperationFilter(filter);
      await this.operationService.executeImport(operationFilter, {
        ...opts,
        maxProgression: maxProgression / 2,
      });

      // Import physical gears
      const gearFilter = TripFilter.toPhysicalGearFilter(filter);
      await this.physicalGearService.executeImport(gearFilter, {
        ...opts,
        maxProgression: maxProgression / 2,
      });
    }

    if (opts?.progression) opts?.progression.next(maxProgression);
  }

  /**
   * Copy Id and update, in sample tree (recursively)
   *
   * @param sources
   * @param targets
   */
  // TODO BLA: Utiliser celle de operation-servive, en la passant en public
  protected copyIdAndUpdateDateOnSamples(sources: (Sample | any)[], targets: Sample[]) {
    // Update samples
    if (sources && targets) {
      targets.forEach((target) => {
        const source = sources.find((json) => target.equals(json));
        EntityUtils.copyIdAndUpdateDate(source, target);

        // Apply to children
        if (target.children && target.children.length) {
          this.copyIdAndUpdateDateOnSamples(sources, target.children);
        }
      });
    }
  }

  protected showToast<T = any>(opts: ShowToastOptions): Promise<OverlayEventDetail<T>> {
    return Toasts.show(this.toastController, this.translate, opts);
  }

  protected finishImport() {
    super.finishImport();

    // Add vessel offline feature
    this.settings.markOfflineFeatureAsSync(VESSEL_FEATURE_NAME);
  }
}
