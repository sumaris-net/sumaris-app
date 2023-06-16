import { ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, Output } from '@angular/core';
import { TableElement } from '@e-is/ngx-material-table';
import {UntypedFormGroup, Validators} from '@angular/forms';
import { AbstractBatchesTableConfig, BATCH_RESERVED_END_COLUMNS, BATCH_RESERVED_START_COLUMNS } from '../common/batches.table.class';
import {
  changeCaseToUnderscore,
  ColumnItem,
  firstArrayValue,
  FormFieldDefinition,
  FormFieldType,
  InMemoryEntitiesService,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrNaN,
  LoadResult,
  LocalSettingsService,
  ReferentialRef, ReferentialUtils,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  SETTINGS_DISPLAY_COLUMNS,
  TableSelectColumnsComponent,
  toBoolean
} from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes, MethodIds, QualityFlagIds } from '@app/referential/services/model/model.enum';
import { MeasurementValuesUtils } from '../../services/model/measurement.model';
import {Batch} from '../common/batch.model';
import { BatchGroupModal, IBatchGroupModalOptions } from './batch-group.modal';
import { BatchGroup, BatchGroupUtils } from './batch-group.model';
import { SubBatch } from '../sub/sub-batch.model';
import {Observable, Subject, Subscription} from 'rxjs';
import { filter, map, takeUntil, tap } from 'rxjs/operators';
import { ISubBatchesModalOptions, SubBatchesModal } from '../sub/sub-batches.modal';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { BatchGroupValidatorOptions, BatchGroupValidatorService } from './batch-group.validator';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { TripContextService } from '@app/trip/services/trip-context.service';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { AbstractBatchesTable } from '@app/trip/batch/common/batches.table.class';
import { hasFlag } from '@app/shared/flags.utils';
import { OverlayEventDetail } from '@ionic/core';
import { MeasurementsTableValidatorOptions } from '@app/trip/measurement/measurements-table.validator';
import { RxState } from '@rx-angular/state';
import { environment } from '@environments/environment';

const DEFAULT_USER_COLUMNS = ['weight', 'individualCount'];

declare type BatchGroupColumnKey = 'totalWeight' | 'totalIndividualCount' | 'samplingRatio' | 'samplingWeight' | 'samplingIndividualCount' | string;
declare type BatchComputedFn<T extends Batch = Batch> = (batch: T, parent: T|undefined, samplingRatioFormat: SamplingRatioFormat) => boolean;

/**
 * Compose many computed functions to one function.<br/>
 * return true (=computed) when one function return true (= OR operand between functions).
 * Nil value are ignored
 * @param values
 */
export function composeBatchComputed(values: (boolean | BatchComputedFn)[]): BatchComputedFn|boolean {
  // Remove nil value
  values = values?.filter(isNotNil);
  if (isEmptyArray(values)) return false; // Empty

  // Only one value: use it
  if (values.length === 1) return values[0];

  // Convert boolean values to functions
  const fns: BatchComputedFn[] = values
    .map(value => {
      if (typeof value !== 'function') return () => value;
      return value // already a function
    });

  // Compose functions: return true (=computed) when one function return true (= OR operand between functions)
  return (batch, parent, samplingRatioFormat) => fns.some(fn => fn(batch, parent, samplingRatioFormat));
}

export const BatchGroupColumnFlags = Object.freeze({
  IS_WEIGHT: 0x000001,
  IS_INDIVIDUAL_COUNT: 0x000010,
  IS_SAMPLING: 0x000100,
  IS_SAMPLING_RATIO: 0x001000,
  IS_ALWAYS_COMPUTED: 0x010000,
  IS_TOTAL: 0x100000
});

declare type BatchGroupColumnType = FormFieldType | 'samplingRatio' | 'pmfm';

declare interface BatchGroupColumnDefinition extends FormFieldDefinition<BatchGroupColumnKey, BatchGroupColumnType> {

  computed: boolean | BatchComputedFn;
  hidden: boolean;
  unitLabel?: string;
  rankOrder: number;
  qvIndex: number;
  classList?: string;
  path?: string;

