import { Department, EntityFilter, isNil, isNotNil } from '@sumaris-net/ngx-components';
import { QualityFlagIds } from '@app/referential/services/model/model.enum';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
export class DataEntityFilter extends EntityFilter {
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.recorderDepartment = Department.fromObject(source.recorderDepartment)
            || isNotNil(source.recorderDepartmentId) && Department.fromObject({ id: source.recorderDepartmentId })
            || undefined;
        this.dataQualityStatus = source.dataQualityStatus;
        this.qualityFlagId = source.qualityFlagId;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        if (opts && opts.minify) {
            target.recorderDepartmentId = this.recorderDepartment && isNotNil(this.recorderDepartment.id) ? this.recorderDepartment.id : undefined;
            delete target.recorderDepartment;
            target.qualityFlagIds = isNotNil(this.qualityFlagId) ? [this.qualityFlagId] : undefined;
            delete target.qualityFlagId;
            target.dataQualityStatus = this.dataQualityStatus && [this.dataQualityStatus] || undefined;
            // If filter on NOT qualified data, remove quality flag
            if (Array.isArray(target.dataQualityStatus) && target.dataQualityStatus.length && !target.dataQualityStatus.includes('QUALIFIED')) {
                delete target.qualityFlagIds;
            }
        }
        else {
            target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS));
            target.dataQualityStatus = this.dataQualityStatus;
        }
        return target;
    }
    buildFilter() {
        const filterFns = super.buildFilter();
        // Department
        if (this.recorderDepartment) {
            const recorderDepartmentId = this.recorderDepartment.id;
            if (isNotNil(recorderDepartmentId)) {
                filterFns.push(t => (t.recorderDepartment && t.recorderDepartment.id === recorderDepartmentId));
            }
        }
        // Quality flag
        if (isNotNil(this.qualityFlagId)) {
            const qualityFlagId = this.qualityFlagId;
            filterFns.push((t => isNotNil(t.qualityFlagId) && t.qualityFlagId === qualityFlagId));
        }
        // Quality status
        if (isNotNil(this.dataQualityStatus)) {
            switch (this.dataQualityStatus) {
                case 'MODIFIED':
                    filterFns.push(t => isNil(t.controlDate));
                    break;
                case 'CONTROLLED':
                    filterFns.push(t => isNotNil(t.controlDate));
                    break;
                case 'VALIDATED':
                    // Must be done in sub-classes (see RootDataEntity)
                    break;
                case 'QUALIFIED':
                    filterFns.push(t => isNotNil(t.qualityFlagId)
                        && t.qualityFlagId !== QualityFlagIds.NOT_QUALIFIED
                        // Exclude incomplete OPE (e.g. filage)
                        && t.qualityFlagId !== QualityFlagIds.NOT_COMPLETED);
                    break;
            }
        }
        return filterFns;
    }
}
//# sourceMappingURL=data-filter.model.js.map