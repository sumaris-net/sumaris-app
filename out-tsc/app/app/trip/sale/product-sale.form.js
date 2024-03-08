import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { AppForm, AppFormUtils, FormArrayHelper, isNotEmptyArray, isNotNil } from '@sumaris-net/ngx-components';
import { Injector } from '@angular/core';
import { ProductValidatorService } from '../product/product.validator';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { Subscription } from 'rxjs';
import { SaleProductUtils } from './sale-product.model';
let ProductSaleForm = class ProductSaleForm extends AppForm {
    constructor(injector, validatorService, cd, formBuilder, referentialRefService) {
        super(injector, validatorService.getFormGroup(undefined, { withSaleProducts: true }));
        this.validatorService = validatorService;
        this.cd = cd;
        this.formBuilder = formBuilder;
        this.referentialRefService = referentialRefService;
        this.computing = false;
        this.salesFocusIndex = -1;
        this.showError = true;
    }
    get saleFormArray() {
        return this.form.controls.saleProducts;
    }
    get value() {
        const json = this.form.value;
        // Convert products sales to products
        json.saleProducts = (json.saleProducts || []).map(saleProduct => SaleProductUtils.saleProductToProduct(this._data, saleProduct, this.productSalePmfms, { keepId: true }));
        return json;
    }
    ngOnInit() {
        super.ngOnInit();
        this.initSalesHelper();
        this.usageMode = this.usageMode || this.settings.usageMode;
        // Combo: sale types
        this.registerAutocompleteField('saleType', {
            service: this.referentialRefService,
            attributes: ['name'],
            filter: {
                entityName: 'SaleType'
            },
            showAllOnFocus: true,
            mobile: this.mobile
        });
        this.registerSubscription(this.form.get('individualCount').valueChanges.subscribe(value => {
            this.hasIndividualCount = isNotNil(value);
            this.markForCheck();
        }));
    }
    ngOnDestroy() {
        var _a;
        (_a = this._saleSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
        super.ngOnDestroy();
    }
    setValue(data, opts) {
        const _super = Object.create(null, {
            setValue: { get: () => super.setValue }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (!data)
                return;
            this._data = data;
            // Initialize product sales by converting products to sale products
            data.saleProducts = isNotEmptyArray(data.saleProducts) ? data.saleProducts.map(p => SaleProductUtils.productToSaleProduct(p, this.productSalePmfms)) : [null];
            this.salesHelper.resize(Math.max(1, data.saleProducts.length));
            _super.setValue.call(this, data, opts);
            // update saleFromArray validators
            this.validatorService.updateFormGroup(this.form, { withSaleProducts: true });
            this.computeAllPrices();
            this.initSubscription();
        });
    }
    initSubscription() {
        var _a;
        // clear and re-create
        (_a = this._saleSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
        this._saleSubscription = new Subscription();
        // add subscription on each sale form
        for (const saleForm of this.saleFormArray.controls || []) {
            this._saleSubscription.add(saleForm.valueChanges.subscribe(() => {
                const dirty = saleForm.dirty;
                this.computePrices(saleForm.controls);
                // Restore previous state - fix OBSDEB bug
                if (!dirty)
                    saleForm.markAsPristine();
            }));
        }
    }
    computeAllPrices() {
        for (const saleForm of this.saleFormArray.controls || []) {
            this.computePrices(saleForm.controls);
        }
    }
    computePrices(controls) {
        if (this.computing)
            return;
        try {
            this.computing = true;
            SaleProductUtils.computeSaleProduct(this.form.value, controls, (object, valueName) => AppFormUtils.isControlHasInput(object, valueName), (object, valueName) => object[valueName].value, (object, valueName, value1) => AppFormUtils.setCalculatedValue(object, valueName, value1), (object, valueName) => AppFormUtils.resetCalculatedValue(object, valueName), true, 'individualCount');
        }
        finally {
            this.computing = false;
        }
    }
    isProductWithNumber() {
        return isNotNil(this.form.value.individualCount);
    }
    isProductWithWeight() {
        return isNotNil(this.form.value.weight);
    }
    initSalesHelper() {
        this.salesHelper = new FormArrayHelper(FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'saleProducts'), (saleProduct) => this.validatorService.getSaleProductControl(saleProduct), SaleProductUtils.isSaleProductEquals, SaleProductUtils.isSaleProductEmpty, {
            allowEmptyArray: true,
            validators: this.validatorService.getDefaultSaleProductValidators()
        });
        if (this.salesHelper.size() === 0) {
            // add at least one sale
            this.salesHelper.resize(1);
        }
        this.markForCheck();
    }
    asFormGroup(control) {
        return control;
    }
    addSale(event) {
        event === null || event === void 0 ? void 0 : event.stopPropagation();
        this.salesHelper.add();
        this.initSubscription();
        this.editSale(this.salesHelper.size() - 1);
    }
    removeSale(index) {
        this.salesHelper.removeAt(index);
        this.initSubscription();
        this.editSale(index - 1, { focus: false });
    }
    editSale(index, opts = { focus: true }) {
        const maxIndex = this.salesHelper.size() - 1;
        if (index < 0) {
            index = 0;
        }
        else if (index > maxIndex) {
            index = maxIndex;
        }
        if (this.salesEditedIndex === index)
            return; // Skip if same
        this.salesEditedIndex = index;
        this.markForCheck();
        // Focus
        if (!this.mobile && (!opts || opts.focus !== false)) {
            this.salesFocusIndex = index;
            setTimeout(() => {
                this.salesFocusIndex = undefined;
                this.markForCheck();
            }, 500);
        }
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], ProductSaleForm.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ProductSaleForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], ProductSaleForm.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], ProductSaleForm.prototype, "productSalePmfms", void 0);
ProductSaleForm = __decorate([
    Component({
        selector: 'app-product-sale-form',
        templateUrl: './product-sale.form.html',
        styleUrls: ['./product-sale.form.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        ProductValidatorService,
        ChangeDetectorRef,
        UntypedFormBuilder,
        ReferentialRefService])
], ProductSaleForm);
export { ProductSaleForm };
//# sourceMappingURL=product-sale.form.js.map