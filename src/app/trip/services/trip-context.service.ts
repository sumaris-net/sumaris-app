import { Trip } from '@app/trip/services/model/trip.model';
import { Injectable } from '@angular/core';
import { DataClipboard, DataContext } from '@app/data/services/model/data-context.model';
import { BatchContext } from '@app/trip/batch/sub/sub-batch.validator';
import { ContextService } from '@app/shared/context.service';

export interface TripContext extends DataContext, BatchContext {
  trip?: Trip;
}

@Injectable({providedIn: 'root'})
export class TripContextService extends ContextService<TripContext> {

  constructor() {
    super(<TripContext>{});
  }

  get clipboard(): DataClipboard|undefined {
    return this.getValue('clipboard') as DataClipboard;
  }
}
