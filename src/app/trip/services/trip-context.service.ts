import { Operation, Trip } from '@app/trip/services/model/trip.model';
import { Injectable } from '@angular/core';
import { DataContextService } from '@app/data/services/model/data-context.model';
import { BatchContext } from '@app/trip/batch/sub/sub-batch.validator';

export interface TripContext extends BatchContext {
  trip?: Trip;
  operation?: Operation;
}

@Injectable({providedIn: 'root'})
export class TripContextService extends DataContextService<TripContext> {

  constructor() {
    super(<TripContext>{});
  }

  get trip(): Trip|undefined {
    return this.getValue('trip') as Trip;
  }

  get operation(): Operation|undefined {
    return this.getValue('operation') as Operation;
  }

}
