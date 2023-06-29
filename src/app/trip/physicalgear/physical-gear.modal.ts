import {AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Injector, Input, OnDestroy, OnInit, Output, Self, ViewChild} from '@angular/core';
import {AcquisitionLevelCodes, AcquisitionLevelType, PmfmIds, QualityFlagIds} from '@app/referential/services/model/model.enum';
import {PhysicalGearForm} from './physical-gear.form';
import {
  AppEntityEditorModal,
  createPromiseEventEmitter,
  emitPromiseEvent,
  firstNotNilPromise,
  IEntityEditorModalOptions,
  InMemoryEntitiesService,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  PromiseEvent,
  ReferentialRef,
  toBoolean,
  toNumber,
  TranslateContextService
} from '@sumaris-net/ngx-components';
import {MeasurementValuesUtils} from '@app/data/measurement/measurement.model';
import {PhysicalGear} from '@app/trip/physicalgear/physical-gear.model';
import {UntypedFormGroup} from '@angular/forms';
import {PhysicalGearFilter} from '@app/trip/physicalgear/physical-gear.filter';
import {PHYSICAL_GEAR_DATA_SERVICE_TOKEN} from '@app/trip/physicalgear/physicalgear.service';
import {PhysicalGearTable} from '@app/trip/physicalgear/physical-gears.table';
import {filter, switchMap} from 'rxjs/operators';
import {IPmfm, PmfmUtils} from '@app/referential/services/model/pmfm.model';
import {slideDownAnimation} from '@app/shared/material/material.animation';
import {RxState} from '@rx-angular/state';
import {environment} from '@environments/environment';

export interface IPhysicalGearModalOptions
  extends IEntityEditorModalOptions<PhysicalGear> {

  helpMessage: string;

  acquisitionLevel: string;
  programLabel: string;
  tripId: number;

  showSearchButton: boolean;
  showGear: boolean;
  canEditGear: boolean;
  canEditRankOrder: boolean;
  allowChildrenGears: boolean;
  minChildrenCount: number;

  // UI
  maxVisibleButtons?: number;
  maxItemCountForButtons?: number;
}

const INVALID_GEAR_ID = -999;

interface ComponentState {
  gear: ReferentialRef;
  gearId: number;
  showChildrenTable: boolean;
  childrenTable: PhysicalGearTable;
  childrenPmfms: IPmfm[];
}