  // Describe column
  flags: number;
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
interface BatchGroupsTableState {
  showSamplingBatchColumns: boolean;
  individualCountColumns: boolean;
}

@Component({
  selector: 'app-batch-groups-table',
  templateUrl: 'batch-groups.table.html',
  styleUrls: ['batch-groups.table.scss'],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchGroupsTable extends AbstractBatchesTable<
  BatchGroup,
  BatchFilter,
  InMemoryEntitiesService<BatchGroup, BatchFilter>,
  BatchGroupValidatorService,
  AbstractBatchesTableConfig<BatchGroup>,
  BatchGroupValidatorOptions
  > {

  static BASE_DYNAMIC_COLUMNS: Partial<BatchGroupColumnDefinition>[] = [
    // Column on total (weight, nb indiv)
    {
      type: 'double',
      key: 'totalWeight',
      path: 'weight.value',
      label: 'TRIP.BATCH.TABLE.TOTAL_WEIGHT',
      minValue: 0,
      maxValue: 10000,
      maximumNumberDecimals: 3,
      isWeight: true,
      flags: BatchGroupColumnFlags.IS_WEIGHT | BatchGroupColumnFlags.IS_TOTAL,
      classList: 'total mat-column-weight',
      computed: (batch) => batch && batch.weight?.computed || false
    },
    {
      type: 'double',
      key: 'totalIndividualCount',
      path: 'individualCount',
      label: 'TRIP.BATCH.TABLE.TOTAL_INDIVIDUAL_COUNT',
      minValue: 0,
      maxValue: 10000,
      maximumNumberDecimals: 2,
      isIndividualCount: true,
      flags: BatchGroupColumnFlags.IS_INDIVIDUAL_COUNT | BatchGroupColumnFlags.IS_TOTAL,
      classList: 'total'
    },

    // Column on sampling (ratio, nb indiv, weight)
    {
      type: 'samplingRatio',
      key: 'samplingRatio',
      path: 'children.0.samplingRatio',
      label: 'TRIP.BATCH.TABLE.SAMPLING_RATIO',
      unitLabel: <SamplingRatioFormat>'%',
      flags: BatchGroupColumnFlags.IS_SAMPLING | BatchGroupColumnFlags.IS_SAMPLING_RATIO,
      isSampling: true,
      computed: (batch, parent, samplingRatioFormat) => BatchUtils.isSamplingRatioComputed(batch?.children?.[0]?.samplingRatioText, samplingRatioFormat) || false
    },
    {
      type: 'double',
      key: 'samplingWeight',
      path: 'children.0.weight.value',
      label: 'TRIP.BATCH.TABLE.SAMPLING_WEIGHT',
      minValue: 0,
      maxValue: 1000,
      maximumNumberDecimals: 3,
      isWeight: true,
      isSampling: true,
      flags: BatchGroupColumnFlags.IS_SAMPLING | BatchGroupColumnFlags.IS_WEIGHT,
      computed: (batch) => batch?.children?.[0]?.weight?.computed || false
    },
    {
      type: 'double',
      key: 'samplingIndividualCount',
      path: 'children.0.individualCount',
      label: 'TRIP.BATCH.TABLE.SAMPLING_INDIVIDUAL_COUNT',
      isIndividualCount: true,
      isSampling: true,
      flags: BatchGroupColumnFlags.IS_SAMPLING | BatchGroupColumnFlags.IS_INDIVIDUAL_COUNT | BatchGroupColumnFlags.IS_ALWAYS_COMPUTED,
      computed: true
    }
  ];

  private _showWeightColumns = true;
  private _rowValidatorSubscription: Subscription;
  private _speciesPmfms: IPmfm[]; // Pmfms at species level (when has QV pmfm)
  private _childrenPmfms: IPmfm[]; // Pmfms ar children levels (if has QV pmfms) or species levels (if no QV Pmfm)

  weightMethodForm: UntypedFormGroup;
  estimatedWeightPmfm: IPmfm;
  dynamicColumns: BatchGroupColumnDefinition[];

  showToolbar = true; // False only if no group columns AND mobile
  groupColumns: GroupColumnDefinition[];
  groupColumnNames: string[];
  groupColumnStartColSpan: number;
  qvPmfm: IPmfm;

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
    return this.dirtySubject.value
      || (this.weightMethodForm && this.weightMethodForm.dirty);
  }

  @Input() modalOptions: Partial<IBatchGroupModalOptions>;
  @Input() subBatchesModalOptions: Partial<ISubBatchesModalOptions>;
  @Input() availableSubBatches: SubBatch[] | Observable<SubBatch[]>;
  @Input() enableWeightLengthConversion: boolean;
  @Input() labelPrefix: string; // Prefix to use for BatchGroup.label. If empty, will use the acquisitionLevel

  @Input() set showSamplingBatchColumns(value: boolean){
    this._state.set('showSamplingBatchColumns', (_) => value);
  }
  get showSamplingBatchColumns(): boolean {
    return this._state.get('showSamplingBatchColumns');
  }

  @Input() set showWeightColumns(value: boolean) {
    if (this._showWeightColumns !== value) {
      this._showWeightColumns = value;
      // updateColumns only if pmfms are ready
      if (!this.loading && this._initialPmfms) {
        this.computeDynamicColumns(this.qvPmfm, {cache: false /* no cache, to force computed */});
        this.updateColumns();
      }
    }
  }

  get showWeightColumns(): boolean {
    return this._showWeightColumns;
  }

  setShowSpeciesPmfmColumn(pmfmId: number, show: boolean, opts = {emitEvent: true}) {
    const pmfmIndex = (this._speciesPmfms || []).findIndex(p => p.id === pmfmId);
    if (pmfmIndex !== -1) {
      this._speciesPmfms[pmfmIndex] = this._speciesPmfms[pmfmIndex].clone();
      this._speciesPmfms[pmfmIndex].hidden = !show;
    }
    this.setShowColumn(pmfmId.toString(), show);
  }

  @Input() showError = true;
  @Input() allowSubBatches = true;
  @Input() defaultHasSubBatches = false;
  @Input() taxonGroupsNoWeight: string[] = [];

  @Input() set showIndividualCountColumns(value: boolean){
    this._state.set('individualCountColumns', (_) => value);
  }
  get showIndividualCountColumns(): boolean {
    return this._state.get('individualCountColumns');
  }

  @Output() onSubBatchesChanges = new EventEmitter<SubBatch[]>();

  constructor(
    injector: Injector,
    validatorService: BatchGroupValidatorService,
    protected context: TripContextService,
    protected pmfmNamePipe: PmfmNamePipe,
    protected _state: RxState<BatchGroupsTableState>
  ) {
    super(injector,
      BatchGroup, BatchFilter,
      new InMemoryEntitiesService<BatchGroup, BatchFilter>(BatchGroup, BatchFilter, {
        onLoad: (data) => this.onLoad(data),
        onSave: (data) => this.onSave(data),
        equals: BatchGroup.equals,
        sortByReplacement: {
          'id': 'rankOrder'
        }
      }),
      // Force no validator (readonly mode, if mobile)
      injector.get(LocalSettingsService).mobile ? null : validatorService,
      {
        // Need to set additional validator here
        // WARN: we cannot use onStartEditingRow here, because it is called AFTER row.validator.patchValue()
        //       e.g. When we add some validator (see operation page), so new row should always be INVALID with those additional validators
        onPrepareRowForm: (form) => this.onPrepareRowForm(form)
      }
    );

    // Set default values
    this.confirmBeforeDelete = this.mobile;
    this.i18nColumnPrefix = 'TRIP.BATCH.TABLE.';
    this.i18nPmfmPrefix = 'TRIP.BATCH.PMFM.';
    this.keepEditedRowOnSave = !this.mobile;
    this.saveBeforeDelete = true;
    this.saveBeforeFilter = true;
    this.saveBeforeSort = true;
    this.errorTranslatorOptions = { separator: '\n', controlPathTranslator: this};
    this.showCommentsColumn = !this.mobile; // Was set to 'false' in batches-table
    // this.acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH; // Already set in batches-table

    // -- For DEV only
    //this.debug = !environment.production;
    this.logPrefix = '[batch-groups-table] ';
  }

  ngOnInit() {
    this.inlineEdition = this.validatorService && !this.mobile;
    this.allowRowDetail = !this.inlineEdition;
    this.showIndividualCountColumns = toBoolean(this.showIndividualCountColumns, !this.mobile);
    this.showSamplingBatchColumns = toBoolean(this.showSamplingBatchColumns, true);

    // in DEBUG only: force validator = null
    //if (this.debug && this.mobile) this.setValidatorService(null);

    super.ngOnInit();

    // Configure sortBy replacement
    this.memoryDataService.addSortByReplacement('taxonGroup', `taxonGroup.${firstArrayValue(this.autocompleteFields.taxonGroup.attributes)}`)
    this.memoryDataService.addSortByReplacement('taxonName', `taxonName.${firstArrayValue(this.autocompleteFields.taxonName.attributes)}`)

    // Listen showSamplingBatchColumns
    this._state.hold(this._state.select('showSamplingBatchColumns'),  async (value) => {
      if (this.validatorService) {
        this.configureValidator(this.validatorService.measurementsOptions);
      }

      this.setModalOption('showSamplingBatch', value);

      // updateColumns only if pmfms are ready
      if (this._initialPmfms) {
        if (this.loading) await this.waitIdle({ timeout: 500 });
        this.computeDynamicColumns(this.qvPmfm, { cache: false /* no cache, to force computed */ });
        this.updateColumns();
      }
    });

  }

  ngOnDestroy() {
    super.ngOnDestroy();
  }

  protected configureValidator(opts?: MeasurementsTableValidatorOptions) {
    // make sure to confirm editing row, before to change validator
    this.confirmEditCreate();

    this.validatorService.measurementsOptions = null; // disable
    this.validatorService.delegateOptions = {
      qvPmfm: this.qvPmfm,
      withMeasurements: !this.qvPmfm && isNotEmptyArray(this._speciesPmfms),
      pmfms: this._speciesPmfms,
      childrenPmfms: this._childrenPmfms,
      enableSamplingBatch: this.showSamplingBatchColumns
    };
  }

  translateControlPath(controlPath: string): string {
    if (controlPath.startsWith('measurementValues.')) {
      const parts = controlPath.split('.');
      const pmfmId = parseInt(parts[parts.length-1]);
      const pmfm = (this._speciesPmfms || []).find(p => p.id === pmfmId);
      if (pmfm) return PmfmUtils.getPmfmName(pmfm);
    }
    else if (controlPath.includes('.measurementValues.')) {
      const parts = controlPath.split('.');
      const pmfmId = parseInt(parts[parts.length-1]);
      const pmfm = [...this._childrenPmfms, this.qvPmfm].find(p => p?.id === pmfmId);
      if (pmfm) return PmfmUtils.getPmfmName(pmfm);
    }
    else if (controlPath.startsWith('children.')){
      const parts = controlPath.split('.');
      let prefix = '';
      if (this.qvPmfm) {
        const qvIndex = parseInt(parts[1]);
        prefix = this.qvPmfm.qualitativeValues[qvIndex]?.name;
        controlPath = parts.slice(2).join('.');
      }
      const col = BatchGroupsTable.BASE_DYNAMIC_COLUMNS.find(col => col.path === controlPath);
      prefix = prefix.length ? `${prefix} > ` : prefix;
      if (col) return `${prefix} > ${this.translate.instant(col.label)}`;

      // Example: error on the sampling form group
      if (controlPath === 'children.0') {
        return prefix + this.translate.instant( 'TRIP.BATCH.EDIT.SAMPLING_BATCH');
      }
    }
    return super.translateControlPath(controlPath);
  }

  setModalOption(key: keyof IBatchGroupModalOptions, value: IBatchGroupModalOptions[typeof key]) {
    this.modalOptions = this.modalOptions || {};
    this.modalOptions[key as any] = value;
  }

  setSubBatchesModalOption(key: keyof ISubBatchesModalOptions, value: ISubBatchesModalOptions[typeof key]) {
    this.subBatchesModalOptions = this.subBatchesModalOptions || {};
    this.subBatchesModalOptions[key as any] = value;
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
            const hasSubBatches = this.showSamplingBatchColumns || isNotNil(BatchUtils.getSamplingChild(child));

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
        const hasSubBatches = this.showSamplingBatchColumns || isNotNil(BatchUtils.getSamplingChild(batch));

        // Make sure to create a sampling batch, if has sub bacthes
        if (hasSubBatches) {
          BatchUtils.getOrCreateSamplingChild(batch);
        }
      }
      MeasurementValuesUtils.normalizeEntityToForm(batch, this._speciesPmfms, null, {keepOtherExistingPmfms: true});

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


  isComputed(col: BatchGroupColumnDefinition, row: TableElement<BatchGroup>): boolean {

    if (typeof col.computed !== 'function') return col.computed === true;

    // With qv pmfm
    if (col.qvIndex >= 0) {
      const parent = row.currentData;
      const batch = parent.children[col.qvIndex];
      return col.computed(batch, parent, this.samplingRatioFormat);
    }

    return col.computed(row.currentData, null, this.samplingRatioFormat);
  }

  /**
   * Use in ngFor, for trackBy
   *
   * @param index
   * @param column
   */
  trackColumnFn(index: number, column: BatchGroupColumnDefinition): any {
    return column.rankOrder;
  }

  setFilter(filterData: BatchFilter, opts?: { emitEvent: boolean }) {

    const filteredSpeciesPmfmIds = filterData && Object.keys(filterData.measurementValues);
    if (isNotEmptyArray(filteredSpeciesPmfmIds)) {
      let changed = false;
      filteredSpeciesPmfmIds.forEach(pmfmId => {
          const shouldExcludeColumn = PmfmValueUtils.isNotEmpty(filterData.measurementValues[pmfmId]);
          if (shouldExcludeColumn !== this.excludesColumns.includes(pmfmId)) {
            this.setShowSpeciesPmfmColumn(+pmfmId, false, {emitEvent: false});
            changed = true;
          }
        });
      if (changed) this.updateColumns();
    }

    super.setFilter(filterData, opts);
  }

  async updateView(res: LoadResult<BatchGroup> | undefined, opts?: { emitEvent?: boolean }): Promise<void> {
    await super.updateView(res, opts);
    // Add hidden data to row count (e.g. when a filter has been applied)
    this.totalRowCount = this.totalRowCount + this.memoryDataService.hiddenCount;
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
    // DEBUG
    //if (this.debug) console.debug('[batch-group-table] Normalize QV child batch', data);

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
        samplingChild.samplingRatioComputed = BatchUtils.isSamplingRatioComputed(samplingChild.samplingRatioText, this.samplingRatioFormat);
      }
    }

    const qvId = this.qvPmfm?.qualitativeValues[qvIndex]?.id || -1;
    const childrenPmfms = qvId !== -1
      ? BatchGroupUtils.mapChildrenPmfms(this._childrenPmfms, {qvPmfm: this.qvPmfm, qvId})
      : this._speciesPmfms;
    data.measurementValues = MeasurementValuesUtils.normalizeValuesToForm(data.measurementValues, childrenPmfms, {keepSourceObject: true});

  }

