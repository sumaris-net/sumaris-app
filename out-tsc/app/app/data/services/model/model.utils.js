import { StatusIds } from '@sumaris-net/ngx-components';
import { QualityFlagIds, QualityFlags } from '@app/referential/services/model/model.enum';
export const SynchronizationStatusEnum = Object.freeze({
    DIRTY: 'DIRTY',
    READY_TO_SYNC: 'READY_TO_SYNC',
    SYNC: 'SYNC',
    DELETED: 'DELETED',
    TEMPORARY: 'TEMPORARY'
});
export const DataQualityStatusIds = Object.freeze({
    MODIFIED: 'MODIFIED',
    CONTROLLED: 'CONTROLLED',
    VALIDATED: 'VALIDATED',
    QUALIFIED: 'QUALIFIED',
});
export const DataQualityStatusEnum = Object.freeze({
    MODIFIED: {
        id: DataQualityStatusIds.MODIFIED,
        icon: 'pencil',
        label: 'QUALITY.MODIFIED'
    },
    CONTROLLED: {
        id: DataQualityStatusIds.CONTROLLED,
        icon: 'checkmark',
        label: 'QUALITY.CONTROLLED'
    },
    VALIDATED: {
        id: DataQualityStatusIds.VALIDATED,
        icon: 'checkmark-circle',
        label: 'QUALITY.VALIDATED'
    },
    QUALIFIED: {
        id: DataQualityStatusIds.QUALIFIED,
        icon: 'flag',
        label: 'QUALITY.QUALIFIED'
    }
});
export const DataQualityStatusList = Object.freeze([
    DataQualityStatusEnum.MODIFIED,
    DataQualityStatusEnum.CONTROLLED,
    DataQualityStatusEnum.VALIDATED,
    DataQualityStatusEnum.QUALIFIED
]);
/* -- Helper function -- */
export function getMaxRankOrder(values) {
    let maxRankOrder = 0;
    (values || []).forEach(m => {
        if (m.rankOrder && m.rankOrder > maxRankOrder)
            maxRankOrder = m.rankOrder;
    });
    return maxRankOrder;
}
export function fillRankOrder(values) {
    if (!values)
        return; // Skip
    // Compute rankOrder
    let maxRankOrder = getMaxRankOrder(values);
    (values || []).forEach(m => {
        m.rankOrder = m.rankOrder || ++maxRankOrder;
    });
}
export function fillTreeRankOrder(values) {
    // Compute rankOrder
    let maxRankOrder = getMaxRankOrder(values);
    (values || []).forEach(m => {
        m.rankOrder = m.rankOrder || ++maxRankOrder;
        if (m.children)
            fillTreeRankOrder(m.children);
    });
}
/**
 * Compare unique rankOrder from values with values count
 *
 * @param values
 * @return true if all rankOrder are unique
 */
export function isRankOrderValid(values) {
    return (values || []).length ===
        (values || []).filter((v1, i, array) => array.findIndex(v2 => v2.rankOrder === v1.rankOrder) === i).length;
}
export function qualityFlagToColor(qualityFlagId) {
    switch (qualityFlagId) {
        case QualityFlagIds.NOT_QUALIFIED:
            return 'secondary';
        case QualityFlagIds.GOOD:
        case QualityFlagIds.FIXED:
            return 'success';
        case QualityFlagIds.OUT_STATS:
        case QualityFlagIds.DOUBTFUL:
            return 'warning';
        case QualityFlagIds.BAD:
        case QualityFlagIds.MISSING:
        case QualityFlagIds.NOT_COMPLETED:
            return 'danger';
        default:
            return 'secondary';
    }
}
export function qualityFlagInvalid(qualityFlagId) {
    switch (qualityFlagId) {
        case QualityFlagIds.BAD:
        case QualityFlagIds.MISSING:
        case QualityFlagIds.NOT_COMPLETED:
            return true;
        default:
            return false;
    }
}
export function qualityFlagToIcon(qualityFlagId) {
    switch (qualityFlagId) {
        case QualityFlagIds.NOT_QUALIFIED:
            return undefined;
        case QualityFlagIds.GOOD:
        case QualityFlagIds.FIXED:
            return 'flag';
        case QualityFlagIds.OUT_STATS:
        case QualityFlagIds.DOUBTFUL:
            return 'warning';
        case QualityFlagIds.BAD:
        case QualityFlagIds.MISSING:
            return 'alert-circle';
        case QualityFlagIds.NOT_COMPLETED:
            return 'time-outline';
        default:
            return 'flag';
    }
}
export function statusToColor(statusId) {
    switch (statusId) {
        case StatusIds.ENABLE:
            return 'tertiary';
        case StatusIds.TEMPORARY:
            return 'secondary';
        case StatusIds.DISABLE:
            return 'danger';
        default:
            return 'secondary';
    }
}
export function translateQualityFlag(qualityFlagId, qualityFlags) {
    // Get label from the input list, if any
    let qualityFlag = qualityFlags && qualityFlags.find(qf => qf.id === qualityFlagId);
    if (qualityFlag && qualityFlag.label)
        return qualityFlag.label;
    // Or try to compute a label from the model enumeration
    qualityFlag = qualityFlag || QualityFlags.find(qf => qf.id === qualityFlagId);
    return qualityFlag ? ('QUALITY.QUALITY_FLAGS.' + qualityFlag.label) : undefined;
}
//# sourceMappingURL=model.utils.js.map