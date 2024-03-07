import { DateUtils, Department, Entity, fromDateISOString, isNil, isNotNil, removeEnd, toDateISOString, } from '@sumaris-net/ngx-components';
import { QualityFlagIds } from '@app/referential/services/model/model.enum';
export const SERIALIZE_FOR_OPTIMISTIC_RESPONSE = Object.freeze({
    minify: false,
    keepTypename: true,
    keepEntityName: true,
    keepLocalId: true,
    keepSynchronizationStatus: true
});
export const MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE = Object.freeze({
    minify: true,
    keepTypename: true,
    keepEntityName: true,
    keepLocalId: true,
    keepSynchronizationStatus: true
});
export const SAVE_AS_OBJECT_OPTIONS = Object.freeze({
    minify: true,
    keepTypename: false,
    keepEntityName: false,
    keepLocalId: false,
    keepSynchronizationStatus: false
});
export const COPY_LOCALLY_AS_OBJECT_OPTIONS = Object.freeze(Object.assign(Object.assign({}, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE), { keepLocalId: false, keepRemoteId: false, keepUpdateDate: false }));
export const CLONE_AS_OBJECT_OPTIONS = Object.freeze(Object.assign(Object.assign({}, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE), { minify: false }));
export class DataEntity extends Entity {
    constructor(__typename) {
        super(__typename);
        this.recorderDepartment = null;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        if (opts && opts.keepRemoteId === false && target.id >= 0)
            delete target.id;
        if (opts && opts.keepUpdateDate === false && target.id >= 0)
            delete target.updateDate;
        target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.asObject(opts) || undefined;
        target.controlDate = toDateISOString(this.controlDate);
        target.qualificationDate = toDateISOString(this.qualificationDate);
        target.qualificationComments = this.qualificationComments || undefined;
        target.qualityFlagId = isNotNil(this.qualityFlagId) ? this.qualityFlagId : undefined;
        return target;
    }
    fromObject(source, opts) {
        super.fromObject(source);
        this.recorderDepartment = source.recorderDepartment && Department.fromObject(source.recorderDepartment);
        this.controlDate = fromDateISOString(source.controlDate);
        this.qualificationDate = fromDateISOString(source.qualificationDate);
        this.qualificationComments = source.qualificationComments;
        this.qualityFlagId = source.qualityFlagId;
    }
    getStrategyDateTime() {
        return undefined;
    }
}
export class DataEntityUtils {
    static copyControlDate(source, target) {
        if (!source)
            return;
        target.controlDate = fromDateISOString(source.controlDate);
    }
    static copyQualificationDateAndFlag(source, target) {
        if (!source)
            return;
        target.qualificationDate = fromDateISOString(source.qualificationDate);
        target.qualificationComments = source.qualificationComments;
        target.qualityFlagId = source.qualityFlagId;
    }
    /**
     * Reset controlDate, and reset quality fLag and comment
     *
     * @param entity
     * @param opts
     */
    static markAsNotControlled(entity, opts) {
        // Mark as controlled
        entity.controlDate = null;
        // Clean quality flag
        if (!opts || opts.keepQualityFlag !== true) {
            entity.qualityFlagId = QualityFlagIds.NOT_QUALIFIED;
        }
        // Clean qualification data
        entity.qualificationComments = null;
        entity.qualificationDate = null;
    }
    /**
     * Check if an entity has been controlled
     *
     * @param entity
     */
    static isControlled(entity) {
        return !!(entity === null || entity === void 0 ? void 0 : entity.controlDate);
    }
    /**
     * Set controlDate, and reset quality fLag and comment
     *
     * @param entity
     * @param opts
     */
    static markAsControlled(entity, opts) {
        if (!entity)
            return; // skip
        // Mark as controlled
        entity.controlDate = (opts === null || opts === void 0 ? void 0 : opts.controlDate) || DateUtils.moment();
        // Clean quality flag
        entity.qualityFlagId = QualityFlagIds.NOT_QUALIFIED;
        // Clean qualification data
        entity.qualificationComments = null;
        entity.qualificationDate = null;
    }
    /**
     * Mark as invalid, using qualityFlag
     *
     * @param entity
     * @param errorMessage
     */
    static markAsInvalid(entity, errorMessage) {
        if (!entity)
            return; // skip
        // Clean date
        entity.controlDate = null;
        entity.qualificationDate = null;
        // Register error message, into qualificationComments
        entity.qualificationComments = errorMessage;
        // Clean quality flag
        entity.qualityFlagId = QualityFlagIds.BAD;
    }
    /**
     * Check if an entity has been mark as invalid
     *
     * @param entity
     */
    static isInvalid(entity) {
        if (!entity)
            return false; // skip
        return isNil(entity.controlDate) && isNil(entity.qualificationDate) && entity.qualityFlagId === QualityFlagIds.BAD;
    }
    /**
     * Reset controlDate, and reset quality fLag and comment
     *
     * @param entity
     * @param opts
     */
    static hasNoQualityFlag(entity) {
        return isNil(entity.qualityFlagId) || entity.qualityFlagId === QualityFlagIds.NOT_QUALIFIED;
    }
    /**
     * Get entity name from the __typename of an entity
     *
     * @param entity
     */
    static getEntityName(entity) {
        return entity && removeEnd(entity.__typename || 'UnknownVO', 'VO');
    }
    static isWithObservers(entity) {
        return isNotNil(entity === null || entity === void 0 ? void 0 : entity['observers']);
    }
}
//# sourceMappingURL=data-entity.model.js.map