  protected prepareEntityToSave(batch: BatchGroup) {

    if (this.qvPmfm) {
      batch.children = (this.qvPmfm.qualitativeValues || [])
        .map((qv, qvIndex) => this.prepareChildToSave(batch, qv, qvIndex));
      batch.measurementValues = MeasurementValuesUtils.normalizeValuesToModel(batch.measurementValues, this._speciesPmfms);
    } else {

      batch.measurementValues = MeasurementValuesUtils.normalizeValuesToModel(batch.measurementValues, this._speciesPmfms);
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
      batch.measurementValues[this.qvPmfm.id.toString()] = qv;
    }
    // Clean previous weights
    this.weightPmfms.forEach(p => batch.measurementValues[p.id.toString()] = undefined);

    // Set weight
    if (isNotNilOrNaN(batch.weight?.value)) {
      batch.weight.estimated = isEstimatedWeight;
      const weightPmfm = BatchUtils.getWeightPmfm(batch.weight, this.weightPmfms, this.weightPmfmsByMethod);
      batch.measurementValues[weightPmfm.id.toString()] = batch.weight.value?.toString();
    }

    // Convert measurementValues to model
    batch.measurementValues = MeasurementValuesUtils.normalizeValuesToModel(batch.measurementValues,
      this._childrenPmfms,
      // Keep weight values
      {keepSourceObject: true});

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
        const detectedFormat = BatchUtils.getSamplingRatioFormat(samplingBatch.samplingRatioText, this.samplingRatioFormat)
        if (detectedFormat !== this.samplingRatioFormat) {
          // TODO adapt text if format change ?
          console.warn('TODO: adapt samplingRatioText to new format=' + this.samplingRatioFormat);
        }
      }

