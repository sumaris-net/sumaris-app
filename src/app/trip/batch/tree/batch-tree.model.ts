import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import {
  arrayDistinct,
  Entity,
  EntityAsObjectOptions,
  EntityClass,
  EntityFilter,
  FilterFn,
  getPropertyByPath,
  IconRef,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  ITreeItemEntity,
  TreeItemEntityUtils,
  waitWhilePending,
} from '@sumaris-net/ngx-components';
import { Batch } from '@app/trip/batch/common/batch.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { FormArray, UntypedFormGroup } from '@angular/forms';
import {
  MeasurementFormValues,
  MeasurementModelValues,
  MeasurementUtils,
  MeasurementValuesTypes,
  MeasurementValuesUtils,
} from '@app/data/measurement/measurement.model';
import { DataEntityAsObjectOptions } from '@app/data/services/model/data-entity.model';
import { Rule, RuleUtils } from '@app/referential/services/model/rule.model';
import { BatchFormState } from '@app/trip/batch/common/batch.form';
import { BatchGroupsTableState } from '@app/trip/batch/group/batch-groups.table';

export interface BatchModelAsObjectOptions extends DataEntityAsObjectOptions {
  withChildren?: boolean;
}
export interface BatchModelFromObjectOptions {
  withChildren?: boolean;
}

