import { Trip } from '@app/trip/services/model/trip.model';
import { Injectable } from '@angular/core';
import { DataContext } from '@app/data/services/model/data-context.model';
import { DataContextService } from '@app/data/services/data-context.service';

export interface TripContext extends DataContext {
  trip?: Trip;
}

@Injectable({providedIn: 'root'})
export class TripContextService extends DataContextService<TripContext> {

  constructor() {
    super(<TripContext>{});
  }
}
