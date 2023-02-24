import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, InjectionToken, Injector, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { isObservable, Observable, Subscription } from 'rxjs';
import { TableElement } from '@e-is/ngx-material-table';
import { UntypedFormGroup, Validators } from '@angular/forms';
import {
  AppFormUtils,
  EntityFilter,
  EntityUtils,
  FilterFn,
  InMemoryEntitiesService,
  IReferentialRef,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  LoadResult,
  ReferentialUtils,
  startsWithUpperCase,
  toBoolean,
  UsageMode
} from '@sumaris-net/ngx-components';
import { BaseMeasurementsTable, BaseMeasurementsTableConfig } from '../../measurement/measurements-table.class';
import { Batch } from '../common/batch.model';
import { SubBatchValidatorService } from './sub-batch.validator';
import { SubBatchForm } from './sub-batch.form';
import { MeasurementValuesUtils } from '../../services/model/measurement.model';
import { ISubBatchModalOptions, SubBatchModal } from './sub-batch.modal';
import { AcquisitionLevelCodes, MethodIds, PmfmIds, QualitativeLabels, WeightUnitSymbol } from '@app/referential/services/model/model.enum';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { SubBatch } from './sub-batch.model';
import { BatchGroup } from '../group/batch-group.model';
import { PmfmValidators } from '@app/referential/services/validator/pmfm.validators';
import { environment } from '@environments/environment';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { ContextService } from '@app/shared/context.service';
import { TripContextService } from '@app/trip/services/trip-context.service';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';

export const SUB_BATCH_RESERVED_START_COLUMNS: string[] = ['parentGroup', 'taxonName'];
export const SUB_BATCH_RESERVED_END_COLUMNS: string[] = ['individualCount', 'comments'];


export const SUB_BATCHES_TABLE_OPTIONS = new InjectionToken<BaseMeasurementsTableConfig<Batch>>('SubBatchesTableOptions');

export class SubBatchFilter extends EntityFilter<SubBatchFilter, SubBatch>{
  parentId?: number;
  operationId?: number;
  landingId?: number;

  asFilterFn<E extends Batch>(): FilterFn<E> {
    return (data) =>
      (isNil(this.operationId) || data.operationId === this.operationId)
      && (isNil(this.parentId) || data.parentId === this.parentId)

      // TODO enable this:
      // && (isNil(this.landingId) || data.landingId === this.landingId))
      ;
  }
}

