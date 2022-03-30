import {Injectable, InjectionToken} from '@angular/core';
import {
  AccountService,
  arrayDistinct, BaseEntityGraphqlQueries,
  BaseGraphqlService,
  EntitiesStorage,
  firstNotNilPromise,
  fromDateISOString,
  GraphqlService,
  IEntitiesService,
  isNil,
  JobUtils,
  LoadResult,
  NetworkService
} from '@sumaris-net/ngx-components';
import {PhysicalGear, Trip} from './model/trip.model';
import {environment} from '@environments/environment';
import {BehaviorSubject, combineLatest, EMPTY, Observable} from 'rxjs';
import {filter, map, throttleTime} from 'rxjs/operators';
import {gql, WatchQueryFetchPolicy} from '@apollo/client/core';
import {PhysicalGearFragments} from './trip.queries';
import {ReferentialFragments} from '@app/referential/services/referential.fragments';
import {SortDirection} from '@angular/material/sort';
import {PhysicalGearFilter} from './filter/physical-gear.filter';
import moment from 'moment';
import {TripFilter} from '@app/trip/services/filter/trip.filter';
import {ErrorCodes} from '@app/data/services/errors';
import {mergeLoadResult} from '@app/shared/functions';
import {mergeMap} from 'rxjs/operators';
import { OperationQueries } from '@app/trip/services/operation.service';
import { BaseQueryOptions } from '@apollo/client';
import { VesselSnapshotFragments } from '@app/referential/services/vessel-snapshot.service';

const Queries: BaseEntityGraphqlQueries & {loadAllWithTripAndTotal: any} = {
  loadAll: gql`query PhysicalGears($filter: PhysicalGearFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String) {
    data: physicalGears(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...PhysicalGearFragment
    }
  }
  ${PhysicalGearFragments.physicalGear}
  ${ReferentialFragments.referential}
  ${ReferentialFragments.lightDepartment}`,

  load: gql`query PhysicalGear($id: Int!) {
    data: physicalGear(id: $id){
      ...PhysicalGearFragment
    }
  }
  ${PhysicalGearFragments.physicalGear}
  ${ReferentialFragments.referential}
  ${ReferentialFragments.lightDepartment}`,

  loadAllWithTripAndTotal: gql`query PhysicalGearsWithTrip($filter: PhysicalGearFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    data: physicalGears(filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      ...PhysicalGearFragment
      trip {
        departureDateTime
        returnDateTime
        vesselSnapshot {
          ...LightVesselSnapshotFragment
        }
      }
    }
  }
  ${PhysicalGearFragments.physicalGear}
  ${ReferentialFragments.referential}
  ${ReferentialFragments.lightDepartment}
  ${VesselSnapshotFragments.lightVesselSnapshot}`
};


const sortByTripDateFn = (n1: PhysicalGear, n2: PhysicalGear) => {
  const d1 = n1.trip && (n1.trip.returnDateTime || n1.trip.departureDateTime);
  const d2 = n2.trip && (n2.trip.returnDateTime || n2.trip.departureDateTime);
  return d1.isSame(d2) ? 0 : (d1.isAfter(d2) ? 1 : -1);
};

export const PHYSICAL_GEAR_DATA_SERVICE = new InjectionToken<IEntitiesService<PhysicalGear, PhysicalGearFilter>>('PhysicalGearDataService');


