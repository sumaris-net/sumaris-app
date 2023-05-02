import { Operation, Trip } from '@app/trip/trip/trip.model';
import { Injectable } from '@angular/core';
import { DataContext, DataContextService } from '@app/data/services/model/data-context.model';
import { BatchContext } from '@app/trip/batch/sub/sub-batch.validator';

export interface TripContext extends DataContext, BatchContext {
  trip?: Trip;
  operation?: Operation;
}

@Injectable({providedIn: 'root'})
export class TripContextService extends DataContextService<TripContext> {

  constructor() {
    super(<TripContext>{});
  }

  set trip(value: Trip) {
    this.set('trip', () => value);
  }

  get trip(): Trip {
    return this.get('trip');
  }

  get operation(): Operation|undefined {
    return this.get('operation');
  }

  set operation(value: Operation) {
    this.set('operation', _ => value);
  }
}
