import { DataContext, DataContextService } from '@app/data/services/model/data-context.model';
import { BatchContext } from '@app/trip/batch/sub/sub-batch.validator';
import { Inject, inject, Injectable, Optional } from '@angular/core';
import { APP_MAIN_CONTEXT_SERVICE } from '@app/shared/context.service';

export interface ActivityCalendarContext extends DataContext, BatchContext {}

@Injectable({ providedIn: 'root' })
export class ActivityCalendarContextService<C extends ActivityCalendarContext = ActivityCalendarContext> extends DataContextService<C> {
  protected context = inject(APP_MAIN_CONTEXT_SERVICE, { optional: true });

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
