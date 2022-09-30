import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Injector, Input, OnDestroy, OnInit, Output, Self, ViewChild, ViewEncapsulation } from '@angular/core';
import { AcquisitionLevelCodes, AcquisitionLevelType, PmfmIds } from '@app/referential/services/model/model.enum';
import { PhysicalGearForm } from './physical-gear.form';
import {
  AppEntityEditorModal,
  createPromiseEventEmitter,
  emitPromiseEvent,
  firstNotNil,
  IEntityEditorModalOptions,
  InMemoryEntitiesService,
  isNil,
  isNotEmptyArray, isNotNil, PromiseEvent,
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
import { PhysicalGearFilter } from '@app/trip/physicalgear/physical-gear.filter';
import { BehaviorSubject } from 'rxjs';
import { PHYSICAL_GEAR_DATA_SERVICE_TOKEN } from '@app/trip/physicalgear/physicalgear.service';
import { PhysicalGearTable } from '@app/trip/physicalgear/physical-gears.table';
import { switchMap, tap } from 'rxjs/operators';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';

export interface IPhysicalGearModalOptions
  extends IEntityEditorModalOptions<PhysicalGear> {

  helpMessage: string;

  acquisitionLevel: string;
  programLabel: string;

  showSearchButton: boolean;
  showGear: boolean;
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
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: PHYSICAL_GEAR_DATA_SERVICE_TOKEN,
      useFactory: () => new InMemoryEntitiesService(PhysicalGear, PhysicalGearFilter, {
        equals: PhysicalGear.equals
      })
    }
  ]
})
export class PhysicalGearModal
  extends AppEntityEditorModal<PhysicalGear>
  implements OnInit, OnDestroy, AfterViewInit, IPhysicalGearModalOptions {

  showChildrenTable = false;
  $gear = new BehaviorSubject<ReferentialRef>(null);
  $gearId = new BehaviorSubject<number>(INVALID_GEAR_ID);
  $childrenTable = new BehaviorSubject<PhysicalGearTable>(undefined);

  @Input() helpMessage: string = 'Veullez';
  @Input() acquisitionLevel: string;
  @Input() childAcquisitionLevel: AcquisitionLevelType = 'CHILD_PHYSICAL_GEAR';
  @Input() programLabel: string;
  @Input() canEditGear = false;
  @Input() canEditRankOrder = false;
  @Input() allowChildrenGears: boolean
  @Input() showGear = true;
  @Input() showSearchButton = true;
  @Input() maxVisibleButtons: number;

  @Output() onSearchButtonClick = createPromiseEventEmitter<PhysicalGear>();

  @ViewChild(PhysicalGearForm, {static: true}) physicalGearForm: PhysicalGearForm;

  get form(): FormGroup {
    return this.physicalGearForm.form;
  }

  get childrenTable(): PhysicalGearTable {
    return this.$childrenTable.value;
  }

  get valid(): boolean {
    return super.valid && (!this.showChildrenTable || (this.childrenTable && this.childrenTable.totalRowCount > 0));
  }

  get invalid(): boolean {
    return super.invalid || (this.showChildrenTable && (!this.childrenTable || this.childrenTable.totalRowCount <= 0));
  }

  get gearId(): number {
    return this.$gear.value?.id;
  }

  constructor(injector: Injector,
              protected translateContext: TranslateContextService,
              @Self() @Inject(PHYSICAL_GEAR_DATA_SERVICE_TOKEN) protected childrenGearService: InMemoryEntitiesService<PhysicalGear, PhysicalGearFilter>,
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

  ngOnInit() {
    this.allowChildrenGears = toBoolean(this.allowChildrenGears, true);

    super.ngOnInit();

    if (this.enabled && this.isNewData) {
      this.markAsLoaded();
    }
  }

  protected registerForms() {
    this.addChildForms([
      this.physicalGearForm,
      // Will be included by (ngInit)= (see template)
      //this.childrenTable
    ])
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.onSearchButtonClick.unsubscribe();
    this.childrenGearService.stop();
  }

  async ngAfterViewInit() {
    await super.ngAfterViewInit();

    this.registerSubscription(
      this.physicalGearForm.form.get('gear')
        .valueChanges
        .subscribe(gear =>{
          this.$gear.next(gear);

          // Always put a not nil id
          this.$gearId.next(toNumber(gear?.id, INVALID_GEAR_ID));

          // Auto-hide children table, if new gear is null
          if (this.showChildrenTable && isNil(this.gearId)) {
            this.showChildrenTable = false;
            this.markForCheck();
          }
        })
    )

    if (this.allowChildrenGears) {

      this.registerSubscription(
        firstNotNil(this.$childrenTable)
          .pipe(
            // Add children table to the editor
            tap(table => {
              this.addChildForm(table);
              table.setModalOption('helpMessage', this.helpMessage);
              table.setModalOption('maxVisibleButtons', this.maxVisibleButtons);
            }),
            // Listen pmfm changed
            switchMap(table => table.$pmfms),
            tap(pmfms => {
              // Check if table has something to display (some PMFM in the strategy)
              const childrenHasSomePmfms = (pmfms||[]).some(p =>
                // Exclude label PMFM
                p.id !== PmfmIds.GEAR_LABEL
                // Exclude Pmfm on all gears (e.g. GEAR_LABEL)
                && (!PmfmUtils.isDenormalizedPmfm(p) || isNotEmptyArray(p.gearIds)));

              if (this.showChildrenTable !== childrenHasSomePmfms && isNotNil(this.gearId)) {
                this.showChildrenTable = childrenHasSomePmfms;
                this.markForCheck();
              }
            })
          )
          .subscribe()
      );
    }
    // Focus on the first field, is not in mobile
     if (this.isNewData && !this.mobile && this.enabled) {
       setTimeout(() => this.physicalGearForm.focusFirstInput(), 400);
     }

  }

  registerChildrenTable(value: PhysicalGearTable) {
    this.$childrenTable.next(value);
  }

  async openSearchModal(event?: UIEvent) {

    if (this.onSearchButtonClick.observers.length === 0) return; // Skip

    // Emit event, then wait for a result
    try {
      const selectedData = await emitPromiseEvent(this.onSearchButtonClick, this.acquisitionLevel);

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

  // Change to public, to be able to force refresh
  public markForCheck() {
    this.cd.markForCheck();
  }

  /* -- protected functions -- */

  protected async setValue(data: PhysicalGear) {

    try {
      // Save children, before reset (not need in the main form)
      const children = data.children;
      data.children = undefined;

      // Set main form
      await this.physicalGearForm.setValue(data);

      if (this.allowChildrenGears) {
        await waitFor(() => !!this.childrenTable);

        this.$gear.next(data.gear);
        this.childrenTable.gearId = data.gear?.id;
        this.childrenTable.markAsReady();
        this.childrenGearService.value = children || [];
        await this.childrenTable.waitIdle();

        // Restore children
        data.children = children;
      }
    }
    catch (err) {
      if (err === 'CANCELLED') return; // Skip
      this.setError(err);
    }
  }

  protected async getValue(): Promise<PhysicalGear> {
    const data = PhysicalGear.fromObject(this.physicalGearForm.value);

    if (this.allowChildrenGears) {
      if (this.childrenTable.dirty) {
        await this.childrenTable.save();
      }
      data.children = this.childrenGearService.value;
    }
    else {
      data.children = null;
    }
    return data;
  }

  protected async getJsonValueToSave(): Promise<any> {
    console.warn('Should not used this method! Because form and childrenTable always return Entities!');
    const data = await this.getValue();
    return data.asObject();
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

  /**
   * Open a modal to select a previous child gear
   * @param event
   */
  async openSearchChildrenModal(event: PromiseEvent<PhysicalGear>) {
    if (!event || !event.detail.success) return; // Skip (missing callback)

    if (this.onSearchButtonClick.observers.length === 0) {
      event.detail.error('CANCELLED');
      return; // Skip
    }

    // Emit event, then wait for a result
    try {
      const selectedData = await emitPromiseEvent(this.onSearchButtonClick, event.type);

      if (selectedData) {
        // Create a copy
        const data = PhysicalGear.fromObject({
          gear: selectedData.gear,
          rankOrder: selectedData.rankOrder,
          // Convert measurementValues as JSON, in order to force values of not required PMFM to be converted, in the form
          measurementValues: MeasurementValuesUtils.asObject(selectedData.measurementValues, {minify: true}),
          measurements: selectedData.measurements
        }).asObject();
        event.detail.success(data);
      }

      // User cancelled
      else {
        event.detail.error('CANCELLED');
      }
    }
    catch (err) {
      console.error(err)
      event.detail?.error(err);
    }
  }
}
