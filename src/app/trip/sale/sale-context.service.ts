import { Sale } from './sale.model';
import { inject, Inject, Injectable, Optional } from '@angular/core';
import { DataContext, DataContextService } from '@app/data/services/model/data-context.model';
import { BatchContext } from '@app/trip/batch/sub/sub-batch.validator';
import { APP_MAIN_CONTEXT_SERVICE } from '@app/shared/context.service';
import { RxStateProperty } from '@app/shared/state/state.decorator';
import { Batch } from '../batch/common/batch.model';

export interface SaleContext extends DataContext, BatchContext {
  sale?: Sale;
}

@Injectable({ providedIn: 'root' })
export class SaleContextService<C extends SaleContext = SaleContext> extends DataContextService<C> {
  protected context = inject(APP_MAIN_CONTEXT_SERVICE, { optional: true });

  @RxStateProperty() sale: Sale;
  @RxStateProperty() batch: Batch | undefined;

  constructor(@Optional() @Inject(APP_MAIN_CONTEXT_SERVICE) defaultState: Partial<C>) {
    super(defaultState || {});

    console.debug('[sale-context] Creating new context');

    if (this.context) {
      // Connect program/strategy to the main context
      this.connect('program', this.context.select('program'));
      this.connect('strategy', this.context.select('strategy'));
    }
  }
}
