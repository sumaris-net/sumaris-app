import {Injectable} from "@angular/core";
import gql from "graphql-tag";
import {Apollo} from "apollo-angular";
import {Observable} from "rxjs";
import {fillRankOrder, isNil, Person, Trip} from "./trip.model";
import {DataService, LoadResult, isNotNil} from "../../shared/shared.module";
import {BaseDataService} from "../../core/core.module";
import {map} from "rxjs/operators";
import {Moment} from "moment";

import {ErrorCodes} from "./trip.errors";
import {AccountService} from "../../core/services/account.service";
import {Fragments} from "./trip.queries";

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
    comments
    departureLocation {
      ...LocationFragment
    }
    returnLocation {
      ...LocationFragment
    }
    recorderDepartment {
      ...RecorderDepartmentFragment
    }
    recorderPerson {
      ...RecorderPersonFragment
    }
    vesselFeatures {
      vesselId,
      name,
      exteriorMarking
    }
  }
  ${Fragments.location}
  ${Fragments.recorderDepartment}
  ${Fragments.recorderPerson}
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
    comments
    departureLocation {
      ...LocationFragment
    }
    returnLocation {
      ...LocationFragment
    }
    recorderDepartment {
      ...RecorderDepartmentFragment
    }
    recorderPerson {
      ...RecorderPersonFragment
    }
    vesselFeatures {
      vesselId
      name
      exteriorMarking
    }
    sale {
      id
      startDateTime
      creationDate
      updateDate
      comments
      saleType {
        ...ReferentialFragment
      }
      saleLocation {
        ...LocationFragment
      }
    }
    gears {
      id
      rankOrder
      updateDate
      creationDate
      comments
      gear {
        ...ReferentialFragment
      }
      recorderDepartment {
        ...RecorderDepartmentFragment
      }
      measurements {
        ...MeasurementFragment
      }
    }
    measurements {
      ...MeasurementFragment
    }
  }
  ${Fragments.recorderDepartment}
  ${Fragments.recorderPerson}
  ${Fragments.measurement}
  ${Fragments.referential}
  ${Fragments.location}
  `
};

export declare class TripFilter {
  programLabel?: string;
  startDate?: Date | Moment;
  endDate?: Date | Moment;
  locationId?: number;
}
const LoadAllQuery: any = gql`
  query Trips($offset: Int, $size: Int, $sortBy: String, $sortDirection: String, $filter: TripFilterVOInput){
    trips(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...LightTripFragment
    }
    tripsCount(filter: $filter)
  }
  ${TripFragments.lightTrip}
`;
//
const LoadQuery: any = gql`
  query Trip($id: Int) {
    trip(id: $id) {
      ...TripFragment
    }
  }
  ${TripFragments.trip}
`;
const SaveTrips: any = gql`
  mutation saveTrips($trips:[TripVOInput]){
    saveTrips(trips: $trips){
      ...TripFragment
    }
  }
  ${TripFragments.trip}
`;
const ControlTrip: any = gql`
  mutation controlTrip($trip:TripVOInput){
    controlTrip(trip: $trip){
      ...TripFragment
    }
  }
  ${TripFragments.trip}
`;
const ValidateTrip: any = gql`
  mutation validateTrip($trip:TripVOInput){
    validateTrip(trip: $trip){
      ...TripFragment
    }
  }
  ${TripFragments.trip}
`;
const UnvalidateTrip: any = gql`
  mutation unvalidateTrip($trip:TripVOInput){
    unvalidateTrip(trip: $trip){
      ...TripFragment
    }
  }
  ${TripFragments.trip}
`;
const DeleteTrips: any = gql`
  mutation deleteTrips($ids:[Int]){
    deleteTrips(ids: $ids)
  }
`;

const UpdateSubscription = gql`
  subscription updateTrip($id: Int, $interval: Int){
    updateTrip(id: $id, interval: $interval) {
      ...TripFragment
    }
  }
  ${TripFragments.trip}
