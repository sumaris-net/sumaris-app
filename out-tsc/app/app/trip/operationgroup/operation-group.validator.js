import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { LocalSettingsService, SharedValidators, toBoolean } from '@sumaris-net/ngx-components';
import { DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { OperationGroup } from '../trip/trip.model';
import { TranslateService } from '@ngx-translate/core';
let OperationGroupValidatorService = class OperationGroupValidatorService extends DataEntityValidatorService {
    constructor(formBuilder, translate, settings, measurementsValidatorService) {
        super(formBuilder, translate, settings);
        this.formBuilder = formBuilder;
        this.translate = translate;
        this.settings = settings;
        this.measurementsValidatorService = measurementsValidatorService;
    }
    getFormGroup(data, opts) {
        opts = this.fillDefaultOptions(opts);
        const form = super.getFormGroup(data, opts);
        // Add measurement form
        // if (opts.withMeasurements) {
        //   const pmfms = (opts.program?.strategies?.[0]?.denormalizedPmfms || [])
        //     .filter(p => p.acquisitionLevel === AcquisitionLevelCodes.OPERATION);
        //   form.addControl('measurements', this.measurementsValidatorService.getFormGroup(data && data.measurements, {
        //     isOnFieldMode: opts.isOnFieldMode,
        //     pmfms
        //   }));
        // }
        return form;
    }
    getFormGroupConfig(data, opts) {
        return Object.assign(super.getFormGroupConfig(data, opts), {
            __typename: [OperationGroup.TYPENAME],
            rankOrderOnPeriod: [(data === null || data === void 0 ? void 0 : data.rankOrderOnPeriod) || null],
            metier: [(data === null || data === void 0 ? void 0 : data.metier) || null, Validators.compose([Validators.required, SharedValidators.entity])],
            physicalGearId: [(data === null || data === void 0 ? void 0 : data.physicalGearId) || null],
            measurementValues: this.formBuilder.group({}),
            comments: [(data === null || data === void 0 ? void 0 : data.comments) || null, Validators.maxLength(2000)]
        });
    }
    /* -- protected methods -- */
    fillDefaultOptions(opts) {
        opts = super.fillDefaultOptions(opts);
        opts.withMeasurements = toBoolean(opts.withMeasurements, toBoolean(!!opts.program, false));
        //console.debug("[operation-validator] Ope Validator will use options:", opts);
        return opts;
    }
};
OperationGroupValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        TranslateService,
        LocalSettingsService,
        MeasurementsValidatorService])
], OperationGroupValidatorService);
export { OperationGroupValidatorService };
//# sourceMappingURL=operation-group.validator.js.map