import {Injectable, Injector, Optional} from "@angular/core";
import {gql} from "@apollo/client/core";
import {filter, map} from "rxjs/operators";
import * as momentImported from "moment";
import {Moment} from "moment";
import {ErrorCodes} from "./trip.errors";
import {AccountService} from "../../core/services/account.service";
import {DataFragments, Fragments, OperationGroupFragment, PhysicalGearFragments, SaleFragments} from "./trip.queries";
import {GraphqlService} from "../../core/graphql/graphql.service";
import {
  COPY_LOCALLY_AS_OBJECT_OPTIONS,
  DataEntityAsObjectOptions,
  SAVE_AS_OBJECT_OPTIONS,
  SAVE_LOCALLY_AS_OBJECT_OPTIONS,
  SAVE_OPTIMISTIC_AS_OBJECT_OPTIONS
} from "../../data/services/model/data-entity.model";
import {NetworkService} from "../../core/services/network.service";
import {Observable} from "rxjs";
import {EntitiesStorage} from "../../core/services/storage/entities-storage.service";
import {Beans, isEmptyArray, isNil, isNotEmptyArray, isNotNil, KeysEnum, toNumber} from "../../shared/functions";
import {IDataEntityQualityService} from "../../data/services/data-quality-service.class";
import {OperationFilter, OperationService} from "./operation.service";
import {VesselSnapshotFragments, VesselSnapshotService} from "../../referential/services/vessel-snapshot.service";
import {ReferentialRefService} from "../../referential/services/referential-ref.service";
import {PersonService} from "../../admin/services/person.service";
import {chainPromises} from "../../shared/observables";
import {LocalSettingsService} from "../../core/services/local-settings.service";
import {TripValidatorService} from "./validator/trip.validator";
import {AppFormUtils, FormErrors} from "../../core/form/form.utils";
import {Operation, PhysicalGear, Trip} from "./model/trip.model";
import {
  DataRootEntityUtils,
  SynchronizationStatus,
  SynchronizationStatusEnum
} from "../../data/services/model/root-data-entity.model";
import {fillRankOrder} from "../../data/services/model/model.utils";
import {MINIFY_OPTIONS} from "../../core/services/model/referential.model";
import {SortDirection} from "@angular/material/sort";
import {
  EntitiesServiceWatchOptions,
  EntityServiceLoadOptions,
  FilterFn,
  IEntitiesService,
  IEntityService,
  LoadResult
} from "../../shared/services/entity-service.class";
import {UserEventService} from "../../social/services/user-event.service";
import {ShowToastOptions, Toasts} from "../../shared/toasts";
import {OverlayEventDetail} from "@ionic/core";
import {TranslateService} from "@ngx-translate/core";
import {ToastController} from "@ionic/angular";
import {TrashRemoteService} from "../../core/services/trash-remote.service";
import {TRIP_FEATURE_NAME} from "./config/trip.config";
import {IDataSynchroService, RootDataSynchroService} from "../../data/services/root-data-synchro-service.class";
import {Entity, EntityUtils} from "../../core/services/model/entity.model";
import {environment} from "../../../environments/environment";
import {fromDateISOString, toDateISOString} from 'src/app/shared/dates';
import {ProgramRefService} from "../../referential/services/program-ref.service";
import {Sample} from "./model/sample.model";

const moment = momentImported;

