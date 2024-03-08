import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { AppFormArray, isNil, LocalSettingsService, SharedValidators, toBoolean, toNumber } from '@sumaris-net/ngx-components';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { DataRootEntityValidatorService } from '@app/data/services/validator/root-data-entity.validator';
import { TranslateService } from '@ngx-translate/core';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { OperationValidators } from '@app/trip/operation/operation.validator';
let PhysicalGearValidatorService = class PhysicalGearValidatorService extends DataRootEntityValidatorService {
    constructor(formBuilder, translate, measurementsValidatorService, settings) {
        super(formBuilder, translate, settings);
        this.measurementsValidatorService = measurementsValidatorService;
    }
    getFormGroup(data, opts) {
        opts = opts || {};
        const form = super.getFormGroup(data, opts);
        // Add measurement values form
        if (opts.withMeasurementValues) {
            form.setControl('measurementValues', this.getMeasurementValuesForm(data === null || data === void 0 ? void 0 : data.measurementValues, {
                pmfms: opts.pmfms
            }));
        }
        return form;
    }
    getFormGroupConfig(data, opts) {
        const config = Object.assign(Object.assign({}, super.getFormGroupConfig(data, opts)), { __typename: [PhysicalGear.TYPENAME], rankOrder: [toNumber(data === null || data === void 0 ? void 0 : data.rankOrder, null), Validators.compose([Validators.required, SharedValidators.integer, Validators.min(1)])], gear: [(data === null || data === void 0 ? void 0 : data.gear) || null, Validators.compose([Validators.required, SharedValidators.entity])], measurementValues: this.formBuilder.group({}), tripId: [toNumber(data === null || data === void 0 ? void 0 : data.tripId, null)] });
        // Change program is optional
        config['program'] = [(data === null || data === void 0 ? void 0 : data.program) || null];
        if (!opts || opts.withChildren !== false) {
            config['children'] = this.getChildrenFormArray(data === null || data === void 0 ? void 0 : data.children, opts);
        }
        return config;
    }
    getFormGroupOptions(data, opts) {
        return null;
    }
    getChildrenFormArray(data, opts) {
        const formArray = new AppFormArray((value) => this.getFormGroup(value, Object.assign(Object.assign({}, opts), { pmfms: (opts === null || opts === void 0 ? void 0 : opts.childrenPmfms) || (opts === null || opts === void 0 ? void 0 : opts.pmfms), withChildren: false, acquisitionLevel: AcquisitionLevelCodes.CHILD_PHYSICAL_GEAR // Force the acquisition level for children
         })), PhysicalGear.equals, (value) => isNil(value), {
            allowEmptyArray: true,
            allowReuseControls: false,
            validators: (opts === null || opts === void 0 ? void 0 : opts.minChildrenCount) > 0
                ? OperationValidators.requiredArrayMinLength(opts.minChildrenCount)
                : undefined
        });
        if (data) {
            formArray.patchValue(data);
        }
        return formArray;
    }
    getMeasurementValuesForm(data, opts) {
        const measurementValues = data && MeasurementValuesUtils.normalizeValuesToForm(data, opts.pmfms);
        return this.measurementsValidatorService.getFormGroup(measurementValues, opts);
    }
    fillDefaultOptions(opts) {
        var _a, _b;
        opts = super.fillDefaultOptions(opts);
        opts.withChildren = toBoolean(opts.withChildren, toBoolean((_a = opts.program) === null || _a === void 0 ? void 0 : _a.getPropertyAsBoolean(ProgramProperties.TRIP_PHYSICAL_GEAR_ALLOW_CHILDREN), false));
        opts.minChildrenCount = toNumber(opts.minChildrenCount, (_b = opts.program) === null || _b === void 0 ? void 0 : _b.getPropertyAsInt(ProgramProperties.TRIP_PHYSICAL_GEAR_MIN_CHILDREN_COUNT));
        return opts;
    }
};
PhysicalGearValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        TranslateService,
        MeasurementsValidatorService,
        LocalSettingsService])
], PhysicalGearValidatorService);
export { PhysicalGearValidatorService };
//# sourceMappingURL=physicalgear.validator.js.map