@Component({
  selector: 'app-physical-gear-modal',
  templateUrl: './physical-gear.modal.html',
  styleUrls: ['./physical-gear.modal.scss'],
  providers: [
    {
      provide: PHYSICAL_GEAR_DATA_SERVICE_TOKEN,
      useFactory: () => new InMemoryEntitiesService(PhysicalGear, PhysicalGearFilter, {
        equals: PhysicalGear.equals,
        sortByReplacement: {'id': 'rankOrder'}
      })
    },
    RxState
  ],
  animations: [
    slideDownAnimation
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhysicalGearModal
  extends AppEntityEditorModal<PhysicalGear>
  implements OnInit, OnDestroy, AfterViewInit, IPhysicalGearModalOptions {

  gear$ = this._state.select('gear');
  gearId$ = this._state.select('gearId');
  childrenTable$ = this._state.select('childrenTable');
  showChildrenTable$ = this._state.select('showChildrenTable');

  @Input() helpMessage: string;
  @Input() acquisitionLevel: string;
  @Input() childAcquisitionLevel: AcquisitionLevelType = 'CHILD_PHYSICAL_GEAR';
  @Input() programLabel: string;
  @Input() tripId: number;
  @Input() canEditGear = false;
  @Input() canEditRankOrder = false;
  @Input() allowChildrenGears: boolean
  @Input() minChildrenCount: number = 2;
  @Input() showGear = true;
  @Input() showSearchButton = true;
  @Input() maxVisibleButtons: number;
  @Input() maxItemCountForButtons: number = 12;

  @Output() onSearchButtonClick = createPromiseEventEmitter<PhysicalGear>();

  @ViewChild(PhysicalGearForm, {static: true}) physicalGearForm: PhysicalGearForm;

  get form(): UntypedFormGroup {
    return this.physicalGearForm.form;
  }

  get childrenTable(): PhysicalGearTable {
    return this._state.get('childrenTable');
  }

  set childrenTable(table: PhysicalGearTable) {
    this._state.set('childrenTable', () => table);
  }

  get showChildrenTable(): boolean {
    return this._state.get('showChildrenTable');
  }

  set showChildrenTable(value: boolean) {
    this._state.set('showChildrenTable', _ => value);
  }


  constructor(injector: Injector,
              protected translateContext: TranslateContextService,
              @Self() @Inject(PHYSICAL_GEAR_DATA_SERVICE_TOKEN) protected childrenGearService: InMemoryEntitiesService<PhysicalGear, PhysicalGearFilter>,
              protected _state: RxState<ComponentState>,
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

    if (this.enabled && this.isNew) {
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

    this._state.connect('gear',  this.physicalGearForm.form.get('gear').valueChanges);
    this._state.connect('gearId',  this._state.select('gear'),
      (_, gear) => toNumber(gear?.id, INVALID_GEAR_ID));

    if (this.allowChildrenGears) {

      this._state.connect('childrenPmfms', this._state.select('childrenTable')
        .pipe(
          filter(isNotNil),
          switchMap((table) => table.$pmfms)
        ), (_, pmfms) => {
        console.debug('[physical-gear-modal] Receiving new pmfms', pmfms);
        return pmfms;
      });

      this._state.connect('showChildrenTable',
        this._state.select(['childrenPmfms', 'gearId'], ({childrenPmfms, gearId}) => {
            // DEBUG
            console.debug('[physical-gear-modal] Should show children table ?', childrenPmfms, gearId);

            // Check if table has something to display (some PMFM in the strategy)
            const childrenHasSomePmfms = (childrenPmfms||[]).some(p =>
              // Exclude Pmfm on all gears (e.g. GEAR_LABEL)
              PmfmUtils.isDenormalizedPmfm(p) && isNotEmptyArray(p.gearIds)
              // Keep only if applied to the selected gear (if any)
              // We need to filter by gearId, because sometimes the table pmfms are outdated (e.g. on a previous gearId)
              && (isNil(gearId) || p.gearIds.includes(gearId))
            );

            return (childrenPmfms && isNotNil(gearId) && gearId !== INVALID_GEAR_ID)
              ? childrenHasSomePmfms
              : null;
          })
      );

      this._state.hold(this.showChildrenTable$, () => this.updateChildrenTableState());
    }
    else {
      this.showChildrenTable = false;
    }

    // Focus on the first field, is not in mobile
    if (this.isNew && !this.mobile && this.enabled) {
       setTimeout(() => this.physicalGearForm.focusFirstInput(), 400);
    }
  }

  async openSearchModal(event?: Event) {

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

  initChildrenTable(table: PhysicalGearTable) {
    // DEBUG
    console.debug('[physical-gear-modal] Init children table', table);

    // Add children table to the editor
    this.addChildForm(table);

    // Configure table
    table.setModalOption('helpMessage', this.helpMessage);
    table.setModalOption('maxVisibleButtons', this.maxVisibleButtons);
    table.setModalOption('maxItemCountForButtons', this.maxItemCountForButtons);

    // Update state
    this.childrenTable = table;

    this.updateChildrenTableState();
  }

  updateViewState(data: PhysicalGear, opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.updateViewState(data, opts);
    this.updateChildrenTableState(opts);

    // Restore error
    const errorMessage = this.enabled && this.usageMode === 'DESK' && isNil(data.controlDate) ? data.qualificationComments : undefined;
    if (isNotNilOrBlank(errorMessage)) {
      console.info('[physical-gear-modal] Restore error from qualificationComments : ', errorMessage);

      // Clean quality flags
      this.form.patchValue({
        qualificationComments: null,
        qualityFlagId: QualityFlagIds.NOT_QUALIFIED
      }, {emitEvent: false});

      setTimeout(() => {
        this.markAllAsTouched();
        this.form.updateValueAndValidity();

        // Replace newline by a <br> tag, then display
        this.setError(errorMessage.replace(/(\n|\r|<br\/>)+/g, '<br/>'));
      });
    }
  }

  updateChildrenTableState(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    const table = this.childrenTable;
    if (!table) return; // Skip

    const enabled = this.enabled && this.showChildrenTable === true;
    if (enabled && !table.enabled) {
      console.debug('[physical-gear-modal] Enable children table');
      table.enable();
    }
    else if (!enabled && table.enabled) {
      console.debug('[physical-gear-modal] Disable children table');
      table.disable();
    }
  }

  protected async setValue(data: PhysicalGear) {

    // Save children, before reset (not need in the main form)
    const children = data.children;
    data.children = undefined;

    // Set main form
    await this.physicalGearForm.setValue(data);

    if (this.allowChildrenGears) {
      const childrenTable = await firstNotNilPromise(this.childrenTable$, {stop: this.destroySubject, stopError: false});

      childrenTable.gearId = data.gear?.id;
      childrenTable.markAsReady();
      this.childrenGearService.value = children || [];
      await childrenTable.waitIdle({timeout: 2000, stop: this.destroySubject, stopError: false});

      // Restore children
      data.children = children;
    }
  }

  protected async getValue(): Promise<PhysicalGear> {
    const data = PhysicalGear.fromObject(this.physicalGearForm.value);

    if (this.allowChildrenGears && this.showChildrenTable) {
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

  async saveAndClose(event?: Event): Promise<boolean> {
    const valid = await super.saveAndClose(event);
    if (!valid) {
      // Need to mark table as touched, to show not enough row error
      this.markAllAsTouched();
    }
    return valid;
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
    if (this.showChildrenTable && this.childrenTable?.invalid) return 1;
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
