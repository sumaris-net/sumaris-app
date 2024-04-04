import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { LocalSettingsService, SharedFormArrayValidators, SharedFormGroupValidators, SharedValidators, toBoolean } from '@sumaris-net/ngx-components';
import { DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { OperationGroup } from '../trip/trip.model';
import { DataValidators } from '@app/data/services/validator/data.validators';
import { TranslateService } from '@ngx-translate/core';
let ProductValidatorService = class ProductValidatorService extends DataEntityValidatorService {
    constructor(formBuilder, translate, settings, measurementsValidatorService) {
        super(formBuilder, translate, settings);
        this.measurementsValidatorService = measurementsValidatorService;
    }
    getRowValidator() {
        return this.getFormGroup();
    }
    getFormGroup(data, opts) {
        opts = this.fillDefaultOptions(opts);
        const form = super.getFormGroup(data, opts);
        // Add measurement form
        // if (opts.withMeasurements) {
        //   const pmfms = (opts.program && opts.program.strategies[0] && opts.program.strategies[0].pmfms || [])
        //     .filter(p => p.acquisitionLevel === AcquisitionLevelCodes.OPERATION);
        //   form.addControl('measurements', this.measurementsValidatorService.getFormGroup(data && data.measurements, {
        //     isOnFieldMode: opts.isOnFieldMode,
        //     pmfms
        //   }));
        // }
        return form;
    }
    getFormGroupConfig(data, opts) {
        const formConfig = Object.assign(super.getFormGroupConfig(data, opts), {
            __typename: [OperationGroup.TYPENAME],
            parent: [(data === null || data === void 0 ? void 0 : data.parent) || null, Validators.required],
            rankOrder: [(data === null || data === void 0 ? void 0 : data.rankOrder) || null],
            saleType: [(data === null || data === void 0 ? void 0 : data.saleType) || null],
            taxonGroup: [(data === null || data === void 0 ? void 0 : data.taxonGroup) || null, Validators.compose([Validators.required, SharedValidators.entity])],
            weight: [(data === null || data === void 0 ? void 0 : data.weight) || '', SharedValidators.decimal({ maxDecimals: 2 })],
            individualCount: [(data === null || data === void 0 ? void 0 : data.individualCount) || '', SharedValidators.integer],
            measurementValues: this.formBuilder.group({}),
            samples: [(data === null || data === void 0 ? void 0 : data.samples) || null],
            // comments: [data && data.comments || null, Validators.maxLength(2000)]
        });
        if (opts.withSaleProducts) {
            formConfig.saleProducts = this.getSaleProductsFormArray(data);
        }
        else {
            formConfig.saleProducts = [(data === null || data === void 0 ? void 0 : data.saleProducts) || null];
        }
        return formConfig;
    }
    getFormGroupOptions(data, opts) {
        return {
            validator: [
                SharedFormGroupValidators.requiredIfEmpty('weight', 'individualCount'),
                SharedFormGroupValidators.requiredIfEmpty('individualCount', 'weight'),
            ],
        };
    }
    fillDefaultOptions(opts) {
        opts = super.fillDefaultOptions(opts);
        opts.withMeasurements = toBoolean(opts.withMeasurements, toBoolean(!!opts.program, false));
        return opts;
    }
    updateFormGroup(formGroup, opts) {
        if (opts.withSaleProducts) {
            const saleValidators = this.getDefaultSaleProductValidators();
            if (formGroup.controls.individualCount.value) {
                saleValidators.push(SharedFormArrayValidators.validSumMaxValue('individualCount', formGroup.controls.individualCount.value));
            }
            if (formGroup.controls.weight.value) {
                saleValidators.push(SharedFormArrayValidators.validSumMaxValue('weight', formGroup.controls.weight.value));
            }
            if (saleValidators.length) {
                formGroup.controls.saleProducts.setValidators(saleValidators);
            }
        }
    }
    /* -- protected methods -- */
    getSaleProductsFormArray(data) {
        return this.formBuilder.array((data && data.saleProducts || [null]).map(saleProduct => this.getSaleProductControl(saleProduct)), this.getDefaultSaleProductValidators());
    }
    getDefaultSaleProductValidators() {
        return [
            SharedFormArrayValidators.validSumMaxValue('ratio', 100),
        ];
    }
    getSaleProductControl(sale) {
        return this.formBuilder.group({
            id: [(sale === null || sale === void 0 ? void 0 : sale.id) || null],
            saleType: [(sale === null || sale === void 0 ? void 0 : sale.saleType) || null, Validators.compose([Validators.required, SharedValidators.entity])],
            ratio: [(sale === null || sale === void 0 ? void 0 : sale.ratio) || null, Validators.compose([SharedValidators.decimal({ maxDecimals: 2 }), Validators.min(0), Validators.max(100)])],
            ratioCalculated: [(sale === null || sale === void 0 ? void 0 : sale.ratioCalculated) || null],
            weight: [(sale === null || sale === void 0 ? void 0 : sale.weight) || null, Validators.compose([SharedValidators.decimal({ maxDecimals: 2 }), Validators.min(0)])],
            weightCalculated: [(sale === null || sale === void 0 ? void 0 : sale.weightCalculated) || null],
            individualCount: [(sale === null || sale === void 0 ? void 0 : sale.individualCount) || null, Validators.compose([SharedValidators.integer, Validators.min(0)])],
            averageWeightPrice: [(sale === null || sale === void 0 ? void 0 : sale.averageWeightPrice) || null, Validators.compose([SharedValidators.decimal({ maxDecimals: 2 }), Validators.min(0)])],
            averageWeightPriceCalculated: [(sale === null || sale === void 0 ? void 0 : sale.averageWeightPriceCalculated) || null],
            averagePackagingPrice: [(sale === null || sale === void 0 ? void 0 : sale.averagePackagingPrice) || null, Validators.compose([SharedValidators.decimal({ maxDecimals: 2 }), Validators.min(0)])],
            averagePackagingPriceCalculated: [(sale === null || sale === void 0 ? void 0 : sale.averagePackagingPriceCalculated) || null],
            totalPrice: [(sale === null || sale === void 0 ? void 0 : sale.totalPrice) || null, Validators.compose([SharedValidators.decimal({ maxDecimals: 2 }), Validators.min(0)])],
            totalPriceCalculated: [(sale === null || sale === void 0 ? void 0 : sale.totalPriceCalculated) || null],
        }, {
            validators: [
                DataValidators.resetCalculatedFlag('ratio', ['weight']),
                DataValidators.resetCalculatedFlag('weight', ['ratio']),
                DataValidators.resetCalculatedFlag('averageWeightPrice', ['averagePackagingPrice', 'totalPrice']),
                DataValidators.resetCalculatedFlag('averagePackagingPrice', ['averageWeightPrice', 'totalPrice']),
                DataValidators.resetCalculatedFlag('totalPrice', ['averageWeightPrice', 'averagePackagingPrice']),
            ],
        });
    }
};
ProductValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        TranslateService,
        LocalSettingsService,
        MeasurementsValidatorService])
], ProductValidatorService);
export { ProductValidatorService };
//# sourceMappingURL=product.validator.js.map