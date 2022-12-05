import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { LandingsTable } from '../../landing/landings.table';

import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { ModalController } from '@ionic/angular';
import { Landing } from '../../services/model/landing.model';
import { VesselService } from '@app/vessel/services/vessel-service';
import { VesselFilter } from '@app/vessel/services/filter/vessel.filter';
import { VesselsTable } from '@app/vessel/list/vessels.table';
import { AppFormUtils, AppTable, ConfigService, isEmptyArray, isNil, isNotNil, ReferentialRef, toBoolean } from '@sumaris-net/ngx-components';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { VesselForm } from '@app/vessel/form/form-vessel';
import { Vessel } from '@app/vessel/services/model/vessel.model';
import { Subscription } from 'rxjs';
import { MatTabGroup } from '@angular/material/tabs';
import { LandingFilter } from '../../services/filter/landing.filter';
import { VESSEL_CONFIG_OPTIONS } from '@app/vessel/services/config/vessel.config';
import { SynchronizationStatus } from '@app/data/services/model/model.utils';
import { Moment } from 'moment';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { debounceTime, mergeMap } from 'rxjs/operators';

export interface SelectVesselsForDataModalOptions {
  landingFilter: LandingFilter|null;
  vesselFilter: VesselFilter|null;
  allowMultiple: boolean;
  allowAddNewVessel: boolean;
  showVesselTypeColumn?: boolean;
  showBasePortLocationColumn?: boolean;
  defaultVesselSynchronizationStatus: SynchronizationStatus;
  maxDateVesselRegistration?: Moment;
}

