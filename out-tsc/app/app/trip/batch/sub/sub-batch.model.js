var SubBatch_1;
import { __decorate, __metadata } from "tslib";
import { Batch } from '../common/batch.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { EntityClass } from '@sumaris-net/ngx-components';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
let SubBatch = SubBatch_1 = class SubBatch extends Batch {
    constructor() {
        super(SubBatch_1.TYPENAME);
    }
    static fromBatch(source, parentGroup) {
        if (!source || !parentGroup)
            throw new Error('Missing argument \'source\' or \'parentGroup\'');
        const target = new SubBatch_1();
        Object.assign(target, source);
        // Find the group
        target.parentGroup = parentGroup;
        return target;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        if (opts && opts.minify === true) {
            delete target.parentGroup;
        }
        return target;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.parentGroup = source.parentGroup;
    }
};
SubBatch = SubBatch_1 = __decorate([
    EntityClass({ typename: 'SubBatchVO', fromObjectReuseStrategy: 'clone' }),
    __metadata("design:paramtypes", [])
], SubBatch);
export { SubBatch };
export class SubBatchUtils {
    static fromBatchGroups(groups, opts) {
        opts = opts || {};
        // If using QV pmfm
        if (opts.groupQvPmfm) {
            return groups.reduce((res, group) => res.concat((group.children || []).reduce((res, qvBatch) => {
                const children = BatchUtils.getChildrenByLevel(qvBatch, AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL);
                const qvModelValue = PmfmValueUtils.toModelValue(qvBatch.measurementValues[opts.groupQvPmfm.id], opts.groupQvPmfm);
                return res.concat(children
                    .map(child => {
                    const target = SubBatch.fromBatch(child, group);
                    target.measurementValues = Object.assign({}, target.measurementValues);
                    // Copy the QV value, from the parent
                    // /!\ Should used expected value type (form or model)
                    if (MeasurementValuesUtils.isMeasurementFormValues(target.measurementValues)) {
                        target.measurementValues[opts.groupQvPmfm.id] = PmfmValueUtils.fromModelValue(qvModelValue, opts.groupQvPmfm);
                    }
                    else {
                        target.measurementValues[opts.groupQvPmfm.id] = qvModelValue;
                    }
                    return target;
                }));
            }, [])), []);
        }
        // No QV pmfm
        else {
            return groups.reduce((res, group) => res.concat(BatchUtils.getChildrenByLevel(group, AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL)
                .map(child => SubBatch.fromBatch(child, group))), []);
        }
    }
    /**
     * Make sure each subbatch.parentGroup use a reference found inside the groups arrays
     *
     * @param groups
     * @param subBatches
     */
    static linkSubBatchesToGroup(groups, subBatches) {
        if (!groups || !subBatches)
            return;
        subBatches.forEach(s => {
            s.parentGroup = s.parentGroup && groups.find(p => Batch.equals(p, s.parentGroup)) || null;
            if (!s.parentGroup)
                console.warn('linkSubBatchesToGroup() - Could not found parent group, for sub-batch:', s);
        });
    }
    /**
     * Prepare subbatches for model (set the subbatch.parent)
     *
     * @param batchGroups
     * @param subBatches
     * @param opts
     */
    static linkSubBatchesToParent(batchGroups, subBatches, opts) {
        opts = opts || {};
        if (opts.qvPmfm) {
            const qvPmfmId = opts.qvPmfm.id;
            (batchGroups || []).forEach(batchGroup => {
                // Get group's sub batches
                const groupSubBatches = (subBatches || []).filter(sb => sb.parentGroup && Batch.equals(batchGroup, sb.parentGroup));
                // Get group's children (that should hold a QV pmfm's value)
                (batchGroup.children || []).forEach(parent => {
                    // Find sub batches for this QV pmfm's value
                    const children = groupSubBatches.filter(sb => PmfmValueUtils.equals(sb.measurementValues[qvPmfmId], parent.measurementValues[qvPmfmId]));
                    // If has sampling batch, use it as parent
                    if (parent.children && parent.children.length === 1 && BatchUtils.isSamplingBatch(parent.children[0])) {
                        parent = parent.children[0];
                    }
                    // Link to parent
                    parent.children = children;
                    children.forEach(c => {
                        c.parentId = parent.id;
                        c.parent = undefined; // Not need for model serialization
                    });
                });
            });
        }
        else {
            (batchGroups || []).forEach(parent => {
                // Find subbatches, from parentGroup
                const children = subBatches.filter(sb => sb.parentGroup && Batch.equals(parent, sb.parentGroup));
                // If has sampling batch, use it as parent
                if (parent.children && parent.children.length === 1 && BatchUtils.isSamplingBatch(parent.children[0])) {
                    parent = parent.children[0];
                }
                parent.children = children;
                children.forEach(c => {
                    c.parentId = parent.id;
                    c.parent = undefined;
                });
            });
        }
        return batchGroups;
    }
}
//# sourceMappingURL=sub-batch.model.js.map