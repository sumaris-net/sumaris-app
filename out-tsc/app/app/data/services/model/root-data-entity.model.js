import { fromDateISOString, isNil, Person, ReferentialRef, toDateISOString } from '@sumaris-net/ngx-components';
import { DataEntity, DataEntityUtils } from './data-entity.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
export class RootDataEntity extends DataEntity {
    constructor(__typename) {
        super(__typename);
        this.creationDate = null;
        this.validationDate = null;
        this.comments = null;
        this.recorderPerson = null;
        this.program = null;
        this.synchronizationStatus = null;
    }
    static fromObject(source) {
        const target = new RootDataEntity();
        target.fromObject(source);
        return target;
    }
    asObject(options) {
        const target = super.asObject(options);
        target.creationDate = toDateISOString(this.creationDate);
        target.validationDate = toDateISOString(this.validationDate);
        target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject(options) || undefined;
        target.program = this.program && this.program.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS /*always keep for table*/)) || undefined;
        if (options && options.minify) {
            if (target.program)
                delete target.program.entityName;
            if (options.keepSynchronizationStatus !== true) {
                delete target.synchronizationStatus; // Remove by default, when minify, because not exists on pod's model
            }
        }
        return target;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.comments = source.comments;
        this.creationDate = fromDateISOString(source.creationDate);
        this.validationDate = fromDateISOString(source.validationDate);
        this.recorderPerson = source.recorderPerson && Person.fromObject(source.recorderPerson);
        // Keep existing program, if not in source (because some forms can disable the program field - e.g. ObservedLocationForm)
        this.program = source.program && ReferentialRef.fromObject(source.program) || this.program;
        this.synchronizationStatus = source.synchronizationStatus;
    }
}
export class RootDataEntityUtils {
    static copyControlAndValidationDate(source, target) {
        if (!source)
            return;
        DataEntityUtils.copyControlDate(source, target);
        target.validationDate = fromDateISOString(source.validationDate);
    }
    static isNew(entity) {
        return isNil(entity.id);
    }
    static isLocal(entity) {
        return entity && (isNil(entity.id) ? (entity.synchronizationStatus && entity.synchronizationStatus !== 'SYNC') : entity.id < 0);
    }
    static isRemote(entity) {
        return entity && !RootDataEntityUtils.isLocal(entity);
    }
    static isLocalAndDirty(entity) {
        return entity && entity.id < 0 && entity.synchronizationStatus === 'DIRTY' || false;
    }
    static isReadyToSync(entity) {
        return entity && entity.id < 0 && entity.synchronizationStatus === 'READY_TO_SYNC' || false;
    }
    static markAsDirty(entity) {
        if (!entity)
            return; // skip
        // Remove control flags
        DataEntityUtils.markAsNotControlled(entity);
        // On local entity: change the synchronization statuc
        if (entity.id < 0) {
            entity.synchronizationStatus = 'DIRTY';
        }
    }
}
RootDataEntityUtils.copyQualificationDateAndFlag = DataEntityUtils.copyQualificationDateAndFlag;
//# sourceMappingURL=root-data-entity.model.js.map