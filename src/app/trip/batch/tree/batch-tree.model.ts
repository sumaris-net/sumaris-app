import {IPmfm, PmfmUtils} from '@app/referential/services/model/pmfm.model';
import {Entity, EntityClass, IconRef, isEmptyArray, isNil, isNotEmptyArray, ITreeItemEntity, waitWhilePending} from '@sumaris-net/ngx-components';
import {Batch} from '@app/trip/batch/common/batch.model';
import {BatchUtils} from '@app/trip/batch/common/batch.utils';
import {AcquisitionLevelCodes, PmfmIds} from '@app/referential/services/model/model.enum';
import {PmfmValueUtils} from '@app/referential/services/model/pmfm-value.model';
import {UntypedFormGroup} from '@angular/forms';
import {MeasurementValuesTypes} from '@app/trip/services/model/measurement.model';
import {DataEntityAsObjectOptions} from '@app/data/services/model/data-entity.model';

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

  static fromObject: (source: any, opts?: { withChildren?: boolean; }) => BatchModel;
  static fromBatch(batch: Batch,
                   pmfms: IPmfm[],
                   // Internal arguments (used by recursive call)
                   maxTreeDepth = 3,
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

    // Find the first QV pmfm
    const qvPmfm: IPmfm = PmfmUtils.getFirstQualitativePmfm(pmfms, {
      excludeHidden: true,
      minQvCount: 2,
      maxQvCount: 3,
      excludePmfmIds: [PmfmIds.CHILD_GEAR] // Avoid child gear be a qvPmfm
    });
    if (qvPmfm) {
      const qvPmfmIndex = pmfms.indexOf(qvPmfm);
      if (qvPmfmIndex > 0) {
        model.pmfms = pmfms.slice(0, qvPmfmIndex);
      }

      // Prepare next iteration
      pmfms = pmfms.slice(qvPmfmIndex+1);
      treeDepth++;

      if (treeDepth < maxTreeDepth && isNotEmptyArray(pmfms)) {

        const childLabelPrefix = isCatchBatch ?
          `${AcquisitionLevelCodes.SORTING_BATCH}#` : `${batch.label}.`;
        const childrenPath = isCatchBatch ? 'children' : `${path}.children`;
        // Create children batches
        model.children = qvPmfm.qualitativeValues.map((qv, index) => {
          const childQvPmfm = qvPmfm.clone();
          childQvPmfm.hidden = true;
          childQvPmfm.defaultValue = qv.id;

          const childBatch = (batch.children || []).find(c => PmfmValueUtils.equals(c.measurementValues?.[childQvPmfm.id], qv))
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
          const childModel = BatchModel.fromBatch(childBatch, pmfms, maxTreeDepth, treeDepth, model, `${childrenPath}.${index}`);
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

    // Disabled root node, if no pmfms (e.g. when catch batch has no pmfm)
    model.disabled = isEmptyArray(model.pmfms)
      && !model.isLeaf
      && !model.parent;
    // Hide is disabled and no parent
    model.hidden = model.disabled && !model.parent;
    // Leaf = leaf in the batch model tree, NOT in the final batch tree
    model.isLeaf = isEmptyArray(model.children) || isNotEmptyArray(model.childrenPmfms);
    model.pmfms = model.pmfms || [];
    model.childrenPmfms = model.childrenPmfms || [];

    return model;
  }

  private _valid = false;

  name: string;
  icon: IconRef;
  isLeaf: boolean;
  originalData?: Batch;
  pmfms?: IPmfm[];
  childrenPmfms?: IPmfm[];
  validator?: UntypedFormGroup;
  disabled?: boolean;
  hidden?: boolean;

  path: string;
  parentId: number = null;
  parent: BatchModel = null;
  children: BatchModel[] = null;

  constructor(init?: { validator?: UntypedFormGroup; parent?: BatchModel; path?: string; originalData?: Batch}) {
    super();
    this.validator = init?.validator;
    if (init) Object.assign(this, init);
  }

  fromObject(source: any, opts?: BatchModelFromObjectOptions) {
    super.fromObject(source);
    this.name = source.name;
    this.icon = source.icon;
    this.originalData = source.originalData;
    this.pmfms = source.pmfms || [];
    this.childrenPmfms = source.childrenPmfms || [];

    this.disabled = source.disabled || false;
    this.hidden = source.hidden || false;
    this.isLeaf = source.isLeaf || (this.childrenPmfms?.length > 0);

    this.path = source.path || null;
    this.parent = source.parent || null;
    this.children = source.children || source.children.map(BatchModel.fromObject) || null;
  }

  get fullName(): string {
    if (this.parent && this.parent.hidden !== true) return [this.parent.fullName, this.name].join(' &gt; ');
    return this.name;
  }


  get invalid(): boolean {
    return !this.valid;
  }

  get valid(): boolean {
    if (isNil(this._valid) && this.editing) {
      this._valid = this.validator.valid;
    }
    if (!this._valid) return false;
    return !this.children || !this.children.some(c => !c.valid);
  }

  set valid(value: boolean) {
    this._valid = value;
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

  set editing(value: boolean) {
    if (value) {
      this.validator.enable({onlySelf: true});
      this.validator.get('children')?.disable({onlySelf: true});
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
    const disabled = this.validator.disabled;
    if (disabled) {
      this.validator.enable({emitEvent: false, onlySelf: true});
    }

    try {
      if (!this.validator.valid) {

        // Wait end of async validation
        if (this.validator.pending) {
          await waitWhilePending(this.validator);
        }

        // Quit if really invalid
        if (this.validator.invalid) {
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
    return this.validator.getRawValue();
  }

  get next(): BatchModel|undefined {
    // get first child, if any
    if (isNotEmptyArray(this.children)) return this.children[0];

    // No parent: end
    if (!this.parent) return undefined; // Nothing next

    // Try to get next brother
    let current: BatchModel = this;
    let parent: BatchModel = this.parent;
    let result: BatchModel;
    while (!result && parent) {
      const currentIndex = (parent.children || []).indexOf(current);
      result = (parent.children || []).find((b, i) => i > currentIndex && !b.hidden);
      current = parent;
      parent = parent.parent;
    }

    // If root batch AND hidden, goto to first visible root's child
    if (!result && !current.parent && current.hidden) return current.next;

    return result || current;
  }

  get previous(): BatchModel|undefined {

    let result: BatchModel;
    let parent: BatchModel = this.parent;

    // If root is hidden: go to very last leaf
    if (!parent) {
      // Try to get next brother
      result = this;
      while (isNotEmptyArray(result.children)) {
        result = result.children[this.children.length-1];
      }
      return result;
    }

    // Try to get next brother
    let current: BatchModel = this;
    while (!result && parent) {
      const currentIndex = (parent.children || []).indexOf(current);
      result = (parent.children || []).find((b, i) => i < currentIndex && !b.hidden);
      current = parent;
      parent = parent.parent;
    }

    // If root is hidden: go next
    if (!result && !current.parent && current.hidden) return current.previous;

    return result || current;
  }
}
