import { Sale } from './sale.model';
import { inject, Inject, Injectable, OnDestroy, Optional } from '@angular/core';
import { DataContext, DataContextService } from '@app/data/services/model/data-context.model';
import { BacthTreeContext, BatchContext } from '@app/trip/batch/sub/sub-batch.validator';
import { APP_MAIN_CONTEXT_SERVICE, CONTEXT_DEFAULT_STATE } from '@app/shared/context.service';
import { RxStateProperty } from '@app/shared/state/state.decorator';
import { Batch } from '../batch/common/batch.model';

export interface SaleContext extends DataContext, BatchContext {
  sale?: Sale;
}

@Injectable({ providedIn: 'root' })
export class SaleContextService<C extends SaleContext = SaleContext> extends DataContextService<C> implements BacthTreeContext, OnDestroy {
  protected context = inject(APP_MAIN_CONTEXT_SERVICE, { optional: true });

  @RxStateProperty() sale: Sale;
  @RxStateProperty() batch: Batch | undefined;

  constructor(@Optional() @Inject(CONTEXT_DEFAULT_STATE) defaultState: Partial<C>) {
    super(defaultState || {});

    console.debug(`[sale-context] Creating new context#${this.id}`);

    if (this.context) {
      // Connect program/strategy to the main context
      this.connect('program', this.context.select('program'));
      this.connect('strategy', this.context.select('strategy'));

      // Register to the main context
      this.context.registerChild(this);
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.context?.unregisterChild(this);
  }
}
