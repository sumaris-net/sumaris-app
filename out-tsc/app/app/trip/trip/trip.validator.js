var TripValidatorService_1;
import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { AppFormArray, LocalSettingsService, ReferentialUtils, SharedFormArrayValidators, SharedFormGroupValidators, SharedValidators, toBoolean, toNumber, } from '@sumaris-net/ngx-components';
import { SaleValidatorService } from '../sale/sale.validator';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { Trip } from './trip.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { DataRootVesselEntityValidatorService } from '@app/data/services/validator/root-vessel-entity.validator';
import { FishingAreaValidatorService } from '@app/data/fishing-area/fishing-area.validator';
import { TranslateService } from '@ngx-translate/core';
let TripValidatorService = TripValidatorService_1 = class TripValidatorService extends DataRootVesselEntityValidatorService {
    constructor(formBuilder, translate, settings, saleValidator, fishingAreaValidator, measurementsValidatorService) {
        super(formBuilder, translate, settings);
        this.saleValidator = saleValidator;
        this.fishingAreaValidator = fishingAreaValidator;
        this.measurementsValidatorService = measurementsValidatorService;
    }
    getFormGroup(data, opts) {
        opts = this.fillDefaultOptions(opts);
        const form = super.getFormGroup(data, opts);
        // Add sale form
        if (opts.withSale) {
            form.addControl('sale', this.saleValidator.getFormGroup(data && data.sale, {
                required: false
            }));
        }
        // Add measurement form
        if (opts.withMeasurements) {
            const pmfms = (opts.program && opts.program.strategies[0] && opts.program.strategies[0].denormalizedPmfms || [])
                .filter(p => p.acquisitionLevel === AcquisitionLevelCodes.TRIP);
            form.addControl('measurements', this.measurementsValidatorService.getFormGroup(data && data.measurements, {
                isOnFieldMode: opts.isOnFieldMode,
                pmfms
            }));
        }
        return form;
    }
    getFormGroupConfig(data, opts) {
        const formConfig = Object.assign(super.getFormGroupConfig(data, opts), {
            __typename: [Trip.TYPENAME],
            departureDateTime: [data && data.departureDateTime || null, !opts.departureDateTimeRequired ? null : Validators.required],
            departureLocation: [data && data.departureLocation || null, Validators.compose([Validators.required, SharedValidators.entity])],
            returnDateTime: [data && data.returnDateTime || null, this.getReturnDateTimeValidator(opts)],
            returnLocation: [data && data.returnLocation || null, this.getReturnLocationValidator(opts)]
        });
        // Add observers
        if (opts.withObservers) {
            formConfig.observers = this.getObserversFormArray(data === null || data === void 0 ? void 0 : data.observers);
        }
        // Add metiers
        if (opts.withMetiers) {
            formConfig.metiers = this.getMetiersArray(data === null || data === void 0 ? void 0 : data.metiers);
        }
        // Add fishing Ares
        if (opts.withFishingAreas) {
            formConfig.fishingAreas = this.getFishingAreasArray(data);
        }
        return formConfig;
    }
    getFormGroupOptions(data, opts) {
        return {
            validator: Validators.compose([
                SharedFormGroupValidators.dateRange('departureDateTime', 'returnDateTime'),
                SharedFormGroupValidators.dateMinDuration('departureDateTime', 'returnDateTime', (opts === null || opts === void 0 ? void 0 : opts.minDurationInHours) || TripValidatorService_1.DEFAULT_MIN_DURATION_HOURS, 'hour'),
                SharedFormGroupValidators.dateMaxDuration('departureDateTime', 'returnDateTime', (opts === null || opts === void 0 ? void 0 : opts.maxDurationInHours) || TripValidatorService_1.DEFAULT_MAX_DURATION_HOURS, 'hour')
            ])
        };
    }
    updateFormGroup(form, opts) {
        var _a;
        opts = this.fillDefaultOptions(opts);
        const enabled = form.enabled;
        form.get('returnDateTime').setValidators(this.getReturnDateTimeValidator(opts));
        form.get('returnLocation').setValidators(this.getReturnLocationValidator(opts));
        // Metier array
        if (opts === null || opts === void 0 ? void 0 : opts.withMetiers) {
            if (!form.controls.metiers)
                form.addControl('metiers', this.getMetiersArray(null, { required: true }));
        }
        else {
            if (form.controls.metiers)
                form.removeControl('metiers');
        }
        // Observers
        if (opts === null || opts === void 0 ? void 0 : opts.withObservers) {
            if (!form.controls.observers)
                form.addControl('observers', this.getObserversFormArray(null, { required: true }));
        }
        else {
            if (form.controls.observers)
                form.removeControl('observers');
        }
        // Update form group validators
        const formValidators = (_a = this.getFormGroupOptions(null, opts)) === null || _a === void 0 ? void 0 : _a.validators;
        form.setValidators(formValidators);
        return form;
    }
    getMetiersArray(data, opts) {
        const required = !opts || opts.required !== false;
        const formArray = new AppFormArray((metier) => this.getMetierControl(metier, { required }), ReferentialUtils.equals, ReferentialUtils.isEmpty, {
            allowEmptyArray: false,
            validators: required ? SharedFormArrayValidators.requiredArrayMinLength(1) : null,
        });
        if (data || required) {
            formArray.patchValue(data || [null]);
        }
        return formArray;
    }
    getMetierControl(value, opts) {
        const required = !opts || opts.required !== false;
        return this.formBuilder.control(value || null, required ? [Validators.required, SharedValidators.entity] : SharedValidators.entity);
    }
    getFishingAreasArray(data, opts) {
        const required = !opts || opts.required !== false;
        return this.formBuilder.array((data && data.fishingAreas || []).map(fa => this.fishingAreaValidator.getFormGroup(fa)), required ? SharedFormArrayValidators.requiredArrayMinLength(1) : undefined);
    }
    /* -- protected methods -- */
    fillDefaultOptions(opts) {
        var _a, _b, _c, _d, _e;
        opts = super.fillDefaultOptions(opts);
        opts.withObservers = toBoolean(opts.withObservers, toBoolean((_a = opts.program) === null || _a === void 0 ? void 0 : _a.getPropertyAsBoolean(ProgramProperties.TRIP_OBSERVERS_ENABLE), ProgramProperties.TRIP_OBSERVERS_ENABLE.defaultValue === 'true'));
        opts.withMetiers = toBoolean(opts.withMetiers, toBoolean((_b = opts.program) === null || _b === void 0 ? void 0 : _b.getPropertyAsBoolean(ProgramProperties.TRIP_METIERS_ENABLE), ProgramProperties.TRIP_METIERS_ENABLE.defaultValue === 'true'));
        opts.withSale = toBoolean(opts.withSale, toBoolean((_c = opts.program) === null || _c === void 0 ? void 0 : _c.getPropertyAsBoolean(ProgramProperties.TRIP_SALE_ENABLE), false));
        opts.withMeasurements = toBoolean(opts.withMeasurements, !!opts.program);
        opts.returnFieldsRequired = toBoolean(opts.returnFieldsRequired, !opts.isOnFieldMode);
        opts.minDurationInHours = toNumber(opts.minDurationInHours, (_d = opts.program) === null || _d === void 0 ? void 0 : _d.getPropertyAsInt(ProgramProperties.TRIP_MIN_DURATION_HOURS));
        opts.maxDurationInHours = toNumber(opts.maxDurationInHours, (_e = opts.program) === null || _e === void 0 ? void 0 : _e.getPropertyAsInt(ProgramProperties.TRIP_MAX_DURATION_HOURS));
        return opts;
    }
    getReturnDateTimeValidator(opts) {
        return Validators.compose([
            opts.returnFieldsRequired ? Validators.required : Validators.nullValidator,
            SharedValidators.dateRangeEnd('departureDateTime'),
            SharedValidators.copyParentErrors(['dateRange', 'dateMaxDuration', 'dateMinDuration'])
        ]);
    }
    getReturnLocationValidator(opts) {
        return opts.returnFieldsRequired ? Validators.compose([Validators.required, SharedValidators.entity]) : SharedValidators.entity;
    }
};
TripValidatorService.DEFAULT_MIN_DURATION_HOURS = 1; // 1 hour
TripValidatorService.DEFAULT_MAX_DURATION_HOURS = 100 * 24; // 100 days
TripValidatorService = TripValidatorService_1 = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        TranslateService,
        LocalSettingsService,
        SaleValidatorService,
        FishingAreaValidatorService,
        MeasurementsValidatorService])
], TripValidatorService);
export { TripValidatorService };
//# sourceMappingURL=trip.validator.js.map