`;

@Injectable()
export class TripService extends BaseDataService implements DataService<Trip, TripFilter>{

  constructor(
    protected apollo: Apollo,
    protected accountService: AccountService
  ) {
    super(apollo);

    // FOR DEV ONLY
    //this._debug = !environment.production;
  }

  /**
   * Load many trips
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param filter
   */
  loadAll(offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: string,
    filter?: TripFilter): Observable<LoadResult<Trip>> {
    const variables: any = {
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || 'departureDateTime',
      sortDirection: sortDirection || 'asc',
      filter: filter
    };

    this._lastVariables.loadAll = variables;

    const now = new Date();
    if (this._debug) console.debug("[trip-service] Loading trips... using options:", variables);
    return this.watchQuery<{ trips: Trip[]; tripsCount: number }>({
      query: LoadAllQuery,
      variables: variables,
      error: { code: ErrorCodes.LOAD_TRIPS_ERROR, message: "TRIP.ERROR.LOAD_TRIPS_ERROR" },
      fetchPolicy: 'cache-and-network'
    })
      .pipe(
        map(res => {
          const data = (res && res.trips || []).map(Trip.fromObject);
          const total = res && res.tripsCount || 0;
          if (this._debug) console.debug("[trip-service] Loaded {" + (data.length || 0) + "} trips in " + (new Date().getTime() - now.getTime()) + "ms", data);
          return {
            data: data,
            total: total
          };
        })
      );
  }

  load(id: number): Observable<Trip | null> {
    if (!id) throw new Error("id should not be null");

    const now = Date.now();
    if (this._debug) console.debug("[trip-service] Loading trip {" + id + "}...");

    return this.watchQuery<{ trip: Trip }>({
      query: LoadQuery,
      variables: {
        id: id
      },
      error: { code: ErrorCodes.LOAD_TRIP_ERROR, message: "TRIP.ERROR.LOAD_TRIP_ERROR" }
    })
      .pipe(
        map(data => {
          if (data && data.trip) {
            const res = Trip.fromObject(data.trip);
            if (this._debug) console.debug(`[trip-service] Trip {${id}} loaded in ${Date.now() - now}ms`, res);
            return res;
          }
          return null;
        })
      );
  }

  public listenChanges(id: number): Observable<Trip> {
    if (!id && id !== 0) throw "Missing argument 'id' ";

    if (this._debug) console.debug(`[trip-service] [WS] Listening changes for trip {${id}}...`);

    return this.subscribe<{ updateTrip: Trip }, { id: number, interval: number }>({
      query: UpdateSubscription,
      variables: {
        id: id,
        interval: 10
      },
      error: {
        code: ErrorCodes.SUBSCRIBE_TRIP_ERROR,
        message: 'TRIP.ERROR.SUBSCRIBE_TRIP_ERROR'
      }
    })
      .pipe(
        map(data => {
          if (data && data.updateTrip) {
            const res = Trip.fromObject(data.updateTrip);
            if (this._debug) console.debug(`[trip-service] Trip {${id}} updated on server !`, res);
            return res;
          }
          return null; // deleted ?
        })
      );
  }

  /**
   * Save many trips
   * @param data
   */
  async saveAll(entities: Trip[], options?: any): Promise<Trip[]> {
    if (!entities) return entities;

    const json = entities.map(t => {
      // Fill default properties (as recorder department and person)
      this.fillDefaultProperties(t)
      return this.asObject(t);
    });

    const now = new Date();
    if (this._debug) console.debug("[trip-service] Saving trips...", json);

    const res = await this.mutate<{ saveTrips: Trip[] }>({
      mutation: SaveTrips,
      variables: {
        trips: json
      },
      error: { code: ErrorCodes.SAVE_TRIPS_ERROR, message: "TRIP.ERROR.SAVE_TRIPS_ERROR" }
    });
    (res && res.saveTrips && entities || [])
      .forEach(entity => {
        const savedTrip = res.saveTrips.find(res => entity.equals(res));
        this.copyIdAndUpdateDate(savedTrip, entity);
      });

    if (this._debug) console.debug("[trip-service] Trips saved and updated in " + (new Date().getTime() - now.getTime()) + "ms", entities);


    return entities;
  }

  /**
   * Save a trip
   * @param data
   */
  async save(entity: Trip): Promise<Trip> {

    // Prepare to save
    this.fillDefaultProperties(entity);

    // Transform into json
    const json = this.asObject(entity);
    const isNew = isNil(entity.id);

    const now = new Date();
    if (this._debug) console.debug("[trip-service] Saving trip...", json);

    const res = await this.mutate<{ saveTrips: any }>({
      mutation: SaveTrips,
      variables: {
        trips: [json]
      },
      error: { code: ErrorCodes.SAVE_TRIP_ERROR, message: "TRIP.ERROR.SAVE_TRIP_ERROR" }
    });

    const savedTrip = res && res.saveTrips && res.saveTrips[0];
    if (savedTrip) {
      this.copyIdAndUpdateDate(savedTrip, entity);

      // Add to cache
      if (isNew && this._lastVariables.loadAll) {
        this.addToQueryCache({
          query: LoadAllQuery,
          variables: this._lastVariables.loadAll
        }, 'trips', entity.asObject());
      }
    }

    if (this._debug) console.debug("[trip-service] Trip saved and updated in " + (new Date().getTime() - now.getTime()) + "ms", entity);

    return entity;
  }

  /**
   * Control the trip
   * @param entity
   */
  async controlTrip(entity: Trip) {

    // TODO vérifier que le formulaire est dirty et/ou s'il est valide, car le control provoque une sauvegarde

    if (isNil(entity.id)) {
      throw "Entity must be saved before control !"
    }

    // Prepare to save
    this.fillDefaultProperties(entity);

    // Transform into json
    const json = this.asObject(entity);

    const now = new Date();
    if (this._debug) console.debug("[trip-service] Control trip...", json);

    const res = await this.mutate<{ controlTrip: any }>({
      mutation: ControlTrip,
      variables: {
        trip: json
      },
      error: { code: ErrorCodes.CONTROL_TRIP_ERROR, message: "TRIP.ERROR.CONTROL_TRIP_ERROR" }
    });

    let savedTrip = res && res.controlTrip;
    if (savedTrip) {
      this.copyIdAndUpdateDate(savedTrip, entity);
      entity.controlDate = savedTrip.controlDate || entity.controlDate;
      entity.validationDate = savedTrip.validationDate || entity.validationDate;
    }

    if (this._debug) console.debug("[trip-service] Trip controlled in " + (new Date().getTime() - now.getTime()) + "ms", entity);

    return entity;
  }

  /**
   * Validate the trip
   * @param entity
   */
  async validateTrip(entity: Trip) {

    if (isNil(entity.controlDate)) {
      throw "Entity must be controlled before validate !"
    }
    if (isNotNil(entity.validationDate)) {
      throw "Entity is already validated !"
    }

    // Prepare to save
    this.fillDefaultProperties(entity);

    // Transform into json
    const json = this.asObject(entity);

    const now = new Date();
    if (this._debug) console.debug("[trip-service] Validate trip...", json);

    const res = await this.mutate<{ validateTrip: any }>({
      mutation: ValidateTrip,
      variables: {
        trip: json
      },
      error: { code: ErrorCodes.VALIDATE_TRIP_ERROR, message: "TRIP.ERROR.VALIDATE_TRIP_ERROR" }
    });

    let savedTrip = res && res.validateTrip;
    if (savedTrip) {
      this.copyIdAndUpdateDate(savedTrip, entity);
      entity.controlDate = savedTrip.controlDate || entity.controlDate;
      entity.validationDate = savedTrip.validationDate || entity.validationDate;
    }

    if (this._debug) console.debug("[trip-service] Trip validated in " + (new Date().getTime() - now.getTime()) + "ms", entity);

    return entity;
  }

  /**
   * Unvalidate the trip
   * @param entity
   */
  async unvalidateTrip(entity: Trip) {

    if (isNil(entity.validationDate)) {
      throw "Entity is not validated yet !"
    }

    // Prepare to save
    this.fillDefaultProperties(entity);

    // Transform into json
    const json = this.asObject(entity);

    const now = new Date();
    if (this._debug) console.debug("[trip-service] Unvalidate trip...", json);

    const res = await this.mutate<{ unvalidateTrip: any }>({
      mutation: UnvalidateTrip,
      variables: {
        trip: json
      },
      error: { code: ErrorCodes.UNVALIDATE_TRIP_ERROR, message: "TRIP.ERROR.UNVALIDATE_TRIP_ERROR" }
    });

    let savedTrip = res && res.unvalidateTrip;
    if (savedTrip) {
      this.copyIdAndUpdateDate(savedTrip, entity);
      entity.controlDate = savedTrip.controlDate || entity.controlDate;
      entity.validationDate = savedTrip.validationDate; // should be null
    }

    if (this._debug) console.debug("[trip-service] Trip unvalidated in " + (new Date().getTime() - now.getTime()) + "ms", entity);

    return entity;
  }

  /**
   * Save many trips
   * @param entities
   */
  async deleteAll(entities: Trip[]): Promise<any> {

    let ids = entities && entities
      .map(t => t.id)
      .filter(id => (id > 0));

    const now = new Date();
    if (this._debug) console.debug("[trip-service] Deleting trips... ids:", ids);

    const res = await this.mutate<any>({
      mutation: DeleteTrips,
      variables: {
        ids: ids
      }
    });

    // Update the cache
    if (this._lastVariables.loadAll) {
      this.removeToQueryCacheByIds({
        query: LoadAllQuery,
        variables: this._lastVariables.loadAll
      }, 'trips', ids);
    }

    if (this._debug) console.debug("[trip-service] Trips deleted in " + (new Date().getTime() - now.getTime()) + "ms");

    return res;
  }

  canUserWrite(trip: Trip): boolean {
    if (!trip) return false;

    // If the user is the recorder: can write
    if (trip.recorderPerson && this.accountService.account.equals(trip.recorderPerson)) {
      return true;
    }

    // TODO: check rights on program (need model changes)

    return this.accountService.canUserWriteDataForDepartment(trip.recorderDepartment);
  }

  /* -- protected methods -- */

  protected asObject(entity: Trip): any {
    const copy: any = entity.asObject(true/*minify*/);

    // Fill return date using departure date
    copy.returnDateTime = copy.returnDateTime || copy.departureDateTime;

    // Fill return location using departure location
    if (!copy.returnLocation || !copy.returnLocation.id) {
      copy.returnLocation = { id: copy.departureLocation && copy.departureLocation.id };
    }

    // Clean vessel features object, before saving
    copy.vesselFeatures = { vesselId: entity.vesselFeatures && entity.vesselFeatures.vesselId };

    // Keep id only, on person and department
    copy.recorderPerson = { id: entity.recorderPerson && entity.recorderPerson.id };
    copy.recorderDepartment = entity.recorderDepartment && { id: entity.recorderDepartment && entity.recorderDepartment.id } || undefined;

    return copy;
  }

  protected fillDefaultProperties(entity: Trip) {

    // If new trip
    if (!entity.id || entity.id < 0) {

      const person: Person = this.accountService.account;

      // Recorder department
      if (person && person.department) {
        entity.recorderDepartment.id = person.department.id;
      }

      // Recorder person
      if (person && person.id) {
        entity.recorderPerson.id = person.id;
      }
    }

    // Physical gears: compute rankOrder
    fillRankOrder(entity.gears);

    // Measurement: compute rankOrder
    fillRankOrder(entity.measurements);
  }

  copyIdAndUpdateDate(source: Trip | undefined, target: Trip) {
    if (!source) return;

    // Update (id and updateDate)
    target.id = source.id || target.id;
    target.updateDate = source.updateDate || target.updateDate;
    target.creationDate = source.creationDate || target.creationDate;
    target.dirty = false;

    // Update sale
    if (target.sale && source.sale) {
      target.sale.id = source.sale.id || target.sale.id;
      target.sale.updateDate = source.sale.updateDate || target.sale.updateDate;
      target.sale.creationDate = source.sale.creationDate || target.sale.creationDate;
      target.sale.dirty = false;
    }

    // Update gears
    if (target.gears && source.gears) {
      target.gears.forEach(entity => {
        const savedGear = source.gears.find(json => entity.equals(json));
        entity.id = savedGear && savedGear.id || entity.id;
        entity.updateDate = savedGear && savedGear.updateDate || entity.updateDate;
        entity.creationDate = savedGear && savedGear.creationDate || entity.creationDate;
        entity.dirty = false;

        // Update measurements
        if (savedGear && entity.measurements && savedGear.measurements) {
          entity.measurements.forEach(entity => {
            const savedMeasurement = savedGear.measurements.find(m => entity.equals(m));
            entity.id = savedMeasurement && savedMeasurement.id || entity.id;
            entity.updateDate = savedMeasurement && savedMeasurement.updateDate || entity.updateDate;
            entity.dirty = false;
          });
        }
      });
    }

    // Update measurements
    if (target.measurements && source.measurements) {
      target.measurements.forEach(entity => {
        const savedMeasurement = source.measurements.find(m => entity.equals(m));
        entity.id = savedMeasurement && savedMeasurement.id || entity.id;
        entity.updateDate = savedMeasurement && savedMeasurement.updateDate || entity.updateDate;
        entity.dirty = false;
      });
    }
  }

}
