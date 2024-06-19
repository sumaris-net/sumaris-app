import { Operation, Trip } from '@app/trip/trip/trip.model';
import { inject, Inject, Injectable, Optional } from '@angular/core';
import { DataContext, DataContextService } from '@app/data/services/model/data-context.model';
import { BacthTreeContext, BatchContext } from '@app/trip/batch/sub/sub-batch.validator';
import { APP_MAIN_CONTEXT_SERVICE, CONTEXT_DEFAULT_STATE } from '@app/shared/context.service';
import { RxStateProperty } from '@app/shared/state/state.decorator';

export interface TripContext extends DataContext, BatchContext {
  trip?: Trip;
  operation?: Operation;
}

@Injectable({ providedIn: 'root' })
export class TripContextService<C extends TripContext = TripContext> extends DataContextService<C> implements BacthTreeContext {
  protected context = inject(APP_MAIN_CONTEXT_SERVICE, { optional: true });

  @RxStateProperty() trip: Trip;
  @RxStateProperty() operation: Operation | undefined;

  constructor(@Optional() @Inject(CONTEXT_DEFAULT_STATE) defaultState: Partial<C>) {
    super(defaultState || {});

    console.debug(`[trip-context] Creating new context#${this.id}`);

    if (this.context) {
      // Connect program/strategy to the main context
      this.connect('program', this.context.select('program'));
      this.connect('strategy', this.context.select('strategy'));

      this.context.registerChild(this);
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.context?.unregisterChild(this);
  }
}
