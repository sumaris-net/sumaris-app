import { ChangeDetectionStrategy, Component, ElementRef, HostListener, Injector, Input, OnInit } from '@angular/core';
import {
  DateUtils,
  EntityUtils,
  IEntitiesService,
  InMemoryEntitiesService,
  isNotNil,
  IStatus,
  sleep,
  splitById,
  StatusIds,
} from '@sumaris-net/ngx-components';
import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import { AppBaseTable, BaseTableState } from '@app/shared/table/base.table';
import { TableElement } from '@e-is/ngx-material-table';
import { ActivityMonth, ActivityMonthFilter } from '@app/activity-calendar/calendar/activity-month.model';
import { ActivityMonthValidatorService } from '@app/activity-calendar/calendar/activity-month.validator';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { RxState } from '@rx-angular/state';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';
import { Observable } from 'rxjs';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { LocationLevelIds } from '@app/referential/services/model/model.enum';

const BASE_COLUMNS = ['month', 'vesselOwner', 'registrationLocation', 'isActive', 'basePortLocation'];

export const IsActiveList: Readonly<IStatus[]> = Object.freeze([
  {
    id: 1,
    icon: 'checkmark',
    label: 'ACTIVITY_CALENDAR.EDIT.IS_ACTIVE_ENUM.ENABLE'
  },
  {
    id: 0,
    icon: 'close',
    label: 'ACTIVITY_CALENDAR.EDIT.IS_ACTIVE_ENUM.DISABLE'
  }
]);

export interface ActivityCalendarState extends BaseTableState {
  vesselSnapshots: VesselSnapshot[];
}

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
    RxState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent
  extends AppBaseTable<
    ActivityMonth,
    ActivityMonthFilter,
    IEntitiesService<ActivityMonth, ActivityMonthFilter>,
    ActivityMonthValidatorService,
    number,
    ActivityCalendarState
  >
  implements OnInit
{
  @RxStateSelect() protected vesselSnapshots$: Observable<VesselSnapshot[]>;
  readonly isActiveList = IsActiveList;
  readonly isActiveMap = Object.freeze(splitById(IsActiveList));

  hiddenColumns = ['select', 'id'];
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

  @RxStateProperty() vesselSnapshots: VesselSnapshot[];
  @RxStateProperty() @Input() locationDisplayAttributes: string[];
  @RxStateProperty() @Input() basePortLocationLevelIds: number[];

  constructor(
    injector: Injector,
    validatorService: ActivityMonthValidatorService,
    private vesselSnapshotService: VesselSnapshotService,
    private referentialRefService: ReferentialRefService,
    private element: ElementRef
  ) {
    super(injector, ActivityMonth, ActivityMonthFilter, BASE_COLUMNS, injector.get(InMemoryEntitiesService), validatorService);
    this.inlineEdition = true;
    this.autoLoad = true;
    this.sticky = true;
  }

  async ngOnInit() {
    super.ngOnInit();

    this.locationDisplayAttributes = this.locationDisplayAttributes || this.settings.getFieldDisplayAttributes('location');

    await this.referentialRefService.ready();

    this.registerAutocompleteField('basePortLocation', {
      suggestFn: (value, filter) =>
        this.referentialRefService.suggest(value, { ...filter, levelIds: this.basePortLocationLevelIds || [LocationLevelIds.PORT] }),
      filter: {
        entityName: 'Location',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      attributes: this.locationDisplayAttributes,
      mobile: this.mobile,
    });

    this.markAsReady();
  }

  async setValue(data: ActivityCalendar) {
    const year = data?.year || DateUtils.moment().year() - 1;
    const vesselId = data.vesselSnapshot?.id;

    this.memoryDataService.value = new Array(12).fill(null).map((_, month) => {
      const startDate = DateUtils.moment().utc(false).year(year).month(month).startOf('month');
      const endDate = DateUtils.moment().utc(false).year(year).month(month).endOf('month');
      const source = data.vesselUseFeatures?.find((vuf) => DateUtils.isSame(startDate, vuf.startDate)) || { startDate };
      const target = ActivityMonth.fromObject(source);
      target.gearUseFeatures = data.gearUseFeatures?.filter((guf) => guf.startDate?.month() === month);
      target.vesselId = vesselId;
      target.endDate = endDate;
      return target;
    });

    // Load vessels
    if (isNotNil(vesselId)) {
      await this.loadVessels(vesselId, year);
    }
  }

  async loadVessels(vesselId: number, year: number) {
    this.vesselSnapshots = await Promise.all(
      new Array(12).fill(null).map(async (_, month) => {
        //await sleep(500);

        const date = DateUtils.moment().utc(false).year(year).startOf('year');
        const { data } = await this.vesselSnapshotService.loadAll(
          0,
          1,
          null,
          null,
          {
            vesselId,
            date,
            onlyWithRegistration: true,
          },
          { withTotal: false }
        );
        return data?.[0] || null;
      })
    );
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

  cancelOrDelete(event: Event, row: TableElement<ActivityMonth>, opts?: { interactive?: boolean; keepEditing?: boolean }) {
    event?.preventDefault();
    super.cancelOrDelete(event, row, {...opts, keepEditing: false});

    // Update view
    if (!row.editing) this.markForCheck();
  }

  addMetier(event: UIEvent, row: TableElement<ActivityMonth>) {
    console.log('TODO add metier');
  }
}
