import {Batch, BatchAsObjectOptions, BatchFromObjectOptions} from "../common/batch.model";
import { AcquisitionLevelCodes, PmfmIds, QualitativeValueIds } from '../../../referential/services/model/model.enum';
import { EntityClass, EntityUtils, ReferentialRef } from '@sumaris-net/ngx-components';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { PmfmValue, PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';

@EntityClass({typename: "BatchGroupVO", fromObjectReuseStrategy: "clone"})
export class BatchGroup extends Batch<BatchGroup> {

  static fromObject: (source: any, opts?: BatchFromObjectOptions) => BatchGroup;

  // Number of individual observed (by individual measure)
  observedIndividualCount: number;

  static fromBatch(batch: Batch): BatchGroup {
    const target = new BatchGroup();
    Object.assign(target, batch);
    // Compute observed indiv. count
    target.observedIndividualCount = BatchUtils.sumObservedIndividualCount(batch.children);
    return target;
  }

  constructor() {
    super(BatchGroup.TYPENAME);
  }

  asObject(opts?: BatchAsObjectOptions): any {
    const target = super.asObject(opts);
    if (opts && opts.minify === true) {
      delete target.observedIndividualCount;
    }
    return target;
  }

  fromObject(source: any, opts?: BatchFromObjectOptions) {
    super.fromObject(source, opts);
    this.observedIndividualCount = source.observedIndividualCount;
  }
}

export class BatchGroupUtils {

  static fromBatchTree(catchBatch: Batch): BatchGroup[] {

    // Retrieve batch group (make sure label start with acquisition level)
    // Then convert into batch group entities
    return (catchBatch.children || [])
      .filter(s => s.label && s.label.startsWith(AcquisitionLevelCodes.SORTING_BATCH + "#"))
      // Convert to Batch Group
      .map(BatchGroup.fromBatch);
  }

  /**
   * Count only individual count with measure
   * @param batch
   */
  static computeObservedIndividualCount(batch: BatchGroup) {

    // Compute observed indiv. count
    batch.observedIndividualCount = BatchUtils.sumObservedIndividualCount(batch.children);
  }

  /**
   * Check equality of BatchGroup
   * @param batchGroup1
   * @param batchGroup2
   */
  static equals(batchGroup1: BatchGroup, batchGroup2: BatchGroup) {
    return EntityUtils.equals(batchGroup1, batchGroup2, 'rankOrder')
      && EntityUtils.equals(batchGroup1, batchGroup2, 'parentId');
  }

  static computeChildrenPmfmsByQvPmfm(qvId: number, pmfms: IPmfm[]) {
    return (pmfms || [])
      // Exclude DISCARD_REASON if NOT on DISCARD
      .filter(pmfm => qvId === QualitativeValueIds.DISCARD_OR_LANDING.DISCARD || pmfm.id !== PmfmIds.DISCARD_REASON)
      // If DISCARD
      .map(pmfm => {
        if (qvId === QualitativeValueIds.DISCARD_OR_LANDING.DISCARD) {
          // Hide pmfm DRESSING or PRESERVATION
          if (pmfm.id === PmfmIds.DRESSING) {
            pmfm = pmfm.clone();
            pmfm.hidden = true;
            pmfm.defaultValue = ReferentialRef.fromObject({ id: QualitativeValueIds.DRESSING.WHOLE, label: 'WHL' });
          }
          else if (pmfm.id === PmfmIds.PRESERVATION) {
            pmfm = pmfm.clone();
            pmfm.hidden = true;
            pmfm.defaultValue = ReferentialRef.fromObject({ id: QualitativeValueIds.PRESERVATION.FRESH, label: 'FRE' });
          }
          // Hide computed weight
          else if (pmfm.isComputed && PmfmUtils.isWeight(pmfm)) {
            pmfm = pmfm.clone();
            pmfm.hidden = true;
          }
        }
        return pmfm;
      })
  }


  /**
   * Find the parent batch, of a subBatches, by the parent group
   * @param batchGroup
   * @param qvValue
   * @param qvPmfm
   */
  static findChildByQvValue(batchGroup: BatchGroup, qvValue: PmfmValue, qvPmfm: IPmfm): Batch {
    const qvPmfmId = qvPmfm.id;
    const value = PmfmValueUtils.toModelValue(qvValue, qvPmfm);
    return (batchGroup.children || []).find(parent =>
      // WARN: use '==' and NOT '===', because measurementValues can use string, for values
      value == PmfmValueUtils.toModelValue(parent.measurementValues[qvPmfmId], qvPmfm)
    );
  }
}
