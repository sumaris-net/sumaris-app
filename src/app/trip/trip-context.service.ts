import { Operation, Trip } from '@app/trip/trip/trip.model';
import { inject, Inject, Injectable, Optional } from '@angular/core';
import { DataContext, DataContextService } from '@app/data/services/model/data-context.model';
import { BatchContext } from '@app/trip/batch/sub/sub-batch.validator';
import { APP_MAIN_CONTEXT_SERVICE } from '@app/shared/context.service';
import { RxStateProperty } from '@app/shared/state/state.decorator';

export interface TripContext extends DataContext, BatchContext {
  trip?: Trip;
  operation?: Operation;
}

@Injectable({ providedIn: 'root' })
export class TripContextService<C extends TripContext = TripContext> extends DataContextService<C> {
  protected context = inject(APP_MAIN_CONTEXT_SERVICE, { optional: true });

  @RxStateProperty() trip: Trip;
  @RxStateProperty() operation: Operation | undefined;

  constructor(@Optional() @Inject(APP_MAIN_CONTEXT_SERVICE) defaultState: Partial<C>) {
    super(defaultState || {});

    console.debug('[trip-context] Creating new context');

    if (this.context) {
      // Connect program/strategy to the main context
      this.connect('program', this.context.select('program'));
      this.connect('strategy', this.context.select('strategy'));
    }
  }

}
