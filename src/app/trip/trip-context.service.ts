import { Operation, Trip } from '@app/trip/trip/trip.model';
import { Inject, Injectable, Optional } from '@angular/core';
import { DataContext, DataContextService } from '@app/data/services/model/data-context.model';
import { BatchContext } from '@app/trip/batch/sub/sub-batch.validator';
import { CONTEXT_DEFAULT_STATE } from '@app/shared/context.service';

export interface TripContext extends DataContext, BatchContext {
  trip?: Trip;
  operation?: Operation;
}

@Injectable({providedIn: 'root'})
export class TripContextService<C extends TripContext = TripContext> extends DataContextService<C> {

  constructor(@Optional() @Inject(CONTEXT_DEFAULT_STATE) defaultState: C) {
    super(defaultState || <C>{});
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
