import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Input, OnInit, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PHYSICAL_GEAR_DATA_SERVICE_TOKEN, PhysicalGearService, PhysicalGearServiceWatchOptions } from './physicalgear.service';
import { TableElement } from '@e-is/ngx-material-table';
import { IEntitiesService, isNotNil, LocalSettingsService, ReferentialRef, toBoolean } from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes, AcquisitionLevelType, PmfmIds } from '@app/referential/services/model/model.enum';
import { Observable } from 'rxjs';
import { PhysicalGearFilter } from './physical-gear.filter';
import { PhysicalGearTable } from '@app/trip/physicalgear/physical-gears.table';
import { PhysicalGear } from "@app/trip/physicalgear/physical-gear.model";

export interface ISelectPhysicalGearModalOptions {
  allowMultiple?: boolean;
  filter?: PhysicalGearFilter;
  acquisitionLevel?: AcquisitionLevelType;
  programLabel?: string;
  distinctBy?: string[];
  withOffline?: boolean;
}

@Component({
  selector: 'app-select-physical-gear-modal',
  templateUrl: './select-physical-gear.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: PHYSICAL_GEAR_DATA_SERVICE_TOKEN,
      useExisting: PhysicalGearService
    }
  ]
})
export class SelectPhysicalGearModal implements OnInit, ISelectPhysicalGearModalOptions {

  readonly mobile: boolean;

  @Input() allowMultiple: boolean;
  @Input() filter: PhysicalGearFilter | null = null;
  @Input() acquisitionLevel: AcquisitionLevelType;
  @Input() programLabel: string;
  @Input() distinctBy: string[];
  @Input() withOffline: boolean;

  get loadingSubject(): Observable<boolean> {
    return this.table.loadingSubject;
  }

  @ViewChild(PhysicalGearTable, {static: true}) table: PhysicalGearTable;

  constructor(
    private modalCtrl: ModalController,
    private settings: LocalSettingsService,
    protected cd: ChangeDetectorRef,
    @Inject(PHYSICAL_GEAR_DATA_SERVICE_TOKEN) protected dataService?: IEntitiesService<PhysicalGear, PhysicalGearFilter>
  ) {
    this.mobile = settings.mobile;
  }

  ngOnInit() {

    // Init table
    this.table.dataService = this.dataService;
    this.filter = PhysicalGearFilter.fromObject(this.filter);
    this.filter.program = ReferentialRef.fromObject({
      ...this.filter.program,
      label: this.programLabel
    });
    this.table.filter = this.filter;
    this.table.dataSource.serviceOptions = <PhysicalGearServiceWatchOptions>{
      distinctBy: this.distinctBy || ['gear.id', 'rankOrder', `measurementValues.${PmfmIds.GEAR_LABEL}`],
      withOffline: this.withOffline
    };
    this.table.acquisitionLevel = this.acquisitionLevel || AcquisitionLevelCodes.PHYSICAL_GEAR;
    this.table.programLabel = this.programLabel;
    this.table.markAsReady();
    this.table.onRefresh.emit();

    // Set defaults
    this.allowMultiple = toBoolean(this.allowMultiple, false);

  }

  async selectRow(row: TableElement<PhysicalGear>) {
    if (row && this.table) {

      // Select the clicked row, then close
      if (!this.allowMultiple) {
        this.table.selection.clear();
        this.table.selection.select(row);
        await this.close();
      }

      // Add clicked row to selection
      else {
        this.table.selection.select(row);
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
