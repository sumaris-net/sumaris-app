import { ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, Output } from '@angular/core';
import { TableElement } from '@e-is/ngx-material-table';
import { FormGroup, Validators } from '@angular/forms';
import { BATCH_RESERVED_END_COLUMNS, BATCH_RESERVED_START_COLUMNS, BatchesTable, BatchFilter } from '../common/batches.table';
import {
  changeCaseToUnderscore,
  ColumnItem,
  FormFieldDefinition,
  InMemoryEntitiesService,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrNaN,
  LocalSettingsService,
  propertiesPathComparator,
  ReferentialRef,
  ReferentialUtils,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  SETTINGS_DISPLAY_COLUMNS,
  TableSelectColumnsComponent,
  toBoolean
} from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes, MethodIds, QualityFlagIds } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { MeasurementValuesUtils } from '../../services/model/measurement.model';
import { Batch } from '../common/batch.model';
import { BatchGroupModal, IBatchGroupModalOptions } from './batch-group.modal';
import { BatchGroup, BatchGroupUtils } from './batch-group.model';
import { SubBatch } from '../sub/sub-batch.model';
import { defer, Observable, Subject, Subscription } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { ISubBatchesModalOptions, SubBatchesModal } from '../sub/sub-batches.modal';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { BatchGroupValidatorService } from './batch-group.validator';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { TripContextService } from '@app/trip/services/trip-context.service';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';

const DEFAULT_USER_COLUMNS = ['weight', 'individualCount'];

declare type BaseColumnKeyType = 'totalWeight' | 'totalIndividualCount' | 'samplingRatio' | 'samplingWeight' | 'samplingIndividualCount';

declare interface ColumnDefinition extends FormFieldDefinition {
  key: BaseColumnKeyType;
  computed: boolean;
  hidden: boolean;
  unitLabel?: string;
  rankOrder: number;
  qvIndex: number;
  classList?: string;
  path?: string;

  // Describe column
  isWeight?: boolean;
  isIndividualCount?: boolean;
  isSampling?: boolean;

  // Column from pmfm
  id?: number;
  pmfm?: IPmfm;
}

declare interface GroupColumnDefinition {
  key: string;
  name: string;
  qvIndex: number;
  colSpan?: number;
}

