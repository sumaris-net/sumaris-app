import { __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { AppForm, AppFormUtils, FormArrayHelper, isNotEmptyArray } from '@sumaris-net/ngx-components';
import { PacketValidatorService } from '../packet/packet.validator';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { Subscription } from 'rxjs';
import { fillRankOrder } from '@app/data/services/model/model.utils';
import { SaleProductUtils } from './sale-product.model';
let PacketSaleForm = class PacketSaleForm extends AppForm {
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
        // Update packets sales if needed
        fillRankOrder(json.saleProducts);
        // Convert aggregated products sales to products
        json.saleProducts = json.saleProducts && SaleProductUtils.aggregatedSaleProductsToProducts(this._data, json.saleProducts, this.packetSalePmfms);
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
    }
    ngOnDestroy() {
        var _a;
        (_a = this._saleSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
        super.ngOnDestroy();
    }
    setValue(data, opts) {
        if (!data)
            return;
        this._data = data;
        // Initialize product sales by converting products to aggregated sale products
        const aggregatedSaleProducts = isNotEmptyArray(data.saleProducts)
            ? SaleProductUtils.productsToAggregatedSaleProduct(data.saleProducts, this.packetSalePmfms)
                .map(p => p.asObject())
            : [{}];
        this.salesHelper.resize(Math.max(1, aggregatedSaleProducts.length));
        data.saleProducts = aggregatedSaleProducts;
        // Set value
        super.setValue(data, opts);
        // update saleFromArray validators
        this.validatorService.updateFormGroup(this.form, { withSaleProducts: true });
        this.computeAllPrices();
        this.initSubscription();
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
        for (const sale of this.saleFormArray.controls || []) {
            this.computePrices(sale.controls);
        }
    }
    computePrices(controls) {
        if (this.computing)
            return;
        try {
            this.computing = true;
            SaleProductUtils.computeSaleProduct(this.form.value, controls, (object, valueName) => AppFormUtils.isControlHasInput(object, valueName), (object, valueName) => object[valueName].value, (object, valueName, value) => AppFormUtils.setCalculatedValue(object, valueName, value), (object, valueName) => AppFormUtils.resetCalculatedValue(object, valueName), false, 'subgroupCount', 'number');
        }
        finally {
            this.computing = false;
        }
    }
    initSalesHelper() {
        this.salesHelper = new FormArrayHelper(FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'saleProducts'), (saleProduct) => this.validatorService.getSaleProductControl(saleProduct), SaleProductUtils.isSaleProductEquals, SaleProductUtils.isSaleProductEmpty, {
            allowEmptyArray: true
        });
        if (this.salesHelper.size() === 0) {
            // add at least one sale
            this.salesHelper.resize(1);
        }
        this.markForCheck();
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
], PacketSaleForm.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PacketSaleForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PacketSaleForm.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], PacketSaleForm.prototype, "packetSalePmfms", void 0);
PacketSaleForm = __decorate([
    Component({
        selector: 'app-packet-sale-form',
        templateUrl: './packet-sale.form.html',
        styleUrls: ['./packet-sale.form.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        PacketValidatorService,
        ChangeDetectorRef,
        UntypedFormBuilder,
        ReferentialRefService])
], PacketSaleForm);
export { PacketSaleForm };
//# sourceMappingURL=packet-sale.form.js.map