@EntityClass({typename: 'BatchModelVO'})
export class BatchModel
  extends Entity<BatchModel, number, BatchModelAsObjectOptions, BatchModelFromObjectOptions>
  implements ITreeItemEntity<BatchModel> {

  static fromObject: (source: any, opts?: { withChildren?: boolean }) => BatchModel;
  static fromBatch(batch: Batch|undefined,
                   pmfms: IPmfm[],
                   rules: Rule<{model: BatchModel; pmfm: IPmfm}>[],
                   // Internal arguments (used by recursive call)
                   maxTreeDepth = 5,
                   treeDepth = 0,
                   parent: BatchModel = null,
                   path= ''
  ): BatchModel {
    pmfms = pmfms || [];

    // Make sure the first batch is a catch batch
    const isCatchBatch = treeDepth === 0 || BatchUtils.isCatchBatch(batch);
    if (isCatchBatch && !batch) {
      batch = Batch.fromObject({ label: AcquisitionLevelCodes.CATCH_BATCH, rankOrder: 1});
    }
    const model = new BatchModel({
      parent,
      path,
      originalData: batch
    });

    // Apply rule on childrenPmfms
    if (rules?.length) {
      // Build rules
      RuleUtils.build(rules, false /*keep previous compilation*/);

      // Filter pmfms, by applying all rules
      pmfms = pmfms.filter(pmfm => RuleUtils.valid({model, pmfm}, rules));
    }

    // Find the first QV pmfm
    const qvPmfm: IPmfm = PmfmUtils.getFirstQualitativePmfm(pmfms, {
      excludeHidden: true,
      minQvCount: 2,
      maxQvCount: 3,
      excludePmfmIds: [PmfmIds.CHILD_GEAR], // Avoid child gear be a qvPmfm
      includePmfmIds: [PmfmIds.LANDING_CATEGORY, PmfmIds.IS_SAMPLING, PmfmIds.DISCARD_TYPE]
    });
    if (qvPmfm) {
      const qvPmfmIndex = pmfms.indexOf(qvPmfm);
      if (qvPmfmIndex > 0) {
        model.state.initialPmfms = pmfms.slice(0, qvPmfmIndex);
      }

      // Prepare next iteration
      pmfms = pmfms.slice(qvPmfmIndex+1);

      treeDepth++;
      if (treeDepth < maxTreeDepth && isNotEmptyArray(pmfms)) {

        const samplingBatch = BatchUtils.getSamplingChild(batch);
        const childLabelPrefix = isCatchBatch ?
          `${AcquisitionLevelCodes.SORTING_BATCH}#` : `${samplingBatch?.label || batch.label}.`;
        const childrenPath = isCatchBatch ? 'children' :
          (samplingBatch
             ? `${path}.children.0.children`
             : `${path}.children`);

        // Create children batches
        model.children = qvPmfm.qualitativeValues.map((qv, index) => {
          const childQvPmfm = qvPmfm.clone();
          childQvPmfm.hidden = true;
          childQvPmfm.defaultValue = qv.id;

          const childBatch = (samplingBatch?.children || batch.children || []).find(c => PmfmValueUtils.equals(c.measurementValues?.[childQvPmfm.id], qv))
            || Batch.fromObject({
              measurementValues: {
                __typename: MeasurementValuesTypes.MeasurementModelValues,
                [childQvPmfm.id]: qv.id.toString()
              }
            });
          childBatch.measurementValues.__typename = childBatch.measurementValues.__typename || MeasurementValuesTypes.MeasurementModelValues;
          childBatch.label = `${childLabelPrefix}${qv.label}`;
          childBatch.rankOrder = index+1;

          // Recursive call
          const childModel = BatchModel.fromBatch(childBatch, pmfms, rules, maxTreeDepth, treeDepth, model, `${childrenPath}.${index}`);
          childModel.pmfms = [
            childQvPmfm,
            ...(childModel.pmfms || [])
          ];

          // Set name
          childModel.name = qv.name;

          return childModel;
        });
      }
      else {
        model.childrenPmfms = [
          qvPmfm,
          ...pmfms
        ];
      }
    }
    else {
      // No QV pmfm found
      model.pmfms = [];
      model.childrenPmfms = pmfms;
    }

    // Disabled root node, if no visible pmfms (e.g. when catch batch has no pmfm)
    model.disabled = !(model.pmfms || []).some(p => !p.hidden)
      && !model.isLeaf
      && !model.parent;

    // if is disabled and no parent
    model.hidden = model.disabled && !model.parent;
    // Leaf = leaf in the batch model tree, NOT in the final batch tree
    model.isLeaf = isEmptyArray(model.children) || isNotEmptyArray(model.childrenPmfms);
    model.pmfms = model.pmfms || [];
    model.childrenPmfms = model.childrenPmfms || [];
    if (!model.isLeaf) {
      model.state.showExhaustiveInventory = false;
    }

    return model;
  }

  static equals(b1: BatchModel, b2: BatchModel): boolean {
    return b1 && b2 && ((isNotNil(b1.id) && b1.id === b2.id)
      // Or by functional attributes
      // Same path
      || (b1.path === b2.path));
  }

  static isEmpty(b1: BatchModel): boolean {
    return !b1 || (!b1.originalData && !b1.validator);
  }


  // Cached values (should be recomputed on changes)
  private _valid: boolean;
  private _rowCount: number;
  private _weightPmfms: IPmfm[];

  name: string;
  icon: IconRef;
  isLeaf: boolean;
  originalData?: Batch;
  validator?: UntypedFormGroup;
  disabled?: boolean;
  hidden?: boolean;

  state?: Partial<BatchFormState>;
  childrenState?: Partial<BatchGroupsTableState>;

  path: string;
  parentId: number = null;
  parent: BatchModel = null;
  children: BatchModel[] = null;


  constructor(init?: { validator?: UntypedFormGroup; parent?: BatchModel; path?: string; originalData?: Batch}) {
    super();
    this.validator = init?.validator;
    if (init) Object.assign(this, init);
    this.state = {};
    this.childrenState = {};
  }

  fromObject(source: any, opts?: BatchModelFromObjectOptions) {
    super.fromObject(source);
    this.name = source.name;
    this.icon = source.icon;
    this.originalData = source.originalData;
    this.state = source.state && {
      initialPmfms: source.state.initialPmfms || []
    } || {};
    this.childrenState = source.childrenState && {
      initialPmfms: source.childrenState.initialPmfms || []
    } || {};

    this.disabled = source.disabled || false;
    this.hidden = source.hidden || false;
    this.isLeaf = source.isLeaf || (this.childrenState?.initialPmfms?.length > 0);

    this.path = source.path || null;
    this.parent = source.parent || null;
    this.children = source.children || source.children.map(BatchModel.fromObject) || null;
    this.rowCount = source.rowCount;
  }

  get fullName(): string {
    if (this.parent && this.parent.hidden !== true) return [this.parent.fullName, this.name].join(' &gt; ');
    return this.name;
  }

  get invalid(): boolean {
    return !this.valid;
  }
  set invalid(value: boolean) {
    this._valid = !value;
  }

  get valid(): boolean {
    if (isNil(this._valid) && this.editing) {
      this._valid = this.validator.valid;
    }
    if (!this._valid) return false;
    return true;
    //return !this.children || !this.children.some(c => !c.valid);
  }

  set valid(value: boolean) {
    this._valid = value;
  }

  get rowCount(): number {
    if (isNil(this._rowCount) && this.isLeaf) {
      const data = this.validator.value;
      const samplingBatch = BatchUtils.getSamplingChild(data) || data;
      this._rowCount = samplingBatch?.children?.length || 0;
    }
    return this._rowCount || 0;
  }

  set rowCount(value: number) {
    this._rowCount = value;
  }

  get childrenValid(): boolean {
    return !this.children || !this.children.some(c => !c.valid);
  }

  get childrenInvalid(): boolean {
    return !this.childrenValid;
  }

  get dirty(): boolean {
    return this.validator?.dirty || false;
  }

  get touched(): boolean {
    return this.validator.touched;
  }

  get untouched(): boolean {
    return this.validator.untouched;
  }

  get editing(): boolean {
    return this.validator?.enabled || false;
  }

  set editing(enable: boolean) {
    if (enable) {
      this.validator.enable({onlySelf: true});
      let childrenForm = this.validator.get('children');
      if (this.state?.showSamplingBatch && childrenForm instanceof FormArray) {
        childrenForm = childrenForm.at(0)?.get('children');
      }
      childrenForm?.disable({onlySelf: true});
    } else {
      if (this.validator.enabled) {
        // Save the valid state
        this._valid = this.validator.valid;
      }
      this.validator.disable();
    }
  }

  get isExpanded(): boolean {
    return !this.isLeaf;
  }

  async isValid(): Promise<boolean> {

    // Enable temporarily the validator to get the valid status
    const disabled = this.validator?.disabled;
    if (disabled) {
      this.validator.enable({emitEvent: false, onlySelf: true});
    }

    try {
      if (!this.validator?.valid) {

        // Wait end of async validation
        if (this.validator?.pending) {
          await waitWhilePending(this.validator);
        }

        // Quit if really invalid
        if (this.validator?.invalid) {
          return false;
        }
      }

      return true;
    } finally {
      // Re-disabled, if need
      if (disabled) {
        this.validator.disable({emitEvent: false, onlySelf: true});
      }
    }
  }

  set currentData(value: Batch) {
    this.validator.patchValue(value);
  }

  get currentData(): Batch {
    return this.validator?.getRawValue();
  }

  get(path: string): BatchModel {
    if (isNilOrBlank(path)) return this;
    return getPropertyByPath(this, path);
  }

  get pmfms(): IPmfm[] {
    return this.state?.initialPmfms;
  }
  set pmfms(pmfms: IPmfm[]) {
    this.state = {
      ...this.state,
      initialPmfms: pmfms
    };
    this._weightPmfms = null; // Reset cache
  }
  get childrenPmfms(): IPmfm[] {
    return this.childrenState?.initialPmfms;
  }
  set childrenPmfms(pmfms: IPmfm[]) {
    this.childrenState = {
      ...this.childrenState,
      initialPmfms: pmfms
    };
  }

  get weightPmfms(): IPmfm[] {
    if (!this._weightPmfms) {
      this._weightPmfms = this.pmfms?.filter(PmfmUtils.isWeight) || [];
    }
    return this._weightPmfms;
  }

  remove() {
    if (isNotNil(this.parent)) {
      const index = this.parent.children.indexOf(this);
      if (index !== -1) {
        this.parent.children.splice(index, 1);
      }
    }
  }
}

