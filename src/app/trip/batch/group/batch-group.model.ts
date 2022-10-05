import {Batch, BatchAsObjectOptions, BatchFromObjectOptions} from "../common/batch.model";
import { AcquisitionLevelCodes, PmfmIds, QualitativeValueIds } from '../../../referential/services/model/model.enum';
import {EntityClass, EntityUtils, isNotEmptyArray, ReferentialRef} from '@sumaris-net/ngx-components';
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
      .map(pmfm => {
        // If DISCARD
        if (qvId === QualitativeValueIds.DISCARD_OR_LANDING.DISCARD) {
          // Hide pmfm DRESSING and PRESERVATION, and force default values
          if (PmfmUtils.isDressing(pmfm)) {
            pmfm = pmfm.clone();
            pmfm.hidden = true;
            pmfm.defaultValue = ReferentialRef.fromObject({ id: QualitativeValueIds.DRESSING.WHOLE, label: 'WHL' });
          }
          else if (pmfm.id === PmfmIds.PRESERVATION) {
            pmfm = pmfm.clone();
            pmfm.hidden = true;
            pmfm.defaultValue = ReferentialRef.fromObject({ id: QualitativeValueIds.PRESERVATION.FRESH, label: 'FRE' });
          }
          else if (pmfm.id === PmfmIds.TRAWL_SIZE_CAT) {
            pmfm = pmfm.clone();
            pmfm.hidden = true;
            pmfm.defaultValue = ReferentialRef.fromObject({ id: QualitativeValueIds.SIZE_UNLI_CAT.NONE, label: 'SANS' });
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

  static getQvPmfm(pmfms: IPmfm[], opts?: {
    preferredPmfmIds?: number[];
    onlyFirst?: boolean; // If not a preferred pmfm, should be the first PMFM in the list ?
  }): IPmfm | undefined {
    opts = {
      preferredPmfmIds: [PmfmIds.DISCARD_OR_LANDING],
      onlyFirst: true,
      ...opts
    };
    let qvPmfm = pmfms && (
      // Use the first preferred pmfm if present AND visible (e.g. DISCARD/LANDING)
      (isNotEmptyArray(opts.preferredPmfmIds) && pmfms.find(p => opts.preferredPmfmIds.includes(p.id) && !p.hidden))
      // Or get the first QV pmfm
      || PmfmUtils.getFirstQualitativePmfm(pmfms, {
        excludeHidden: true,
        minQvCount: 2, // (e.g. exclude SUB_GEAR)
        maxQvCount: 3, // (e.g. exclude TRAWL_SIZE_CAT)
        //excludePmfmIds: [PmfmIds.DRESSING, PmfmIds.TRAWL_SIZE_CAT],
        filterFn: (p, index) => !opts.onlyFirst || index === 0 // Should be the first visible (e.g. no number before)
      })
    );

    // If landing/discard: 'Landing' is always before 'Discard (see issue #122)
    if (qvPmfm?.id === PmfmIds.DISCARD_OR_LANDING) {
      qvPmfm = qvPmfm.clone(); // copy, to keep original array
      qvPmfm.qualitativeValues.sort((qv1, qv2) => qv1.label === 'LAN' ? -1 : 1);
    }
    return qvPmfm;
  }
}
