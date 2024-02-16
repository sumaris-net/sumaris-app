import { ChangeDetectionStrategy, Component, ElementRef, HostListener, Injector, OnInit } from '@angular/core';
import { DateUtils, EntityUtils, InMemoryEntitiesService, sleep } from '@sumaris-net/ngx-components';
import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import { ActivityCalendarFilter } from '@app/activity-calendar/activity-calendar.filter';
import { AppBaseTable } from '@app/shared/table/base.table';
import { TableElement } from '@e-is/ngx-material-table';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  providers: [
    {
      provide: InMemoryEntitiesService,
      useFactory: () =>
        new InMemoryEntitiesService(ActivityCalendar, ActivityCalendarFilter, {
          equals: EntityUtils.equals,
        }),
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent extends AppBaseTable<ActivityCalendar, ActivityCalendarFilter> implements OnInit {
  static MONTHS = new Array(12).fill(0).map((_, index) => index);
  static MONTH_COLUMNS = CalendarComponent.MONTHS.map((id) => id.toString());

  protected style: object = {};
  protected readonly columnDefinitions = CalendarComponent.MONTHS.map((month) => {
    return { month, startDate: DateUtils.moment().utc(false).month(month).startOf('month') };
  });

  resizingCell: {
    validating?: boolean;
    axis?: 'x' | 'y';
    row: TableElement<any>;
    month: number;
    cellRect: { top: number; left: number; width: number; height: number };
    shadowElement: HTMLDivElement;
  };
  originalMouseY: number;
  originalMouseX: number;

  constructor(injector: Injector, private element: ElementRef) {
    super(
      injector,
      ActivityCalendar,
      ActivityCalendarFilter,
      CalendarComponent.MONTH_COLUMNS,
      new InMemoryEntitiesService(ActivityCalendar, ActivityCalendarFilter)
    );
    this.inlineEdition = false;
    this.autoLoad = true;
  }

  ngOnInit() {
    super.ngOnInit();
    this.memoryDataService.value = new Array(10).fill(null).map((_) => new ActivityCalendar());
    this.markAsReady();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const shadowElement = this.resizingCell?.shadowElement;
    if (!shadowElement || this.resizingCell.validating) return;
    const axis = this.resizingCell.axis;
    const movementX = axis !== 'y' ? event.clientX - this.originalMouseX : 0;
    const movementY = axis !== 'x' ? event.clientY - this.originalMouseY : 0;
    const originalRect = this.resizingCell.cellRect;
    const newWidth = originalRect.width + Math.abs(movementX);
    const snapWidth = Math.max(originalRect.width, Math.round(newWidth / originalRect.width) * originalRect.width);
    const newHeight = originalRect.height + Math.abs(movementY);
    const snapHeight = Math.max(originalRect.height, Math.round(newHeight / originalRect.height) * originalRect.height);
    let left = originalRect.left;
    let top = originalRect.top;
    if (movementX < 0) {
      left = originalRect.left + originalRect.width - snapWidth;
    }
    if (movementY < 0) {
      top = originalRect.top + originalRect.height - snapHeight;
    }

    // Resize the shadow element
    shadowElement.style.left = left + 'px';
    shadowElement.style.width = snapWidth + 'px';
    shadowElement.style.top = top + 'px';
    shadowElement.style.height = snapHeight + 'px';
  }

  @HostListener('document:mouseup', ['$event'])
  async onMouseUp(event: MouseEvent) {
    const shadowElement = this.resizingCell?.shadowElement;
    const originalRect = this.resizingCell?.cellRect;
    if (shadowElement && originalRect) {
      this.resizingCell.validating = true;
      const actualRect = shadowElement.getBoundingClientRect();
      const colspan = actualRect.width / originalRect.width;
      const rowspan = actualRect.height / originalRect.height;
      if (colspan !== 1 || rowspan !== 1) {
        const event = { colspan, rowspan };
        const validate = await this.validate(event);
        if (validate) {
          console.debug(`Applying colspan=${colspan} rowspan=${rowspan}`);
        }
      }
      shadowElement.remove();
    }
    this.resizingCell = null;
    this.originalMouseY = null;
    this.originalMouseX = null;
  }

  onMouseDown(event: MouseEvent, cellElement: HTMLTableCellElement, row: TableElement<any>, month: number, axis?: 'x' | 'y') {
    if (!cellElement) throw new Error('Missing rectangle element');
    if (this.resizingCell) return; // Skip if already resizing

    const parentRect = this.element.nativeElement.getBoundingClientRect();
    const rect = cellElement.getBoundingClientRect();
    const cellRect = {
      top: rect.y,
      left: rect.x - parentRect.left,
      width: rect.width,
      height: rect.height,
    };
    this.originalMouseX = event.clientX;
    this.originalMouseY = event.clientY;
    const shadowElement = document.createElement('div');
    shadowElement.style.position = 'fixed';
    shadowElement.style.zIndex = '9999';
    shadowElement.style.backgroundColor = 'rgba(var(--ion-color-secondary-rgb), 0.4)';
    shadowElement.style.top = cellRect.top + 'px';
    shadowElement.style.left = cellRect.left + 'px';
    shadowElement.style.width = cellRect.width + 'px';
    shadowElement.style.height = cellRect.height + 'px';
    cellElement.prepend(shadowElement);
    this.resizingCell = { shadowElement, row, month, cellRect, axis };
  }

  protected async validate(event: { colspan: number; rowspan: number }): Promise<boolean> {
    // TODO display merge menu
    await sleep(500);
    return true;
  }
}
