import { Inject, inject, Injectable, Optional } from '@angular/core';
import { APP_MAIN_CONTEXT_SERVICE, Context, ContextService } from '@app/shared/context.service';
import { ActivityMonth } from '@app/activity-calendar/calendar/activity-month.model';

export interface ActivityCalendarClipboardData {
  months: ActivityMonth[];
  paths?: string[];
}

export interface ActivityCalendarContext extends Context<ActivityCalendarClipboardData> {}

@Injectable({ providedIn: 'root' })
export class ActivityCalendarContextService<C extends ActivityCalendarContext = ActivityCalendarContext> extends ContextService<
  C,
  ActivityCalendarClipboardData
> {
  protected context = inject(APP_MAIN_CONTEXT_SERVICE, { optional: true });

  constructor(@Optional() @Inject(APP_MAIN_CONTEXT_SERVICE) defaultState: Partial<C>) {
    super(defaultState || {});

    console.debug('[trip-context] Creating new context');

    if (this.context) {
      // Connect program/strategy to the main context
      this.connect('program', this.context.select('program'));
      this.connect('strategy', this.context.select('strategy'));

      this.context.registerChild(this);
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.context?.registerChild(this);
  }
}
