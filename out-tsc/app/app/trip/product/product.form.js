import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Injector } from '@angular/core';
import { isNotNil } from '@sumaris-net/ngx-components';
import { UntypedFormBuilder } from '@angular/forms';
import { MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
import { ProductValidatorService } from '@app/trip/product/product.validator';
let ProductForm = class ProductForm extends MeasurementValuesForm {
    constructor(injector, measurementsValidatorService, formBuilder, programRefService, validatorService) {
        super(injector, measurementsValidatorService, formBuilder, programRefService, validatorService.getFormGroup(null, {
            withMeasurements: false
        }));
        this.measurementsValidatorService = measurementsValidatorService;
        this.formBuilder = formBuilder;
        this.programRefService = programRefService;
        this.validatorService = validatorService;
        this.showComment = false;
        this.showError = true;
        // Set default acquisition level
        this.acquisitionLevel = AcquisitionLevelCodes.PRODUCT;
        this.mobile = this.settings.mobile;
        this.debug = !environment.production;
    }
    ;
    ngOnInit() {
        super.ngOnInit();
        // Default values
        this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;
        this.registerAutocompleteField('parent', {
            items: this.parents,
            attributes: this.parentAttributes,
            columnNames: ['RANK_ORDER', 'REFERENTIAL.LABEL', 'REFERENTIAL.NAME'],
            columnSizes: this.parentAttributes.map(attr => attr === 'metier.label' ? 3 : (attr === 'rankOrderOnPeriod' ? 1 : undefined)),
            mobile: this.mobile
        });
        const taxonGroupAttributes = this.settings.getFieldDisplayAttributes('taxonGroup');
        this.registerAutocompleteField('taxonGroup', {
            suggestFn: (value, options) => this.suggestTaxonGroups(value, options),
            columnSizes: taxonGroupAttributes.map(attr => attr === 'label' ? 3 : undefined),
            mobile: this.mobile
        });
    }
    /* -- protected methods -- */
    suggestTaxonGroups(value, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.programRefService.suggestTaxonGroups(value, {
                program: this.programLabel,
                searchAttribute: options && options.searchAttribute
            });
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Number)
], ProductForm.prototype, "tabindex", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ProductForm.prototype, "showComment", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ProductForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], ProductForm.prototype, "parents", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], ProductForm.prototype, "parentAttributes", void 0);
ProductForm = __decorate([
    Component({
        selector: 'app-product-form',
        templateUrl: './product.form.html',
        styleUrls: ['./product.form.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        MeasurementsValidatorService,
        UntypedFormBuilder,
        ProgramRefService,
        ProductValidatorService])
], ProductForm);
export { ProductForm };
//# sourceMappingURL=product.form.js.map