      batch.children = [samplingBatch];
    }
    // Remove children
    else {
      batch.children = [];
    }

    return batch;
  }

  async onSubBatchesClick(event: Event,
                          row: TableElement<BatchGroup>,
                          opts?: { showParent?: boolean; emitLoaded?: boolean; }) {
    event?.preventDefault();
    event?.stopPropagation(); // Avoid to send event to clicRow()

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
  protected mapPmfms(pmfms: IPmfm[]): IPmfm[] {
    if (!pmfms) return pmfms; // Skip (no pmfms)

    super.mapPmfms(pmfms); // Should find the qvPmfm

    // Find the first qualitative PMFM
    this.qvPmfm = BatchGroupUtils.getQvPmfm(pmfms);

    // Compute species pmfms (at species batch level)
    if (this.qvPmfm) {
      const qvPmfmIndex = this._initialPmfms.findIndex(pmfm => pmfm.id === this.qvPmfm.id);
      this._speciesPmfms = this._initialPmfms.filter((pmfm, index) => index < qvPmfmIndex);
      this._childrenPmfms = [
        this.qvPmfm,
        ...this._initialPmfms.filter((pmfm, index) => index > qvPmfmIndex && !PmfmUtils.isWeight(pmfm))
      ];
    }
    else {
      this._speciesPmfms = this._initialPmfms.filter(pmfm => !PmfmUtils.isWeight(pmfm));
      this._childrenPmfms = [];
    }

    // Init dynamic columns
    this.computeDynamicColumns(this.qvPmfm, {cache: false});

    //Additional pmfms managed by validator on children batch
    return this._speciesPmfms;
  }

  protected computeDynamicColumns(qvPmfm: IPmfm, opts = { cache: true }): BatchGroupColumnDefinition[] {
    // Use cache
    if (this.dynamicColumns) {
      if (opts.cache !== false) {
        console.debug(this.logPrefix + 'Reusing cached dynamic columns', this.dynamicColumns);
        return this.dynamicColumns;
      }
      else {
        console.debug(this.logPrefix + 'Updating dynamic columns');
      }
    }

    // DEBUG
    if (this.debug) {
      // Log QV pmfm
      if (this.qvPmfm) console.debug('[batch-group-table] Using a qualitative PMFM, to group columns: ' + qvPmfm.label);

      // Make sure default weight pmfm exists
      if (isNil(this.defaultWeightPmfm)) {
        //throw new Error(`[batch-group-table] Unable to construct the table. No weight PMFM found in strategy - acquisition level ${this.acquisitionLevel})`);
        console.warn(`[batch-group-table] Unable to construct the table. No weight PMFM found in strategy - acquisition level ${this.acquisitionLevel})`);
      }

      // Check rankOrder is correct
      else if (PmfmUtils.isDenormalizedPmfm(this.defaultWeightPmfm)
          && (qvPmfm && PmfmUtils.isDenormalizedPmfm(qvPmfm)
            && qvPmfm.rankOrder > this.defaultWeightPmfm.rankOrder)) {
        throw new Error(`[batch-group-table] Unable to construct the table. First qualitative value PMFM must be define BEFORE any weight PMFM (by rankOrder in PMFM strategy - acquisition level ${this.acquisitionLevel})`);
      }
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
        console.warn('[batch-groups-table] TODO: create weightMethodForm, when no QV Pmfm')
      }
    }

    this.estimatedWeightPmfm = this.weightPmfmsByMethod && this.weightPmfmsByMethod[MethodIds.ESTIMATED_BY_OBSERVER] || this.defaultWeightPmfm;

    // No QV pmfm (no grouped columns)
    if (!qvPmfm) {
      this.groupColumns = [];

      // Add species Pmfms
      const speciesColumns = this.computePmfmColumns(this._speciesPmfms || [], 0, {
        qvIndex: -1
      });

      const childrenColumns = this.computeDynamicColumnsByQv();
      this.dynamicColumns = speciesColumns.concat(childrenColumns);
      this.showToolbar = !this.mobile || isNotEmptyArray(this.availableTaxonGroups) /* show auto fill button*/;
    }
    else {
      const groupColumns = [];

      // Add species Pmfms
      const speciesColumns = this.computePmfmColumns(this._speciesPmfms || [], 0, {
        qvIndex: -1
      });

      const childrenColumns = qvPmfm.qualitativeValues.flatMap((qv, qvIndex) => {
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
      if (this.debug) console.debug('[batch-groups-table] Dynamic columns: ' + speciesColumns.map(c => c.key).join(','));

      this.groupColumns = groupColumns;
      this.dynamicColumns = speciesColumns.concat(childrenColumns);
      this.showToolbar = true;
    }
  }

  protected computeDynamicColumnsByQv(qvGroup?: ReferentialRef, qvIndex?: number): BatchGroupColumnDefinition[] {
    qvIndex = isNotNil(qvIndex) ? qvIndex : -1;
    const qvId = qvGroup?.id || -1;
    let rankOrderOffset = this._speciesPmfms.filter(p => !p.hidden).length;
    if (qvIndex > 0) {
      rankOrderOffset += qvIndex * (BatchGroupsTable.BASE_DYNAMIC_COLUMNS.length + (!this.mobile && this._childrenPmfms.length || 0));
    }

    const hideWeightColumns = !this._showWeightColumns;
    const hideIndividualCountColumns = !this.showIndividualCountColumns;
    const hideSamplingColumns = !this.showSamplingBatchColumns;
    const hideSamplingRatioColumns = hideSamplingColumns;

    // Add pmfm columns
    const childrenPmfms = BatchGroupUtils.mapChildrenPmfms(this._childrenPmfms, {qvPmfm: this.qvPmfm, qvId});
    const pmfmColumns = childrenPmfms
      .map((pmfm, index) => {
        const key: string = qvGroup ? `${qvGroup.label}_${pmfm.id}` : `${pmfm.id}`;
        const rankOrder: number = rankOrderOffset + index;
        const hidden = this.mobile || pmfm.hidden;
        const path = qvIndex === -1 ? `measurementValues.${pmfm.id}` : `children.${qvIndex}.measurementValues.${pmfm.id}`;
        return <BatchGroupColumnDefinition>{
          type: 'pmfm',
          label: this.pmfmNamePipe.transform(pmfm, {i18nPrefix: this.i18nPmfmPrefix, i18nContext: this.i18nColumnSuffix}),
          key,
          qvIndex,
          rankOrder,
          hidden,
          classList: 'total',
          computed: pmfm.isComputed || false,
          isIndividualCount: false,
          isSampling: false,
          pmfm,
          unitLabel: pmfm.unitLabel,
          path
        };
      });

    const qvColumns = BatchGroupsTable.BASE_DYNAMIC_COLUMNS
      .map((def, index) => {
        const key = qvGroup ? `${qvGroup.label}_${def.key}` : def.key;
        const path = (qvIndex >= 0 ? `children.${qvIndex}.${def.path}` : def.path);
        const rankOrder = rankOrderOffset + pmfmColumns.length + index;
        const isSamplingRatio = hasFlag(def.flags, BatchGroupColumnFlags.IS_SAMPLING_RATIO);
        const hidden = (hideWeightColumns && hasFlag(def.flags, BatchGroupColumnFlags.IS_WEIGHT))
          || (hideIndividualCountColumns && hasFlag(def.flags, BatchGroupColumnFlags.IS_INDIVIDUAL_COUNT))
          || (hideSamplingColumns && hasFlag(def.flags, BatchGroupColumnFlags.IS_SAMPLING))
          || (hideSamplingRatioColumns && hasFlag(def.flags, BatchGroupColumnFlags.IS_SAMPLING_RATIO));
        const label = isSamplingRatio && this.samplingRatioFormat === '1/w' ? 'TRIP.BATCH.TABLE.SAMPLING_COEFFICIENT' : def.label;
        const unitLabel = isSamplingRatio && this.samplingRatioFormat === '1/w' ? null : def.unitLabel;
        let computed = def.computed;

        // Detect computed column, when taxonGroupsNoWeight is used
        if (isNotEmptyArray(this.taxonGroupsNoWeight)) {
          if (def.key === 'totalIndividualCount') {
            computed = composeBatchComputed([computed, (batch, parent) => {
              return !this.isTaxonGroupNoWeight(parent?.taxonGroup || batch?.taxonGroup);
            }]);
          }
          else if (hasFlag(def.flags, BatchGroupColumnFlags.IS_WEIGHT)) {
            computed = composeBatchComputed([computed, (batch, parent) => {
              return this.isTaxonGroupNoWeight(parent?.taxonGroup || batch?.taxonGroup)
            }]);
          }
        }
        return <BatchGroupColumnDefinition>{
          ...(def.isWeight && this.defaultWeightPmfm || {}),
          ...def,
          key,
          label,
          unitLabel,
          qvIndex,
          rankOrder,
          hidden,
          path,
          computed
        };
      });

    return pmfmColumns.concat(qvColumns);
  }


  protected computePmfmColumns(pmfms: IPmfm[], offset?: number, opts?: Partial<BatchGroupColumnDefinition>): BatchGroupColumnDefinition[] {
    offset = offset || 0;
    // Add Pmfm columns
    return (pmfms || [])
      .map((pmfm, index) => {
        return <BatchGroupColumnDefinition>{
          type: 'pmfm',
          label: this.pmfmNamePipe.transform(pmfm, {i18nPrefix: this.i18nPmfmPrefix, i18nContext: this.i18nColumnSuffix}),
          key: pmfm.id.toString(),
          rankOrder: offset + index,
          qvIndex: -1,
          hidden: pmfm.hidden,
          computed: pmfm.isComputed || false,
          isIndividualCount: false,
          isSampling: false,
          pmfm,
          unitLabel: pmfm.unitLabel,
          path: `measurementValues.${pmfm.id}`,
          ...opts
        };
      });
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

    this.groupColumnStartColSpan = RESERVED_START_COLUMNS.length
      + (this.showTaxonGroupColumn ? 1 : 0)
      + (this.showTaxonNameColumn ? 1 : 0);
    if (this.qvPmfm) {
      this.groupColumnStartColSpan += isEmptyArray(this._speciesPmfms) ? 0 :
        this._speciesPmfms.filter(p => !p.hidden && !this.excludesColumns.includes(''+p.id)).length;
    }
    else {
      this.groupColumnStartColSpan += this.dynamicColumns.filter(c => !c.hidden && !this.excludesColumns.includes(c.key)).length;
    }

    if (!this.loading) this.markForCheck();
  }

  deleteSelection(event: Event): Promise<number> {
    return super.deleteSelection(event);
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
        rankOrder: c.rankOrder
          + (inverseOrder ? ((c.isWeight && 1) || (c.isIndividualCount && -1)) : 0),
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

  /**
   * Open the sub batches modal, from a parent batch group.
   * Return the updated parent, or undefined if o changes (e.g. user cancelled)
   * @param data
   * @protected
   */
  protected async openSubBatchesModalFromParentModal(data: BatchGroup): Promise<BatchGroup|undefined> {

    let changes = false;

    // Search if row already exists
    let row = await this.findRowByEntity(data);

    // Row already exists: edit the row
    if (row) {
      if (row !== this.editedRow) {
        const confirmed: boolean = this.confirmEditCreate();
        if (!confirmed) throw new Error('Cannot confirmed the preview edited row !');
      }

      // Update row's data
      row.currentData = data;

      // Select the row (highlight)
      this.editedRow = row;
    }

    // Add new row to table
    else {
      console.debug('[batch-group-table] Adding batch group, before opening sub batches modal...');
      row = await this.addEntityToTable(data, {confirmCreate: false});
      if (!row) throw new Error('Cannot add new row!');
      changes = true;
    }

    const subBatches = await this.openSubBatchesModal(data, {
      showParent: false // action triggered from the parent batch modal, so the parent field can be hidden
    });

    // User cancelled from the subbatches modal
    if (!subBatches) {
      // If row was added, return changes made when adding the row
      if (changes) return data;
      // No changes
      return;
    }

    // Update the parent
    data = this.updateBatchGroupFromSubBatches(data, subBatches);

    return data;
  }


  protected async openSubBatchesModal(parentGroup?: BatchGroup, opts?: {
    showParent?: boolean;
  }): Promise<SubBatch[] | undefined> {

    // DEBUG
    if (this.debug) console.debug('[batches-table] Open individual measures modal...');

    // FIXME: opts.showParent=true not working
    const showParentGroup = !opts || opts.showParent !== false; // True by default

    const $dismiss = new Subject<any>();

    const hasTopModal = !!(await this.modalCtrl.getTop());
    const modal = await this.modalCtrl.create({
      component: SubBatchesModal,
      componentProps: <ISubBatchesModalOptions>{
        programLabel: this.programLabel,
        acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL,
        usageMode: this.usageMode,
        showParentGroup,
        parentGroup,
        data: this.availableSubBatches,
        qvPmfm: this.qvPmfm,
        disabled: this.disabled,
        // Scientific species is required, only not already set in batch groups
        showTaxonNameColumn: !this.showTaxonNameColumn,
        // If on field mode: use individualCount=1 on each sub-batches
        showIndividualCount: !this.settings.isOnFieldMode(this.usageMode),
        // Define available parent, as an observable (if new parent can added)
        availableParents: this.dataSource.rowsSubject
          .pipe(
            takeUntil($dismiss),
            map((rows) => rows.map(r => r.currentData)),
            tap((data) => console.warn('[batch-groups-table] Modal -> New available parents:', data))
          ),
        onNewParentClick: async () => {
          const { data, role } = await this.openDetailModal();
          if (data) {
            await this.addEntityToTable(data, {editing: false});
          }
          return data;
        },
        i18nSuffix: this.i18nColumnSuffix,
        mobile: this.mobile,
        // Override using input options
        maxVisibleButtons: this.modalOptions?.maxVisibleButtons,
        maxItemCountForButtons: this.modalOptions?.maxItemCountForButtons,
        ...this.subBatchesModalOptions
      },
      backdropDismiss: false,
      keyboardClose: true,
      cssClass: hasTopModal ? 'modal-large stack-modal' : 'modal-large'
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const {data, role} = await modal.onDidDismiss();

    $dismiss.next(); // disconnect datasource observables

    // User cancelled
    if (isNil(data) || role === 'cancel') {
      if (this.debug) console.debug('[batches-table] Sub-batches modal: user cancelled');
    } else {
      // DEBUG
      //if (this.debug) console.debug('[batches-table] Sub-batches modal result: ', data);

      this.onSubBatchesChanges.emit(data);
    }

    return data;
  }

  protected async openDetailModal(dataToOpen?: BatchGroup, row?: TableElement<BatchGroup>): Promise<OverlayEventDetail<BatchGroup | undefined>> {
    console.debug('[batch-group-table] Opening detail modal...');

    let originalData: BatchGroup;
    let isNew = !dataToOpen && true;
    if (isNew) {
      dataToOpen = new BatchGroup();
      await this.onNewEntity(dataToOpen);
    }
    else {
      // Clone data, to keep the original data (allow to cancel - see below)
      originalData = this.asEntity(dataToOpen).clone();
    }

    this.markAsLoading();

    const modal = await this.modalCtrl.create({
      component: BatchGroupModal,
      componentProps: <IBatchGroupModalOptions>{
        acquisitionLevel: this.acquisitionLevel,
        pmfms: this._initialPmfms,
        qvPmfm: this.qvPmfm,
        disabled: this.disabled,
        showTaxonGroup: this.showTaxonGroupColumn,
        showTaxonName: this.showTaxonNameColumn,
        availableTaxonGroups: this.availableTaxonGroups,
        taxonGroupsNoWeight: this.taxonGroupsNoWeight,
        showSamplingBatch: this.showSamplingBatchColumns,
        allowSubBatches: this.allowSubBatches,
        defaultHasSubBatches: this.defaultHasSubBatches,
        samplingRatioFormat: this.samplingRatioFormat,
        openSubBatchesModal: (data) => this.openSubBatchesModalFromParentModal(data),
        onDelete: (event, batchGroup) => this.deleteEntity(event, batchGroup),
        onSaveAndNew: async (dataToSave) => {
          // Always try to retrieve the row (fix #403)
          row = await this.findRowByEntity(dataToSave);

          // Insert or update
          let savedRow: TableElement<BatchGroup>;
          if (isNew && !row) {
            savedRow = await this.addEntityToTable(dataToSave, {editing: false});
          } else if (row) {
            savedRow = await this.updateEntityToTable(dataToSave, row, {confirmEdit: true});
          }
          if (!savedRow) return undefined; // Failed

          // Prepare new entity
          dataToOpen = new BatchGroup();
          await this.onNewEntity(dataToOpen);

          isNew = true; // Next row should be new
          row = null; // Forget the row to update
          originalData = null; // forget the orignal data

          return dataToOpen;
        },
        i18nSuffix: this.i18nColumnSuffix,
        mobile: this.mobile,
        usageMode: this.usageMode,
        // Override using given options
        ...this.modalOptions,

        // Data to open
        isNew,
        data: dataToOpen
      },
      cssClass: 'modal-large',
      backdropDismiss: false,
      keyboardClose: true
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    // /!\ we use 'onWillDismiss' (and NOT 'onDidDismiss') to make sure row is deleted if cancelled, BEFORE modal is really closed
    const {data, role} = await modal.onWillDismiss();

    if (data && this.debug) console.debug('[batch-group-table] Batch group modal result: ', data, role);

    this.markAsLoaded();

    // User cancelled: try to rollback changes
    if (!data || role === 'cancel') {

      // new data: delete if exists
      // /!\ it can be added when open the subbatches moda : that why we need to delete a new row !
      if (isNew) {
        await this.deleteEntity(null, dataToOpen);
      }
      // Revert changes
      else if (originalData) {
        row = await this.findRowByEntity(dataToOpen);
        row.currentData = originalData;
      }
    }

    return {data: data instanceof BatchGroup ? data : undefined, role};
  }

  async openSelectColumnsModal(event?: Event) {

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

  protected async findRowByEntity(data: BatchGroup): Promise<TableElement<BatchGroup>> {
    const result = await super.findRowByEntity(data);

    // TODO: remove this code, after testing well the App
    if (!environment.production) {
      const result2 = data && this.dataSource.getRows().find(r => BatchGroup.equals(r.currentData, data));
      if (result !== result2) {
        console.warn('TODO: findRowByEntity(). Nos same result, using static BatchGroup.equals() !', result, result2);
      }
    }

    return result;
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

    const children = (subBatches || []).filter(b => this.equals(parent, b.parentGroup));

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

    if (this.qvPmfm) {
      const qvPmfmId = this.qvPmfm.id.toString();
      let observedIndividualCount = 0;

      this.qvPmfm.qualitativeValues.forEach((qv, qvIndex) => {
        const batchGroup = (parent.children || []).find(b => PmfmValueUtils.equals(b.measurementValues[qvPmfmId], qv));
        const qvChildren = children.filter(c => PmfmValueUtils.equals(c.measurementValues[qvPmfmId], qv));

        if (!batchGroup) {
          throw new Error('Invalid batch group: missing children with QV pmfm = ' + qv.label);
        }
        else {
          const {individualCount} = updateSortingBatch(batchGroup, qvChildren);

          // Update individual count
          observedIndividualCount += (individualCount || 0);
        }
      });

      parent.observedIndividualCount = observedIndividualCount;
    }
    else {
      const {individualCount, childrenWeight} = updateSortingBatch(parent, children);
      parent.observedIndividualCount = individualCount || 0;
    }

    return parent;
  }

  protected async onNewEntity(data: BatchGroup): Promise<void> {
    console.debug('[batch-group-table] Initializing new row data...');

    await super.onNewEntity(data);

    // generate label (override default)
    data.label = this.labelPrefix
      ? `${this.labelPrefix}${data.rankOrder}`
      : `${this.acquisitionLevel||''}#${data.rankOrder}`;

    // Default taxon name
    if (isNotNil(this.defaultTaxonName)) {
      data.taxonName = TaxonNameRef.fromObject(this.defaultTaxonName);
    }
    // Default taxon group
    if (isNotNil(this.defaultTaxonGroup)) {
      data.taxonGroup = TaxonGroupRef.fromObject(this.defaultTaxonGroup);
    }

    // Default measurements
    const filter = this.filter;
    const filteredSpeciesPmfmIds = MeasurementValuesUtils.getPmfmIds(filter?.measurementValues);
    if (isNotEmptyArray(filteredSpeciesPmfmIds)) {
      data.measurementValues = data.measurementValues || {};
      filteredSpeciesPmfmIds.forEach(pmfmId => {
        const pmfm = (this._speciesPmfms || []).find(p => p.id === +pmfmId);
        const filterValue = pmfm && filter.measurementValues[pmfmId];
        if (isNil(data.measurementValues[pmfmId]) && isNotNil(filterValue)) {
          data.measurementValues[pmfmId] = PmfmValueUtils.fromModelValue(filterValue, pmfm);
        }
      })
    }


    if (this.qvPmfm) {
      data.children = (this.qvPmfm.qualitativeValues || []).reduce((res, qv, qvIndex: number) => {

        const childLabel = `${data.label}.${qv.label}`;

        const child: Batch = (data.children || []).find(b => b.label === childLabel) || new Batch();

        child.rankOrder = qvIndex + 1;
        child.measurementValues = child.measurementValues || {};
        child.measurementValues[this.qvPmfm.id.toString()] = qv.id.toString();
        child.label = childLabel;

        // If sampling
        if (this.showSamplingBatchColumns) {
          const samplingLabel = childLabel + Batch.SAMPLING_BATCH_SUFFIX;
          const samplingChild: Batch = (child.children || []).find(b => b.label === samplingLabel) || new Batch();
          samplingChild.rankOrder = 1;
          samplingChild.label = samplingLabel;
          samplingChild.measurementValues = samplingChild.measurementValues || {};
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
      const samplingChild: Batch = (data.children || []).find(b => b.label === samplingLabel) || new Batch();
      samplingChild.rankOrder = 1;
      samplingChild.label = samplingLabel;
      samplingChild.measurementValues = samplingChild.measurementValues || {};
      data.children = [samplingChild];
    }
  }

  private onPrepareRowForm(form?: UntypedFormGroup) {
    if (!form) return; // Skip
    console.debug('[batch-group-table] Init row validator');

    // Remove previous subscription
    this._rowValidatorSubscription?.unsubscribe();

    const data = form.value as BatchGroup;

    // Clean quality flag
    const qualityFlagId = data.qualityFlagId;
    if (qualityFlagId !== QualityFlagIds.NOT_QUALIFIED) {
      form.patchValue(<Partial<BatchGroup>>{controlDate: null, qualificationDate: null, qualificationComments: null, qualityFlagId: QualityFlagIds.NOT_QUALIFIED}, {emitEvent: false});
      form.markAsDirty();
      this.markAsDirty({emitEvent: false});
    }

    const hasSubBatches = (data.observedIndividualCount || 0) > 0;
    const taxonGroupNoWeight = this.isTaxonGroupNoWeight(data.taxonGroup);
    const weightRequired = !taxonGroupNoWeight;
    const individualCountRequired = taxonGroupNoWeight;
    const requiredSampleWeight = weightRequired && hasSubBatches;

    // Updating row form, with new options
    this.validatorService.updateFormGroup(form, {
      withWeight: weightRequired,
      weightRequired,
      individualCountRequired
    });

    if (isNotEmptyArray(this.taxonGroupsNoWeight)) {
      // If taxon group with NO weights: reset weight and sampling ratio
      if (taxonGroupNoWeight) {
        this.resetColumnValueByFlag(form, BatchGroupColumnFlags.IS_WEIGHT);
        this.resetColumnValueByFlag(form, BatchGroupColumnFlags.IS_SAMPLING_RATIO);
      }
        // Default case (weight allowed)
      // - Reset totalIndividualCount
      else {
        this.resetColumnValueByFlag(form, BatchGroupColumnFlags.IS_INDIVIDUAL_COUNT | BatchGroupColumnFlags.IS_TOTAL);
      }
    }

    const subscription = new Subscription();

    // Detect taxon group changes
    // e.g. if a taxon group becomes 'RJB' (no weight), we should refresh the form
    if (isNotEmptyArray(this.taxonGroupsNoWeight)) {
      subscription.add(
        form.get('taxonGroup').valueChanges
          .pipe(
            filter(ReferentialUtils.isNotEmpty), // Skip if not item selected
            map(taxonGroup => this.isTaxonGroupNoWeight(taxonGroup)),
            filter(v => v !== taxonGroupNoWeight) // distinguish changes from initial call
          )
          .subscribe(_ => {
            // DEBUG
            //console.debug(this.logPrefix + 'Detecting taxon group changes: will update form...');

            // Refresh form, because taxon group has changed
            this.onPrepareRowForm(form);
          })
      );
    }

    // Enable computation of weights and sampling ratio
    if (!taxonGroupNoWeight) {
      subscription.add(this.validatorService.delegate.enableSamplingRatioAndWeight(form, {
        qvPmfm: this.qvPmfm,
        samplingRatioFormat: this.samplingRatioFormat,
        requiredSampleWeight,
        weightMaxDecimals: this.defaultWeightPmfm?.maximumNumberDecimals,
        markForCheck: () => this.markForCheck()
      }));
    }

    // Register row subscription
    this._rowValidatorSubscription = subscription;
    this.registerSubscription(this._rowValidatorSubscription);
    subscription.add(() => {
      this.unregisterSubscription(subscription);
      this._rowValidatorSubscription = undefined;
    });
  }

  protected isTaxonGroupNoWeight(taxonGroup: TaxonGroupRef): boolean {
    if (!taxonGroup || !taxonGroup?.label || isEmptyArray(this.taxonGroupsNoWeight)) return false;
    return this.taxonGroupsNoWeight.includes(taxonGroup.label);
  };

  protected resetColumnValueByFlag(form: UntypedFormGroup, flag: number, opts? : {emitEvent?: boolean}) {
    let dirty = false;
    this.dynamicColumns.filter(column => hasFlag(column.flags, flag))
      .forEach(column => {
        const control = form.get(column.path);
        if (isNotNil(control.value)) {
          control.setValue(null);
          dirty = true;
        }
      });

    if (dirty && opts?.emitEvent !== false) {
      form.markAsDirty();
      this.markAsDirty({emitEvent: false});
    }
    return dirty;
  }

  confirmEditCreate(event?: Event, row?: TableElement<BatchGroup>): boolean {
    const confirmed = super.confirmEditCreate(event, row);

    // Stop row subscription
    if (confirmed && (!row || !row.editing)) {
      this._rowValidatorSubscription?.unsubscribe();
    }
    return confirmed;
  }



  getDebugData(type:'rowValidator'): any {
    switch (type) {
      case 'rowValidator':
        const form = this.validatorService.getRowValidator();
        form.disable();
        return form;
    }
  }
}