export const TripFragments = {
  lightTrip: gql`fragment LightTripFragment on TripVO {
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
  ${Fragments.location}
  ${Fragments.lightDepartment}
  ${Fragments.lightPerson}
  ${VesselSnapshotFragments.lightVesselSnapshot}
  ${Fragments.referential}`,

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
    departureLocation {
      ...LocationFragment
    }
    returnLocation {
      ...LocationFragment
    }
    vesselSnapshot {
      ...LightVesselSnapshotFragment
    }
    sale {
      ...LightSaleFragment
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
  }
  ${Fragments.lightDepartment}
  ${Fragments.lightPerson}
  ${Fragments.measurement}
  ${Fragments.referential}
  ${Fragments.location}
  ${VesselSnapshotFragments.lightVesselSnapshot}
  ${PhysicalGearFragments.physicalGear}
  ${Fragments.metier},
  ${SaleFragments.lightSale}`,

  landedTrip: gql`fragment LandedTripFragment on TripVO {
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
      rankOrderOnVessel
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
    sale {
      ...SaleFragment
    }
    fishingArea {
      ...FishingAreaFragment
    }
  }
  ${Fragments.lightDepartment}
  ${Fragments.lightPerson}
  ${Fragments.measurement}
  ${Fragments.referential}
  ${Fragments.location}
  ${VesselSnapshotFragments.lightVesselSnapshot}
  ${Fragments.metier}
  ${OperationGroupFragment.operationGroup}
  ${SaleFragments.sale}
  ${DataFragments.fishingArea}`
};


export class TripFilter {
  programLabel?: string;
  vesselId?: number;
  locationId?: number;
  startDate?: Date | Moment | string;
  endDate?: Date | Moment | string;
  recorderDepartmentId?: number;
  recorderPersonId?: number;
  synchronizationStatus?: SynchronizationStatus;

  static isEmpty(f: TripFilter|any): boolean {
    return Beans.isEmpty<TripFilter>({...f, synchronizationStatus: null}, TripFilterKeys, {
      blankStringLikeEmpty: true
    });
  }

  static searchFilter<T extends Trip>(f?: TripFilter): (T) => boolean {
    if (!f) return () => true;

    const filterFns: FilterFn<T>[] = [];

    // Program
    if (f.programLabel) {
      filterFns.push(t => (t.program && t.program.label === f.programLabel));
    }

    // Vessel
    if (f.vesselId) {
      filterFns.push(t => (t.vesselSnapshot && t.vesselSnapshot.id === f.vesselId));
    }

    // Location
    if (isNotNil(f.locationId)) {
      filterFns.push(t => ((t.departureLocation && t.departureLocation.id === f.locationId) || (t.returnLocation && t.returnLocation.id === f.locationId)));
    }

    // Start/end period
    const startDate = fromDateISOString(f.startDate);
    let endDate = fromDateISOString(f.endDate);
    if (startDate) {
      filterFns.push(t => t.returnDateTime ? startDate.isSameOrBefore(t.returnDateTime) : startDate.isSameOrBefore(t.departureDateTime));
    }
    if (endDate) {
      endDate = endDate.add(1, 'day').startOf('day');
      filterFns.push(t => t.departureDateTime && endDate.isAfter(t.departureDateTime));
    }

    // Recorder department
    if (isNotNil(f.recorderDepartmentId)) {
      filterFns.push(t => (t.recorderDepartment && t.recorderDepartment.id === f.recorderDepartmentId));
    }

    // Recorder person
    if (isNotNil(f.recorderPersonId)) {
      filterFns.push(t => (t.recorderPerson && t.recorderPerson.id === f.recorderPersonId));
    }

    // Synchronization status
    if (f.synchronizationStatus) {
      if (f.synchronizationStatus === 'SYNC') {
        filterFns.push(t => t.synchronizationStatus === 'SYNC' || (!t.synchronizationStatus && t.id >= 0));
      }
      else {
        filterFns.push(t => t.synchronizationStatus && t.synchronizationStatus !== 'SYNC' || t.id < 0);
      }
    }

    if (!filterFns.length) return undefined;

    return (entity) => !filterFns.find(fn => !fn(entity));
  }

  /**
   * Clean a filter, before sending to the pod (e.g remove 'synchronizationStatus')
   * @param f
   */
  static asPodObject(f?: TripFilter): any {
    if (!f) return f;
    return {
      ...f,
      // Convert dates to string
      startDate: toDateISOString(f.startDate),
      endDate: toDateISOString(f.endDate),
      // Remove fields that not exists in pod
      synchronizationStatus: undefined
    };
  }
}

export const TripFilterKeys: KeysEnum<TripFilter> = {
  programLabel: true,
  vesselId: true,
  startDate: true,
  endDate: true,
  locationId: true,
  recorderDepartmentId: true,
  recorderPersonId: true,
  synchronizationStatus: true
};

export interface TripLoadOptions extends EntityServiceLoadOptions {
  isLandedTrip?: boolean;
  withOperation?: boolean;
  withOperationGroup?: boolean;
  toEntity?: boolean;
}

export interface TripSaveOptions {
  withLanding?: boolean;
  withOperation?: boolean;
  withOperationGroup?: boolean;
  enableOptimisticResponse?: boolean; // True by default
}

export interface TripServiceCopyOptions extends TripSaveOptions {
  keepRemoteId?: boolean;
  deletedFromTrash?: boolean;
  displaySuccessToast?: boolean;
}

const TripQueries = {

  // Load a trip
  load: gql` query Trip($id: Int!) {
    data: trip(id: $id) {
      ...TripFragment
    }
  }
  ${TripFragments.trip}`,

  loadAll: gql` query Trips($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $trash: Boolean, $filter: TripFilterVOInput){
    data: trips(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, trash: $trash){
      ...LightTripFragment
    }
  }
  ${TripFragments.lightTrip}`,

  loadAllWithTotal: gql` query Trips($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $trash: Boolean, $filter: TripFilterVOInput){
    data: trips(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection, trash: $trash){
      ...LightTripFragment
    }
    total: tripsCount(filter: $filter, trash: $trash)
  }
  ${TripFragments.lightTrip}`,

  // Load a landed trip
  loadLandedTrip: gql`query Trip($id: Int!) {
    data: trip(id: $id) {
      ...LandedTripFragment
    }
  }
  ${TripFragments.landedTrip}`
};

// Save a trip
const TripMutations = {
  save: gql`mutation saveTrip($trip:TripVOInput!, $options: TripSaveOptionsInput!){
    data: saveTrip(trip: $trip, options: $options){
      ...TripFragment
    }
  }
  ${TripFragments.trip}`,

  // Save a landed trip
  saveLandedTrip: gql`mutation saveTrip($trip:TripVOInput!, $options: TripSaveOptionsInput!){
    data: saveTrip(trip: $trip, options: $options){
      ...LandedTripFragment
    }
  }
  ${TripFragments.landedTrip}`,

  // Delete
  delete: gql`mutation DeleteTrips($ids:[Int]!){
    deleteTrips(ids: $ids)
  }`,

  // Terminate
  terminate: gql`mutation ControlTrip($data:TripVOInput!){
    data: controlTrip(trip: $data){
      ...TripFragment
    }
  }
  ${TripFragments.trip}`,

  validate: gql`mutation ValidateTrip($data:TripVOInput!){
    data: validateTrip(trip: $data){
      ...TripFragment
    }
  }
  ${TripFragments.trip}`,

  qualify: gql`mutation QualifyTrip($data:TripVOInput!){
    data: qualifyTrip(trip: $data){
      ...TripFragment
    }
  }
  ${TripFragments.trip}`,

  unvalidate: gql`mutation UnvalidateTrip($data:TripVOInput!){
    data: unvalidateTrip(trip: $data){
      ...TripFragment
    }
  }
  ${TripFragments.trip}`
};

const TripSubscriptions = {
  listenChanges: gql`subscription UpdateTrip($id: Int!, $interval: Int){
    data: updateTrip(id: $id, interval: $interval) {
      ...TripFragment
    }
  }
  ${TripFragments.trip}`
};


@Injectable({providedIn: 'root'})
export class TripService
  extends RootDataSynchroService<Trip, TripFilter, TripLoadOptions>
  implements
    IEntitiesService<Trip, TripFilter>,
    IEntityService<Trip, TripLoadOptions>,
    IDataEntityQualityService<Trip>,
    IDataSynchroService<Trip, TripLoadOptions>{

  protected $importationProgress: Observable<number>;
  protected loading = false;

  constructor(
    injector: Injector,
    protected graphql: GraphqlService,
    protected network: NetworkService,
    protected accountService: AccountService,
    protected referentialRefService: ReferentialRefService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected personService: PersonService,
    protected programRefService: ProgramRefService,
    protected entities: EntitiesStorage,
    protected operationService: OperationService,
    protected settings: LocalSettingsService,
    protected validatorService: TripValidatorService,
    protected userEventService: UserEventService,
    protected trashRemoteService: TrashRemoteService,
    @Optional() private translate: TranslateService,
    @Optional() private toastController: ToastController
  ) {
    super(injector,
      Trip,
      {
        featureName: TRIP_FEATURE_NAME,
        queries: TripQueries,
        mutations: TripMutations,
        subscriptions: TripSubscriptions,
        filterAsObjectFn: TripFilter.asPodObject,
        filterFnFactory: TripFilter.searchFilter
      });

    // Register user event actions
    userEventService.registerAction({
      __typename: Trip.TYPENAME,
      matIcon: "content_copy",
      name: 'copyToLocal',
      title: 'SOCIAL.USER_EVENT.BTN_COPY_TO_LOCAL',
      color: 'primary',
      executeAction: (event, context) => this.copyLocally(Trip.fromObject(context), {displaySuccessToast: true})
    });

    // FOR DEV ONLY
    this._debug = !environment.production;
    if (this._debug) console.debug('[trip-service] Creating service');
  }

  /**
   * Load many trips
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param dataFilter
   * @param opts
   */
  watchAll(offset: number,
           size: number,
           sortBy?: string,
           sortDirection?: SortDirection,
           dataFilter?: TripFilter,
           opts?: EntitiesServiceWatchOptions ): Observable<LoadResult<Trip>> {

    // Load offline
    const offlineData = this.network.offline || (dataFilter && dataFilter.synchronizationStatus && dataFilter.synchronizationStatus !== 'SYNC') || false;
    if (offlineData) {
      return this.watchAllLocally(offset, size, sortBy, sortDirection, dataFilter, opts);
    }

    const variables: any = {
      offset: offset || 0,
      size: size || 20,
      sortBy: sortBy || 'departureDateTime',
      sortDirection: sortDirection || 'asc',
      trash: opts && opts.trash || false,
      filter: TripFilter.asPodObject(dataFilter)
    };

    let now = this._debug && Date.now();
    if (this._debug) console.debug("[trip-service] Watching trips... using options:", variables);

    const withTotal = (!opts || opts.withTotal !== false);
    const query = withTotal ? this.queries.loadAllWithTotal : this.queries.loadAll;
    return this.mutableWatchQuery<{ data: Trip[]; total: number; }>({
        queryName: 'LoadAll',
        query,
        arrayFieldName: 'data',
        totalFieldName: withTotal ? 'total' : undefined,
        insertFilterFn: TripFilter.searchFilter(dataFilter),
        variables,
        error: { code: ErrorCodes.LOAD_TRIPS_ERROR, message: "TRIP.ERROR.LOAD_TRIPS_ERROR" },
        fetchPolicy: opts && opts.fetchPolicy || 'cache-and-network'
      })
        .pipe(
          filter(() => !this.loading),
          map(({data, total}) => {
            const entities = (!opts || opts.toEntity !== false)
              ? (data || []).map((json) => this.fromObject(json))
              : (data || []) as Trip[];

            if (now) {
              console.debug(`[trip-service] Loaded {${entities.length || 0}} trips in ${Date.now() - now}ms`, entities);
              now = undefined;
            }
            return {data: entities, total};
          })
        );
  }

  watchAllLocally(offset: number,
           size: number,
           sortBy?: string,
           sortDirection?: SortDirection,
           dataFilter?: TripFilter,
           options?: EntitiesServiceWatchOptions & {
             trash?: boolean;
           }): Observable<LoadResult<Trip>> {
    const variables: any = {
      offset: offset || 0,
      size: size || 20,
      sortBy: sortBy || 'departureDateTime',
      sortDirection: sortDirection || 'asc',
      trash: options && options.trash || false,
      filter: TripFilter.searchFilter<Trip>(dataFilter)
    };

    if (this._debug) console.debug("[trip-service] Watching local trips... using options:", variables);

    return this.entities.watchAll<Trip>(Trip.TYPENAME, variables)
      .pipe(
        map(res => {
          const data = (res && res.data || []).map(Trip.fromObject);
          const total = res && isNotNil(res.total) ? res.total : undefined;
          return {data, total};
        }));
  }

  async load(id: number, opts?: TripLoadOptions): Promise<Trip | null> {
    if (isNil(id)) throw new Error("Missing argument 'id'");

    // use landedTrip option if itself or withOperationGroups is present in service options
    const isLandedTrip = opts && (opts.isLandedTrip || opts.withOperationGroup);

    const now = this._debug && Date.now();
    if (this._debug) console.debug(`[trip-service] Loading trip #${id}...`);
    this.loading = true;

    try {
      let data: any;

      // If local entity
      if (id < 0) {
        data = await this.entities.load<Trip>(id, Trip.TYPENAME);
        if (!data) throw {code: ErrorCodes.LOAD_TRIP_ERROR, message: "TRIP.ERROR.LOAD_TRIP_ERROR"};

        if (opts && opts.withOperation) {
          data.operations = await this.entities.loadAll<Operation>(Operation.TYPENAME, {
            filter: OperationFilter.searchFilter<Operation>({tripId: id})
          });
        }
      }

      else {
        const query = isLandedTrip ? TripQueries.loadLandedTrip : this.queries.load;

        // Load remotely
        const res = await this.graphql.query<{ data: Trip }>({
          query,
          variables: { id },
          error: { code: ErrorCodes.LOAD_TRIP_ERROR, message: "TRIP.ERROR.LOAD_TRIP_ERROR" },
          fetchPolicy: opts && opts.fetchPolicy || undefined
        });
        data = res && res.data;
      }

      // Transform to entity
      const entities = (!opts || opts.toEntity !== false) ? Trip.fromObject(data) : (data as Trip);

      if (entities && this._debug) console.debug(`[trip-service] Trip #${id} loaded in ${Date.now() - now}ms`, entities);
      return entities;
    }
    finally {
      this.loading = false;
    }
  }

  async hasOfflineData(): Promise<boolean> {
    const result = await super.hasOfflineData();
    if (result) return result;

    const res = await this.entities.loadAll(Trip.TYPENAME, {
      offset: 0,
      size: 0
    });
    return res && res.total > 0;
  }

  listenChanges(id: number, opts?: { interval?: number; }): Observable<Trip> {
    if (isNil(id)) throw new Error("Missing argument 'id' ");

    if (this._debug) console.debug(`[trip-service] [WS] Listening changes for trip {${id}}...`);

    return this.graphql.subscribe<{ data: any }, { id: number, interval: number }>({
      query: this.subscriptions.listenChanges,
      variables: { id, interval: toNumber(opts && opts.interval, 10) },
      error: {
        code: ErrorCodes.SUBSCRIBE_TRIP_ERROR,
        message: 'TRIP.ERROR.SUBSCRIBE_TRIP_ERROR'
      }
    })
      .pipe(
        map(({data}) => {
          const entity = data && Trip.fromObject(data);
          if (entity && this._debug) console.debug(`[trip-service] Trip {${id}} updated on server !`, entity);
          return entity;
        })
      );
  }

  /**
   * Save many trips
   * @param entities
   * @param opts
   */
  async saveAll(entities: Trip[], opts?: TripSaveOptions): Promise<Trip[]> {
    if (isEmptyArray(entities)) return entities;

    if (this._debug) console.debug(`[trip-service] Saving ${entities.length} trips...`);
    const jobsFactories = (entities || []).map(entity => () => this.save(entity, {...opts}));
    return chainPromises<Trip>(jobsFactories);
  }

  /**
   * Save a trip
   * @param entity
   * @param opts
   */
  async save(entity: Trip, opts?: TripSaveOptions): Promise<Trip> {
    const isNew = isNil(entity.id);

    // If is a local entity: force a local save
    const isLocal = isNew ? (entity.synchronizationStatus && entity.synchronizationStatus !== 'SYNC') : entity.id < 0;
    if (isLocal) {
      return this.saveLocally(entity, opts);
    }

    opts = {
      withLanding: false,
      withOperation: false,
      withOperationGroup: false,
      ...opts
    };

    const now = Date.now();
    if (this._debug) console.debug("[trip-service] Saving trip...", entity);

    // Prepare to save
    this.fillDefaultProperties(entity);

    // Reset quality properties
    this.resetQualityProperties(entity);

    // Provide an optimistic response, if connection lost
    const offlineResponse = (!opts || opts.enableOptimisticResponse !== false) ?
      async (context) => {
        // Make sure to fill id, with local ids
        await this.fillOfflineDefaultProperties(entity);

        // For the query to be tracked (see tracked query link) with a unique serialization key
        context.tracked = (!entity.synchronizationStatus || entity.synchronizationStatus === 'SYNC');
        if (isNotNil(entity.id)) context.serializationKey = `${Trip.TYPENAME}:${entity.id}`;

        return {
          data: [this.asObject(entity, SAVE_OPTIMISTIC_AS_OBJECT_OPTIONS)]
        };
      } : undefined;

    // Transform into json
    const json = this.asObject(entity, SAVE_AS_OBJECT_OPTIONS);
    if (this._debug) console.debug("[trip-service] Using minify object, to send:", json);

    const variables = {
      trip: json,
      options: {
        withLanding: opts.withLanding,
        withOperation: opts.withOperation,
        withOperationGroup: opts.withOperationGroup
      }
    };
    const mutation = (opts.withLanding) ? TripMutations.saveLandedTrip : this.mutations.save;
    await this.graphql.mutate<{ data: any }>({
       mutation,
       variables,
       offlineResponse,
       error: { code: ErrorCodes.SAVE_TRIP_ERROR, message: "TRIP.ERROR.SAVE_TRIP_ERROR" },
       update: async (cache, {data}) => {
         const savedEntity = data && data.data;

         // Local entity: save it
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
                 await this.operationService.deleteLocally({tripId: entity.id});
               }
             }
             catch (err) {
               console.error(`[trip-service] Failed to locally delete operations of trip {${entity.id}}`, err);
             }
           }

           // Copy id and update Date
           this.copyIdAndUpdateDate(savedEntity, entity, opts);

           if (this._debug) console.debug(`[trip-service] Trip saved remotely in ${Date.now() - now}ms`, entity);

           // Add to cache
           if (isNew) {
             this.insertIntoMutableCachedQuery(cache, {
               queryName: 'LoadAll',
               data: savedEntity
             });
           }
         }

       }
     });

    return entity;
  }

  async saveLocally(entity: Trip, opts?: TripSaveOptions): Promise<Trip> {
    if (entity.id >= 0) throw new Error('Must be a local entity');
    opts = {
      withLanding: false,
      withOperation: false,
      withOperationGroup: false,
      ...opts
    };

    this.fillDefaultProperties(entity);

    // Reset quality properties
    this.resetQualityProperties(entity);

    // Make sure to fill id, with local ids
    await this.fillOfflineDefaultProperties(entity);

    // Reset synchro status
    entity.synchronizationStatus = 'DIRTY';

    // Extract operations (saved just after)
    const operations = entity.operations;
    delete entity.operations;

    const jsonLocal = this.asObject(entity, {...SAVE_LOCALLY_AS_OBJECT_OPTIONS, batchAsTree: false});
    if (this._debug) console.debug('[trip-service] [offline] Saving trip locally...', jsonLocal);

    // Save trip locally
    await this.entities.save(jsonLocal, {entityName: Trip.TYPENAME});

    // Save operations
    if (opts.withOperation && isNotEmptyArray(operations)) {

      // Link to physical gear id, using the rankOrder
      operations.forEach(o => {
        o.id = null; // Clean ID, to force new ids
        o.physicalGear = o.physicalGear && (entity.gears || []).find(g => g.rankOrder === o.physicalGear.rankOrder);
        o.tripId = entity.id;
        o.trip = undefined;
        o.updateDate = undefined;
      });

      entity.operations = await this.operationService.saveAll(operations, {tripId: entity.id});
    }

    return entity;
  }

  async synchronize(entity: Trip, opts?: TripSaveOptions): Promise<Trip> {
    opts = {
      withOperation: true, // Change default to true
      withLanding: false, // todo manage landedTrip
      withOperationGroup: false,
      enableOptimisticResponse: false, // Optimistic response not need
      ...opts
    };

    const localId = entity && entity.id;
    if (isNil(localId) || localId >= 0) {
      throw new Error("Entity must be a local entity");
    }
    if (this.network.offline) {
      throw new Error("Could not synchronize if network if offline");
    }

    // Clone (to keep original entity unchanged)
    entity = entity instanceof Entity ? entity.clone() : entity;
    entity.synchronizationStatus = 'SYNC';
    entity.id = undefined;

    // Fill operations
    const res = await this.operationService.loadAllByTrip( {tripId: localId},
      {fullLoad: true, computeRankOrder: false});
    entity.operations = res && res.data || [];

    try {

      entity = await this.save(entity, opts);

      // Check return entity has a valid id
      if (isNil(entity.id) || entity.id < 0) {
        throw {code: ErrorCodes.SYNCHRONIZE_TRIP_ERROR};
      }
    } catch (err) {
      throw {
        ...err,
        code: ErrorCodes.SYNCHRONIZE_TRIP_ERROR,
        message: "TRIP.ERROR.SYNCHRONIZE_TRIP_ERROR",
        context: entity.asObject(SAVE_LOCALLY_AS_OBJECT_OPTIONS)
      };
    }

    try {
      if (this._debug) console.debug(`[trip-service] Deleting trip {${entity.id}} from local storage`);

      // Delete trip's operations
      await this.operationService.deleteLocally({tripId: localId});

      // Delete trip
      await this.entities.deleteById(localId, {entityName: Trip.TYPENAME});
    }
    catch (err) {
      console.error(`[trip-service] Failed to locally delete trip {${entity.id}} and its operations`, err);
      // Continue
    }

    // TODO: add to a synchro history (using class SynchronizationHistory) and store it in local settings ?

    return entity;
  }

  /**
   * Control the validity of an trip
   * @param entity
   * @param opts
   */
  async control(entity: Trip, opts?: any): Promise<FormErrors> {

    const now = this._debug && Date.now();
    if (this._debug) console.debug(`[trip-service] Control {${entity.id}}...`, entity);

    const programLabel = entity.program && entity.program.label || null;
    if (!programLabel) throw new Error("Missing trip's program. Unable to control the trip");
    const program = await this.programRefService.loadByLabel(programLabel);

    const form = this.validatorService.getFormGroup(entity, {
      isOnFieldMode: false, // Always disable 'on field mode'
      program,
      withMeasurements: true // Need by full validation
    });

    if (!form.valid) {
      // Wait end of validation (e.g. async validators)
      await AppFormUtils.waitWhilePending(form);

      // Get form errors
      if (form.invalid) {
        const errors = AppFormUtils.getFormErrors(form, 'trip');

        if (this._debug) console.debug(`[trip-service] Control trip {${entity.id}} [INVALID] in ${Date.now() - now}ms`, errors.trip);

        return errors.trip;
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
   * @param entities
   * @param opts
   */
  async deleteAll(entities: Trip[], opts?: {
    trash?: boolean; // True by default
  }): Promise<any> {

    // Delete local entities
    const localEntities = entities && entities.filter(DataRootEntityUtils.isLocal);
    if (isNotEmptyArray(localEntities)) {
      return this.deleteAllLocally(localEntities, opts);
    }

    const ids = entities && entities.map(t => t.id)
      .filter(id => id >= 0);
    if (isEmptyArray(ids)) return; // stop if empty

    const now = Date.now();
    if (this._debug) console.debug(`[trip-service] Deleting trips ids: {${ids.join(',')}`);

    await this.graphql.mutate<any>({
      mutation: this.mutations.deleteAll,
      variables: { ids },
      update: (proxy) => {
        // Update the cache
        this.removeFromMutableCachedQueryByIds(proxy, {
          queryName: 'LoadAll',
          ids
        });

        if (this._debug) console.debug(`[trip-service] Trips deleted remotely in ${Date.now() - now}ms`);
      }
    });
  }

  /**
   * Delete many local trips
   * @param entities
   * @param opts
   */
  async deleteAllLocally(entities: Trip[], opts?: {
    trash?: boolean; // True by default
  }): Promise<any> {

    // Get local entity ids, then delete id
    const localEntities = entities && entities
      .filter(DataRootEntityUtils.isLocal);

    if (isEmptyArray(localEntities)) return; // Skip if empty

    const trash = !opts || opts !== false;
    const trashUpdateDate = trash && moment();

    if (this._debug) console.debug(`[trip-service] Deleting locally... {trash: ${trash}`);

    await chainPromises(localEntities.map(entity => async () => {

      // Load trip's operations
      const res = await this.operationService.loadAllByTrip({tripId: entity.id},
        {fullLoad: true, computeRankOrder: false});
      const operations = res && res.data;

      await this.entities.delete(entity, {entityName: Trip.TYPENAME});

      if (isNotNil(operations)) {
        await this.operationService.deleteAll(operations, {trash: false});
      }

      if (trash) {
        // Fill trip's operation, before moving it to trash
        entity.operations = operations;
        entity.updateDate = trashUpdateDate;

        const json = entity.asObject({...SAVE_LOCALLY_AS_OBJECT_OPTIONS, keepLocalId: false});

        // Add to trash
        await this.entities.saveToTrash(json, {entityName: Trip.TYPENAME});
      }

    }));
  }

  /**
   * Copy entities (local or remote) to the local storage
   * @param entities
   * @param opts
   */
  copyAllLocally(entities: Trip[], opts?: TripServiceCopyOptions): Promise<Trip[]> {
    return chainPromises(entities.map(source => () => this.copyLocally(source, opts)));
  }

  async copyLocallyById(id: number, opts?: TripLoadOptions & {}): Promise<Trip> {

    // Load existing data
    const data = await this.load(id, {...opts, fetchPolicy: "network-only"});

    // Add operations
    if (!opts || opts.withOperation !== false) {
      const res = await this.operationService.loadAllByTrip({tripId: id}, {
        fetchPolicy: "network-only",
        fullLoad: true
      });
      data.operations = res.data;
    }

    await this.copyLocally(data, opts);

    return data;
  }

  /**
   * Copy an entity (local or remote) to the local storage
   * @param entities
   */
  async copyLocally(source: Trip, opts?: TripServiceCopyOptions): Promise<Trip> {
    console.debug("[trip-service] Copy trip locally...", source);

    opts = {
      keepRemoteId: false,
      deletedFromTrash: false,
      withOperation: true, // Change default value to 'true'
      ...opts
    };
    const isLocal = DataRootEntityUtils.isLocal(source);

    // Create a new entity (without id and updateDate)
    const json = this.asObject(source, { ...COPY_LOCALLY_AS_OBJECT_OPTIONS, keepRemoteId: opts.keepRemoteId });
    json.synchronizationStatus = SynchronizationStatusEnum.DIRTY; // To make sure it will be saved locally

    // Save
    const target = await this.saveLocally(Trip.fromObject(json), opts);

    // Remove from the local trash
    if (opts.deletedFromTrash) {
      if (isLocal) {
        await this.entities.deleteFromTrash(source, {entityName: Trip.TYPENAME});
      }
      else {
        await this.trashRemoteService.delete('Trip', source.id);
      }
    }

    if (opts.displaySuccessToast) {
      await this.showToast({message: 'SOCIAL.USER_EVENT.INFO.COPIED_LOCALLY', type: 'info'});
    }

    return target;
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
      copy.vesselSnapshot = {id: entity.vesselSnapshot && entity.vesselSnapshot.id};
    }

    return copy;
  }

  protected fillDefaultProperties(entity: Trip) {

    super.fillDefaultProperties(entity);

    if (entity.operationGroups) {
      this.fillRecorderDepartment(entity.operationGroups, entity.recorderDepartment);
      entity.operationGroups.forEach(operationGroup => {
        this.fillRecorderDepartment(operationGroup.products, entity.recorderDepartment);
        this.fillRecorderDepartment(operationGroup.packets, entity.recorderDepartment);
      });
    }
    // todo maybe others tables ?

    // Physical gears: compute rankOrder
    fillRankOrder(entity.gears);

    // Measurement: compute rankOrder
    fillRankOrder(entity.measurements);
  }

  protected async fillOfflineDefaultProperties(entity: Trip) {
    await super.fillOfflineDefaultProperties(entity);

    // Fill gear id
    const gears = entity.gears || [];
    await EntityUtils.fillLocalIds(gears, (_, count) => this.entities.nextValues(PhysicalGear.TYPENAME, count));
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
      DataRootEntityUtils.copyControlAndValidationDate(source.sale, target.sale);

      // For a landedTrip with operationGroups, copy directly sale's product, a reload must be done after service call
      if (opts && opts.withLanding && source.sale.products) {
        target.sale.products = source.sale.products;
      }
    }

    // Update gears
    if (source.gears && target.gears) {
      target.gears.forEach(targetGear => {
        const sourceGear = source.gears.find(json => targetGear.equals(json));
        EntityUtils.copyIdAndUpdateDate(sourceGear, targetGear);
        DataRootEntityUtils.copyControlAndValidationDate(sourceGear, targetGear);

        // Update measurements
        if (sourceGear && sourceGear.measurements && targetGear.measurements) {
          targetGear.measurements.forEach(targetMeasurement => {
            const sourceMeasurement = sourceGear.measurements.find(m => targetMeasurement.equals(m));
            EntityUtils.copyIdAndUpdateDate(sourceMeasurement, targetMeasurement);
          });
        }
      });

      // Update gears in operation groups
      if (target.operationGroups) {
        target.operationGroups.forEach(operationGroup => {
          operationGroup.physicalGear = source.gears.find(json => operationGroup.physicalGear.equals(json));
        });
      }
    }

    // Update measurements
    if (target.measurements && source.measurements) {
      target.measurements.forEach(entity => {
        const savedMeasurement = source.measurements.find(m => entity.equals(m));
        EntityUtils.copyIdAndUpdateDate(savedMeasurement, entity);
      });
    }

    // Update operation groups
    if (source.operationGroups && target.operationGroups && opts && opts.withOperationGroup) {
      target.operationGroups.forEach(targetOperationGroup => {
        const sourceOperationGroup = source.operationGroups.find(json => targetOperationGroup.equals(json));
        EntityUtils.copyIdAndUpdateDate(sourceOperationGroup, targetOperationGroup);

        // Operation group's measurements
        if (sourceOperationGroup && sourceOperationGroup.measurements && targetOperationGroup.measurements) {
          targetOperationGroup.measurements.forEach(targetMeasurement => {
            const sourceMeasurement = sourceOperationGroup.measurements.find(m => targetMeasurement.equals(m));
            EntityUtils.copyIdAndUpdateDate(sourceMeasurement, targetMeasurement);
          });
        }

        // Operation group's products
        if (sourceOperationGroup && sourceOperationGroup.products && targetOperationGroup.products) {
          targetOperationGroup.products.forEach(targetProduct => {
            const sourceProduct = sourceOperationGroup.products.find(json => targetProduct.equals(json));
            EntityUtils.copyIdAndUpdateDate(sourceProduct, targetProduct);
          });
        }

        // Operation group's samples (recursively)
        if (sourceOperationGroup && sourceOperationGroup.samples && targetOperationGroup.samples) {
          this.copyIdAndUpdateDateOnSamples(sourceOperationGroup.samples, targetOperationGroup.samples);
        }

        // Operation group's packets
        if (sourceOperationGroup && sourceOperationGroup.packets && targetOperationGroup.packets) {
          targetOperationGroup.packets.forEach(targetPacket => {
            const sourcePacket = sourceOperationGroup.packets.find(json => targetPacket.equals(json));
            EntityUtils.copyIdAndUpdateDate(sourcePacket, targetPacket);

            // Packet's compositions
            if (sourcePacket && sourcePacket.composition && targetPacket.composition) {
              targetPacket.composition.forEach(targetComposition => {
                const sourceComposition = sourcePacket.composition.find(json => targetComposition.equals(json));
                EntityUtils.copyIdAndUpdateDate(sourceComposition, targetComposition);
              });
            }
          });
        }
      });
    }
  }

  /**
   * Copy Id and update, in sample tree (recursively)
   * @param sources
   * @param targets
   */
  // TODO BLA: Utiliser celle de operation-servive, en la passant en public
  protected copyIdAndUpdateDateOnSamples(sources: (Sample | any)[], targets: Sample[]) {
    // Update samples
    if (sources && targets) {
      targets.forEach(target => {
        const source = sources.find(json => target.equals(json));
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
}
