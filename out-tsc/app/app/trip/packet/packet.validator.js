import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { LocalSettingsService, SharedFormArrayValidators, SharedValidators } from '@sumaris-net/ngx-components';
import { DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { Packet, PacketIndexes } from './packet.model';
import { PacketCompositionValidatorService } from './packet-composition.validator';
import { DataValidators } from '@app/data/services/validator/data.validators';
import { TranslateService } from '@ngx-translate/core';
let PacketValidatorService = class PacketValidatorService extends DataEntityValidatorService {
    constructor(formBuilder, translate, settings, packetCompositionValidatorService) {
        super(formBuilder, translate, settings);
        this.packetCompositionValidatorService = packetCompositionValidatorService;
    }
    getFormGroupConfig(data, opts) {
        const formConfig = Object.assign(super.getFormGroupConfig(data, opts), {
            __typename: [Packet.TYPENAME],
            parent: [(data === null || data === void 0 ? void 0 : data.parent) || null, Validators.required],
            rankOrder: [(data === null || data === void 0 ? void 0 : data.rankOrder) || null],
            number: [(data === null || data === void 0 ? void 0 : data.number) || null, Validators.compose([Validators.required, SharedValidators.integer])],
            weight: [(data === null || data === void 0 ? void 0 : data.weight) || null, Validators.compose([Validators.required, SharedValidators.decimal({ maxDecimals: 2 })])]
        });
        // add sampledWeights
        PacketIndexes.forEach(index => {
            formConfig['sampledWeight' + index] = [(data === null || data === void 0 ? void 0 : data['sampledWeight' + index]) || null, Validators.compose([Validators.min(0), SharedValidators.decimal({ maxDecimals: 2 })])];
        });
        if (opts.withComposition) {
            formConfig.composition = this.getCompositionFormArray(data);
            // add sampledRatios
            PacketIndexes.forEach(index => {
                formConfig['sampledRatio' + index] = [(data === null || data === void 0 ? void 0 : data['sampledRatio' + index]) || null, Validators.max(100)];
            });
        }
        else {
            formConfig.composition = [(data === null || data === void 0 ? void 0 : data.composition) || null, Validators.required];
        }
        if (opts.withSaleProducts) {
            formConfig.saleProducts = this.getSaleProductsFormArray(data);
        }
        else {
            formConfig.saleProducts = [(data === null || data === void 0 ? void 0 : data.saleProducts) || null];
        }
        return formConfig;
    }
    updateFormGroup(formGroup, opts) {
        if (opts.withSaleProducts) {
            const saleValidators = [];
            if (formGroup.controls.number.value) {
                saleValidators.push(SharedFormArrayValidators.validSumMaxValue('subgroupCount', formGroup.controls.number.value));
            }
            if (saleValidators.length) {
                formGroup.controls.saleProducts.setValidators(saleValidators);
            }
        }
    }
    /* -- protected methods -- */
    getCompositionFormArray(data) {
        return this.formBuilder.array((data && data.composition || [null]).map(composition => this.getCompositionControl(composition)), this.getDefaultCompositionValidators());
    }
    getDefaultCompositionValidators() {
        return [
            SharedFormArrayValidators.uniqueEntity('taxonGroup')
        ];
    }
    getCompositionControl(composition) {
        return this.packetCompositionValidatorService.getFormGroup(composition);
    }
    getSaleProductsFormArray(data) {
        return this.formBuilder.array((data && data.saleProducts || [null]).map(saleProduct => this.getSaleProductControl(saleProduct)));
    }
    getSaleProductControl(sale) {
        return this.formBuilder.group({
            saleType: [sale && sale.saleType || null, Validators.compose([Validators.required, SharedValidators.entity])],
            rankOrder: [sale && sale.rankOrder || null],
            subgroupCount: [sale && sale.subgroupCount || null, Validators.compose([SharedValidators.integer, Validators.min(0)])],
            weight: [sale && sale.weight || null],
            weightCalculated: [true],
            averagePackagingPrice: [sale && sale.averagePackagingPrice || null, Validators.compose([SharedValidators.decimal({ maxDecimals: 2 }), Validators.min(0)])],
            averagePackagingPriceCalculated: [sale && sale.averagePackagingPriceCalculated || null],
            totalPrice: [sale && sale.totalPrice || null, Validators.compose([SharedValidators.decimal({ maxDecimals: 2 }), Validators.min(0)])],
            totalPriceCalculated: [sale && sale.totalPriceCalculated || null],
            productIdByTaxonGroup: [sale && sale.productIdByTaxonGroup || null]
        }, {
            validators: [
                DataValidators.resetCalculatedFlag('averagePackagingPrice', ['totalPrice']),
                DataValidators.resetCalculatedFlag('totalPrice', ['averagePackagingPrice']),
            ]
        });
    }
};
PacketValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        TranslateService,
        LocalSettingsService,
        PacketCompositionValidatorService])
], PacketValidatorService);
export { PacketValidatorService };
//# sourceMappingURL=packet.validator.js.map