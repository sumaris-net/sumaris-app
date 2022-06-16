import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { AcquisitionLevelCodes, AcquisitionLevelType, PmfmIds } from '../../referential/services/model/model.enum';
import { PhysicalGearForm } from './physical-gear.form';
import {
  AppEntityEditorModal,
  createPromiseEventEmitter,
  emitPromiseEvent,
  IEntityEditorModalOptions, isNil,
  ReferentialRef,
  toBoolean,
  toNumber,
  TranslateContextService,
  waitFor
} from '@sumaris-net/ngx-components';
import { MeasurementValuesUtils } from '@app/trip/services/model/measurement.model';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { environment } from '@environments/environment';
import { FormGroup } from '@angular/forms';
import { AppMeasurementsTable } from '@app/trip/measurement/measurements.table.class';
import { PhysicalGearFilter } from '@app/trip/physicalgear/physical-gear.filter';
import { BehaviorSubject } from 'rxjs';

export interface IPhysicalGearModalOptions
  extends IEntityEditorModalOptions<PhysicalGear> {
  acquisitionLevel: string;
  programLabel: string;

  canEditGear: boolean;
  canEditRankOrder: boolean;
  allowChildrenGears: boolean;

  // UI
  maxVisibleButtons?: number;
}

const INVALID_GEAR_ID = -999;

@Component({
  selector: 'app-physical-gear-modal',
  templateUrl: './physical-gear.modal.html',
  styleUrls: ['./physical-gear.modal.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class PhysicalGearModal
  extends AppEntityEditorModal<PhysicalGear>
  implements OnInit, OnDestroy, AfterViewInit, IPhysicalGearModalOptions {

  _showChildrenTable = false;
  $gear = new BehaviorSubject<ReferentialRef>(null);
  $gearId = new BehaviorSubject<number>(INVALID_GEAR_ID);

  @Input() acquisitionLevel: string;
  @Input() childAcquisitionLevel: AcquisitionLevelType = 'CHILD_PHYSICAL_GEAR';
  @Input() programLabel: string;
  @Input() canEditGear = false;
  @Input() canEditRankOrder = false;
  @Input() allowChildrenGears: boolean
  @Input() showGear = true;
  @Input() maxVisibleButtons: number;

  @Output() onSearchButtonClick = createPromiseEventEmitter<PhysicalGear>();

  @ViewChild(PhysicalGearForm, {static: true}) physicalGearForm: PhysicalGearForm;
  @ViewChild('childrenTable') childrenTable: AppMeasurementsTable<PhysicalGear, PhysicalGearFilter> & {value: PhysicalGear[]};

  get form(): FormGroup {
    return this.physicalGearForm.form;
  }

  get valid(): boolean {
    return super.valid && (!this._showChildrenTable || (this.childrenTable && this.childrenTable.totalRowCount > 0));
  }

  get invalid(): boolean {
    return super.invalid || (this._showChildrenTable && (!this.childrenTable || this.childrenTable.totalRowCount <= 0));
  }

  constructor(injector: Injector,
    protected translateContext: TranslateContextService,
    protected cd: ChangeDetectorRef
  ) {
    super(injector, PhysicalGear, {
      tabCount: 2,
      i18nPrefix: 'TRIP.PHYSICAL_GEAR.EDIT.',
      enableSwipe: false
    })

    // Default values
    this._logPrefix = '[physical-gear-modal] ';
    this.acquisitionLevel = AcquisitionLevelCodes.PHYSICAL_GEAR;
    this.tabGroupAnimationDuration = this.mobile ? this.tabGroupAnimationDuration : '0s';

    // TODO: for DEV only
    this.debug = !environment.production;
  }

  async ngOnInit(): Promise<void> {
    this.allowChildrenGears = toBoolean(this.allowChildrenGears, true);

    await super.ngOnInit();

  }

  protected registerForms() {
    this.addChildForms([
      this.physicalGearForm,
      this.childrenTable
    ])
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.onSearchButtonClick?.complete();
    this.onSearchButtonClick?.unsubscribe();
  }

  async ngAfterViewInit() {
    await super.ngAfterViewInit();

    // Show/Hide children table
    if (this.allowChildrenGears) {
      this.registerSubscription(
        this.physicalGearForm.form.get('gear').valueChanges
          .subscribe(gear =>{
            this.$gear.next(gear);
            const gearId = gear?.id;
            this.$gearId.next(toNumber(gearId, INVALID_GEAR_ID));
            if (this._showChildrenTable && isNil(gearId)) {
              this._showChildrenTable = false;
              this.markForCheck();
            }
          })
      )
      this.registerSubscription(
        this.childrenTable.$pmfms
          .subscribe(pmfms => {
            const hasChildrenPmfms = (pmfms||[]).filter(p => p.id !== PmfmIds.GEAR_LABEL).length > 0;
            if (this._showChildrenTable !== hasChildrenPmfms) {
              this._showChildrenTable = hasChildrenPmfms;
              this.markForCheck();
            }
          })
      );
    }
    // Focus on the first field, is not in mobile
     if (this.isNewData && !this.mobile && this.enabled) {
       setTimeout(() => this.physicalGearForm.focusFirstInput(), 400);
     }

  }

  async openSearchModal(event?: UIEvent) {

    if (this.onSearchButtonClick.observers.length === 0) return; // Skip

    // Emit event, then wait for a result
    try {
      const selectedData = await emitPromiseEvent(this.onSearchButtonClick, 'copyPreviousGear');

      // No result (user cancelled): skip
      if (!selectedData) return;

      // Create a copy
      const data = PhysicalGear.fromObject({
        gear: selectedData.gear,
        rankOrder: selectedData.rankOrder,
        // Convert measurementValues as JSON, in order to force values of not required PMFM to be converted, in the form
        measurementValues: MeasurementValuesUtils.asObject(selectedData.measurementValues, {minify: true}),
        measurements: selectedData.measurements,
      }).asObject();

      if (!this.canEditRankOrder) {
        // Apply computed rankOrder
        data.rankOrder = this.data.rankOrder;
      }

      // Apply to form
      console.debug('[physical-gear-modal] Paste selected gear:', data);
      await this.setValue(data);
      this.markAsDirty();
    }
    catch (err) {
      if (err === 'CANCELLED') return; // Skip
      this.setError(err);
      this.scrollToTop();
    }
  }

  /* -- protected functions -- */

  protected async setValue(data: PhysicalGear) {

    await this.physicalGearForm.setValue(this.data);

    if (this.allowChildrenGears) {
      await waitFor(() => !!this.childrenTable);
      this.childrenTable.markAsReady();
      this.childrenTable.gearId = data.gear?.id;
      this.childrenTable.value = data.children || [];
    }
  }

  protected async getJsonValueToSave(): Promise<any> {
    const data = await super.getJsonValueToSave();

    if (this.allowChildrenGears) {
      data.children = this.childrenTable.value;
    }
    else {
      data.children = null;
    }
    return data;
  }

  protected computeTitle(data?: PhysicalGear): Promise<string> {
    data = data || this.data;

    if (this.isNewData || !data) {
      return this.translateContext.instant('TRIP.PHYSICAL_GEAR.NEW.TITLE', this.i18nSuffix);
    }
    else {
      const label = data?.measurementValues[PmfmIds.GEAR_LABEL] || ('#' + data.rankOrder);
      return this.translateContext.instant('TRIP.PHYSICAL_GEAR.EDIT.TITLE', this.i18nSuffix, { label });
    }
  }

  protected getFirstInvalidTabIndex(): number {
    if (this.allowChildrenGears && this.childrenTable?.invalid) return 1;
    return 0;
  }
}
