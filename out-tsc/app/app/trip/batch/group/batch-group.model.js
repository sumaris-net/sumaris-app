var BatchGroup_1;
import { __decorate, __metadata } from "tslib";
import { Batch } from '../common/batch.model';
import { AcquisitionLevelCodes, PmfmIds, QualitativeValueIds } from '@app/referential/services/model/model.enum';
import { EntityClass, EntityUtils, isNotEmptyArray, isNotNil, ReferentialRef } from '@sumaris-net/ngx-components';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
let BatchGroup = BatchGroup_1 = class BatchGroup extends Batch {
    constructor() {
        super(BatchGroup_1.TYPENAME);
    }
    static fromBatch(batch) {
        const target = new BatchGroup_1();
        Object.assign(target, batch);
        // Compute observed indiv. count
        target.observedIndividualCount = BatchUtils.sumObservedIndividualCount(batch.children);
        return target;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        if (opts && opts.minify === true) {
            delete target.observedIndividualCount;
        }
        return target;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.observedIndividualCount = source.observedIndividualCount;
    }
};
BatchGroup = BatchGroup_1 = __decorate([
    EntityClass({ typename: 'BatchGroupVO', fromObjectReuseStrategy: 'clone' }),
    __metadata("design:paramtypes", [])
], BatchGroup);
export { BatchGroup };
export class BatchGroupUtils {
    static fromBatchTree(catchBatch) {
        // Retrieve batch group (make sure label start with acquisition level)
        // Then convert into batch group entities
        return (catchBatch.children || [])
            .filter(s => s.label && s.label.startsWith(AcquisitionLevelCodes.SORTING_BATCH + '#'))
            // Convert to Batch Group
            .map(BatchGroup.fromBatch);
    }
    /**
     * Count only individual count with measure
     *
     * @param batch
     */
    static computeObservedIndividualCount(batch) {
        // Compute observed indiv. count
        batch.observedIndividualCount = BatchUtils.sumObservedIndividualCount(batch.children);
    }
    /**
     * Check equality of BatchGroup
     *
     * @param batchGroup1
     * @param batchGroup2
     */
    static equals(batchGroup1, batchGroup2) {
        return EntityUtils.equals(batchGroup1, batchGroup2, 'rankOrder')
            && EntityUtils.equals(batchGroup1, batchGroup2, 'parentId');
    }
    /**
     * Map PMFM, for batch group's children.
     * Depending of the qvId, some pmfms can be hidden (e.g. DRESSING and PRESERVATION are hidden, if qvId = DISCARD)
     *
     * @param pmfms
     * @param opts
     */
    static mapChildrenPmfms(pmfms, opts) {
        const isDiscard = opts.isDiscard
            || (opts.qvId === QualitativeValueIds.DISCARD_OR_LANDING.DISCARD);
        const childrenPmfms = (pmfms || [])
            // Remove qvPmfm (will be add first)
            .filter(pmfm => { var _a; return pmfm.id !== ((_a = opts.qvPmfm) === null || _a === void 0 ? void 0 : _a.id); })
            // Allow DISCARD_REASON only on DISCARD
            .filter(pmfm => pmfm.id !== PmfmIds.DISCARD_REASON || isDiscard)
            .map(pmfm => {
            // If DISCARD
            if (isDiscard) {
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
                    pmfm.defaultValue = ReferentialRef.fromObject({ id: QualitativeValueIds.SIZE_UNLI_CAT.NONE, label: 'NA' });
                }
                // Hide computed weight
                else if (pmfm.isComputed && PmfmUtils.isWeight(pmfm)) {
                    pmfm = pmfm.clone();
                    pmfm.hidden = true;
                }
            }
            return pmfm;
        });
        if (opts.qvPmfm && isNotNil(opts === null || opts === void 0 ? void 0 : opts.qvId)) {
            const qvPmfm = opts.qvPmfm.clone();
            qvPmfm.hidden = true;
            qvPmfm.required = true;
            qvPmfm.defaultValue = opts.qvPmfm.qualitativeValues.find(qv => qv.id === opts.qvId);
            return [qvPmfm, ...childrenPmfms];
        }
        else {
            return childrenPmfms;
        }
    }
    /**
     * Find the parent batch, of a subBatches, by the parent group
     *
     * @param batchGroup
     * @param qvValue
     * @param qvPmfm
     */
    static findChildByQvValue(batchGroup, qvValue, qvPmfm) {
        const qvPmfmId = qvPmfm.id;
        const value = PmfmValueUtils.toModelValue(qvValue, qvPmfm);
        return (batchGroup.children || []).find(parent => 
        // WARN: use '==' and NOT '===', because measurementValues can use string, for values
        // eslint-disable-next-line eqeqeq
        value == PmfmValueUtils.toModelValue(parent.measurementValues[qvPmfmId], qvPmfm));
    }
    static getQvPmfm(pmfms, opts) {
        opts = Object.assign({ preferredPmfmIds: [PmfmIds.DISCARD_OR_LANDING], onlyFirst: true }, opts);
        let qvPmfm = pmfms && (
        // Use the first preferred pmfm if present AND visible (e.g. DISCARD/LANDING)
        (isNotEmptyArray(opts.preferredPmfmIds) && pmfms.find(p => opts.preferredPmfmIds.includes(p.id) && !p.hidden))
            // Or get the first QV pmfm
            || PmfmUtils.getFirstQualitativePmfm(pmfms, {
                excludeHidden: true,
                minQvCount: 2,
                maxQvCount: 3,
                //excludePmfmIds: [PmfmIds.DRESSING, PmfmIds.TRAWL_SIZE_CAT],
                filterFn: (p, index) => !opts.onlyFirst || index === 0 // Should be the first visible (e.g. no number before)
            }));
        // If landing/discard: 'Landing' is always before 'Discard (see issue #122)
        if ((qvPmfm === null || qvPmfm === void 0 ? void 0 : qvPmfm.id) === PmfmIds.DISCARD_OR_LANDING) {
            qvPmfm = qvPmfm.clone(); // copy, to keep original array
            qvPmfm.qualitativeValues.sort((qv1, qv2) => qv1.label === 'LAN' ? -1 : 1);
        }
        return qvPmfm;
    }
}
//# sourceMappingURL=batch-group.model.js.map