@Component({
  selector: 'app-sub-batches-table',
  templateUrl: 'sub-batches.table.html',
  styleUrls: ['sub-batches.table.scss'],
  providers: [
    {provide: ContextService, useExisting: TripContextService},
    SubBatchValidatorService,
    {
      provide: SUB_BATCHES_TABLE_OPTIONS,
      useFactory: () => {
        return {
          prependNewElements: false,
          suppressErrors: environment.production,
          reservedStartColumns: SUB_BATCH_RESERVED_START_COLUMNS,
          reservedEndColumns: SUB_BATCH_RESERVED_END_COLUMNS
        };
      }
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubBatchesTable
  extends BaseMeasurementsTable<SubBatch,
    SubBatchFilter,
    InMemoryEntitiesService<SubBatch, SubBatchFilter>,
    SubBatchValidatorService
    >
  implements OnInit, OnDestroy {

  private _qvPmfm: IPmfm;
  private _parentSubscription: Subscription;
  private _availableParents: BatchGroup[] = [];
  private _showTaxonNameInParentAutocomplete = true;
  private _rowValidatorSubscription: Subscription;
  protected _initialPmfms: IPmfm[];
  protected _availableSortedParents: BatchGroup[] = [];

  protected cd: ChangeDetectorRef;
  protected referentialRefService: ReferentialRefService;
  protected memoryDataService: InMemoryEntitiesService<SubBatch, SubBatchFilter>;
  protected enableWeightConversion = false;

  weightPmfm: IPmfm;

  @Input() displayParentPmfm: IPmfm;
  @Input() showForm = false;
  @Input() tabindex: number;
  @Input() usageMode: UsageMode;
  @Input() useSticky = false;
  @Input() weightDisplayedUnit: WeightUnitSymbol;
  @Input() weightDisplayDecimals = 2;

  @Input() set qvPmfm(value: IPmfm) {
    if (this._qvPmfm !== value) {
      this._qvPmfm = value;
      // If already loaded, re apply pmfms, to be able to execute mapPmfms
      if (!this.loading) this.refreshPmfms();
    }
  }

  get qvPmfm(): IPmfm {
    return this._qvPmfm;
  }

  @Input()
  set availableParents(parents: Observable<BatchGroup[]> | BatchGroup[]) {
    if (!parents) return; // Skip
    if (isObservable<Batch[]>(parents)) {
      this._parentSubscription?.unsubscribe();
      const subscription = parents.subscribe((values) => this.setAvailableParents(values));
      this._parentSubscription = subscription
      this.registerSubscription(subscription);
      subscription.add(() => {
        this.unregisterSubscription(subscription);
        this._parentSubscription = null;
      });
    } else if (Array.isArray(parents) && parents !== this._availableParents) {
      this.setAvailableParents(parents);
    }
  }

  get availableParents(): Observable<BatchGroup[]> | BatchGroup[] {
    return this._availableParents;
  }

  set value(data: SubBatch[]) {
    this.setValue(data);
  }

  get value(): SubBatch[] {
    return this.getValue();
  }

  @Input()
  set showParentColumn(value: boolean) {
    this.setShowColumn('parent', value);
  }

  get showParentColumn(): boolean {
    return this.getShowColumn('parent');
  }

  @Input()
  set showTaxonNameColumn(value: boolean) {
    this.setShowColumn('taxonName', value);
    this.updateParentAutocomplete();
  }

  get showTaxonNameColumn(): boolean {
    return this.getShowColumn('taxonName');
  }

  @Input()
  set showTaxonNameInParentAutocomplete(value: boolean) {
    this._showTaxonNameInParentAutocomplete = value;
    this.updateParentAutocomplete();
  }

  @Input()
  set showIndividualCount(value: boolean) {
    this.setShowColumn('individualCount', value);
  }

  get showIndividualCount(): boolean {
    return this.getShowColumn('individualCount') && this.displayedColumns.findIndex(c => c === 'individualCount') !== -1;
  }

  @Input()
  set showWeightColumn(value: boolean) {
    this.setShowColumn('weight', value);
  }

  get showWeightColumn(): boolean {
    return this.getShowColumn('weight');
  }

  @Input()
  set showCommentsColumn(value: boolean) {
    this.setShowColumn('comments', value);
  }

  get showCommentsColumn(): boolean {
    return this.getShowColumn('comments');
  }


  @ViewChild('form', { static: true }) form: SubBatchForm;

  constructor(
    injector: Injector,
    validatorService: SubBatchValidatorService,
    @Inject(SUB_BATCHES_TABLE_OPTIONS) options: BaseMeasurementsTableConfig<Batch>
  ) {
    super(injector,
      SubBatch, SubBatchFilter,
      new InMemoryEntitiesService<SubBatch, SubBatchFilter>(SubBatch, SubBatchFilter, {
        onLoad: (data) => this.onLoadData(data),
        onSave: (data) => this.onSaveData(data),
        equals: Batch.equals,
        sortByReplacement: {
          'id': 'rankOrder',
          'parentGroup': 'parentGroup.rankOrder'
        }
      }),
      validatorService,
      {
        ...options,
        i18nColumnPrefix: 'TRIP.BATCH.TABLE.',
        i18nPmfmPrefix: 'TRIP.BATCH.PMFM.',
        mapPmfms: (pmfms) => this.mapPmfms(pmfms),
        onPrepareRowForm: (form) => this.onPrepareRowForm(form)
      }
    );
    this.referentialRefService = injector.get(ReferentialRefService);
    this.tabindex = 1;
    this.inlineEdition = !this.mobile;

    // Default value
    this.acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL;
    this.showCommentsColumn = !this.mobile;

    // DEBUG
    this.debug = !environment.production;
    this.logPrefix = '[sub-batches-table] ';
  }

  ngOnInit() {
    super.ngOnInit();

    // Parent combo
    this.registerAutocompleteField('parentGroup', {
      suggestFn: (value: any, options?: any) => this.suggestParent(value, options),
      showAllOnFocus: true,
      mobile: this.mobile
    });
    this.updateParentAutocomplete();

    this.registerAutocompleteField('taxonName', {
      suggestFn: (value: any, options?: any) => this.suggestTaxonNames(value, options),
      showAllOnFocus: true,
      mobile: this.mobile
    });

    if (this.inlineEdition) { // can be override by subclasses

      // Create listener on column 'DISCARD_OR_LANDING' value changes
      this.registerSubscription(
        this.registerCellValueChanges('discard', "measurementValues." + PmfmIds.DISCARD_OR_LANDING.toString(), true)
          .subscribe((value) => {
            if (!this.editedRow) return; // Should never occur
            const row = this.editedRow;
            const controls = (row.validator.controls['measurementValues'] as UntypedFormGroup).controls;
            if (ReferentialUtils.isNotEmpty(value) && value.label === QualitativeLabels.DISCARD_OR_LANDING.DISCARD) {
              if (controls[PmfmIds.DISCARD_REASON]) {
                if (row.validator.enabled) {
                  controls[PmfmIds.DISCARD_REASON].enable();
                }
                controls[PmfmIds.DISCARD_REASON].setValidators(Validators.required);
                controls[PmfmIds.DISCARD_REASON].updateValueAndValidity();
              }
            } else {
              if (controls[PmfmIds.DISCARD_REASON]) {
                controls[PmfmIds.DISCARD_REASON].disable();
                controls[PmfmIds.DISCARD_REASON].setValue(null);
                controls[PmfmIds.DISCARD_REASON].setValidators(null);
              }
            }
          }));

      this.registerSubscription(
        this.registerCellValueChanges('parentGroup', 'parentGroup', true)
          .subscribe((parentGroup) => {
            if (!this.editedRow) return; // Skip

            const parenTaxonGroupId = parentGroup && parentGroup.taxonGroup && parentGroup.taxonGroup.id;
            if (isNil(parenTaxonGroupId)) return; // Skip

            const row = this.editedRow;

            const formEnabled = row.validator.enabled;
            const controls = (row.validator.controls['measurementValues'] as UntypedFormGroup).controls;

            (this.pmfms || []).forEach(pmfm => {
              const enable = !pmfm.isComputed &&
                (!PmfmUtils.isDenormalizedPmfm(pmfm)
                || isEmptyArray(pmfm.taxonGroupIds)
                || pmfm.taxonGroupIds.includes(parenTaxonGroupId));
              const control = controls[pmfm.id];

              // Update control state
              if (control) {
                if (enable) {
                  if (formEnabled) {
                    control.enable();
                  }
                  control.setValidators(PmfmValidators.create(pmfm));
                }
                else {
                  control.disable();
                  control.setValidators(null);
                  control.setValue(null);
                }
              }
            });
          }));
    }
  }

  async doSubmitForm(event?: Event, row?: TableElement<SubBatch>) {
    // Skip if loading,
    // or if previous edited row not confirmed
    if (this.loading) return;
    if (row !== this.editedRow && !this.confirmEditCreate()) return;

    await AppFormUtils.waitWhilePending(this.form);

    if (this.form.invalid) {
      await this.onInvalidForm();
      return;
    }

    const subBatch = this.form.form.value;
    subBatch.individualCount = isNotNil(subBatch.individualCount) ? subBatch.individualCount : 1;

    // Store computed weight into measurement, if any
    if (this.weightPmfm && isNotNil(subBatch.weight?.value)) {
      // Convert

      subBatch.measurementValues[this.weightPmfm.id] = subBatch.weight?.value;
      delete subBatch.weight;
    }

    await this.resetForm(subBatch, {focusFirstEmpty: true});

    // Add batch to table
    if (!row) {
      await this.addEntityToTable(subBatch);
    }

    // Update existing row
    else {
      await this.updateEntityToTable(subBatch, row);
    }
  }

  async add(batches: SubBatch[], opts?: {linkDataToParentGroup?: boolean}) {
    if (toBoolean(opts && opts.linkDataToParentGroup, true)) {
      this.linkDataToParentGroup(batches);
    }

    for (const b of batches) {
      await this.addEntityToTable(b);
    }
  }

  markAsPristine(opts?: {onlySelf?: boolean}) {
    super.markAsPristine();
    if (this.form) this.form.markAsPristine(opts);
  }

  markAsUntouched() {
    super.markAsUntouched();
    if (this.form) this.form.markAsUntouched();
  }

  enable(opts?: {onlySelf?: boolean, emitEvent?: boolean; }) {
    super.enable(opts);

    if (this.showForm && this.form && this.form.disabled) {
      this.form.enable(opts);
    }
  }

  disable(opts?: {onlySelf?: boolean, emitEvent?: boolean; }) {
    super.disable(opts);

    if (this.showForm && this.form && this.form.enabled) {
      this.form.disable(opts);
    }
  }

  /**
   * Allow to set value
   * @param data
   * @param opts
   */
  setValue(data: SubBatch[], opts?: { emitEvent?: boolean; }) {
    this.memoryDataService.value = data;
    //this.markAsLoaded();
  }

  /* -- protected methods -- */

  protected getValue(): SubBatch[] {
    return this.memoryDataService.value;
  }

  protected prepareEntityToSave(data: SubBatch) {
    // Override by subclasses
  }

  protected updateParentAutocomplete() {
    if (!this.autocompleteFields.parentGroup) return; // skip

    const taxonGroupAttributes = this.settings.getFieldDisplayAttributes('taxonGroup');
    const taxonNameAttributes = this.settings.getFieldDisplayAttributes('taxonName');

    const parentToStringOptions = {
      pmfm: this.displayParentPmfm,
      taxonGroupAttributes: taxonGroupAttributes,
      taxonNameAttributes: taxonNameAttributes
    };
    if (this._showTaxonNameInParentAutocomplete) {
      if (this.showTaxonNameColumn) {
        this.autocompleteFields.parentGroup.attributes = ['rankOrder']
          .concat(taxonGroupAttributes.map(attr => 'taxonGroup.' + attr));
      } else {
        this.autocompleteFields.parentGroup.attributes = ['taxonGroup.' + taxonGroupAttributes[0]]
          .concat(taxonNameAttributes.map(attr => 'taxonName.' + attr));
      }
    } else {
      // show only taxon group
      this.autocompleteFields.parentGroup.attributes = taxonGroupAttributes.map(attr => 'taxonGroup.' + attr);
    }
    this.autocompleteFields.parentGroup.displayWith = (value) => BatchUtils.parentToString(value, parentToStringOptions);
  }

  public async resetForm(previousBatch?: SubBatch, opts?: {focusFirstEmpty?: boolean, emitEvent?: boolean}) {
    if (!this.form) throw new Error('Form not exists');

    await this.ready();

    // Finish form configuration
    this.form.availableParents = this._availableSortedParents;
    this.form.markAsReady();
    this.form.error = null;

    // Create a new batch
    const newBatch = new SubBatch();

    // Reset individual count, if manual mode
    if (this.form.enableIndividualCount) {
      newBatch.individualCount = null;
    } else if (isNil(newBatch.individualCount)) {
      newBatch.individualCount = 1;
    }

    // Copy QV value from previous
    if (previousBatch) {
      // Copy parent
      newBatch.parentGroup = previousBatch.parentGroup;

      // Copy QV PMFM value, if any
      if (this.qvPmfm && this.form.freezeQvPmfm) {
        newBatch.measurementValues[this.qvPmfm.id] = previousBatch.measurementValues[this.qvPmfm.id];
      }

      // Copy taxon name (if freezed)
      if (previousBatch.taxonName && this.form.freezeTaxonName) {
        newBatch.taxonName = previousBatch.taxonName;
      }
      else {
        // Set taxonName, is only one in list
        const taxonNames = this.form.taxonNames;
        if (taxonNames && taxonNames.length === 1) {
          newBatch.taxonName = taxonNames[0];
        }
      }
    }

    // Reset the form with the new batch
    MeasurementValuesUtils.normalizeEntityToForm(newBatch, this.pmfms, this.form.form);
    this.form.setValue(newBatch, {emitEvent: true, normalizeEntityToForm: false /*already done*/});

    // If need, enable the form
    if (this.form.disabled) {
      this.form.enable(opts);
    }

    if (opts && opts.focusFirstEmpty === true) {
      setTimeout(() => {
        this.form.focusFirstEmptyInput();
        this.form.markAsPristine({onlySelf: true});
        this.form.markAsUntouched({onlySelf: true});
      });
    }
    else {
      this.form.markAsPristine({onlySelf: true});
      this.form.markAsUntouched({onlySelf: true});
    }

    if (!opts || opts.emitEvent !== false) {
      this.markForCheck();
    }
  }

  protected async suggestParent(value: any, options?: any): Promise<any[]> {
    if (EntityUtils.isNotEmpty(value, 'label')) {
      return [value];
    }
    value = (typeof value === "string" && value !== "*") && value || undefined;
    if (isNil(value)) return this._availableSortedParents; // All

    if (this.debug) console.debug(`[sub-batch-table] Searching parent {${value || '*'}}...`);
    const ucValueParts = value.trim().toUpperCase().split(" ", 1);

    // Search on labels (taxonGroup or taxonName)
    return this._availableSortedParents.filter(p =>
      (p.taxonGroup && startsWithUpperCase(p.taxonGroup.label, ucValueParts[0])) ||
      (p.taxonName && startsWithUpperCase(p.taxonName.label, ucValueParts.length === 2 ? ucValueParts[1] : ucValueParts[0]))
    );
  }

  protected async suggestTaxonNames(value: any, options?: any): Promise<LoadResult<IReferentialRef>> {
    const parent = this.editedRow && this.editedRow.validator.get('parentGroup').value;
    if (isNilOrBlank(value) && isNil(parent)) return {data: []};
    return this.programRefService.suggestTaxonNames(value,
      {
        programLabel: this.programLabel,
        searchAttribute: options && options.searchAttribute,
        taxonGroupId: parent && parent.taxonGroup && parent.taxonGroup.id || undefined
      });
  }

  protected mapPmfms(pmfms: IPmfm[]) {
    if (!pmfms || !pmfms.length) return pmfms; // Skip (no pmfms)

    this._initialPmfms = pmfms; // Copy original pmfms list

    if (this._qvPmfm) {
      // Make sure QV Pmfm is required (need to link with parent batch)
      const index = pmfms.findIndex(pmfm => pmfm.id === this._qvPmfm.id);
      if (index !== -1) {
        // Replace original pmfm by a clone, with hidden=true
        const qvPmfm = this._qvPmfm.clone();
        qvPmfm.hidden = false;
        qvPmfm.required = true;
        pmfms[index] = qvPmfm;
      }
    }

    // Filter on parent taxon groups
    const taxonGroupIds = (this._availableParents || []).map(parent => parent.taxonGroup?.id).filter(isNotNil);
    if (isNotEmptyArray(taxonGroupIds)) {
      pmfms = pmfms.map(pmfm => {
        if (PmfmUtils.isDenormalizedPmfm(pmfm)) {
          // Hidden PMFM that are not for existing taxon groups
          if (isNotEmptyArray(pmfm.taxonGroupIds) && !pmfm.taxonGroupIds.some(id => taxonGroupIds.includes(id))) {
            pmfm = pmfm.clone(); // Keep original
            pmfm.hidden = true;
            pmfm.required = false;
          }
        }
        return pmfm;
      });
    }

    // Check weight-length conversion is enabled
    {
      const index = pmfms.findIndex(p => p.id === PmfmIds.BATCH_CALCULATED_WEIGHT_LENGTH
          || p.methodId === MethodIds.CALCULATED_WEIGHT_LENGTH);
      if (index !== -1) {
        this.weightPmfm = pmfms[index]?.clone();
        //this.weightPmfm.hidden = !this.mobile;
        this.weightPmfm.maximumNumberDecimals = this.weightPmfm.maximumNumberDecimals || 6;
        this.weightPmfm.required = false;
        this.enableWeightConversion = true;

        // FIXME
        /*if (this.weightDisplayedUnit) {
          this.weightPmfm = PmfmUtils.setWeightUnitConversion(this.weightPmfm, this.weightDisplayedUnit);
        }*/
        pmfms[index] = this.weightPmfm;
      }
      else {
        this.enableWeightConversion = false;
      }
    }
    return pmfms;
  }

  protected async openNewRowDetail(): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    const data = await this.openDetailModal();
    if (data) {
      await this.addEntityToTable(data);
    }
    return true;
  }

  protected async openRow(id: number, row: TableElement<SubBatch>): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    if (this.onOpenRow.observers.length) {
      this.onOpenRow.emit(row);
      return true;
    }

    const data = this.toEntity(row, true);

    // Prepare entity measurement values
    this.prepareEntityToSave(data);

    const updatedData = await this.openDetailModal(data);
    if (updatedData) {
      await this.updateEntityToTable(updatedData, row);
    }
    else {
      this.editedRow = null;
    }
    return true;
  }

  async openDetailModal(batch?: SubBatch): Promise<SubBatch | undefined> {
    const isNew = !batch && true;
    if (isNew) {
      batch = new SubBatch();
      await this.onNewEntity(batch);
    }

    const modal = await this.modalCtrl.create({
      component: SubBatchModal,
      componentProps: <Partial<ISubBatchModalOptions>>{
        programLabel: this.programLabel,
        acquisitionLevel: this.acquisitionLevel,
        availableParents: this.availableParents,
        data: batch,
        isNew: isNew,
        disabled: this.disabled,
        qvPmfm: this.qvPmfm,
        showParent: this.showParentColumn,
        showTaxonGroup: false, // Not used
        showTaxonName: this.showTaxonNameColumn,
        showIndividualCount: this.showIndividualCount
      },
      keyboardClose: true
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const {data} = await modal.onDidDismiss();
    if (data && this.debug) console.debug("[batches-table] Batch modal result: ", data);
    return  (data instanceof SubBatch) ? data : undefined;
  }

  protected async addEntityToTable(newBatch: SubBatch): Promise<TableElement<SubBatch>> {
    if (this.debug) console.debug("[batches-table] Adding batch to table:", newBatch);

    // Make sure individual count if init
    newBatch.individualCount = isNotNil(newBatch.individualCount) ? newBatch.individualCount : 1;

    const pmfms = this.pmfms || [];
    MeasurementValuesUtils.normalizeEntityToForm(newBatch, pmfms);

    // If individual count column is shown (can be greater than 1)
    if (this.showIndividualCount) {
      // Try to find an identical sub-batch
      const row = this.dataSource.getRows().find(r => BatchUtils.canMergeSubBatch(newBatch, r.currentData, pmfms));

      // Already exists: increment individual count
      if (row) {
        if (row.validator) {
          const control = row.validator.get('individualCount');
          control.setValue((control.value || 0) + newBatch.individualCount);
        } else {
          row.currentData.individualCount = (row.currentData.individualCount || 0) + newBatch.individualCount;
          this.markForCheck();
        }
        this.markAsDirty();

        // restore as edited row
        this.editedRow = row;

        return row;
      }
    }

    // The batch does not exists: add it tp the table
    return await super.addEntityToTable(newBatch);
  }

  async setAvailableParents(parents: BatchGroup[], opts?: { emitEvent?: boolean; linkDataToParent?: boolean; }) {
    this._availableParents = parents;

    // Sort parents by Tag-ID, or rankOrder
    if (this.displayParentPmfm) {
      this._availableSortedParents = EntityUtils.sort(parents.slice(), 'measurementValues.' + this.displayParentPmfm.id.toString());
    } else {
      this._availableSortedParents = EntityUtils.sort(parents.slice(), 'rankOrder');
    }

    await this.ready();

    if (this.form) this.form.availableParents = this._availableSortedParents;

    // Link batches to parent, and delete orphan
    if (!opts || opts.linkDataToParent !== false) {
      await this.linkDataToParentAndDeleteOrphan();
    }

    if (!opts || opts.emitEvent !== false) {
      await this.refreshPmfms();
      this.markForCheck();
    }
  }

  protected async onNewEntity(data: SubBatch): Promise<void> {
    console.debug("[sub-batch-table] Initializing new row data...");

    await super.onNewEntity(data);

    // Generate label
    data.label = this.acquisitionLevel + "#" + data.rankOrder;

    if (isNil(data.id)) {
      // TODO : add sequence
    }

    // Set individual count to 1, if column not shown
    if (!this.showIndividualCount) {
      data.individualCount = isNotNil(data.individualCount) ? data.individualCount : 1;
    }
  }

  protected async onInvalidForm(): Promise<void> {
    this.form.markAllAsTouched({emitEvent: true});
    if (this.debug) AppFormUtils.logFormErrors(this.form.form, "[sub-batch-table] ");
  }

  protected getI18nColumnName(columnName: string): string {

    // Replace parent by TAG_ID pmfms
    columnName = columnName && columnName === 'parent' && this.displayParentPmfm ? this.displayParentPmfm.id.toString() : columnName;

    return super.getI18nColumnName(columnName);
  }

  protected linkDataToParentGroup(data: SubBatch[]) {
    if (!this._availableParents || !data) return;

    data.forEach(s => {
      s.parentGroup = s.parentGroup && this._availableParents.find(p => Batch.equals(p, s.parentGroup)) || null;
      if (!s.parentGroup) console.warn("[sub-batches-table] linkDataToParent() - Could not found parent group, for sub-batch:", s);
    });
  }

  /**
   * Remove batches in table, if there have no more parent
   */
  protected async linkDataToParentAndDeleteOrphan() {

    const rows = this.dataSource.getRows();

    // Check if need to delete some rows
    let hasRemovedItem = false;
    const data = rows
      .map(row => {
        const item = row.currentData;

        let parentGroup;
        if (item.parentGroup) {
          // Update the parent, by id
          parentGroup = this._availableParents.find(p => Batch.equals(p, item.parentGroup));

          // Not found, so try to get it by species
          if (!parentGroup) {
            const parentTaxonGroupId = item.parentGroup.taxonGroup && item.parentGroup.taxonGroup.id;
            const parentTaxonNameId = item.parentGroup.taxonName && item.parentGroup.taxonName.id;
            if (isNil(parentTaxonGroupId) && isNil(parentTaxonNameId)) {
              parentGroup = undefined; // remove link to parent
            } else {
              parentGroup = this._availableParents.find(p =>
                (p && ((!p.taxonGroup && !parentTaxonGroupId) || (p.taxonGroup && p.taxonGroup.id === parentTaxonGroupId))
                  && ((!p.taxonName && !parentTaxonNameId) || (p.taxonName && p.taxonName.id === parentTaxonNameId))));
            }
          }
        }

        if (parentGroup || row.editing) {
          if (item.parentGroup !== parentGroup) {
            item.parentGroup = parentGroup;
            // If row use a validator, force update
            if (!row.editing && row.validator) row.validator.patchValue(item, {emitEvent: false});
          }
          return item; // Keep only rows with a parent (or in editing mode)
        }

        // Could not find the parent anymore (parent has been deleted)
        hasRemovedItem = true;
        return undefined;
      })
      .filter(isNotNil);

    if (hasRemovedItem) {
      // Make sure to convert into a Sample - fix issue #371
      this.value = data.map(c => SubBatch.fromObject(c));
    }
  }

  protected onLoadData(data: SubBatch[]): SubBatch[] {
    this.linkDataToParentGroup(data);
    return data;
  }

  protected onSaveData(data: SubBatch[]): SubBatch[] {
    // Can be override by subclasses
    return data;
  }

  protected async refreshPmfms() {
    const pmfms = this._initialPmfms;
    if (!pmfms) return; // Not loaded

    this._dataService.pmfms = this._initialPmfms;
    await this._dataService.waitIdle({stop: this.destroySubject});

    this.updateColumns();
  }

  selectInputContent = AppFormUtils.selectInputContent;

  protected markForCheck() {
    this.cd.markForCheck();
  }

  private onPrepareRowForm(form: UntypedFormGroup) {
    if (!form) return; // Skip
    console.debug('[sub-batches-table] Initializing row validator');

    this.validatorService.updateFormGroup(form, {
      withWeight: this.enableWeightConversion,
      pmfms: this.pmfms
    });

    // Add length -> weight conversion
    this._rowValidatorSubscription?.unsubscribe();
    if (this.enableWeightConversion) {
      const subscription = this.validatorService.delegate.enableWeightLengthConversion(form, {
        pmfms: this.pmfms,
        qvPmfm: this._qvPmfm,
        onError: (err) => this.setError(err && err.message || 'TRIP.SUB_BATCH.ERROR.WEIGHT_LENGTH_CONVERSION_FAILED'),
        markForCheck: () => this.markForCheck()
      });
      if (subscription) {
        this._rowValidatorSubscription = subscription;
        this.registerSubscription(this._rowValidatorSubscription);
        this._rowValidatorSubscription.add(() => {
          this.unregisterSubscription(subscription);
          this._rowValidatorSubscription = null;
        });
      }
    }
  }
}