@Component({
  selector: 'app-select-vessel-for-data-modal',
  templateUrl: 'select-vessel-for-data.modal.html',
  styleUrls: ['select-vessel-for-data.modal.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class SelectVesselsForDataModal implements SelectVesselsForDataModalOptions, OnInit, AfterViewInit, OnDestroy {

  selectedTabIndex = 0;
  subscription = new Subscription();

  @ViewChild(LandingsTable, { static: true }) landingsTable: LandingsTable;
  @ViewChild(VesselsTable, { static: true }) vesselsTable: VesselsTable;
  @ViewChild(VesselForm, { static: false }) vesselForm: VesselForm;
  @ViewChild('tabGroup', { static: true }) tabGroup: MatTabGroup;

  @Input() landingFilter: LandingFilter|null = null;
  @Input() vesselFilter: VesselFilter|null = null;
  @Input() allowMultiple: boolean;
  @Input() allowAddNewVessel: boolean;
  @Input() showVesselTypeColumn: boolean;
  @Input() showBasePortLocationColumn: boolean;

  @Input() defaultVesselSynchronizationStatus: SynchronizationStatus;
  @Input() defaultRegistrationLocation: ReferentialRef;
  @Input() withNameRequired: boolean;
  @Input() maxDateVesselRegistration: Moment;

  get loading(): boolean {
    const table = this.table;
    return table && table.loading;
  }

  get table(): AppTable<any> {
    return (this.showVessels && this.vesselsTable) || (this.showLandings && this.landingsTable);
  }

  get showLandings(): boolean {
    return this.selectedTabIndex === 0;
  }

  @Input() set showLandings(value: boolean) {
    if (this.showLandings !== value) {
      this.selectedTabIndex = value ? 0 : 1;
      this.markForCheck();
    }
  }

  get showVessels(): boolean {
    return this.selectedTabIndex === 1;
  }

  @Input() set showVessels(value: boolean) {
    if (this.showVessels !== value) {
      this.selectedTabIndex = value ? 1 : 0;
      this.markForCheck();
    }
  }

  get isNewVessel(): boolean {
    return this.selectedTabIndex === 2;
  }

  constructor(
    private vesselService: VesselService,
    private configService: ConfigService,
    protected viewCtrl: ModalController,
    private referentialRefService: ReferentialRefService,
    protected cd: ChangeDetectorRef
  ) {
  }

  ngOnInit() {
    // Init landing table
    this.landingFilter = this.landingFilter || new LandingFilter();
    this.landingsTable.filter = this.landingFilter;
    this.landingsTable.programLabel = this.landingFilter.program && this.landingFilter.program.label;
    this.landingsTable.acquisitionLevel = AcquisitionLevelCodes.LANDING;

    // Set defaults
    this.allowMultiple = toBoolean(this.allowMultiple, false);
    this.allowAddNewVessel = toBoolean(this.allowAddNewVessel, true);
    this.showVesselTypeColumn = toBoolean(this.showVesselTypeColumn, false);
    this.showBasePortLocationColumn = toBoolean(this.showBasePortLocationColumn, true);

    // Init vessel table filter
    this.vesselsTable.filter = this.vesselFilter;

    setTimeout(() => {
      // Load landings
      this.landingsTable.onRefresh.next("modal");
      this.selectedTabIndex = 0;
      this.tabGroup.realignInkBar();
      this.markForCheck();

    }, 200);
  }

  ngAfterViewInit() {

    // Get default status by config
    if (this.allowAddNewVessel && this.vesselForm) {
      this.subscription.add(
        this.configService.config
          .pipe(
            debounceTime(100),
            mergeMap(async (config) => {
              this.vesselForm.defaultStatus = config.getPropertyAsInt(VESSEL_CONFIG_OPTIONS.VESSEL_DEFAULT_STATUS);
              this.vesselForm.enable();

              if (isNil(this.defaultRegistrationLocation)) {
                const defaultRegistrationLocationId = config.getPropertyAsInt(VESSEL_CONFIG_OPTIONS.VESSEL_FILTER_DEFAULT_COUNTRY_ID);
                if (defaultRegistrationLocationId) {
                  this.vesselForm.defaultRegistrationLocation = await this.referentialRefService.loadById(defaultRegistrationLocationId, 'Location');
                }
              }
              if (isNil(this.withNameRequired)) {
                this.withNameRequired = config.getPropertyAsBoolean(VESSEL_CONFIG_OPTIONS.VESSEL_NAME_REQUIRED);
                this.vesselForm.withNameRequired = this.withNameRequired;
              }
            })
          )
          .subscribe()
      );
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  async selectRow(row) {
    const table = this.table;
    if (row && table) {
      if (!this.allowMultiple) {
        table.selection.clear();
        table.selection.select(row);
        await this.close();
      }
      else {
        table.selection.select(row);
      }
    }
  }

  async close(event?: any): Promise<boolean> {
    try {
      let vessels: VesselSnapshot[];
      if (this.isNewVessel) {
        const vessel = await this.createVessel();
        if (!vessel) return false;
        vessels = [vessel];
      }
      else if (this.hasSelection()) {
        if (this.showLandings) {
          vessels = (this.landingsTable.selection.selected || [])
            .map(row => row.currentData)
            .map(Landing.fromObject)
            .filter(isNotNil)
            .map(l => l.vesselSnapshot);
        } else if (this.showVessels) {
          vessels = (this.vesselsTable.selection.selected || [])
            .map(row => row.currentData)
            .map(VesselSnapshot.fromVessel)
            .filter(isNotNil);
        }
      }
      if (isEmptyArray(vessels)) {
        console.warn("[select-vessel-modal] no selection");
      }
      this.viewCtrl.dismiss(vessels);
      return true;
    } catch (err) {
      // nothing to do
      return false;
    }
  }

  async createVessel(): Promise<VesselSnapshot> {

    if (!this.vesselForm) throw Error('No Vessel Form');

    console.debug("[select-vessel-modal] Saving new vessel...");

    // Avoid multiple call
    if (this.vesselForm.disabled) return;
    this.vesselForm.error = null;

    await AppFormUtils.waitWhilePending(this.vesselForm);

    if (this.vesselForm.invalid) {
      this.vesselForm.markAllAsTouched();
      AppFormUtils.logFormErrors(this.vesselForm.form);
      return;
    }

    try {
      const json = this.vesselForm.value;
      const data = Vessel.fromObject(json);

      this.vesselForm.disable();

      const savedData = await this.vesselService.save(data);
      return VesselSnapshot.fromVessel(savedData);
    }
    catch (err) {
      this.vesselForm.error = err && err.message || err;
      this.vesselForm.enable();
      return;
    }
  }

  async cancel() {
    await this.viewCtrl.dismiss();
  }

  hasSelection(): boolean {
    if (this.isNewVessel) return false;
    const table = this.table;
    return table && table.selection.hasValue() && (this.allowMultiple || table.selection.selected.length === 1);
  }

  get canValidate(): boolean {
    return (this.isNewVessel && this.vesselForm && this.vesselForm.valid) || this.hasSelection();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
