import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { PacketComposition, PacketIndexes } from './packet.model';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { LocalSettingsService, SharedValidators } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
let PacketCompositionValidatorService = class PacketCompositionValidatorService extends DataEntityValidatorService {
    constructor(formBuilder, translate, settings) {
        super(formBuilder, translate, settings);
    }
    getFormGroupConfig(data, opts) {
        const formConfig = Object.assign(super.getFormGroupConfig(data, opts), {
            __typename: [PacketComposition.TYPENAME],
            rankOrder: [(data === null || data === void 0 ? void 0 : data.rankOrder) || null],
            taxonGroup: [(data === null || data === void 0 ? void 0 : data.taxonGroup) || null, Validators.compose([Validators.required, SharedValidators.entity])],
            weight: [(data === null || data === void 0 ? void 0 : data.weight) || null, null],
        });
        // add ratios
        PacketIndexes.forEach(index => {
            formConfig['ratio' + index] = [(data === null || data === void 0 ? void 0 : data['ratio' + index]) || null, Validators.compose([SharedValidators.integer, Validators.min(0), Validators.max(100)])];
        });
        return formConfig;
    }
};
PacketCompositionValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        TranslateService,
        LocalSettingsService])
], PacketCompositionValidatorService);
export { PacketCompositionValidatorService };
//# sourceMappingURL=packet-composition.validator.js.map