@Injectable({providedIn: 'root'})
export class PhysicalGearService extends BaseGraphqlService<PhysicalGear, PhysicalGearFilter>
  implements IEntitiesService<PhysicalGear, PhysicalGearFilter> {

  loading = false;

  constructor(
    protected graphql: GraphqlService,
    protected network: NetworkService,
    protected accountService: AccountService,
    protected entities: EntitiesStorage
  ) {
    super(graphql, environment);

    // -- For DEV only
    this._debug = !environment.production;
  }

  watchAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    dataFilter?: Partial<PhysicalGearFilter>,
    opts?: {
      distinctByRankOrder?: boolean;
      fetchPolicy?: WatchQueryFetchPolicy;
      toEntity?: boolean;
      withTotal?: boolean;
      query?: any;
    }
  ): Observable<LoadResult<PhysicalGear>> {

    // If offline, load locally
    const offlineData = this.network.offline || (dataFilter && dataFilter.tripId < 0) || false;
    if (offlineData) {
      return this.watchAllLocally(offset, size, sortBy, sortDirection, dataFilter, opts);
    }

    if (!dataFilter || (isNil(dataFilter.vesselId) && isNil(dataFilter.startDate))) {
      console.warn('[physical-gear-service] Trying to load gears without \'filter.vesselId\' and \'filter.startDate\' . Skipping.');
      return EMPTY;
    }

    dataFilter = this.asFilter(dataFilter);

    const variables: any = {
      offset: offset || 0,
      size: size >= 0 ? size : 1000,
      sortBy: (sortBy !== 'id' && sortBy) || 'rankOrder',
      sortDirection: sortDirection || 'desc',
      filter: dataFilter && dataFilter.asPodObject()
    };

    let now = this._debug && Date.now();
    //if (this._debug)
      console.debug('[physical-gear-service] Loading physical gears... using options:', variables);

    const query = opts?.query || Queries.loadAll;
    return this.graphql.watchQuery<LoadResult<any>>({
      query,
      variables,
      error: {code: ErrorCodes.LOAD_ENTITIES_ERROR, message: 'ERROR.LOAD_ENTITIES_ERROR'},
      fetchPolicy: opts && opts.fetchPolicy || undefined
    })
      .pipe(
        throttleTime(200), // avoid multiple call
        filter(() => !this.loading),
        map((res) => {
          let data = (!opts || opts.toEntity !== false) ?
            (res && res.data || []).map(PhysicalGear.fromObject)
            : (res && res.data || []) as PhysicalGear[];

          if (now) {
            console.debug(`[physical-gear-service] Loaded ${data.length} physical gears in ${Date.now() - now}ms`);
            now = undefined;
          }

          // Sort by trip date
          if ((!opts || opts.toEntity !== false) && dataFilter && dataFilter.vesselId && isNil(dataFilter.tripId)) {
            data.sort(sortByTripDateFn);
          }

          // Remove identical gears (find duplication, by [gear, rankOrder and measurements]
          if (opts && opts.distinctByRankOrder === true) {
            data = arrayDistinct(data, ['gear.id', 'rankOrder', 'measurementValues']);
          }

          return {
            data,
            total: data.length
          };
        })
      );
  }

  async deleteAll(data: PhysicalGear[], options?: any): Promise<any> {
    console.error('PhysicalGearService.deleteAll() not implemented yet');
  }

  async saveAll(data: PhysicalGear[], options?: any): Promise<PhysicalGear[]> {
    console.error('PhysicalGearService.saveAll() not implemented yet !');
    return data;
  }

  /**
   * Get physical gears, from trips data, and imported gears (offline mode)
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param filter
   * @param opts
   */
  watchAllLocally(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: Partial<PhysicalGearFilter>,
    opts?: {
      distinctByRankOrder?: boolean;
      toEntity?: boolean;
      fullLoad?: boolean;
    }
  ): Observable<LoadResult<PhysicalGear>> {
    if (!filter || isNil(filter.vesselId)) {
      console.warn('[physical-gear-service] Trying to load gears without \'filter.vesselId\'. Skipping.');
      return EMPTY;
    }

    const tripFilter = TripFilter.fromObject({
      vesselId: filter && filter.vesselId,
      startDate: filter && filter.startDate,
      endDate: filter && filter.endDate
    });

    const variables: any = {
      offset: offset || 0,
      size: size >= 0 ? size : 1000,
      sortBy: (sortBy !== 'id' && sortBy) || 'rankOrder',
      sortDirection: sortDirection || 'desc',
      filter: tripFilter.asFilterFn()
    };

    if (this._debug) console.debug('[physical-gear-service] Loading physical gears locally... using options:', variables);

    // First, search on trips
    const fromTrip$ = this.entities.watchAll<Trip>(Trip.TYPENAME, variables, {fullLoad: true}) // FullLoad is needed to load gears
      .pipe(
        // Get trips array
        map(res => res && res.data || []),
        // Extract physical gears
        // TODO: group by unique gear (from a hash (GEAR.LABEL + measurements))
        map(trips => {
          let data: PhysicalGear[] = trips.reduce((res, trip) => {
            // Exclude if no gears
            const tripDate = fromDateISOString(trip.returnDateTime || trip.departureDateTime);
            if (!trip.gears || !tripDate
              // Or if endDate <= trip date
              || (filter.startDate && tripDate.isBefore(filter.startDate))
              || (filter.endDate && tripDate.isSameOrAfter(filter.endDate))
              // Or excluded trip id (e.g to ignore current trip gears)
              || (filter.excludeTripId && trip.id === filter.excludeTripId)) {
              return res;
            }

            return res.concat(trip.gears
              .map(gear => {
                return {
                  ...gear,
                  trip: {
                    id: trip.id,
                    departureDateTime: trip.departureDateTime,
                    returnDateTime: trip.returnDateTime
                  }
                };
              }));
          }, []);

          let entities = (!opts || opts.toEntity !== false) ?
            (data || []).map(source => PhysicalGear.fromObject(source, opts))
            : (data || []) as PhysicalGear[];

          return {data: entities, total: data.length};
        })
      );

    // Then, search from predoc (physical gears imported by the offline mode, into the local storage)
    variables.filter = filter.asFilterFn();
    const fromStorage$ = this.entities.watchAll<PhysicalGear>(PhysicalGear.TYPENAME, variables, {fullLoad: opts && opts.fullLoad})
      .pipe(map(({data, total}) => {
        const entities = (!opts || opts.toEntity !== false) ?
          (data || []).map(source => PhysicalGear.fromObject(source, opts))
          : (data || []) as PhysicalGear[];

        return {data: entities, total};

      }));

    // Merge local and remote
    if (fromTrip$ && fromStorage$) {
      return combineLatest([fromTrip$, fromStorage$])
        .pipe(
          map(([res1, res2]) => mergeLoadResult(res1, res2)),
          mergeMap(async ({data, total}) => {
            // Sort by trip dates
            if (filter && filter.vesselId && isNil(filter.tripId)) {
              data.sort(sortByTripDateFn);
            }

            // Remove duplicated gears
            if (opts && opts.distinctByRankOrder === true) {
              data = arrayDistinct(data, ['gear.id', 'rankOrder', 'measurementValues']);
            }
            return {data, total};
          })
        );
    }
    return fromStorage$;
  }

  async load(id: number, tripId?: number, opts?: {
    distinctByRankOrder?: boolean;
    toEntity?: boolean;
    fullLoad?: boolean;
  }): Promise<PhysicalGear | null> {
    if (isNil(id)) throw new Error('Missing argument \'id\' ');

    const now = this._debug && Date.now();
    if (this._debug) console.debug(`[physical-gear-service] Loading physical gear #${id}...`);
    this.loading = true;

    try {
      let json: any;
      const offline = this.network.offline || id < 0;

      // Load locally
      if (offline) {
        // Watch on storage
        json = await this.entities.load<PhysicalGear>(id, PhysicalGear.TYPENAME);

        if (!json) {
          // If not on storage, watch on trip
          const trip = await this.entities.load<Trip>(tripId, Trip.TYPENAME);
          if (trip && trip.gears) {
            json = trip.gears.find(g => g.id === id);
          }
        }
        if (!json) throw {code: ErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR'};
      }

      // Load from pod
      else {
        const res = await this.graphql.query<{ data: PhysicalGear }>({
          query: Queries.load,
          variables: {id},
          error: {code: ErrorCodes.LOAD_ENTITY_ERROR, message: 'ERROR.LOAD_ENTITY_ERROR'}
        });
        json = res && res.data;
      }

      // Transform to entity
      const data = (!opts || opts.toEntity !== false)
        ? PhysicalGear.fromObject(json)
        : json as PhysicalGear;
      if (data && this._debug) console.debug(`[physical-gear-service] Physical gear #${id} loaded in ${Date.now() - now}ms`, data);
      return data;
    } finally {
      this.loading = false;
    }
  }

  async loadAll(offset: number,
                size: number,
                sortBy?: string,
                sortDirection?: SortDirection,
                dataFilter?: Partial<PhysicalGearFilter>,
                opts?: {
                  distinctByRankOrder?: boolean;
                  fetchPolicy?: WatchQueryFetchPolicy;
                  toEntity?: boolean;
                  withTotal?: boolean;
                  query?: any;
                }): Promise<LoadResult<PhysicalGear>> {
    return firstNotNilPromise(this.watchAll(offset, size, sortBy, sortDirection, dataFilter, opts));
  }

  async executeImport(progression: BehaviorSubject<number>,
                      opts?: {
                        maxProgression?: number;
                        filter: PhysicalGearFilter | any;
                      }): Promise<void> {

    const maxProgression = opts && opts.maxProgression || 100;
    const filter = {
      startDate: moment().add(-1, 'month'),
      ...opts.filter
    };

    console.info('[physical-gear-service] Importing physical gears...');

    const res = await JobUtils.fetchAllPages((offset, size) =>
        this.loadAll(offset, size, 'id', null, filter, {
          fetchPolicy: 'no-cache',
          distinctByRankOrder: true,
          toEntity: false,
          query: Queries.loadAllWithTripAndTotal
        }),
      progression,
      {maxProgression: maxProgression * 0.9}
    );


    // Save result locally
    await this.entities.saveAll(res.data, {entityName: PhysicalGear.TYPENAME, reset: true});
  }

  asFilter(filter: Partial<PhysicalGearFilter>): PhysicalGearFilter {
    return PhysicalGearFilter.fromObject(filter);
  }

}
