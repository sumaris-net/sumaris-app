import { Injectable } from '@angular/core';
import { ScientificCruise } from '@app/trip/scientific-cruise/scientific-cruise.model';
import { IRootDataEntitiesService } from '@app/data/table/root-table.class';
import { ScientificCruiseFilter } from '@app/trip/scientific-cruise/scientific-cruise.filter';
import { Observable } from 'rxjs';
import { SortDirection } from '@angular/material/sort';
import { TripService } from '@app/trip/trip/trip.service';
import { AppErrorWithDetails, EntitiesServiceWatchOptions, EntityServiceLoadOptions, FormErrors, LoadResult } from '@sumaris-net/ngx-components';
import { map } from 'rxjs/operators';
import { Trip } from '@app/trip/trip/trip.model';
import { IProgressionOptions } from '@app/data/services/data-quality-service.class';

export class ScientificCruiseComparators {
  static sortByDepartureDateFn(n1: ScientificCruise, n2: ScientificCruise): number {
    const d1 = n1.departureDateTime;
    const d2 = n2.departureDateTime;
    return d1.isSame(d2) ? 0 : d1.isAfter(d2) ? 1 : -1;
  }
}

@Injectable({ providedIn: 'root' })
export class ScientificCruiseService implements IRootDataEntitiesService<ScientificCruise, ScientificCruiseFilter> {
  featureName: string;

  constructor(private tripService: TripService) {}

  watchAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: Partial<ScientificCruiseFilter>,
    options?: EntitiesServiceWatchOptions
  ): Observable<LoadResult<ScientificCruise>> {
    filter = this.asFilter(filter);

    const tripFilter = ScientificCruiseFilter.toTripFilter(filter);

    return this.tripService
      .watchAll(offset, size, sortBy, sortDirection, tripFilter, {
        ...options,
        toEntity: false,
      })
      .pipe(
        map(({ data, total }) => {
          const entities: ScientificCruise[] =
            options?.toEntity !== false
              ? (data || []).map((json) => {
                  const entity = ScientificCruise.fromObject(json);
                  entity.trip = Trip.fromObject(json);
                  return entity;
                })
              : (data || []).map((json) => {
                  const entity: any = json;
                  entity.trip = Trip.fromObject(json);
                  return entity;
                });
          return {
            data: entities,
            total: options?.withTotal !== false ? total : entities.length,
          };
        })
      );
  }

  asFilter(source: Partial<ScientificCruiseFilter>): ScientificCruiseFilter {
    return ScientificCruiseFilter.fromObject(source);
  }

  deleteAll(data: ScientificCruise[], opts?: any): Promise<any> {
    return Promise.resolve(undefined);
  }

  hasOfflineData(): Promise<boolean> {
    return Promise.resolve(false);
  }

  lastUpdateDate(): Promise<moment.Moment> {
    return Promise.resolve(undefined);
  }

  load(id: number, opts?: EntityServiceLoadOptions): Promise<ScientificCruise> {
    return Promise.resolve(undefined);
  }

  runImport(filter?: Partial<ScientificCruiseFilter>, opts?: { maxProgression?: number }): Observable<number> {
    return undefined;
  }

  saveAll(data: ScientificCruise[], opts?: any): Promise<ScientificCruise[]> {
    return Promise.resolve([]);
  }

  canUserWrite(data: ScientificCruise, opts?: any): boolean {
    return this.tripService.canUserWrite(data.trip, opts);
  }

  control(data: ScientificCruise, opts?: IProgressionOptions): Promise<AppErrorWithDetails | FormErrors> {
    return this.tripService.control(data.trip, opts);
  }

  async qualify(data: ScientificCruise, qualityFlagId: number): Promise<ScientificCruise> {
    data.trip = await this.tripService.qualify(data.trip, qualityFlagId);
    return data;
  }

  synchronize(data: ScientificCruise, opts?: any): Promise<ScientificCruise> {
    return Promise.resolve(undefined);
  }

  synchronizeById(id: number): Promise<ScientificCruise> {
    return Promise.resolve(undefined);
  }

  terminate(entity: ScientificCruise): Promise<ScientificCruise> {
    return Promise.resolve(undefined);
  }

  terminateById(id: number): Promise<ScientificCruise> {
    return Promise.resolve(undefined);
  }
}
