import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { EntityClass, isEmptyArray, isNotEmptyArray, ITreeItemEntity, Entity, EntityAsObjectOptions } from '@sumaris-net/ngx-components';
import { Batch, BatchAsObjectOptions, BatchFromObjectOptions } from '@app/trip/batch/common/batch.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { FormGroup } from '@angular/forms';
import { MeasurementValuesTypes } from '@app/trip/services/model/measurement.model';


@EntityClass({typename: 'BatchModelVO'})
export class BatchModel
  extends Entity<BatchModel>
  implements ITreeItemEntity<BatchModel> {

  static fromObject: (source: any, opts?: { withChildren?: boolean; }) => BatchModel;
  static fromBatch(source: Batch,
                   pmfms: IPmfm[],
                   // Internal arguments (used by recursive call)
                   maxTreeDepth = 3,
                   treeDepth = 0,
                   parent: BatchModel = null,
                   path= ''
  ): BatchModel {
    pmfms = pmfms || [];

    // Make sure the first batch is a catch batch
    const isCatchBatch = treeDepth === 0 || BatchUtils.isCatchBatch(source);
    if (isCatchBatch && !source) {
      source = Batch.fromObject({ rankOrder: 1, label: AcquisitionLevelCodes.CATCH_BATCH});
    }
    // if (pmfmStartIndex > 0) {
    //   pmfms = pmfms.slice(pmfmStartIndex);
    // }
    const target = BatchModel.fromObject(<Partial<BatchModel>>{
      parent,
      path,
      originalData: source
    });

    // Find the first QV pmfm (with QV
    let childrenQvPmfm: IPmfm = PmfmUtils.getFirstQualitativePmfm(pmfms, {
      excludeHidden: true,
      minQvCount: 2,
      maxQvCount: 3
    });
    if (childrenQvPmfm) {
      const qvPmfmIndex = pmfms.indexOf(childrenQvPmfm);
      if (qvPmfmIndex > 0) {
        target.pmfms = pmfms.slice(0, qvPmfmIndex);
      }

      // Prepare next iteration
      pmfms = pmfms.slice(qvPmfmIndex+1);
      treeDepth++;

      if (treeDepth < maxTreeDepth && isNotEmptyArray(pmfms)) {

        const childLabelPrefix = isCatchBatch ?
          `${AcquisitionLevelCodes.SORTING_BATCH}#` : `${source.label}.`;
        const childrenPath = isCatchBatch ? 'children' : `${path}.children`;
        // Create children batches
        target.children = childrenQvPmfm.qualitativeValues.map((qv, index) => {
          childrenQvPmfm = childrenQvPmfm.clone();
          childrenQvPmfm.hidden = true;
          childrenQvPmfm.defaultValue = qv.id;

          const childSource = (source.children || []).find(c => PmfmValueUtils.equals(c.measurementValues?.[childrenQvPmfm.id], qv))
            || Batch.fromObject({
              measurementValues: {
                __typename: MeasurementValuesTypes.MeasurementModelValues,
                [childrenQvPmfm.id]: qv.id.toString()
              }
            });
          childSource.measurementValues.__typename = childSource.measurementValues.__typename || MeasurementValuesTypes.MeasurementModelValues;
          childSource.label = `${childLabelPrefix}${qv.label}`;
          childSource.rankOrder = index;

          // Recursive call
          const childTarget = BatchModel.fromBatch(childSource, pmfms, maxTreeDepth, treeDepth, target, `${childrenPath}.${index}`);
          childTarget.pmfms = [
            childrenQvPmfm,
            ...childTarget.pmfms
          ];

          // Set name
          childTarget.name = qv.name;

          return childTarget;
        });
      }
      else {
        target.childrenPmfms = [
          childrenQvPmfm,
          ...pmfms
        ];
      }
    }
    else {
      // No QV pmfm found
      target.pmfms = [];
      target.childrenPmfms = pmfms;
    }

    // Disabled root node, if no pmfms (e.g. when catch batch has no pmfm)
    target.disabled = isEmptyArray(target.pmfms)
      && !target.isLeaf
      && !target.parent;
    // Hide is disabled and no parent
    target.hidden = target.disabled && !target.parent;
    // Leaf = leaf in the batch model tree, NOT in the final batch tree
    target.isLeaf = isEmptyArray(target.children) || isNotEmptyArray(target.childrenPmfms);

    return target;
  }

  name: string;
  path: string;
  isLeaf: boolean;
  originalData: Batch;
  pmfms?: IPmfm[];
  childrenPmfms?: IPmfm[];
  validator?: FormGroup;
  disabled?: boolean;
  hidden?: boolean;

  parentId: number = null;
  parent: BatchModel = null;
  children: BatchModel[] = null;

  fromObject(source: any, opts?: any) {
    super.fromObject(source);
    this.name = source.name;
    this.path = source.path || null;
    this.pmfms = source.pmfms || [];
    this.childrenPmfms = source.childrenPmfms || [];
    this.disabled = source.disabled || false;
    this.hidden = source.hidden || false;
    this.isLeaf = source.isLeaf || (this.childrenPmfms?.length > 0);
  }

  get fullName(): string {
    if (this.parent && this.parent.hidden !== true) return [this.parent.fullName, this.name].join(' &gt; ');
    return this.name;
  }

  get invalid(): boolean {
    return this.validator?.invalid || false;
  }
  get valid(): boolean {
    return this.validator?.valid || false;
  }
  get dirty(): boolean {
    return this.validator?.dirty || false;
  }
  get editing(): boolean {
    return this.validator?.enabled || false;
  }

  get brothers(): BatchModel[] {
    return (this.parent?.children || []).filter(b => b !== this);
  }
  get label(): string {
    return this.originalData?.label;
  }
}
