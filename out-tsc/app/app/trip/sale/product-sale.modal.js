import { __awaiter, __decorate, __metadata } from "tslib";
import { Component, Injector, Input, ViewChild } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { AppEntityEditorModal, referentialToString } from '@sumaris-net/ngx-components';
import { ProductSaleForm } from './product-sale.form';
import { Product } from '../product/product.model';
import { TranslateService } from '@ngx-translate/core';
import { distinctUntilChanged } from 'rxjs/operators';
let ProductSaleModal = class ProductSaleModal extends AppEntityEditorModal {
    constructor(injector, viewCtrl, alertCtrl, translate) {
        super(injector, Product, {
            tabCount: 1
        });
        this.viewCtrl = viewCtrl;
        this.alertCtrl = alertCtrl;
        this.translate = translate;
        this.referentialToString = referentialToString;
    }
    get form() {
        return this.productSaleForm.form;
    }
    saveAndClose(event) {
        return super.saveAndClose(event);
    }
    registerForms() {
        this.addChildForm(this.productSaleForm);
    }
    ngOnInit() {
        const _super = Object.create(null, {
            ngOnInit: { get: () => super.ngOnInit }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.ngOnInit.call(this);
            this.productSaleForm.markAsReady();
            const formArray = this.productSaleForm.form.get('saleProducts');
            formArray.statusChanges
                .pipe(distinctUntilChanged())
                .subscribe((status) => {
                const control = formArray.at(0);
                console.log('saleProducts.dirty=' + control.enabled, control);
            });
        });
    }
    ngOnDestroy() {
        super.ngOnDestroy();
    }
    setValue(data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.productSaleForm.setValue(Product.fromObject(data));
        });
    }
    getJsonValueToSave() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.productSaleForm.value;
        });
    }
    computeTitle(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.translate.instant('TRIP.PRODUCT.SALE.TITLE', { taxonGroupLabel: referentialToString(data.taxonGroup) });
        });
    }
    getFirstInvalidTabIndex() {
        return 0;
    }
};
__decorate([
    ViewChild('productSaleForm', { static: true }),
    __metadata("design:type", ProductSaleForm)
], ProductSaleModal.prototype, "productSaleForm", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], ProductSaleModal.prototype, "productSalePmfms", void 0);
ProductSaleModal = __decorate([
    Component({
        selector: 'app-product-sale-modal',
        templateUrl: './product-sale.modal.html'
    }),
    __metadata("design:paramtypes", [Injector,
        ModalController,
        AlertController,
        TranslateService])
], ProductSaleModal);
export { ProductSaleModal };
//# sourceMappingURL=product-sale.modal.js.map