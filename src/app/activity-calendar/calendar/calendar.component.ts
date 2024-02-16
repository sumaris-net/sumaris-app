import { ChangeDetectionStrategy, Component, ElementRef, HostListener, Injector, OnInit } from '@angular/core';
import { DateUtils, Entity, EntityAsObjectOptions, EntityFilter, EntityUtils, InMemoryEntitiesService, sleep } from '@sumaris-net/ngx-components';
import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import { AppBaseTable } from '@app/shared/table/base.table';
import { TableElement } from '@e-is/ngx-material-table';
import { VesselUseFeatures } from '@app/activity-calendar/model/vessel-use-features.model';
import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';
import { StoreObject } from '@apollo/client/core';

export class ActivityMonth extends Entity<ActivityMonth> {
  month: number = null;

  vesselUseFeatures: VesselUseFeatures;
  gearUseFeatures: GearUseFeatures[];

  constructor() {
    super();
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.vesselUseFeatures = VesselUseFeatures.fromObject(source.vesselUseFeatures);
    this.gearUseFeatures = source.gearUseFeatures?.map(GearUseFeatures.fromObject);
    this.month = source.month || this.vesselUseFeatures?.startDate?.month();
  }

  asObject(opts?: EntityAsObjectOptions): StoreObject {
    const target = super.asObject(opts);
    target.vesselUseFeatures = this.vesselUseFeatures?.asObject(opts);
    target.gearUseFeatures = this.gearUseFeatures?.map((guf) => guf.asObject(opts));

    return target;
  }
}
export class ActivityMonthFilter extends EntityFilter<ActivityMonthFilter, ActivityMonth> {

}

const BASE_COLUMNS = ['month', 'vesselOwner', 'registrationLocation', 'isActive', 'basePortLocation']

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  providers: [
    {
      provide: InMemoryEntitiesService,
      useFactory: () =>
        new InMemoryEntitiesService(ActivityMonth, ActivityMonthFilter, {
          equals: EntityUtils.equals,
        }),
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent extends AppBaseTable<ActivityMonth, ActivityMonthFilter> implements OnInit {

  hiddenColumns = ['select', 'id', 'actions'];
  resizingCell: {
    validating?: boolean;
    axis?: 'x' | 'y';
    row: TableElement<ActivityMonth>;
    columnName: string;
    cellRect: { top: number; left: number; width: number; height: number };
    shadowElement: HTMLDivElement;
  };
  originalMouseY: number;
  originalMouseX: number;

  constructor(injector: Injector, private element: ElementRef) {
    super(
      injector,
      ActivityMonth,
      ActivityMonthFilter,
      BASE_COLUMNS,
      new InMemoryEntitiesService(ActivityMonth, ActivityMonthFilter)
    );
    this.inlineEdition = true;
    this.autoLoad = true;

  }

  ngOnInit() {
    super.ngOnInit();

    this.markAsReady();
  }

  setValue(data: ActivityCalendar) {
    const year = data?.year || DateUtils.moment().year() - 1;

    this.memoryDataService.value = new Array(12).fill(null)
      .map((_, month) => {
        const activity = new ActivityMonth();
        activity.month = month;
        const startDate = DateUtils.moment().utc(false).year(year).month(month).startOf('month');
        activity.vesselUseFeatures = data.vesselUseFeatures?.find(vuf => DateUtils.isSame(startDate, vuf.startDate))
          || VesselUseFeatures.fromObject({startDate});
        activity.gearUseFeatures = data.gearUseFeatures?.filter(guf => guf.startDate?.month() === month);
        return activity;
      });
  }

  onMouseDown(event: MouseEvent, cellElement: HTMLTableCellElement, row: TableElement<any>, columnName: string, axis?: 'x' | 'y') {
    if (!cellElement) throw new Error('Missing rectangle element');
    if (this.resizingCell) return; // Skip if already resizing

    event.preventDefault();
    event.stopPropagation();

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
    this.resizingCell = { shadowElement, row, columnName, cellRect, axis };
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const shadowElement = this.resizingCell?.shadowElement;
    if (!shadowElement) return;

    // Ignore if waiting validation
    if (this.resizingCell.validating) return;

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
      event.preventDefault();
      event.stopPropagation();
      if (this.resizingCell.validating) return; // Waiting validation end
      this.resizingCell.validating = true;
      const movementX = this.resizingCell.axis !== 'y' ? event.clientX - this.originalMouseX : 0;
      const movementY = this.resizingCell.axis !== 'x' ? event.clientY - this.originalMouseY : 0;
      const actualRect = shadowElement.getBoundingClientRect();
      const colspan = (actualRect.width / originalRect.width) * (movementX >= 0 ? 1 : -1);
      const rowspan = (actualRect.height / originalRect.height) * (movementY >= 0 ? 1 : -1);
      if (colspan !== 1 || rowspan !== 1) {
        const event = { colspan, rowspan, columnName: this.resizingCell.columnName, row: this.resizingCell.row };
        try {
          const validate = await this.validate(event);
          if (validate) {
            console.debug(`Applying colspan=${colspan} rowspan=${rowspan}`);
            this.onMouseEnd(event);
          }
        } catch (err) {
          console.error(err);
        }
      }
      shadowElement.remove();
    }
    this.resizingCell = null;
    this.originalMouseY = null;
    this.originalMouseX = null;
  }

  protected async validate(event: { colspan: number; rowspan: number }): Promise<boolean> {
    // TODO display merge menu
    await sleep(500);
    return true;
  }

  protected onMouseEnd(event: { colspan: number; rowspan: number }) {
    return true;
  }

  clickRow(event: Event | undefined, row: TableElement<ActivityMonth>): boolean {
    if (this.resizingCell || event.defaultPrevented) return; // Skip

    return super.clickRow(event, row);
  }

}