@EntityClass({ typename: 'BatchModelFilterVO' })
export class BatchModelFilter extends EntityFilter<BatchModelFilter, BatchModel> {
  static fromObject: (source: any, opts?: any) => BatchModelFilter;
  static composeOr(...sources: any): BatchModelFilter {
      return BatchModelFilter.fromObject({or: sources});
  }

  measurementValues: MeasurementModelValues | MeasurementFormValues = null;
  pmfmIds: number[] = null;
  isLeaf: boolean = null;
  hidden: boolean = null;
  parentFilter: BatchModelFilter = null;
  or: BatchModelFilter[] = null;
  and: BatchModelFilter[] = null;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.measurementValues =
      (source.measurementValues && { ...source.measurementValues }) || MeasurementUtils.toMeasurementValues(source.measurements);
    this.pmfmIds = source.pmfmIds;
    this.isLeaf = source.isLeaf;
    this.hidden = source.hidden;
    this.parentFilter = BatchModelFilter.fromObject(source.parentFilter);
    this.or = source.or?.map(BatchModelFilter.fromObject);
    this.and = source.and?.map(BatchModelFilter.fromObject);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);
    target.pmfmIds = this.pmfmIds;
    target.isLeaf = this.isLeaf;
    target.hidden = this.hidden;
    target.parentFilter = this.parentFilter && this.parentFilter.asObject(opts);
    target.or = isNotEmptyArray(this.or) ? this.or.map(f=> f.asObject(opts)) : undefined;
    target.and = isNotEmptyArray(this.and) ? this.and.map(f=> f.asObject(opts)) : undefined;
    return target;
  }

  protected buildFilter(): FilterFn<BatchModel>[] {
    const filterFns = super.buildFilter();

    if (isNotNil(this.measurementValues)) {
      Object.keys(this.measurementValues).forEach((pmfmId) => {
        const pmfmValue = this.measurementValues[pmfmId];
        if (isNotNil(pmfmValue)) {
          filterFns.push((b) => {
            const measurementValues = (b.currentData || b.originalData).measurementValues;
            return measurementValues && isNotNil(measurementValues[pmfmId]) && PmfmValueUtils.equals(measurementValues[pmfmId], pmfmValue);
          });
        }
      });
    }

    // Check all expected pmfms has value
    if (isNotEmptyArray(this.pmfmIds)) {
      const pmfmIds = [...this.pmfmIds];
      filterFns.push((b) => {
        const measurementValues = (b.currentData || b.originalData).measurementValues;
        return pmfmIds.every((pmfmId) => PmfmValueUtils.isNotEmpty(measurementValues[pmfmId]));
      });
    }

    // Hidden
    if (isNotNil(this.hidden)) {
      const hidden = this.hidden;
      filterFns.push((b) => b.hidden === hidden);
    }

    // is leaf
    if (isNotNil(this.isLeaf)) {
      const isLeaf = this.isLeaf;
      filterFns.push((b) => b.isLeaf === isLeaf);
    }

    // Parent filter
    const parentFilter = BatchModelFilter.fromObject(this.parentFilter);
    if (parentFilter && !parentFilter.isEmpty()) {
      const parentFilterFn = parentFilter.asFilterFn();
      filterFns.push((b) => b.parent && parentFilterFn(b.parent));
    }

    // Or
    if (isNotEmptyArray(this.or)) {
      const orFilterFns = this.or.map(BatchModelFilter.fromObject)
        .map(of => of.asFilterFn())
        .filter(isNotNil);
      if (isNotEmptyArray(orFilterFns)) {
        filterFns.push((b) => orFilterFns.some((orFilterFn) => orFilterFn(b)));
      }
    }

    // AND
    if (isNotEmptyArray(this.and)) {
      const andFilterFns = this.and.map(BatchModelFilter.fromObject)
        .map(of => of.asFilterFn())
        .filter(isNotNil);
      if (isNotEmptyArray(andFilterFns)) {
        filterFns.push((b) => andFilterFns.every((orFilterFn) => orFilterFn(b)));
      }
    }

    return filterFns;
  }

  protected isCriteriaNotEmpty(key: string, value: any): boolean {
    return super.isCriteriaNotEmpty(key, value)
      || (key === 'measurementValues' && MeasurementValuesUtils.isNotEmpty(value))
      ;
  }
}

