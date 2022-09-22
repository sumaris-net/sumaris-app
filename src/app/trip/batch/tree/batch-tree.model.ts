import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { EntityClass, isNotEmptyArray } from '@sumaris-net/ngx-components';
import { Batch, BatchAsObjectOptions, BatchFromObjectOptions } from '@app/trip/batch/common/batch.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { BatchGroupUtils } from '@app/trip/batch/group/batch-group.model';
import { MeasurementValuesUtils } from '@app/trip/services/model/measurement.model';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';

export interface IBatchTreeDefinition {
  id: number;
  label: string;
  qvPmfm?: IPmfm;
  pmfms?: IPmfm[];
  filter?: BatchFilter;
  parent?: IBatchTreeDefinition;
  children?: IBatchTreeDefinition[];
}

@EntityClass({typename: 'BatchModelVO'})
export class BatchModel<
  O extends BatchAsObjectOptions = BatchAsObjectOptions,
  FO extends BatchFromObjectOptions = BatchFromObjectOptions
  > extends Batch<BatchModel, number, O, FO> {

  static fromObject: (source: any, opts?: { withChildren?: boolean; }) => BatchModel;
  static fromBatch(source: Batch,
                   pmfms: IPmfm[],
                   // Internal arguments (used by recursive call)
                   parent: BatchModel = null,
                   treeDepth = 0
  ): BatchModel {
    pmfms = pmfms || [];

    // Make sure the first batch is a catch batch
    if (treeDepth === 0) {
      source = BatchUtils.isCatchBatch(source)
        ? source
        : Batch.fromObject({ rankOrder: 1, label: AcquisitionLevelCodes.CATCH_BATCH});
    }
    // if (pmfmStartIndex > 0) {
    //   pmfms = pmfms.slice(pmfmStartIndex);
    // }
    const target = BatchModel.fromObject(source.asObject({withChildren: false}));

    // Find the first QV pmfm
    const qvPmfm: IPmfm = PmfmUtils.getFirstQualitativePmfm(pmfms, {excludeHidden: false});
    if (qvPmfm) {
      const qvPmfmIndex = pmfms.indexOf(qvPmfm);
      if (qvPmfmIndex > 0) {
        if (parent) {
          // Add pmfm BEFORE the QV pmfm to parent (e.g. weight)
          parent.pmfms = pmfms.slice(0, qvPmfmIndex - 1);
        }
        else {
          target.pmfms = pmfms.slice(0, qvPmfmIndex - 1);
        }

      }

      // Prepare next iteration
      pmfms = pmfms.slice(qvPmfmIndex + 1);
      treeDepth++;

      if (treeDepth <= 1 && isNotEmptyArray(pmfms)) {
        const childrenLabelPrefix = BatchUtils.isCatchBatch(source) ?
          `${AcquisitionLevelCodes.SORTING_BATCH}#` : `${target.label}.`;
        // Create children batches
        target.children = qvPmfm.qualitativeValues.map(qv => {
          const childSource = (source.children || []).find(c => PmfmValueUtils.equals(c.measurementValues?.[qvPmfm.id], qv))
            || new Batch();
          childSource.measurementValues = target.measurementValues || {};
          childSource.measurementValues[qvPmfm.id] = qv.id.toString();
          childSource.label = `${childrenLabelPrefix}${qv.label}`;

          // Recursive call
          const childTarget = BatchModel.fromBatch(childSource, pmfms, target, treeDepth);

          // Set name
          childTarget.name = qv.name;

          return childTarget;
        });
      }
    }
    return target;
  }

  name: string;
  pmfms?: IPmfm[];

  fromObject(source: any, opts?: FO) {
    super.fromObject(source);
    this.name = source.name;
    this.pmfms = source.pmfms || [];
  }
}
