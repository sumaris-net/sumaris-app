import { isNotNil, SharedValidators, toNumber } from '@sumaris-net/ngx-components';
import { QualityFlagIds } from '@app/referential/services/model/model.enum';
import { BaseValidatorService } from '@app/shared/service/base.validator.service';
export class DataEntityValidatorService extends BaseValidatorService {
    constructor(formBuilder, translate, settings) {
        super(formBuilder, translate);
        this.formBuilder = formBuilder;
        this.translate = translate;
        this.settings = settings;
    }
    getFormGroup(data, opts) {
        opts = this.fillDefaultOptions(opts);
        return this.formBuilder.group(this.getFormGroupConfig(data, opts), this.getFormGroupOptions(data, opts));
    }
    getFormGroupConfig(data, opts) {
        return {
            id: [toNumber(data && data.id, null)],
            updateDate: [data && data.updateDate || null],
            recorderDepartment: [data && data.recorderDepartment || null, SharedValidators.entity],
            // Quality properties
            controlDate: [data && data.controlDate || null],
            qualificationDate: [data && data.qualificationDate || null],
            qualificationComments: [data && data.qualificationComments || null],
            qualityFlagId: [toNumber(data && data.qualityFlagId, QualityFlagIds.NOT_QUALIFIED)]
        };
    }
    getFormGroupOptions(data, opts) {
        return { updateOn: opts === null || opts === void 0 ? void 0 : opts.updateOn };
    }
    updateFormGroup(form, opts) {
        // Must be override by subclasses
        console.warn(`${this.constructor.name}.updateFormGroup() not implemented yet!`);
    }
    /* -- protected methods -- */
    fillDefaultOptions(opts) {
        var _a;
        opts = opts || {};
        opts.isOnFieldMode = isNotNil(opts.isOnFieldMode) ? opts.isOnFieldMode : (((_a = this.settings) === null || _a === void 0 ? void 0 : _a.isOnFieldMode()) || false);
        return opts;
    }
}
//# sourceMappingURL=data-entity.validator.js.map