@Component({
  selector: 'app-batch-groups-table',
  templateUrl: 'batch-groups.table.html',
  styleUrls: ['batch-groups.table.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchGroupsTable extends BatchesTable<BatchGroup> {

  static BASE_DYNAMIC_COLUMNS: Partial<ColumnDefinition>[] = [
    // Column on total (weight, nb indiv)
    {
      type: 'double',
      key: 'totalWeight',
      label: 'TRIP.BATCH.TABLE.TOTAL_WEIGHT',
      minValue: 0,
      maxValue: 10000,
      maximumNumberDecimals: 3,
      isWeight: true,
      classList: 'total mat-column-weight',
      path: 'weight.value'
    },
    {
      type: 'double',
      key: 'totalIndividualCount',
      label: 'TRIP.BATCH.TABLE.TOTAL_INDIVIDUAL_COUNT',
      minValue: 0,
      maxValue: 10000,
      maximumNumberDecimals: 2,
      isIndividualCount: true,
      classList: 'total',
      path: 'individualCount'
    },

    // Column on sampling (ratio, nb indiv, weight)
    {
      type: 'integer',
      key: 'samplingRatio',
      label: 'TRIP.BATCH.TABLE.SAMPLING_RATIO',
      unitLabel: '%',
      minValue: 0,
      maxValue: 100,
      maximumNumberDecimals: 2,
      isSampling: true,
      path: 'children.0.samplingRatio'
    },
    {
      type: 'double',
      key: 'samplingWeight',
      label: 'TRIP.BATCH.TABLE.SAMPLING_WEIGHT',
      minValue: 0,
      maxValue: 1000,
      maximumNumberDecimals: 3,
      isWeight: true,
      isSampling: true,
      path: 'children.0.weight.value'
    },
    {
      type: 'string',
      key: 'samplingIndividualCount',
      label: 'TRIP.BATCH.TABLE.SAMPLING_INDIVIDUAL_COUNT',
      computed: true,
      isIndividualCount: true,
      isSampling: true,
      path: 'children.0.individualCount'
    }
  ];

  private _defaultTaxonGroups: string[];
  private _showSamplingBatchColumns = true;
  private _showWeightColumns = true;
  private _rowValidatorSubscription: Subscription;

  weightMethodForm: FormGroup;
  estimatedWeightPmfm: IPmfm;
  dynamicColumns: ColumnDefinition[];
  modalOptions: Partial<IBatchGroupModalOptions>;

  showToolbar = true; // False only if no group columns AND mobile
  groupColumns: GroupColumnDefinition[];
  groupColumnNames: string[];
  groupColumnStartColSpan: number;

  disable(opts?: { onlySelf?: boolean; emitEvent?: boolean; }) {
    super.disable(opts);
    if (this.weightMethodForm) this.weightMethodForm.disable(opts);
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean; }) {
    super.enable(opts);
    if (this.weightMethodForm) this.weightMethodForm.enable(opts);
  }

  markAsPristine(opts?: { onlySelf?: boolean; emitEvent?: boolean; }) {
    super.markAsPristine(opts);
    if (this.weightMethodForm) this.weightMethodForm.markAsPristine(opts);
  }

  markAsTouched(opts?: { onlySelf?: boolean; emitEvent?: boolean; }) {
    super.markAsTouched(opts);
    if (this.weightMethodForm) this.weightMethodForm.markAsTouched(opts);
  }

  markAllAsTouched(opts?: { onlySelf?: boolean; emitEvent?: boolean; }) {
    super.markAllAsTouched(opts);
    if (this.weightMethodForm) this.weightMethodForm.markAllAsTouched();
  }

  markAsUntouched(opts?: { onlySelf?: boolean; emitEvent?: boolean; }) {
    super.markAsUntouched(opts);
    if (this.weightMethodForm) this.weightMethodForm.markAsUntouched(opts);
  }

  get dirty(): boolean {
    return this.dirtySubject.value || (this.weightMethodForm && this.weightMethodForm.dirty);
  }

  @Input() useSticky = false;
  @Input() availableSubBatches: SubBatch[] | Observable<SubBatch[]>;
  @Input() availableTaxonGroups: TaxonGroupRef[];
  @Input() enableWeightLengthConversion: boolean;

  @Input() set showSamplingBatchColumns(value: boolean) {
    if (this._showSamplingBatchColumns !== value) {
      this._showSamplingBatchColumns = value;

      if (this.batchGroupValidator && this.inlineEdition) {
        this.batchGroupValidator.showSamplingBatchColumns = value;
      }
      this.setModalOption('showSamplingBatch', value);
      // updateColumns only if pmfms are ready
      if (!this.loading && this._initialPmfms) {
        this.computeDynamicColumns(this.qvPmfm, {forceCompute: true});
        this.updateColumns();
      }
    }
  }

  get showSamplingBatchColumns(): boolean {
    return this._showSamplingBatchColumns;
  }

  @Input() set showWeightColumns(value: boolean) {
    if (this._showWeightColumns !== value) {
      this._showWeightColumns = value;
      // updateColumns only if pmfms are ready
      if (!this.loading && this._initialPmfms) {
        this.computeDynamicColumns(this.qvPmfm, {forceCompute: true});
        this.updateColumns();
      }
    }
  }

  get showWeightColumns(): boolean {
    return this._showWeightColumns;
  }

  @Input() showIndividualCountColumns: boolean;
  @Input() showError = true;

  get additionalPmfms(): IPmfm[] {
    return this._initialPmfms.filter(pmfm => (!this.qvPmfm || pmfm.id !== this.qvPmfm.id) && !PmfmUtils.isWeight(pmfm));
  }

  @Input() allowSubBatches = true;
  @Input() defaultHasSubBatches = false;
  @Input() taxonGroupsNoWeight: string[];
  @Input() mobile: boolean;

  @Output() onSubBatchesChanges = new EventEmitter<SubBatch[]>();

  constructor(
    injector: Injector,
    protected settings: LocalSettingsService,
    protected batchGroupValidator: BatchGroupValidatorService,
    protected context: TripContextService,
    protected pmfmNamePipe: PmfmNamePipe
  ) {
    super(injector,
      // Force no validator (readonly mode, if mobile)
      settings.mobile ? null : batchGroupValidator,
      new InMemoryEntitiesService<BatchGroup, BatchFilter>(BatchGroup, BatchFilter, {
        onLoad: (data) => this.onLoad(data),
        onSave: (data) => this.onSave(data),
        equals: Batch.equals
      }),
      BatchGroup,
      {
        // Need to set additional validator here
        // WARN: we cannot used onStartEditingRow here, because it is called AFTER row.validator.patchValue()
        //       e.g. When we add some validator (see operation page), so new row should always be INVALID with those additional validators
        onRowCreated: (row) => this.onPrepareRowForm(row.validator)
      }
    );

    // Set default values
    this.confirmBeforeDelete = this.mobile;
    this.i18nColumnPrefix = 'TRIP.BATCH.TABLE.';
    this.i18nPmfmPrefix = 'TRIP.BATCH.PMFM.';
    this.keepEditedRowOnSave = !this.mobile;
    this.saveBeforeDelete = false;
    // this.showCommentsColumn = false; // Already set in batches-table
    // this.acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH; // Already set in batches-table

    // -- For DEV only
    //this.debug = !environment.production;
  }

  ngOnInit() {
    this.inlineEdition = this.validatorService && !this.mobile;
    this.allowRowDetail = !this.inlineEdition;
    this.showIndividualCountColumns = toBoolean(this.showIndividualCountColumns, !this.mobile);

    // in DEBUG only: force validator = null
    if (this.debug && this.mobile) this.setValidatorService(null);

    super.ngOnInit();
  }

  setModalOption(key: keyof IBatchGroupModalOptions, value: IBatchGroupModalOptions[typeof key]) {
    this.modalOptions = this.modalOptions || {};
    this.modalOptions[key as any] = value;
  }

  onLoad(data: BatchGroup[]): BatchGroup[] {
    if (this.debug) console.debug('[batch-group-table] Preparing data to be loaded as table rows...');

    const weightMethodValues = this.qvPmfm ? this.qvPmfm.qualitativeValues.reduce((res, qv, qvIndex) => {
        res[qvIndex] = false;
        return res;
      }, {})
      : {0: false};

    // Transform entities into object array
    data = data.map(batch => {

      if (isNotEmptyArray(batch.children) && this.qvPmfm) {
        // For each group (one by qualitative value)
        this.qvPmfm.qualitativeValues.forEach((qv, qvIndex) => {
          const childLabel = `${batch.label}.${qv.label}`;
          // tslint:disable-next-line:triple-equals
          const child = batch.children.find(c => c.label === childLabel || c.measurementValues[this.qvPmfm.id] == qv.id);
          if (child) {

            // Replace measurement values inside a new map, based on fake pmfms
            this.normalizeChildToRow(child, qvIndex);

            // Remember method used for the weight (estimated or not)
            if (!weightMethodValues[qvIndex]) {
              if (child.weight && child.weight.estimated) {
                weightMethodValues[qvIndex] = true;
              } else if (child.children && child.children.length === 1) {
                const samplingChild = child.children[0];
                weightMethodValues[qvIndex] = samplingChild.weight && samplingChild.weight.estimated;
              }
            }

            // Should have sub batches, when sampling batch exists
            const hasSubBatches = this._showSamplingBatchColumns || isNotNil(BatchUtils.getSamplingChild(child));

            // Make sure to create a sampling batch, if has sub bacthes
            if (hasSubBatches) {
              BatchUtils.getOrCreateSamplingChild(child);
            }
          }
        });
      } else if (!this.qvPmfm && batch) {
        // Replace measurement values inside a new map, based on fake pmfms
        this.normalizeChildToRow(batch, -1);

        // Remember method used for the weight (estimated or not)
        if (!weightMethodValues[0]) {
          if (batch.weight && batch.weight.estimated) {
            weightMethodValues[0] = true;
          } else if (batch.children && batch.children.length === 1) {
            const samplingChild = batch.children[0];
            weightMethodValues[0] = samplingChild.weight && samplingChild.weight.estimated;
          }
        }

        // Should have sub batches, when sampling batch exists
        const hasSubBatches = this._showSamplingBatchColumns || isNotNil(BatchUtils.getSamplingChild(batch));

        // Make sure to create a sampling batch, if has sub bacthes
        if (hasSubBatches) {
          BatchUtils.getOrCreateSamplingChild(batch);
        }
      }
      MeasurementValuesUtils.normalizeEntityToForm(batch, this._initialPmfms, null, {keepOtherExistingPmfms: true});

      return batch;
    });

    // Set weight is estimated ?
    if (this.weightMethodForm) {
      console.debug('[batch-group-table] Set weight form values (is estimated ?)');
      this.weightMethodForm.patchValue(weightMethodValues);
    }

    return data;
  }


  async onSave(data: BatchGroup[]): Promise<BatchGroup[]> {

    if (this.debug) console.debug('[batch-group-table] Preparing data to be saved...');
    data = data.map(batch => {
      this.prepareEntityToSave(batch);
      return batch;
    });

    return data;
  }


  /**
   * Auto fill table (e.g. with taxon groups found in strategies) - #176
   */
  async autoFillTable(opts  = { skipIfDisabled: true, skipIfNotEmpty: false}) {
    // Wait table ready and loaded
    await Promise.all([this.ready(), this.waitIdle()]);

    // Skip if disabled
    if (opts.skipIfDisabled && this.disabled) {
      console.warn('[batch-group-table] Skipping autofill as table is disabled');
      return;
    }

    // Skip if not empty
    if (opts.skipIfNotEmpty && this.totalRowCount > 0) {
      console.warn('[batch-group-table] Skipping autofill because table is not empty');
      return;
    }

    // Skip if no available taxon group configured (should be set by parent page - e.g. OperationPage)
    if (isEmptyArray(this.availableTaxonGroups)) {
      console.warn('[batch-group-table] Skipping autofill, because no availableTaxonGroups has been set');
      return;
    }

    // Skip when editing a row
    if (!this.confirmEditCreate()) {
      console.warn('[batch-group-table] Skipping autofill, as table still editing a row');
      return;
    }

    this.markAsLoading();

    try {
      console.debug('[batch-group-table] Auto fill table, using options:', opts);

      // Read existing taxonGroups
      let data = await this.dataSource.getData()
      const existingTaxonGroups = data.map(batch => batch.taxonGroup)
        .filter(isNotNil);
      let rowCount = data.length;

      const taxonGroupsToAdd = this.availableTaxonGroups
        // Exclude if already exists
        .filter(taxonGroup => !existingTaxonGroups.some(tg => ReferentialUtils.equals(tg, taxonGroup)));

      if (isNotEmptyArray(taxonGroupsToAdd)) {

        this.focusColumn = undefined;
        let rankOrder = data.reduce((res, b) => Math.max(res, b.rankOrder || 0), 0) + 1;

        for (const taxonGroup of taxonGroupsToAdd) {
          const batch = new BatchGroup();
          batch.taxonGroup = TaxonGroupRef.fromObject(taxonGroup);
          batch.rankOrder = rankOrder++;
          const newRow = await this.addEntityToTable(batch, { confirmCreate: true });
          rowCount += (newRow.editing) ? 0 : 1;
        }

        // Mark as dirty
        this.markAsDirty();
      }

      // FIXME Workaround to update row count
      if (this.totalRowCount !== rowCount) {
        console.warn('[batch-group-table] Updateing rowCount manually! (should be fixed when table confirmEditCreate() are async ?)');
        this.totalRowCount = rowCount;
        this.visibleRowCount = rowCount;
        this.markForCheck();
      }

    } catch (err) {
      console.error(err && err.message || err, err);
      this.setError(err && err.message || err);
    } finally {
      this.markAsLoaded();
    }
  }

  isComputed(col: ColumnDefinition, row: TableElement<BatchGroup>): boolean {
    const batch = col.qvIndex >= 0
      // With qv pmfm
      ? row.currentData.children[col.qvIndex]
      // With no qv pmfm
      : row.currentData;

    const computed = col.computed
      // total weight is computed
      || (col.isWeight && !col.isSampling && batch.weight?.computed)
      // sampling weight is computed
      || (col.isWeight && col.isSampling && batch.children[0]?.weight?.computed)
      // sampling ratio is computed
      || (col.key.endsWith('samplingRatio') && (batch.children[0]?.samplingRatioText || '').indexOf('/') !== -1)
    ;
    //DEBUG
    // console.debug('[batch-group-table] col computed', col.path, computed);
    return computed;
  }

  isMissingValue(col: ColumnDefinition, row: TableElement<BatchGroup>): boolean {
    if (!col.isWeight || !col.isSampling) return false;
    const samplingBatch = (col.qvIndex >= 0
      // With qv pmfm
      ? row.currentData.children[col.qvIndex]
      // With no qv pmfm
      : row.currentData)
      // Get sampling batch
      .children[0];

    const missing = (isNil(samplingBatch.weight) || isNil(samplingBatch.weight?.value))
      && samplingBatch.individualCount !== null;
    //DEBUG
    // console.debug('[batch-group-table] missing sample weight', col.path, missing);
    return missing;
  }

  /**
   * Use in ngFor, for trackBy
   *
   * @param index
   * @param column
   */
  trackColumnDef(index: number, column: ColumnDefinition) {
    return column.rankOrder;
  }

  // FIXME check if need by any program
  async hideUnusedColumns() {
    // DEBUG
    console.debug('[batch-groups-table] hideUnusedColumns()');
    const availableTaxonGroups = this.availableTaxonGroups;
    if (isNotEmptyArray(availableTaxonGroups) && isNotEmptyArray(this.taxonGroupsNoWeight)) {
      const allTaxonHasNoWeight = availableTaxonGroups
        .every(tg => this.taxonGroupsNoWeight.findIndex(tgNw => tgNw.startsWith(tg.label)) !== -1);
      this.showWeightColumns = !allTaxonHasNoWeight;
    } else {
      this.showWeightColumns = true;
    }
  }

  /* -- protected methods -- */

  protected normalizeEntityToRow(batch: BatchGroup, row: TableElement<BatchGroup>) {
    // When batch has the QV value
    if (this.qvPmfm) {

      if (isNotEmptyArray(batch.children)) {
        // For each group (one by qualitative value)
        this.qvPmfm.qualitativeValues.forEach((qv, qvIndex) => {
          const childLabel = `${batch.label}.${qv.label}`;
          // tslint:disable-next-line:triple-equals
          const child = batch.children.find(c => c.label === childLabel || c.measurementValues[this.qvPmfm.id] == qv.id);
          if (child) {
            this.normalizeChildToRow(child, qvIndex);
          }
        });
      }
    }

    // Inherited method
    super.normalizeEntityToRow(batch, row, {keepOtherExistingPmfms: true});

  }

  protected normalizeChildToRow(data: Batch, qvIndex?: number) {
    if (this.debug) console.debug('[batch-group-table] Normalize QV child batch', data);

    if (isNil(qvIndex)) {
      const qvId = this.qvPmfm && data.measurementValues[this.qvPmfm.id];
      qvIndex = isNotNil(qvId) && this.qvPmfm.qualitativeValues.findIndex(qv => qv.id === +qvId);
      if (qvIndex === -1) throw Error('Invalid batch: no QV value');
    }

    // Column: total weight
    data.weight = BatchUtils.getWeight(data, this.weightPmfms);

    // DEBUG
    if (this.debug && data.qualityFlagId === QualityFlagIds.BAD){
      console.warn('[batch-group-table] Invalid batch (individual count or weight)', data);
    }

    // Sampling batch
    const samplingChild = BatchUtils.getSamplingChild(data);
    if (samplingChild) {
      // Column: sampling weight
      samplingChild.weight = BatchUtils.getWeight(samplingChild, this.weightPmfms);

      // Transform sampling ratio
      if (this.inlineEdition && isNotNil(samplingChild.samplingRatio)) {
        samplingChild.samplingRatio = +samplingChild.samplingRatio * 100;
      }
    }

    const qvId = this.qvPmfm?.qualitativeValues[qvIndex]?.id || -1;
    const childrenPmfms = BatchGroupUtils.computeChildrenPmfmsByQvPmfm(qvId, this.additionalPmfms);
    data.measurementValues = MeasurementValuesUtils.normalizeValuesToForm(data.measurementValues, childrenPmfms, {keepSourceObject: true});

  }

  protected prepareEntityToSave(batch: BatchGroup) {
    batch.measurementValues = {};

    if (this.qvPmfm) {
      batch.children = (this.qvPmfm.qualitativeValues || [])
        .map((qv, qvIndex) => this.prepareChildToSave(batch, qv, qvIndex));
    } else {
      this.prepareChildToSave(batch);
    }
  }

  protected prepareChildToSave(source: BatchGroup, qv?: ReferentialRef, qvIndex?: number): Batch {

    qvIndex = isNotNil(qvIndex) ? qvIndex : -1;
    const isEstimatedWeight = this.weightMethodForm?.controls[qvIndex].value || false;
    const childLabel = qv ? `${source.label}.${qv.label}` : source.label;

    // If qv, add sub level at sorting batch for each qv value
    // If no qv, keep measurements in sorting batch level
    const batch: Batch = !qv ? source : (source.children || []).find(b => b.label === childLabel) || new Batch();

    // If qv compute rank order with qv index, else keep existing rank order
    batch.rankOrder = qvIndex >= 0 ? qvIndex + 1 : batch.rankOrder;
    batch.label = childLabel;

    if (qv) {
      batch.measurementValues[this.qvPmfm.id.toString()] = qv.id.toString();
    }
    // Clean previous weights
    this.weightPmfms.forEach(p => batch.measurementValues[p.id.toString()] = undefined);

    // Set weight
    if (isNotNilOrNaN(batch.weight?.value)) {
      batch.weight.estimated = isEstimatedWeight;
      const weightPmfm = BatchUtils.getWeightPmfm(batch.weight, this.weightPmfms, this.weightPmfmsByMethod);
      batch.measurementValues[weightPmfm.id.toString()] = batch.weight.value;
    }

    // If sampling
    if (isNotEmptyArray(batch.children)) {
      const samplingBatchLabel = childLabel + Batch.SAMPLING_BATCH_SUFFIX;
      const samplingBatch: Batch = (batch.children || []).find(b => b.label === samplingBatchLabel) || new Batch();
      samplingBatch.rankOrder = 1;
      samplingBatch.label = samplingBatchLabel;

      // Clean previous weights
      this.weightPmfms.forEach(p => samplingBatch.measurementValues[p.id.toString()] = undefined);

      // Set weight
      if (isNotNilOrNaN(samplingBatch.weight?.value)) {
        samplingBatch.weight.estimated = isEstimatedWeight;
        const samplingWeightPmfm = BatchUtils.getWeightPmfm(samplingBatch.weight, this.weightPmfms, this.weightPmfmsByMethod);
        samplingBatch.measurementValues[samplingWeightPmfm.id.toString()] = samplingBatch.weight.value;
      }

      // Convert sampling ratio
      if (this.inlineEdition && isNotNil(samplingBatch.samplingRatio)) {
        samplingBatch.samplingRatio = +samplingBatch.samplingRatio / 100;
      }

      batch.children = [samplingBatch];
    }
    // Remove children
    else {
      batch.children = [];
    }
    return batch;
  }

  async onSubBatchesClick(event: UIEvent,
                          row: TableElement<BatchGroup>,
                          opts?: { showParent?: boolean; emitLoaded?: boolean; }) {
    if (event) event.preventDefault();

    // Loading spinner
    this.markAsLoading();

    try {

      const selectedParent = this.toEntity(row);
      const subBatches = await this.openSubBatchesModal(selectedParent, opts);

      if (isNil(subBatches)) return; // User cancelled

      // Update the batch group, from subbatches (e.g. observed individual count)
      this.updateBatchGroupRow(row, subBatches);

    } finally {
      // Hide loading
      if (!opts || opts.emitLoaded !== false) {
        this.markAsLoaded();
      }
      this.markForCheck();
    }
  }

  /* -- protected functions -- */

  // Override parent function
  protected mapPmfms(pmfms: DenormalizedPmfmStrategy[]): DenormalizedPmfmStrategy[] {
    if (!pmfms || !pmfms.length) return pmfms; // Skip (no pmfms)

    super.mapPmfms(pmfms); // Will find the qvPmfm

    if (this.batchGroupValidator && this.inlineEdition) {
      this.batchGroupValidator.showSamplingBatchColumns = this.showSamplingBatchColumns;
      this.batchGroupValidator.qvPmfm = this.qvPmfm;
      this.batchGroupValidator.pmfms = this.additionalPmfms;
    }

    // Init dynamic columns
    this.computeDynamicColumns(this.qvPmfm);

    //Additional pmfms managed by validator on children batch
    return [];
  }

  protected computeDynamicColumns(qvPmfm: IPmfm, opts = { forceCompute: false }): ColumnDefinition[] {
    if (!opts.forceCompute && this.dynamicColumns) return this.dynamicColumns; // Already init

    if (this.qvPmfm && this.debug) console.debug('[batch-group-table] Using a qualitative PMFM, to group columns: ' + qvPmfm.label);

    if (isNil(this.defaultWeightPmfm)
      || (PmfmUtils.isDenormalizedPmfm(this.defaultWeightPmfm)
        && (qvPmfm && PmfmUtils.isDenormalizedPmfm(qvPmfm)
          && qvPmfm.rankOrder > this.defaultWeightPmfm.rankOrder))) {
      throw new Error(`[batch-group-table] Unable to construct the table. First qualitative value PMFM must be define BEFORE any weight PMFM (by rankOrder in PMFM strategy - acquisition level ${this.acquisitionLevel})`);
    }

    // If estimated weight is allow, init a form for weight methods
    if (!this.weightMethodForm && this.weightPmfmsByMethod[MethodIds.ESTIMATED_BY_OBSERVER]) {

      // Create the form, for each QV value
      if (qvPmfm) {
        this.weightMethodForm = this.formBuilder.group(qvPmfm.qualitativeValues.reduce((res, qv, index) => {
          res[index] = [false, Validators.required];
          return res;
        }, {}));
      } else {
        // TODO create weightMethodForm when no QV Pmfm
        console.warn('create weightMethodForm when no QV Pmfm')
      }
    }

    this.estimatedWeightPmfm = this.weightPmfmsByMethod && this.weightPmfmsByMethod[MethodIds.ESTIMATED_BY_OBSERVER] || this.defaultWeightPmfm;

    if (qvPmfm) {
      const groupColumns = [];
      this.dynamicColumns = qvPmfm.qualitativeValues.flatMap((qv, qvIndex) => {
        const qvColumns = this.computeDynamicColumnsByQv(qv, qvIndex);
        // Create the group column
        const visibleColumnCount = qvColumns.filter(c => !c.hidden).length;
        const groupKey = `group-${qv.label}`;
        groupColumns.push({
          key: groupKey,
          name: qv.name,
          qvIndex,
          colSpan: visibleColumnCount
        });
        return qvColumns;
      });

      // DEBUG
      // console.debug('[batch-groups-table] Dynamic columns: ' + qvColumns.map(c => c.key).join(','));

      this.groupColumns = groupColumns;
      this.showToolbar = true;
    } else {
      this.groupColumns = [];
      this.dynamicColumns = this.computeDynamicColumnsByQv();
      this.showToolbar = !this.mobile;
    }
  }

  protected computeDynamicColumnsByQv(qvGroup?: ReferentialRef, qvIndex?: number): ColumnDefinition[] {
    qvIndex = isNotNil(qvIndex) ? qvIndex : -1;
    const offset = qvIndex * (BatchGroupsTable.BASE_DYNAMIC_COLUMNS.length + this._initialPmfms.filter(pmfm => !pmfm.hidden && !this.mobile).length);
    const hideWeightColumns = !this.showWeightColumns;
    const hideIndividualCountColumns = !this.showIndividualCountColumns;
    const hideSamplingColumns = !this._showSamplingBatchColumns;

    const qvColumns = BatchGroupsTable.BASE_DYNAMIC_COLUMNS
      .map((def, index) => {
        const key = qvGroup ? `${qvGroup.label}_${def.key}` : def.key;
        const rankOrder = offset + index;
        const hidden = (hideWeightColumns && def.isWeight)
          || (hideIndividualCountColumns && (def.isIndividualCount || def.key === 'samplingRatio'))
          || (hideSamplingColumns && def.isSampling);
        return <ColumnDefinition>{
          ...(def.isWeight && this.defaultWeightPmfm || {}),
          ...def,
          key,
          qvIndex,
          rankOrder,
          hidden,
          path: qvIndex >= 0 ? `children.${qvIndex}.${def.path}` : def.path
        };
      });

    const pmfmColumns = BatchGroupUtils.computeChildrenPmfmsByQvPmfm((qvGroup?.id || -1), this.additionalPmfms)
      .map((pmfm, index) => {
        const key = qvGroup ? `${qvGroup.label}_${pmfm.id}` : pmfm.id;
        const rankOrder = offset + qvColumns.length + index;
        const hidden = this.mobile || pmfm.hidden;
        return <ColumnDefinition>{
          type: pmfm.type,
          label: this.pmfmNamePipe.transform(pmfm, {i18nPrefix: this.i18nPmfmPrefix, i18nContext: this.i18nColumnSuffix}),
          key,
          qvIndex,
          rankOrder,
          hidden,
          computed: pmfm.isComputed || false,
          isIndividualCount: false,
          isSampling: false,
          pmfm,
          unitLabel: pmfm.unitLabel,
          path: qvIndex >= 0 ? `children.${qvIndex}.measurementValues.${pmfm.id}` : pmfm.id.toString()
        };
      });

    return pmfmColumns.concat(qvColumns);
  }

  protected getUserColumns(userColumns?: string[]): string[] {
    userColumns = userColumns || this.settings.getPageSettings(this.settingsId, SETTINGS_DISPLAY_COLUMNS);

    // Exclude OLD user columns (fix issue on v0.16.2)
    userColumns = userColumns && userColumns.filter(c => c === 'weight' || c === 'individualCount');

    return isNotEmptyArray(userColumns) && userColumns.length === 2 ? userColumns :
      // If not user column override (or if bad format), then use defaults
      DEFAULT_USER_COLUMNS.slice(0);
  }

  protected updateColumns() {
    if (!this.dynamicColumns) return; // skip
    this.displayedColumns = this.getDisplayColumns();

    if (this.qvPmfm) {
      this.groupColumnStartColSpan = RESERVED_START_COLUMNS.length
        + (this.showTaxonGroupColumn ? 1 : 0)
        + (this.showTaxonNameColumn ? 1 : 0);
    }
    else {
      this.groupColumnStartColSpan += this.dynamicColumns.filter(c => !c.hidden).length;
    }

    if (!this.loading) this.markForCheck();
  }

  protected getDisplayColumns(): string[] {
    if (!this.dynamicColumns) return this.columns;

    const userColumns = this.getUserColumns();

    const weightIndex = userColumns.findIndex(c => c === 'weight');
    let individualCountIndex = userColumns.findIndex(c => c === 'individualCount');
    individualCountIndex = (individualCountIndex !== -1 && weightIndex === -1 ? 0 : individualCountIndex);
    const inverseOrder = individualCountIndex < weightIndex;

    const dynamicColumnKeys = (this.dynamicColumns || [])
      .map(c => ({
        key: c.key,
        hidden: c.hidden,
        rankOrder: c.rankOrder + (inverseOrder &&
          ((c.isWeight && 1) || (c.isIndividualCount && -1)) || 0),
      }))
      .sort((c1, c2) => c1.rankOrder - c2.rankOrder)
      .filter(c => !c.hidden)
      .map(c => c.key);

    this.groupColumnNames = ['top-start']
      .concat(this.groupColumns.map(c => c.key))
      .concat(['top-end']);

    return RESERVED_START_COLUMNS
      .concat(BATCH_RESERVED_START_COLUMNS)
      .concat(dynamicColumnKeys)
      .concat(BATCH_RESERVED_END_COLUMNS)
      .concat(RESERVED_END_COLUMNS)
      .filter(name => !this.excludesColumns.includes(name));
  }

  protected async openSubBatchesModalFromParentModal(parent: BatchGroup): Promise<BatchGroup> {

    // Make sure the row exists
    this.editedRow = (this.editedRow && BatchGroup.equals(this.editedRow.currentData, parent) && this.editedRow)
      || (await this.findRowByEntity(parent))
      // Or add it to table, if new
      || (await this.addEntityToTable(parent, {confirmCreate: false}));

    const subBatches = await this.openSubBatchesModal(parent, {
      showParent: false // action triggered from the parent batch modal, so the parent field can be hidden
    });

    if (isNil(subBatches)) return; // User cancelled

    const updatedParent = this.updateBatchGroupFromSubBatches(parent, subBatches);

    // Return the updated parent
    return updatedParent;
  }


  protected async openSubBatchesModal(parentGroup?: BatchGroup, opts?: {
    showParent?: boolean;
  }): Promise<SubBatch[] | undefined> {

    // DEBUG
    if (this.debug) console.debug('[batches-table] Open individual measures modal...');

    const showParentGroup = !opts || opts.showParent !== false; // True by default

    // Define a function to add new parent
    const onNewParentClick = showParentGroup ? async () => {
      const newParent = await this.openDetailModal();
      if (newParent) {
        await this.addEntityToTable(newParent, {confirmCreate: false});
      }
      return newParent;
    } : undefined;

    // Define available parent, as an observable (if new parent can added)
    // - If mobile, create an observable, linked to table rows
    // - else (if desktop), create a copy
    const onModalDismiss = new Subject<any>();
    const availableParents = (showParentGroup ? this.dataSource.connect(null) : defer(() => this.dataSource.getRows()))
      .pipe(
        takeUntil(onModalDismiss),
        map((res: TableElement<BatchGroup>[]) => res.map(row => this.toEntity(row)))
      );

    const hasTopModal = !!(await this.modalCtrl.getTop());
    const modal = await this.modalCtrl.create({
      component: SubBatchesModal,
      componentProps: <ISubBatchesModalOptions>{
        programLabel: this.programLabel,
        acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL,
        usageMode: this.usageMode,
        showParentGroup,
        parentGroup,
        qvPmfm: this.qvPmfm,
        disabled: this.disabled,
        // Scientific species is required, only not already set in batch groups
        showTaxonNameColumn: !this.showTaxonNameColumn,
        // If on field mode: use individualCount=1 on each sub-batches
        showIndividualCount: !this.settings.isOnFieldMode(this.usageMode),
        availableParents,
        data: this.availableSubBatches,
        onNewParentClick,
        i18nSuffix: this.i18nColumnSuffix,
        // Override using input options
        maxVisibleButtons: this.modalOptions?.maxVisibleButtons
      },
      backdropDismiss: false,
      keyboardClose: true,
      cssClass: hasTopModal ? 'modal-large stack-modal' : 'modal-large'
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const {data} = await modal.onDidDismiss();

    onModalDismiss.next(); // disconnect observables

    // User cancelled
    if (isNil(data)) {
      if (this.debug) console.debug('[batches-table] Sub-batches modal: user cancelled');
    } else {
      // DEBUG
      //if (this.debug) console.debug('[batches-table] Sub-batches modal result: ', data);

      this.onSubBatchesChanges.emit(data);
    }

    return data;
  }

  protected async openDetailModal(initialData?: BatchGroup): Promise<BatchGroup | undefined> {
    const isNew = !initialData && true;
    initialData = initialData || new BatchGroup();

    if (isNew) {
      await this.onNewEntity(initialData);
    }

    this.markAsLoading();

    const modal = await this.modalCtrl.create({
      component: BatchGroupModal,
      backdropDismiss: false,
      componentProps: <IBatchGroupModalOptions>{
        acquisitionLevel: this.acquisitionLevel,
        pmfms: this._initialPmfms,
        qvPmfm: this.qvPmfm,
        disabled: this.disabled,
        data: initialData,
        isNew,
        showTaxonGroup: this.showTaxonGroupColumn,
        showTaxonName: this.showTaxonNameColumn,
        availableTaxonGroups: this.availableTaxonGroups,
        taxonGroupsNoWeight: this.taxonGroupsNoWeight,
        showSamplingBatch: this.showSamplingBatchColumns,
        allowSubBatches: this.allowSubBatches,
        defaultHasSubBatches: this.defaultHasSubBatches,
        samplingRatioType: this.samplingRatioType,
        openSubBatchesModal: (batchGroup) => this.openSubBatchesModalFromParentModal(batchGroup),
        onDelete: (event, batchGroup) => this.deleteEntity(event, batchGroup),
        // Override using given options
        ...this.modalOptions
      },
      cssClass: 'modal-large',
      keyboardClose: true
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const {data} = await modal.onDidDismiss();
    if (data && this.debug) console.debug('[batch-group-table] Batch group modal result: ', JSON.stringify(data));
    this.markAsLoaded();

    return data instanceof BatchGroup ? data : undefined;
  }

  async deleteEntity(event: UIEvent, data: BatchGroup): Promise<boolean> {
    const row = await this.findRowByEntity(data);

    // Row not exists: OK
    if (!row) return true;

    const deleted = await this.deleteRow(null, row, {skipIfLoading: false});

    if (!deleted) event?.preventDefault(); // Mark as cancelled

    return deleted;
  }

  async openSelectColumnsModal(event?: UIEvent) {

    let userColumns = this.getUserColumns();
    const hiddenColumns = DEFAULT_USER_COLUMNS.slice(0)
      .filter(name => userColumns.indexOf(name) === -1);
    let columns = (userColumns || [])
      .concat(hiddenColumns)
      .map(name => {
        const label = this.i18nColumnPrefix + changeCaseToUnderscore(name).toUpperCase();
        return {
          name,
          label,
          visible: userColumns.indexOf(name) !== -1
        } as ColumnItem;
      });

    const modal = await this.modalCtrl.create({
      component: TableSelectColumnsComponent,
      componentProps: {
        columns,
        canHideColumns: false
      }
    });

    // Open the modal
    await modal.present();

    // On dismiss
    const res = await modal.onDidDismiss();
    if (!res || !res.data) return; // CANCELLED
    columns = res.data as ColumnItem[];

    // Update columns
    userColumns = columns.filter(c => c.visible).map(c => c.name) || [];

    // Update user settings
    await this.settings.savePageSetting(this.settingsId, userColumns, SETTINGS_DISPLAY_COLUMNS);

    this.updateColumns();
  }

  protected async findRowByEntity(batchGroup: BatchGroup): Promise<TableElement<BatchGroup>> {
    return batchGroup && (await this.dataSource.getRows()).find(r => BatchGroup.equals(r.currentData, batchGroup));
  }

  /**
   * Update the batch group row (e.g. observed individual count), from subbatches
   * @param row
   * @param subBatches
   * @param opts
   */
  protected updateBatchGroupRow(row: TableElement<BatchGroup>, subBatches: SubBatch[], opts = {emitEvent: true}): BatchGroup {
    const parent: BatchGroup = row && row.currentData;
    if (!parent) return; // skip

    const updatedParent = this.updateBatchGroupFromSubBatches(parent, subBatches || []);

    if (row.validator) {
      row.validator.patchValue(updatedParent, opts);
    } else {
      row.currentData = updatedParent.clone(); // Force a refresh (because of propertyGet pipe)
    }

    return updatedParent;
  }

  /**
   * Update the batch group row (e.g. observed individual count), from subbatches
   * @param parent
   * @param subBatches
   */
  protected updateBatchGroupFromSubBatches(parent: BatchGroup, subBatches: SubBatch[]): BatchGroup {
    if (!parent) return parent; // skip

    const children = (subBatches || []).filter(b => Batch.equals(parent, b.parentGroup));

    if (this.debug) console.debug('[batch-group-table] Updating batch group, from batches...', parent, children);

    const updateSortingBatch = (batch: Batch, children: SubBatch[]) => {
      const samplingBatch = BatchUtils.getOrCreateSamplingChild(batch);
      // Update individual count
      samplingBatch.individualCount = BatchUtils.sumObservedIndividualCount(children);
      parent.observedIndividualCount = samplingBatch.individualCount || 0;

      // Update weight, if Length-Weight conversion enabled
      if (this.enableWeightLengthConversion) {
        samplingBatch.childrenWeight = BatchUtils.sumCalculatedWeight(children, this.weightPmfms, this.weightPmfmsByMethod);
        console.debug('[batch-group-table] Computed children weight: ', samplingBatch.childrenWeight);
      }
      else {
        samplingBatch.childrenWeight = null;
      }

      // return some values, to compute sum on the batch group
      return {
        individualCount: samplingBatch.individualCount,
        childrenWeight: samplingBatch.childrenWeight
      };
    }

    if (!this.qvPmfm) {
      const {individualCount, childrenWeight} = updateSortingBatch(parent, children);
      parent.observedIndividualCount = individualCount || 0;
    } else {
      const qvPmfmId = this.qvPmfm.id.toString();
      let observedIndividualCount = 0;

      this.qvPmfm.qualitativeValues.forEach((qv, qvIndex) => {
        const batchGroup = (parent.children || []).find(b => PmfmValueUtils.equals(b.measurementValues[qvPmfmId], qv));
        const qvChildren = children.filter(c => PmfmValueUtils.equals(c.measurementValues[qvPmfmId], qv));

        const {individualCount} = updateSortingBatch(batchGroup, qvChildren);

        // Update individual count
        observedIndividualCount += (individualCount || 0);

      })

      parent.observedIndividualCount = observedIndividualCount;
    }

    return parent;
  }

  protected async loadAvailableTaxonGroups(opts?: { defaultTaxonGroups?: string[] }): Promise<TaxonGroupRef[]> {
    if (!this.programLabel) return;
    const defaultTaxonGroups = opts && opts.defaultTaxonGroups || this._defaultTaxonGroups || null;
    console.debug('[batch-group-table] Loading available taxon groups, using options:', opts);

    const sortAttributes = this.autocompleteFields.taxonGroup && this.autocompleteFields.taxonGroup.attributes || ['label', 'name'];
    const taxonGroups = ((await this.programRefService.loadTaxonGroups(this.programLabel)) || [])
      // Filter on expected labels (as prefix)
      .filter(taxonGroup => !defaultTaxonGroups || taxonGroup.label && defaultTaxonGroups.findIndex(label => taxonGroup.label.startsWith(label)) !== -1)
      // Sort using order configure in the taxon group column
      .sort(propertiesPathComparator(sortAttributes));

    this.availableTaxonGroups = isNotEmptyArray(taxonGroups) ? taxonGroups : undefined;

    return taxonGroups;
  }

  protected async onNewEntity(data: BatchGroup): Promise<void> {
    console.debug('[batch-group-table] Initializing new row data...');

    await super.onNewEntity(data);

    // generate label
    data.label = `${this.acquisitionLevel}#${data.rankOrder}`;

    // Default taxon name
    if (isNotNil(this.defaultTaxonName)) {
      data.taxonName = TaxonNameRef.fromObject(this.defaultTaxonName);
    }
    // Default taxon group
    if (isNotNil(this.defaultTaxonGroup)) {
      data.taxonGroup = TaxonGroupRef.fromObject(this.defaultTaxonGroup);
    }

    if (this.qvPmfm) {
      data.children = (this.qvPmfm && this.qvPmfm.qualitativeValues || []).reduce((res, qv, qvIndex: number) => {

        const childLabel = qv ? `${data.label}.${qv.label}` : data.label;

        // If qv, add sub level at sorting batch for each qv value
        // If no qv, keep measurements in sorting batch level
        const child: Batch = !qv ? data : isNotNil(data.id) && (data.children || []).find(b => b.label === childLabel) || new Batch();

        child.rankOrder = qvIndex + 1;
        child.measurementValues = {};
        child.label = childLabel;

        // If sampling
        if (this.showSamplingBatchColumns) {
          const samplingLabel = childLabel + Batch.SAMPLING_BATCH_SUFFIX;
          const samplingChild: Batch = new Batch();
          samplingChild.rankOrder = 1;
          samplingChild.label = samplingLabel;
          samplingChild.measurementValues = {};
          child.children = [samplingChild];
        }
        // Remove children
        else {
          child.children = [];
        }

        return res.concat(child);
      }, []);
    }
    // If sampling
    else if (this.showSamplingBatchColumns) {
      const samplingLabel = data.label + Batch.SAMPLING_BATCH_SUFFIX;
      const samplingChild: Batch = new Batch();
      samplingChild.rankOrder = 1;
      samplingChild.label = samplingLabel;
      samplingChild.measurementValues = {};
      data.children = [samplingChild];
    }
  }

  private onPrepareRowForm(form?: FormGroup) {
    if (!form) return; // Skip
    console.debug('[batch-group-table] Init row validator');

    // Add computation and validation
    this._rowValidatorSubscription?.unsubscribe();
    const requiredSampleWeight = (form && form.value?.observedIndividualCount || 0) > 0;
    const subscription = this.batchGroupValidator.enableSamplingRatioAndWeight(form, {
      qvPmfm: this.qvPmfm,
      samplingRatioType: this.samplingRatioType,
      requiredSampleWeight,
      weightMaxDecimals: this.defaultWeightPmfm?.maximumNumberDecimals,
      markForCheck: () => this.markForCheck()
    });
    if (subscription) {
      // Register subscription
      this.registerSubscription(subscription);
      this._rowValidatorSubscription = subscription;
      // When unsubscribe, unregister
      subscription.add(() => {
        this.unregisterSubscription(subscription);
        this._rowValidatorSubscription = undefined;
      });
    }
  }
}

