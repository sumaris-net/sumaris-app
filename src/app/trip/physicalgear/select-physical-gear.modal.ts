import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Input, OnInit, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PHYSICAL_GEAR_DATA_SERVICE, PhysicalGearService } from '../services/physicalgear.service';
import { TableElement } from '@e-is/ngx-material-table';
import { PhysicalGear } from '../services/model/trip.model';
import { IEntitiesService, isNotNil, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes, AcquisitionLevelType } from '@app/referential/services/model/model.enum';
import { AppMeasurementsTable } from '../measurement/measurements.table.class';
import { Observable } from 'rxjs';
import { PhysicalGearFilter } from '../services/filter/physical-gear.filter';

export interface SelectPhysicalGearModalOptions {
  allowMultiple?: boolean;
  filter?: PhysicalGearFilter;
  acquisitionLevel?: AcquisitionLevelType;
  programLabel?: string;
}

@Component({
  selector: 'app-select-physical-gear-modal',
  templateUrl: './select-physical-gear.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: PHYSICAL_GEAR_DATA_SERVICE,
      useExisting: PhysicalGearService
    }
  ]
})
export class SelectPhysicalGearModal implements OnInit, SelectPhysicalGearModalOptions {

  selectedTabIndex = 0;
  readonly mobile: boolean;

  @ViewChild('table', {static: true}) table: AppMeasurementsTable<PhysicalGear, PhysicalGearFilter>;

  @Input() allowMultiple: boolean;

  @Input() filter: PhysicalGearFilter | null = null;
  @Input() acquisitionLevel: AcquisitionLevelType;
  @Input() programLabel: string;

  get loadingSubject(): Observable<boolean> {
    return this.table.loadingSubject;
  }

  constructor(
    private modalCtrl: ModalController,
    private settings: LocalSettingsService,
    protected cd: ChangeDetectorRef,
    @Inject(PHYSICAL_GEAR_DATA_SERVICE) protected dataService?: IEntitiesService<PhysicalGear, PhysicalGearFilter>
  ) {
    this.mobile = settings.mobile;
  }

  ngOnInit() {

    // Init table
    this.table.dataService = this.dataService;
    this.filter = PhysicalGearFilter.fromObject(this.filter);
    this.table.filter = this.filter;
    this.table.dataSource.serviceOptions = {
      distinctByRankOrder: true
    };
    this.table.acquisitionLevel = this.acquisitionLevel || AcquisitionLevelCodes.PHYSICAL_GEAR;
    this.table.programLabel = this.programLabel;
    this.table.markAsReady();

    // Set defaults
    this.allowMultiple = toBoolean(this.allowMultiple, false);

  }

  async selectRow(event: { id?: number; row: TableElement<PhysicalGear> }) {
    if (event.row && this.table) {

      // Select the clicked row, then close
      if (!this.allowMultiple) {
        this.table.selection.clear();
        this.table.selection.select(event.row);
        await this.close();
      }

      // Add clicked row to selection
      else {
        this.table.selection.select(event.row);
      }
    }
  }

  async close(event?: any): Promise<boolean> {
    try {
      if (this.hasSelection()) {
        const gears = (this.table.selection.selected || [])
          .map(row => row.currentData)
          .map(PhysicalGear.fromObject)
          .filter(isNotNil);
        this.modalCtrl.dismiss(gears);
      }
      return true;
    } catch (err) {
      // nothing to do
      return false;
    }
  }

  async cancel() {
    await this.modalCtrl.dismiss();
  }

  hasSelection(): boolean {
    return this.table && this.table.selection.hasValue() && (this.allowMultiple || this.table.selection.selected.length === 1);
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
