import { ChangeDetectionStrategy, Component, ElementRef, Injector } from '@angular/core';
import { EntityUtils, InMemoryEntitiesService } from '@sumaris-net/ngx-components';
import { ActivityMonth, ActivityMonthFilter } from '@app/activity-calendar/calendar/activity-month.model';
import { RxState } from '@rx-angular/state';
import { CalendarComponent } from '@app/activity-calendar/calendar/calendar.component';

@Component({
  selector: 'app-calendar-accordion',
  templateUrl: './calendar-accordion.component.html',
  styleUrls: ['./calendar-accordion.component.scss'],
  providers: [
    {
      provide: InMemoryEntitiesService,
      useFactory: () =>
        new InMemoryEntitiesService(ActivityMonth, ActivityMonthFilter, {
          equals: EntityUtils.equals,
          sortByReplacement: { id: 'month' },
        }),
    },
    RxState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarAccordionComponent extends CalendarComponent {
  constructor(injector: Injector, element: ElementRef) {
    super(injector, element);
  }
}
