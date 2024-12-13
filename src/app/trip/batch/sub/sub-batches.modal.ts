import { ChangeDetectionStrategy, Component, Inject, Injector, Input, OnInit, ViewChild } from '@angular/core';
import { TableElement } from '@e-is/ngx-material-table';
import { Batch } from '../common/batch.model';
import {
  Alerts,
  AppFloatLabelType,
  AppFormUtils,
  AudioProvider,
  firstNotNilPromise,
  FormFieldDefinition,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  isNumber,
  LoadResult,
  LocalSettingsService,
  NetworkService,
  PlatformService,
  SharedValidators,
  sleep,
  suggestFromArray,
  toBoolean,
  UsageMode,
} from '@sumaris-net/ngx-components';
import {
  SUB_BATCH_RESERVED_END_COLUMNS,
  SUB_BATCHES_TABLE_OPTIONS,
  SubBatchesTable,
  SubBatchesTableState,
  SubBatchFilter,
} from './sub-batches.table';
import { BaseMeasurementsTableConfig } from '@app/data/measurement/measurements-table.class';
import { Animation, IonContent, ModalController } from '@ionic/angular';
import { debounceTime, distinctUntilChanged, isObservable, Observable, skip, Subject, Subscription } from 'rxjs';
import { createAnimation } from '@ionic/core';
import { SubBatch } from './sub-batch.model';
import { BatchGroup, BatchGroupUtils } from '../group/batch-group.model';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { APP_MAIN_CONTEXT_SERVICE, ContextService } from '@app/shared/context.service';
import { environment } from '@environments/environment';
import { AcquisitionLevelCodes, ModalMode, ModalModeEnum, WeightUnitSymbol } from '@app/referential/services/model/model.enum';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { SelectionModel } from '@angular/cdk/collections';
import { BatchContext, SubBatchValidatorService } from '@app/trip/batch/sub/sub-batch.validator';
import { RxState } from '@rx-angular/state';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { FormBuilder, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { AppSharedFormUtils } from '@app/shared/forms.utils';

export interface ISubBatchesModalOptions {
  disabled: boolean;
  showParentGroup: boolean;
  showTaxonNameColumn: boolean;
  showIndividualCount: boolean;
  showWeightColumn?: boolean;

  weightDisplayUnit?: WeightUnitSymbol | 'auto';
  weightDisplayDecimals?: number;

  // UI options
  floatLabel: AppFloatLabelType;
  maxVisibleButtons: number;
  maxItemCountForButtons: number;
  buttonsColCount: number;
  i18nSuffix: string;
  mobile: boolean;
  usageMode: UsageMode;
  showBluetoothIcon: boolean;
  playSound: boolean;
  defaultIsIndividualCountOnly: boolean;
  settingsId: string;

  programLabel: string;
  requiredStrategy: boolean;
  strategyId: number;
  requiredGear: boolean;
  gearId: number;

  parentGroup: BatchGroup;

  availableParents: BatchGroup[] | Observable<BatchGroup[]>;
  data: SubBatch[] | Observable<SubBatch[]>;
  onNewParentClick: () => Promise<BatchGroup | undefined>;

  canDebug: boolean;
  allowIndividualCountOnly: boolean;
  showIndividualCountOnly: boolean;
  animationDuration: number;
}

export const SUB_BATCH_MODAL_RESERVED_START_COLUMNS: string[] = ['parentGroup', 'taxonName'];
export const SUB_BATCH_MODAL_RESERVED_END_COLUMNS: string[] = SUB_BATCH_RESERVED_END_COLUMNS; //.filter((col) => col !== 'individualCount');

export interface SubBatchesModalState extends SubBatchesTableState {}

@Component({
  selector: 'app-sub-batches-modal',
  styleUrls: ['sub-batches.modal.scss'],
  templateUrl: 'sub-batches.modal.html',
  providers: [
    {
      provide: ContextService,
      useFactory: (mainContext: ContextService) => {
        // Merge parent and children states
        const initialState = mainContext.getMerged();
        console.debug('[sub-batches-modal] Creating batch context, using state:', initialState);
        return new ContextService<BatchContext>(initialState);
      },
      deps: [APP_MAIN_CONTEXT_SERVICE],
    },
    { provide: SubBatchValidatorService, useClass: SubBatchValidatorService },
    {
      provide: SUB_BATCHES_TABLE_OPTIONS,
      useFactory: (settings: LocalSettingsService) =>
        <BaseMeasurementsTableConfig<SubBatch>>{
          prependNewElements: settings.mobile,
          suppressErrors: true,
          reservedStartColumns: SUB_BATCH_MODAL_RESERVED_START_COLUMNS,
          reservedEndColumns: SUB_BATCH_MODAL_RESERVED_END_COLUMNS,
          restoreCompactMode: false, // Avoid to restore to earlier, BEFORE the settingsId has been computed
        },
      deps: [LocalSettingsService],
    },
    RxState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubBatchesModal extends SubBatchesTable<SubBatchesModalState> implements OnInit, ISubBatchesModalOptions {
  private _initialMaxRankOrder: number;
  private _previousMaxRankOrder: number;
  private _hiddenData: SubBatch[];
  private _isOnFieldMode: boolean;
  private _footerRowsSubscription: Subscription;
  protected titleSubject = new Subject<string>();

  protected animationSelection = new SelectionModel<TableElement<SubBatch>>(false, []);
  protected modalForm: UntypedFormGroup;
  protected showSubBatchFormControl: UntypedFormControl;
  protected individualCountControl: UntypedFormControl;
  protected pmfmFilterDefinition: FormFieldDefinition;
  protected virtualPmfms: DenormalizedPmfmStrategy[];
  protected footerValues: { [key: string]: number } = {};
  modalMode: ModalMode = ModalModeEnum.IndividualCount;
  rowsAreMerged: boolean = false;
  canShowEnumeration: boolean = true;

  get selectedRow(): TableElement<SubBatch> {
    return this.singleSelectedRow || this.editedRow;
  }
  set selectedRow(row: TableElement<SubBatch>) {
    this.selection.clear();
    if (row) this.selection.select(row);
    this.markForCheck();
  }

  get dirty(): boolean {
    return super.dirty || (this.form && this.form.dirty);
  }

  get valid(): boolean {
    return this.form && this.form.valid;
  }

  get invalid(): boolean {
    return this.form && this.form.invalid;
  }

  get showIndividualCountOnly(): boolean {
    return this.showSubBatchFormControl.value === false;
  }
  @Input() set showIndividualCountOnly(value: boolean) {
    this.showSubBatchFormControl.setValue(!value);
  }

  get showSubBatchForm(): boolean {
    return this.showSubBatchFormControl.value !== false;
  }
  @Input() set showSubBatchForm(value: boolean) {
    this.showSubBatchFormControl.setValue(value);
  }

  @Input() onNewParentClick: () => Promise<BatchGroup | undefined>;
  @Input() data: SubBatch[] | Observable<SubBatch[]>;
  @Input() showParentGroup: boolean;
  @Input() parentGroup: BatchGroup;
  @Input() maxVisibleButtons: number;
  @Input() buttonsColCount: number;
  @Input() maxItemCountForButtons: number;
  @Input() playSound: boolean;
  @Input() showBluetoothIcon = false;
  @Input() canDebug: boolean;
  @Input() allowIndividualCountOnly: boolean;
  @Input() defaultIsIndividualCountOnly: boolean;
  @Input() animationDuration = 1500; // 1.5s
  @Input() floatLabel: AppFloatLabelType = 'auto';
  @Input() showFilterForm: boolean = false;

  @Input() set i18nSuffix(value: string) {
    this.i18nColumnSuffix = value;
  }

  get i18nSuffix(): string {
    return this.i18nColumnSuffix;
  }

  @ViewChild('content') content: IonContent;

  constructor(
    injector: Injector,
    settings: LocalSettingsService,
    validatorService: SubBatchValidatorService,
    protected viewCtrl: ModalController,
    protected audio: AudioProvider,
    protected platform: PlatformService,
    protected formBuilder: UntypedFormBuilder,
    private fb: FormBuilder,
    private networkService: NetworkService,
    @Inject(SUB_BATCHES_TABLE_OPTIONS) options: BaseMeasurementsTableConfig<SubBatch>
  ) {
    super(injector, settings.mobile ? null : validatorService /*no validator = not editable*/, options);
    this.inlineEdition = !this.mobile; // Disable row edition (no validator)
    this.confirmBeforeDelete = true; // Ask confirmation before delete
    this.allowRowDetail = false; // Disable click on a row
    this.defaultSortBy = 'id';
    this.defaultSortDirection = settings.mobile ? 'desc' : 'asc';
    this.selection = new SelectionModel<TableElement<SubBatch>>(!this.mobile);
    this.modalForm = this.formBuilder.group({
      showSubBatchForm: [true, Validators.required],
      individualCount: [null, [SharedValidators.integer, Validators.required, Validators.min(0)]],
    });
    this.showSubBatchFormControl = this.modalForm.get('showSubBatchForm') as UntypedFormControl;
    this.individualCountControl = this.modalForm.get('individualCount') as UntypedFormControl;
    this.filterPanelFloating = false;

    // default values
    this.showCommentsColumn = false;
    this.showParentGroupColumn = false;
    this.settingsId = 'sub-batches-modal';
    this.filterForm = this.formBuilder.group({
      taxonName: [null],
      pmfm: [null],
      minValue: [null],
      maxValue: [null],
    });
  }

  ngOnInit() {
    this.buttonsColCount = this.buttonsColCount ?? 3;
    this.canDebug = toBoolean(this.canDebug, !environment.production);
    this.canEdit = this._enabled;
    this.debug = this.canDebug && toBoolean(this.settings.getPageSettings(this.settingsId, 'debug'), false);

    if (this.disabled) {
      this.showForm = false;
      this.disable();
    }

    super.ngOnInit();

    // default values
    this.mobile = toBoolean(this.mobile, this.platform.mobile);
    this._isOnFieldMode = this.settings.isOnFieldMode(this.usageMode);
    this.showToolbar = this._enabled && this.inlineEdition; // Hide toolbar if not used
    this.showParentGroup = toBoolean(this.showParentGroup, true);
    this.showIndividualCount = toBoolean(this.showIndividualCount, !this._isOnFieldMode); // Hide individual count on mobile device
    this.showForm = this._enabled && this.showForm && this.form && true;
    this.playSound = toBoolean(this.playSound, this.mobile);
    this.showBluetoothIcon = this.showBluetoothIcon && this._enabled && this.platform.isApp();
    this.allowIndividualCountOnly = toBoolean(this.allowIndividualCountOnly, false) && !this.showParentGroup && !this.qvPmfm;
    this.showFilterForm = !this.mobile && !this.showIndividualCountOnly;

    this.pmfmFilterDefinition = {
      key: 'pmfm',
      type: 'entity',
      label: 'TRIP.BATCH.TABLE.FILTER.PMFM_CRITERIA',
      required: false,
      autocomplete: this.registerAutocompleteField('pmfm', {
        suggestFn: (value, opts) => this.suggestPmfms(value, opts),
        attributes: ['completeName'],
        columnNames: ['TRIP.BATCH.TABLE.FILTER.PMFM_CRITERIA'],
        showAllOnFocus: true,
      }),
    };

    this.markAsReady();

    this.load();

    // Add footer listener
    this.registerSubscription(this.pmfms$.subscribe((pmfms) => this.addFooterListener(pmfms)));
  }

  async load() {
    try {
      // Wait for table pmfms
      const pmfms = await firstNotNilPromise(this.pmfms$, { stop: this.destroySubject, stopError: false });

      await this.initForm(pmfms);

      // Read data
      const data = isObservable(this.data) ? await this.data.toPromise() : this.data;

      // Update individual count column display depending on sub batches individual counts
      this.showIndividualCount = !this.mobile || data.some((subBatch) => subBatch.individualCount > 1);
      this.updateColumns();

      await this.restoreCompactMode();

      // Apply data to table
      await this.setValue(data);

      // Compute the title
      await this.computeTitle();

      await this.setShowEnumeration();

      if (this.canShowEnumeration) {
        this.registerSubscription(
          this.modalForm
            .get('showSubBatchForm')
            .valueChanges.pipe(distinctUntilChanged())
            .subscribe((value) => {
              if (value) {
                this.resetFilter();
              } else {
                this.closeFilterPanel();
              }
            })
        );
      }
    } catch (err) {
      console.error(this.logPrefix + 'Error while loading modal');
    }
  }

  async initForm(pmfms: IPmfm[]) {
    if (!pmfms || !this.form) return; // skip

    // Configure form's properties
    this.form.qvPmfm = this.qvPmfm;
    this.form.showFreezeQvPmfms = true; // TODO: Program option?

    // Mark form as ready
    this.form.markAsReady();

    await this.form.ready();

    // Reset the form, using default value
    let defaultBatch: SubBatch;
    if (this.parentGroup) {
      defaultBatch = new SubBatch();
      defaultBatch.parentGroup = this.parentGroup;
    }
    await this.resetForm(defaultBatch);

    // Update table content when changing parent
    this.registerSubscription(
      this.form.form
        .get('parentGroup')
        .valueChanges // Init table with existing values
        //.pipe(startWith(() => this._defaultValue && this._defaultValue.parent))
        .subscribe((parent) => this.onParentChanges(parent))
    );
  }

  markAsReady() {
    super.markAsReady();

    // Should be done inside initForm(), when pmfms has set
    //this.form?.markAsReady();
  }

  disable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.disable(opts);
    this.modalForm.disable(opts);
  }

  async ready() {
    await this.form?.ready();
  }

  async setValue(data: SubBatch[], opts?: { emitEvent?: boolean }) {
    // Compute the first rankOrder to save
    this._initialMaxRankOrder = (data || []).reduce((max, b) => Math.max(max, b.rankOrder || 0), 0);

    // // Show individual count only field
    // this.showIndividualCountOnly = this.allowIndividualCountOnly && (await BatchGroupUtils.hasSamplingIndividualCountOnly(this.parentGroup, data));

    // if (this.showIndividualCountOnly) {
    //   const samplingBatch = BatchUtils.getOrCreateSamplingChild(this.parentGroup);
    //   const individualCount = toNumber(samplingBatch?.individualCount, this.parentGroup.observedIndividualCount);
    //   this.individualCountControl.setValue(toNumber(individualCount, null));
    // }

    // DEBUG
    if (this.debug) console.debug('[sub-batches-modal] Applying value to table...', data);

    return super.setValue(data, opts);
  }

  async doSubmitForm(event?: Event): Promise<boolean> {
    await this.scrollToTop();
    const done = await super.doSubmitForm(event, this.inlineEdition ? null : this.selectedRow);

    // Forget the edited row
    if (done) {
      this.selectedRow = null;
      this.markForCheck();
    }

    return done;
  }

  protected mapPmfms(pmfms: IPmfm[]): IPmfm[] {
    pmfms = super.mapPmfms(pmfms);

    const parentTaxonGroupId = this.parentGroup && this.parentGroup.taxonGroup && this.parentGroup.taxonGroup.id;
    if (isNil(parentTaxonGroupId)) return pmfms;

    // Filter using parent's taxon group
    return pmfms.filter(
      (pmfm) => !PmfmUtils.isDenormalizedPmfm(pmfm) || isEmptyArray(pmfm.taxonGroupIds) || pmfm.taxonGroupIds.includes(parentTaxonGroupId)
    );
  }

  async cancel(event?: Event) {
    if (this.dirty) {
      const saveBeforeLeave = await Alerts.askSaveBeforeLeave(this.alertCtrl, this.translate, event);

      // User cancelled
      if (isNil(saveBeforeLeave) || (event && event.defaultPrevented)) {
        return;
      }

      // Is user confirm: close normally
      if (saveBeforeLeave === true) {
        this.close(event);
        return;
      }
    }

    await this.viewCtrl.dismiss(undefined, 'cancel');
  }

  async close(event?: Event) {
    if (this.loading) return; // avoid many call

    // Form is dirty
    if (this.form.dirty) {
      const saveBeforeLeave = await Alerts.askSaveBeforeLeave(this.alertCtrl, this.translate, event);

      // User cancelled
      if (isNil(saveBeforeLeave) || (event && event.defaultPrevented)) {
        return;
      }

      // Is user confirm: save before closing
      if (saveBeforeLeave === true) {
        const done = await this.doSubmitForm(event);
        if (!done) {
          if (this.debug && this.form.invalid) {
            AppFormUtils.logFormErrors(this.form.form, '[sub-batch-modal] ');
          }
          return;
        }
      }
      // Continue
    }

    if (this.debug) console.debug('[sub-batch-modal] Closing modal...');

    this.markAsLoading();
    this.resetError();

    // switch to individualCount mode before saving
    await this.setModalMode(ModalModeEnum.IndividualCount);

    try {
      // Save changes
      const saved = await this.save();
      if (!saved) return; // Error
      await this.viewCtrl.dismiss(this.getValue());
    } catch (err) {
      console.error(err);
      this.setError((err && err.message) || err);
      this.markAsLoaded();
    }
  }

  isNewRow(row: TableElement<Batch>): boolean {
    return row.currentData.rankOrder > this._initialMaxRankOrder;
  }

  editRow(event: UIEvent, row?: TableElement<SubBatch>): boolean {
    if (this.mobile) {
      if (!this._enabled) return false;
      row = row || this.selectedRow;
      if (!row) throw new Error('Missing row argument, or a row selection.');

      // Copy the row into the form
      this.form.setValue(this.toEntity(row), { emitEvent: true });

      // Mark the row as edited
      this.selectedRow = row;
      return true;
    } else {
      return super.editRow(event, row);
    }
  }

  selectRow(event: MouseEvent | null, row: TableElement<SubBatch>) {
    if (this.mobile) {
      if (event?.defaultPrevented || !row) return;
      if (event) event.preventDefault();

      this.selection.clear();
      this.selection.select(row);
    } else {
      super.clickRow(event, row);
    }
  }

  /* -- protected methods -- */

  protected async computeTitle() {
    let titlePrefix;
    if (!this.showParentGroup && this.parentGroup) {
      const label = BatchUtils.parentToString(this.parentGroup);
      titlePrefix = await this.translate.instant('TRIP.BATCH.EDIT.INDIVIDUAL.TITLE_PREFIX', { label });
    } else {
      titlePrefix = '';
    }
    if (this.showIndividualCountOnly) {
      this.titleSubject.next(titlePrefix + (await this.translate.instant('TRIP.BATCH.EDIT.INDIVIDUAL_COUNT.TITLE')));
    } else {
      this.titleSubject.next(titlePrefix + (await this.translate.instant('TRIP.BATCH.EDIT.INDIVIDUAL.TITLE')));
    }
  }

  protected async suggestTaxonNames(value?: any, options?: any): Promise<LoadResult<TaxonNameRef>> {
    const parentGroup = this.parentGroup;
    if (isNil(parentGroup)) return { data: [] };
    if (this.debug) console.debug(`[sub-batch-form] Searching taxon name {${value || '*'}}...`);
    return this.programRefService.suggestTaxonNames(value, {
      programLabel: this.programLabel,
      searchAttribute: options && options.searchAttribute,
      taxonGroupId: (parentGroup && parentGroup.taxonGroup && parentGroup.taxonGroup.id) || undefined,
    });
  }

  protected async onParentChanges(parent?: BatchGroup) {
    // Skip if same parent
    if (Batch.equals(this.parentGroup, parent)) return;

    // Store the new parent, in order apply filter in onLoadData()
    this.parentGroup = isNotNilOrBlank(parent) ? parent : undefined;

    // If pending changes, save new rows
    if (this.dirty) {
      const saved = await this.save();
      if (!saved) {
        console.error('Could not save the table');
        this.form.error = 'ERROR.SAVE_DATA_ERROR';
        return;
      }
    }

    // Call refresh on datasource, to force a data reload (will apply filter calling onLoadData())
    this.onRefresh.emit();

    // TODO BLA: refresh PMFM, with the new parent species ?
  }

  protected onLoadData(data: SubBatch[]): SubBatch[] {
    // Filter by parent group
    if (data && this.parentGroup) {
      const showIndividualCount = this.showIndividualCount; // Read once the getter value

      const hiddenData = [];
      let maxRankOrder = this._previousMaxRankOrder || this._initialMaxRankOrder;
      const filteredData = data.reduce((res, b) => {
        maxRankOrder = Math.max(maxRankOrder, b.rankOrder || 0);
        // Filter on individual count = 1 when individual count is hide
        // AND same parent
        if ((showIndividualCount || b.individualCount === 1 || isNotEmptyArray(this.virtualPmfms)) && Batch.equals(this.parentGroup, b.parentGroup)) {
          return res.concat(b);
        }
        hiddenData.push(b);
        return res;
      }, []);
      this._hiddenData = hiddenData;
      this._previousMaxRankOrder = maxRankOrder;
      return super.onLoadData(filteredData);
    }
    // Not filtered
    else {
      this._hiddenData = [];
      return super.onLoadData(data);
    }
  }

  protected onSaveData(data: SubBatch[]): SubBatch[] {
    // Append hidden data to the list, then save
    return data.concat(this._hiddenData || []);
  }

  protected async getMaxRankOrder(): Promise<number> {
    const rowMaxRankOrder = await super.getMaxRankOrder();
    this._previousMaxRankOrder = Math.max(rowMaxRankOrder, this._previousMaxRankOrder || this._initialMaxRankOrder);
    return this._previousMaxRankOrder;
  }

  protected async addEntityToTable(newBatch: SubBatch, opts?: { confirmCreate?: boolean; editing?: boolean }): Promise<TableElement<SubBatch>> {
    const row = await super.addEntityToTable(newBatch, opts);

    // Highlight the row, few seconds
    if (row) this.animateRow(row, true);

    return row;
  }

  protected async updateEntityToTable(
    updatedBatch: SubBatch,
    row: TableElement<SubBatch>,
    opts?: { confirmEdit?: boolean }
  ): Promise<TableElement<SubBatch>> {
    const updatedRow = await super.updateEntityToTable(updatedBatch, row, opts);

    // Highlight the row, few seconds
    if (updatedRow) this.animateRow(updatedRow, false);

    return updatedRow;
  }

  protected async onInvalidForm(): Promise<void> {
    // Play an error beep, if on field
    if (this.playSound) await this.audio.playBeepError();

    return super.onInvalidForm();
  }

  /**
   * When a row has been edited, play a beep and highlight the row (during few seconds)
   *
   * @param row
   * @param opts
   * @pram times duration of highlight
   */
  protected async animateRow(row: TableElement<SubBatch>, isNew: boolean) {
    // Play a beep
    if (this.playSound) this.audio.playBeepConfirm();

    // Selection the animated row (this will apply CSS class mat-mdc-row-animated)
    this.animationSelection.select(row);
    this.cd.detectChanges();

    this.createRowAnimation(document.querySelector('.mat-mdc-row-animated'), isNew)
      .duration(1500)
      .play()
      .then(() => {
        // If row is still selected: unselect it
        if (this.animationSelection.isSelected(row)) {
          this.animationSelection.deselect(row);
          this.markForCheck();
        }
      });
  }

  trackByFn(index: number, row: TableElement<SubBatch>): any {
    return row.currentData.rankOrder;
  }

  async scrollToTop() {
    return this.content.scrollToTop();
  }

  private createRowAnimation(rowElement: Element, isNew: boolean): Animation {
    const cellElements = rowElement && Array.from(rowElement.querySelectorAll('.mat-mdc-cell'));
    if (!rowElement || isEmptyArray(cellElements)) {
      return createAnimation();
    }

    const rowAnimation = isNew
      ? createAnimation()
          .addElement(rowElement)
          .beforeStyles({ 'transition-timing-function': 'ease-in-out', background: 'var(--ion-color-accent)' })
          .keyframes([
            { offset: 0, opacity: '0.4', transform: 'translateX(50%)', background: 'var(--ion-color-accent)' },
            { offset: 0.2, opacity: '0.9', transform: 'translateX(0%)', background: 'var(--ion-color-accent)' },
            { offset: 1, opacity: '1', transform: 'translateX(0)', background: 'var(--ion-color-base)' },
          ])
          .afterStyles({
            background: 'rgba(var(--ion-color-accent-rgb), 0.8)',
          })
      : createAnimation()
          .addElement(rowElement)
          .beforeStyles({ 'transition-timing-function': 'ease-in-out', background: 'var(--ion-color-secondary)' })
          .keyframes([
            { offset: 0, opacity: '0.4', background: 'var(--ion-color-secondary)' },
            { offset: 0.2, opacity: '0.9', background: 'var(--ion-color-secondary)' },
            { offset: 1, opacity: '1', background: 'var(--ion-color-base)' },
          ])
          .afterStyles({
            background: 'rgba(var(--ion-color-accent-rgb), 0.8)',
          });

    const cellAnimation = isNew
      ? createAnimation()
          .addElement(cellElements)
          .beforeStyles({
            'transition-timing-function': 'ease-in-out',
            color: 'var(--ion-color-accent-contrast)',
            'font-weight': 'bold',
          })
          .keyframes([
            { offset: 0, color: 'var(--ion-color-accent-contrast)', 'font-weight': 'bold', background: 'var(--ion-color-accent)' },
            { offset: 0.9, color: 'var(--ion-color-accent-contrast)', 'font-weight': 'bold', background: 'var(--ion-color-accent)' },
            { offset: 1, color: 'var(--ion-color-base)', 'font-weight': 'normal' },
          ])
          .afterStyles({
            'font-weight': '',
          })
      : createAnimation()
          .addElement(cellElements)
          .beforeStyles({
            'transition-timing-function': 'ease-in-out',
            color: 'var(--ion-color-secondary-contrast)',
            'font-weight': 'bold',
          })
          .keyframes([
            { offset: 0, color: 'var(--ion-color-secondary-contrast)', 'font-weight': 'bold' },
            { offset: 0.9, color: 'var(--ion-color-secondary-contrast)', 'font-weight': 'bold' },
            { offset: 1, color: 'var(--ion-color-base)', 'font-weight': 'normal' },
          ])
          .afterStyles({
            'font-weight': '',
          });

    return createAnimation().addAnimation([rowAnimation, cellAnimation]);
  }

  protected async closeWithIndividualCount(event?: Event) {
    if (this.loading) return; // avoid many call
    this.markAsLoading();
    this.resetError();

    try {
      if (!this.modalForm.valid) {
        await AppFormUtils.waitWhilePending(this.modalForm);

        if (!this.modalForm.invalid) {
          this.modalForm.markAllAsTouched();
          return;
        }
      }

      const parentGroup = this.form.parentGroup || this.parentGroup;
      if (this.individualCountControl.dirty) {
        const individualCount = this.individualCountControl.value;
        const samplingBatch = BatchUtils.getOrCreateSamplingChild(parentGroup);
        samplingBatch.individualCount = individualCount;
        parentGroup.observedIndividualCount = individualCount;
      }

      await this.viewCtrl.dismiss(parentGroup, 'batchGroup');
    } catch (err) {
      console.error(err);
      this.setError((err && err.message) || err);
      this.markAsLoaded();
    }
  }

  protected toggleIndividualCount() {
    this.showIndividualCount = !this.showIndividualCount;
  }

  protected async setShowEnumeration() {
    // Avoid to load if offline or mobile
    if (this.mobile || this.networkService.offline) {
      this.canShowEnumeration = false;
      return;
    }

    const pmfmsFiltered = (this.pmfms || []).filter(
      (pmfm) => !PmfmUtils.isComputed(pmfm) && ((PmfmUtils.isNumeric(pmfm) && !PmfmUtils.isVirtual(pmfm)) || PmfmUtils.isQualitative(pmfm))
    );

    this.canShowEnumeration = pmfmsFiltered.filter(PmfmUtils.isNumeric).length === 1;
  }

  protected async generateDynamicColumns(pmfm: IPmfm) {
    const virtualPmfms: DenormalizedPmfmStrategy[] = [];

    pmfm.qualitativeValues.forEach((pmfmQv, index) => {
      const virtualPmfm = new DenormalizedPmfmStrategy();
      virtualPmfm.id = -pmfmQv.id;
      virtualPmfm.name = pmfmQv.name;
      virtualPmfm.minValue = 0;
      virtualPmfm.maxValue = 999;
      virtualPmfm.isMandatory = false;
      virtualPmfm.type = 'integer';
      virtualPmfm.unitLabel = 'Nb. indiv';

      virtualPmfms.push(virtualPmfm);
    });

    if (isEmptyArray(this.virtualPmfms)) this.virtualPmfms = virtualPmfms;

    // Update columns - only show virtualPmfms, hide other columns (sex, weight....)
    // Do not add virtualPmfms if already exists in pmfms
    const missingVirtualPmfms = virtualPmfms.filter((pmfm) => !this.pmfms.some((col) => col.id === pmfm.id));
    this.pmfms = this.pmfms.concat(missingVirtualPmfms);
    this.updateColumns();
  }

  async applyFilterAndClosePanel() {
    const emptyFilter = AppSharedFormUtils.isEmptyForm(this.filterForm);

    if (emptyFilter) {
      this.resetFilter();
    } else {
      const filter = new SubBatchFilter();
      const data = this.filterForm.value;
      if (isNotNil(data.taxonName)) {
        filter.taxonNameId = data.taxonName?.id;
      }
      if (isNotNil(data.pmfm)) {
        filter.numericalPmfm = data.pmfm;
        if (isNotNil(data.maxValue)) {
          filter.numericalMaxValue = data.maxValue;
        }
        if (isNotNil(data.minValue)) {
          filter.numericalMinValue = data.minValue;
        }
      }

      await this.setModalMode(ModalModeEnum.LengthClass);
      this.setFilter(filter);
    }
  }

  async resetFilter() {
    await this.setModalMode(ModalModeEnum.IndividualCount);
    super.resetFilter();
  }

  protected async suggestPmfms(value: any, opts?: any): Promise<LoadResult<IPmfm>> {
    const pmfms = (this.pmfms || []).filter((pmfm) => !PmfmUtils.isComputed(pmfm) && PmfmUtils.isNumeric(pmfm) && !PmfmUtils.isVirtual(pmfm));
    if (isEmptyArray(pmfms)) return { data: [] };
    return suggestFromArray(pmfms, value, {
      ...opts,
      anySearch: true,
    });
  }

  protected addFooterListener(pmfms: IPmfm[]) {
    this.showFooter = true;

    // DEBUG
    console.debug(`${this.logPrefix}Show footer ?`, this.showFooter);

    // Remove previous rows listener
    if (!this.showFooter) {
      this._footerRowsSubscription?.unsubscribe();
      this._footerRowsSubscription = null;
    }
    // Create footer subscription
    else if (!this._footerRowsSubscription) {
      const footerRowsSubscription = this.dataSource
        .connect(null)
        .pipe(debounceTime(500))
        .subscribe((rows) => this.updateFooter(rows));
      footerRowsSubscription.add(() => this.unregisterSubscription(footerRowsSubscription));
      this._footerRowsSubscription = footerRowsSubscription;
    }
  }

  private updateFooter(rows: TableElement<SubBatch>[] | readonly TableElement<SubBatch>[]) {
    this.footerValues = {};

    // Individual count
    if (this.showIndividualCount) {
      const individualCounts: number[] = rows.map((row) => row.currentData.individualCount).filter(isNumber);
      this.footerValues['individualCount'] = individualCounts.reduce((sum, count) => sum + count, 0);
    }

    // Individual count for virtual columns
    this.virtualPmfms?.forEach((pmfm) => {
      this.footerValues[pmfm.id] = 0;
      rows.forEach((row) => {
        const value = row.currentData.measurementValues[pmfm.id];
        if (isNumber(value)) {
          this.footerValues[pmfm.id] += value;
        }
      });
    });

    this.markForCheck();
  }

  async generateSubBatchesFromRange(data: any) {
    await this.save();

    if (isNotNilOrBlank(data.qvPmfm)) {
      // find the qv pmfm
      const qv = this.pmfms.find((pmfm) => pmfm.id === data.qvPmfm.id);
      await this.generateDynamicColumns(qv);
      await this.setModalMode(ModalModeEnum.LengthClass);
    } else {
      // spécifique state for the modal
      await this.setModalMode(null, false);
    }
    // Create subbatches
    const subBatchesToAdd = [];
    let rankOrder = await this.getMaxRankOrder();
    for (let size = data.min; size <= data.max; size += data.precision) {
      // Do not add already existing row for this taxonname and size
      const existing = this.getValue().some(
        (subbatch) =>
          subbatch.measurementValues[data.criteriaPmfm.id] === size &&
          subbatch.taxonName?.id === data.taxonName.id &&
          subbatch.parentGroup?.id === this.parentGroup.id
      );
      if (!existing) {
        const subBatch = new SubBatch();
        subBatch.individualCount = 0;
        subBatch.taxonName = data.taxonName;
        subBatch.measurementValues[data.criteriaPmfm.id] = size;
        subBatch.rankOrder = ++rankOrder;
        subBatchesToAdd.push(subBatch);
      }
    }

    await this.addEntitiesToTable(subBatchesToAdd, { editing: false });

    // Only show added entities
    const filter = new SubBatchFilter();
    filter.numericalMinValue = data.min;
    filter.numericalMaxValue = data.max;
    filter.numericalPmfm = data.criteriaPmfm;
    filter.taxonNameId = data.taxonName.id;

    this.setFilter(filter);
  }

  private async setShowVirtualColumns(show: boolean) {
    this.virtualPmfms?.forEach((col) => {
      this.setShowColumn(col.id.toString(), show);
    });

    this.setShowColumn('id', !show, { emitEvent: false });
    this.setShowColumn('individualCount', !show, { emitEvent: false });

    // Show/hide computed and qualitative pmfms columns
    this.pmfms
      .filter((pmfm) => PmfmUtils.isComputed(pmfm) || PmfmUtils.isQualitative(pmfm))
      .forEach((pmfm) => {
        this.setShowColumn(pmfm.id.toString(), !show, { emitEvent: false });
      });
    this.updateColumns();
  }

  private groupByProperty(property: string): SubBatch[][] {
    const groups: { [key: string]: SubBatch[] } = {};

    this.getValue().forEach((obj) => {
      // Create composite key from measurementValues and taxonName
      const measurementValue = obj?.measurementValues[property];
      const taxonName = obj?.taxonName?.name;
      const parentGroup = obj?.parentGroup?.id;
      const compositeKey = `${measurementValue}-${taxonName}-${parentGroup}`;

      if (!groups[compositeKey]) {
        groups[compositeKey] = [];
      }
      groups[compositeKey].push(obj);
    });

    return Object.values(groups);
  }

  private async mergeRows(numericalPmfm: IPmfm) {
    const numericalPmfmId = numericalPmfm.id.toString();
    const criteriaPmfm = this.pmfms.find((pmfm) => !PmfmUtils.isComputed(pmfm) && PmfmUtils.isQualitative(pmfm));
    const groupRows = this.groupByProperty(numericalPmfmId);
    let rankOrder = (await this.getMaxRankOrder()) + 1;

    const newRows = [];
    const rowsToDelete = [];

    for (const rows of groupRows) {
      const virtualPmfmValue = [];
      rows.forEach((row) => {
        const virtualPmfm = this.virtualPmfms?.find((pmfm) => {
          return pmfm.name === row.measurementValues[criteriaPmfm.id.toString()]?.name;
        });
        virtualPmfmValue.push({ virtualPmfm: virtualPmfm, individualCount: row.individualCount });
        rowsToDelete.push(row);
      });

      const newRow = new SubBatch();
      newRow.individualCount = rows[0].individualCount;
      if (isNotNil(criteriaPmfm)) newRow.measurementValues[criteriaPmfm.id.toString()] = rows[0].measurementValues[criteriaPmfm.id.toString()];
      newRow.taxonName = rows[0].taxonName;
      newRow.parentGroup = rows[0].parentGroup;

      newRow.measurementValues[numericalPmfmId] = rows[0].measurementValues[numericalPmfmId];
      virtualPmfmValue.forEach((pmfm) => {
        if (pmfm.virtualPmfm) newRow.measurementValues[pmfm.virtualPmfm.id.toString()] = pmfm.individualCount;
      });

      newRow.rankOrder = rankOrder++;
      newRow.label = `${AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL}#${newRow.rankOrder}`;
      newRows.push(newRow);
    }
    await this.setValue(newRows);
  }

  private async splitRows(numericalPmfm: IPmfm) {
    const numericalPmfmId = numericalPmfm.id.toString();
    this.save(); // TODO: à passer en await, mais cela provoque le non fonctionnement de la méthode
    let rankOrder = await this.getMaxRankOrder();
    const existingSubBatches = this.getValue();
    const criteriaPmfm = this.pmfms.find((pmfm) => !PmfmUtils.isComputed(pmfm) && PmfmUtils.isQualitative(pmfm));

    const newSubBatches = [];
    const subBatchesToDelete = [];

    // Convert rows
    for (const subBacth of existingSubBatches) {
      this.virtualPmfms?.forEach((pmfm) => {
        const individualCount = subBacth.measurementValues[pmfm.id];
        const lengthTotalCm = subBacth.measurementValues[numericalPmfmId];

        if (isNotNil(individualCount) && individualCount > 0) {
          const qualitativeValue = this.pmfms.find((pm) => pm.id === criteriaPmfm?.id).qualitativeValues.filter((pm) => pm.name === pmfm.name)[0];

          const newSubBatch = new SubBatch();
          newSubBatch.individualCount = individualCount;
          newSubBatch.taxonName = subBacth.taxonName;
          if (isNotNil(criteriaPmfm)) newSubBatch.measurementValues[criteriaPmfm.id.toString()] = qualitativeValue;
          newSubBatch.measurementValues[numericalPmfmId] = lengthTotalCm;
          newSubBatch.rankOrder = ++rankOrder;
          newSubBatch.parentGroup = subBacth.parentGroup;
          newSubBatch.label = `${AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL}#${newSubBatch.rankOrder}`;

          newSubBatches.push(newSubBatch);
        }
      });

      // test conserve subbatch des  autres parentGroup
      if (subBacth.parentGroup.id === this.parentGroup.id) {
        subBatchesToDelete.push(subBacth);
      } else {
        newSubBatches.push(subBacth);
      }
    }
    this.rowsAreMerged = false;

    await this.setValue(newSubBatches);
  }

  async deleteEmptyRows() {
    this.save(); // TODO: à passer en await, mais cela provoque le non fonctionnement de la méthode
    let rows = this.getValue();
    rows = rows.filter((subBacth) => {
      return subBacth.individualCount > 0;
    });
    await this.setValue(rows);
  }

  async setModalMode(mode: ModalMode, showVirtualColumns?: boolean) {
    const showVirtualColums = isNotNil(showVirtualColumns) ? showVirtualColumns : mode === ModalModeEnum.LengthClass ? true : false;
    const numericalPmfm = this.pmfms.find((pmfm) => !PmfmUtils.isComputed(pmfm) && PmfmUtils.isNumeric(pmfm) && !PmfmUtils.isVirtual(pmfm));
    this.setShowVirtualColumns(showVirtualColums);

    if (mode === ModalModeEnum.LengthClass && !this.rowsAreMerged) {
      // merge only on the first time
      await this.mergeRows(numericalPmfm);
      this.rowsAreMerged = true;
    } else if (mode === ModalModeEnum.IndividualCount && isNotNil(this.modalMode) && this.rowsAreMerged) {
      await this.splitRows(numericalPmfm);
      this.rowsAreMerged = false;
    } else if (mode === ModalModeEnum.IndividualCount && isNil(this.modalMode)) {
      await this.deleteEmptyRows();
    }

    //update modal mode
    this.modalMode = mode;
    await sleep(0); // Nécessaire, pour que le tableau s'actualise à la fermeture de la modale
  }

  getFormErrors = AppFormUtils.getFormErrors;
  filterNumberInput = AppFormUtils.filterNumberInput;
}