export class BatchModelUtils {

  static createModel(data: Batch|undefined, opts: {
    catchPmfms: IPmfm[];
    sortingPmfms: IPmfm[];
    allowDiscard?: boolean;
    rules?: Rule[];
  }): BatchModel {
    if (isEmptyArray(opts?.sortingPmfms)) throw new Error('Missing required argument \'opts.sortingPmfms\'');

    // Create a batch model
    const model = BatchModel.fromBatch(data, opts.sortingPmfms, opts.rules);
    if (!model) return;

    // Add catch batches pmfms
    model.state.initialPmfms = arrayDistinct([
      ...(opts.catchPmfms || []),
      ...(model.state.initialPmfms || [])
    ], 'id');

    // Disabled root node, if no visible pmfms (e.g. when catch batch has no pmfm)
    model.disabled = !(model.pmfms || []).some(p => !p.hidden)
      && !model.isLeaf
      && !model.parent;

    // Set default catch batch name
    if (!model.parent && !model.name)  {
      model.name = 'TRIP.BATCH.EDIT.CATCH_BATCH';
    }

    return model;
  }

  /**
   * Find matches batches (recursively)
   *
   * @param model
   * @param filter
   */
  static findByFilterInTree(model: BatchModel, filter: Partial<BatchModelFilter>): BatchModel[] {
    return TreeItemEntityUtils.findByFilter(model, BatchModelFilter.fromObject(filter));
  }

  /**
   * Delete matches batches (recursively)
   *
   * @param model
   * @param filter
   */
  static deleteByFilterInTree(model: BatchModel, filter: Partial<BatchModelFilter>): BatchModel[] {
    return TreeItemEntityUtils.deleteByFilter(model, BatchModelFilter.fromObject(filter));
  }

  static logTree(model: BatchModel, treeDepth = 0, treeIndent = '', result: string[] = []) {
    const isCatchBatch = treeDepth === 0;
    // Append current batch to result array
    let name = isCatchBatch ? 'Catch' : (model.name || model.originalData.label);
    const pmfmLabelsStr = (model.pmfms || []).map(p => p.label).join(', ');
    if (isNotNilOrBlank(pmfmLabelsStr)) name += `: ${pmfmLabelsStr}`;
    if (model.hidden) name += ' (hidden)';
    result.push(`${treeIndent} - ${name}`);

    // Recursive call, for each child
    if (isNotEmptyArray(model.children)) {
      treeDepth++;
      treeIndent = `${treeIndent}\t`;
      model.children.forEach(child => this.logTree(child as BatchModel, treeDepth, treeIndent, result));
    }

    // Display result, if root
    if (isCatchBatch && isNotEmptyArray(result)) {
      console.debug(`[batch-model-utils] Batch model:\n${result.join('\n')}`);
    }
  }

}
