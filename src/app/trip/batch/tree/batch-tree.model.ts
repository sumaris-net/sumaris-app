import {IPmfm, PmfmUtils} from '@app/referential/services/model/pmfm.model';
import {EntityClass, isEmptyArray, isNotEmptyArray, toBoolean} from '@sumaris-net/ngx-components';
import { Batch, BatchAsObjectOptions, BatchFromObjectOptions } from '@app/trip/batch/common/batch.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import {BatchGroupUtils} from '@app/trip/batch/group/batch-group.model';


@EntityClass({typename: 'BatchModelVO'})
export class BatchModel<
  T extends BatchModel<T, ID> = BatchModel<any, any>,
  ID = number,
  AO extends BatchAsObjectOptions = BatchAsObjectOptions,
  FO extends BatchFromObjectOptions = BatchFromObjectOptions
  > extends Batch<T, ID, AO, FO> {

  static fromObject: (source: any, opts?: { withChildren?: boolean; }) => BatchModel;
  static fromBatch(source: Batch,
                   pmfms: IPmfm[],
                   // Internal arguments (used by recursive call)
                   maxTreeDepth = 3,
                   treeDepth = 0,
                   parent: BatchModel = null
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
    const target = BatchModel.fromObject(source.asObject({withChildren: false}));
    target.parent = parent;

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
        childrenQvPmfm = childrenQvPmfm.clone();
        childrenQvPmfm.hidden = true;

        const childrenLabelPrefix = isCatchBatch ?
          `${AcquisitionLevelCodes.SORTING_BATCH}#` : `${target.label}.`;
        // Create children batches
        target.children = childrenQvPmfm.qualitativeValues.map(qv => {
          const childSource = (source.children || []).find(c => PmfmValueUtils.equals(c.measurementValues?.[childrenQvPmfm.id], qv))
            || new Batch();
          childSource.measurementValues = target.measurementValues || {};
          childSource.measurementValues[childrenQvPmfm.id] = qv.id.toString();
          childSource.label = `${childrenLabelPrefix}${qv.label}`;

          // Recursive call
          const childTarget = BatchModel.fromBatch(childSource, pmfms, maxTreeDepth, treeDepth, target);
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
        target.children = source.children;
      }
    }
    else {
      // No QV pmfm found
      target.pmfms = [];
      target.childrenPmfms = pmfms;
    }

    // Disabled if no pmfms
    target.disabled = isEmptyArray(target.pmfms) && isEmptyArray(target.childrenPmfms)
      && !target.parent;
    // Hide is disabled and no parent
    target.hidden = target.disabled && !target.parent;

    return target;
  }

  name: string;
  pmfms?: IPmfm[];
  childrenPmfms?: IPmfm[];
  disabled?: boolean;
  hidden?: boolean;
  error?: string;
  selected?: boolean;
  invalid?: boolean;

  fromObject(source: any, opts?: FO) {
    super.fromObject(source);
    this.name = source.name;
    this.pmfms = source.pmfms || [];
    this.childrenPmfms = source.childrenPmfms || [];
    this.disabled = source.disabled || false;
    this.hidden = source.hidden || false;
    this.error = source.error || null;
    this.selected = source.selected || false;
    this.invalid = source.invalid || false;
  }

  fromBatch(source: Batch) {
    this.measurementValues = source.measurementValues || this.measurementValues;
  }
}
