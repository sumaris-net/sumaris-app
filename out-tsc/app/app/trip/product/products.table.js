import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, Input } from '@angular/core';
import { filterNotNil, InMemoryEntitiesService, isNotEmptyArray, LocalSettingsService, referentialToString, } from '@sumaris-net/ngx-components';
import { BaseMeasurementsTable } from '@app/data/measurement/measurements-table.class';
import { ProductValidatorService } from './product.validator';
import { Product, ProductFilter } from './product.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { BehaviorSubject } from 'rxjs';
import { ProductSaleModal } from '../sale/product-sale.modal';
import { SaleProductUtils } from '../sale/sale-product.model';
import { environment } from '@environments/environment';
import { SamplesModal } from '../sample/samples.modal';
import { ProductModal } from '@app/trip/product/product.modal';
import { mergeMap } from 'rxjs/operators';
import moment from 'moment';
export const PRODUCT_RESERVED_START_COLUMNS = ['parent', 'saleType', 'taxonGroup', 'weight', 'individualCount'];
export const PRODUCT_RESERVED_END_COLUMNS = []; // ['comments']; // todo
let ProductsTable = class ProductsTable extends BaseMeasurementsTable {
    constructor(injector, settings, dataService, validatorService) {
        super(injector, Product, ProductFilter, dataService, validatorService, {
            suppressErrors: true,
            reservedStartColumns: PRODUCT_RESERVED_START_COLUMNS,
            reservedEndColumns: settings.mobile ? [] : PRODUCT_RESERVED_END_COLUMNS,
            i18nColumnPrefix: 'TRIP.PRODUCT.LIST.'
        });
        this.showIdColumn = true;
        this.showActionButtons = true;
        this.useSticky = false;
        this.autoLoad = false; // waiting parent to be loaded
        this.inlineEdition = this.validatorService && !this.mobile;
        this.confirmBeforeDelete = true;
        this.defaultPageSize = -1; // Do not use paginator
        // Set default acquisition level
        this.acquisitionLevel = AcquisitionLevelCodes.PRODUCT;
        this.defaultSortBy = 'id';
        this.defaultSortDirection = 'asc';
        // FOR DEV ONLY ----
        this.debug = !environment.production;
    }
    set showParent(value) {
        this.setShowColumn('parent', value);
    }
    get showParent() {
        return this.getShowColumn('parent');
    }
    set showSaleType(value) {
        this.setShowColumn('saleType', value);
    }
    get showSaleType() {
        return this.getShowColumn('saleType');
    }
    set parentFilter(productFilter) {
        this.setFilter(productFilter);
    }
    set value(data) {
        this.memoryDataService.value = data;
    }
    get value() {
        return this.memoryDataService.value;
    }
    ngOnInit() {
        super.ngOnInit();
        if (this.showParent && this.parentAttributes) {
            this.registerAutocompleteField('parent', {
                items: this.$parents,
                attributes: this.parentAttributes,
                columnNames: ['RANK_ORDER', 'REFERENTIAL.LABEL', 'REFERENTIAL.NAME'],
                columnSizes: this.parentAttributes.map(attr => attr === 'metier.label' ? 3 : (attr === 'rankOrderOnPeriod' ? 1 : undefined)),
                mobile: this.mobile
            });
        }
        const taxonGroupAttributes = this.settings.getFieldDisplayAttributes('taxonGroup');
        this.registerAutocompleteField('taxonGroup', {
            suggestFn: (value, options) => this.suggestTaxonGroups(value, options),
            columnSizes: taxonGroupAttributes.map(attr => attr === 'label' ? 3 : undefined),
            mobile: this.mobile
        });
        this.registerSubscription(filterNotNil(this.pmfms$)
            // if main pmfms are loaded, then other pmfm can be loaded
            .pipe(mergeMap(() => this.programRefService.loadProgramPmfms(this.programLabel, { acquisitionLevel: AcquisitionLevelCodes.PRODUCT_SALE })))
            .subscribe((productSalePmfms) => {
            this.productSalePmfms = productSalePmfms;
        }));
        this.registerSubscription(this.onStartEditingRow.subscribe(row => this.onStartEditProduct(row)));
    }
    confirmEditCreate(event, row) {
        row = row || this.editedRow;
        const confirmed = super.confirmEditCreate(event, row);
        if (confirmed && row) {
            // update sales if any
            if (isNotEmptyArray(row.currentData.saleProducts)) {
                const updatedSaleProducts = SaleProductUtils.updateSaleProducts(row.currentData, this.productSalePmfms);
                row.validator.patchValue({ saleProducts: updatedSaleProducts }, { emitEvent: true });
            }
        }
        return confirmed;
    }
    openProductSale(event, row) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event)
                event.stopPropagation();
            const modal = yield this.modalCtrl.create({
                component: ProductSaleModal,
                componentProps: {
                    disabled: this.disabled,
                    mobile: this.mobile,
                    data: row.currentData,
                    productSalePmfms: this.productSalePmfms
                },
                backdropDismiss: false,
                cssClass: 'modal-large'
            });
            yield modal.present();
            const { data } = yield modal.onDidDismiss();
            if (data) {
                // patch saleProducts only
                row.validator.patchValue({ saleProducts: data.saleProducts }, { emitEvent: true });
                this.markAsDirty({ emitEvent: false });
                this.markForCheck();
            }
        });
    }
    openSampling(event, row) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event)
                event.stopPropagation();
            if (row.editing) {
                const confirmed = yield this.confirmEditCreate(event, row);
                if (!confirmed)
                    return; // skip
            }
            const samples = row.currentData.samples || [];
            const taxonGroup = row.currentData.taxonGroup;
            const title = yield this.translate.get('TRIP.SAMPLE.EDIT.TITLE', { label: referentialToString(taxonGroup) }).toPromise();
            const modal = yield this.modalCtrl.create({
                component: SamplesModal,
                componentProps: {
                    programLabel: this.programLabel,
                    disabled: this.disabled,
                    data: samples,
                    defaultSampleDate: moment(),
                    defaultTaxonGroup: taxonGroup,
                    showLabel: false,
                    showTaxonGroup: false,
                    showTaxonName: false,
                    title
                    // onReady: (obj) => this.onInitForm && this.onInitForm.emit({form: obj.form.form, pmfms: obj.$pmfms.getValue()})
                },
                backdropDismiss: false,
                keyboardClose: true
            });
            // Open the modal
            yield modal.present();
            // Wait until closed
            const res = yield modal.onDidDismiss();
            if (res === null || res === void 0 ? void 0 : res.data) {
                if (this.debug)
                    console.debug('[products-table] Modal result: ', res.data);
                // patch samples only
                row.validator.patchValue({ samples: res === null || res === void 0 ? void 0 : res.data }, { emitEvent: true });
                this.markAsDirty({ emitEvent: false });
                this.markForCheck();
            }
        });
    }
    openNewRowDetail() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.allowRowDetail || this.readOnly)
                return false;
            const { data, role } = yield this.openDetailModal();
            if (data && role !== 'delete') {
                const row = yield this.addEntityToTable(data);
                // Redirect to another modal
                if (role === 'sampling') {
                    yield this.openSampling(null, row);
                }
                else if (role === 'sale') {
                    yield this.openProductSale(null, row);
                }
            }
            return true;
        });
    }
    openRow(id, row) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.allowRowDetail || this.readOnly)
                return false;
            const entity = this.toEntity(row, true);
            const { data, role } = yield this.openDetailModal(entity);
            if (data && role !== 'delete') {
                yield this.updateEntityToTable(data, row, { confirmEdit: false });
            }
            else {
                this.editedRow = null;
            }
            if (role) {
                if (role === 'sampling') {
                    yield this.openSampling(null, row);
                }
                else if (role === 'sale') {
                    yield this.openProductSale(null, row);
                }
            }
            return true;
        });
    }
    openDetailModal(dataToOpen) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const isNew = !dataToOpen && true;
            if (isNew) {
                dataToOpen = new this.dataType();
                yield this.onNewEntity(dataToOpen);
                if ((_a = this.filter) === null || _a === void 0 ? void 0 : _a.parent) {
                    dataToOpen.parent = this.filter.parent;
                }
                else if (((_b = this.$parents.value) === null || _b === void 0 ? void 0 : _b.length) === 1) {
                    dataToOpen.parent = this.$parents.value[0];
                }
            }
            this.markAsLoading();
            const modal = yield this.modalCtrl.create({
                component: ProductModal,
                componentProps: {
                    programLabel: this.programLabel,
                    acquisitionLevel: this.acquisitionLevel,
                    data: dataToOpen,
                    parents: this.$parents.value || null,
                    parentAttributes: this.parentAttributes,
                    disabled: this.disabled,
                    mobile: this.mobile,
                    isNew,
                    onDelete: (event, data) => this.deleteEntity(event, data)
                },
                cssClass: 'modal-large',
                keyboardClose: true
            });
            // Open the modal
            yield modal.present();
            // Wait until closed
            const { data, role } = yield modal.onDidDismiss();
            if (data && this.debug)
                console.debug('[product-table] product modal result: ', data, role);
            this.markAsLoaded();
            return { data: data ? data : undefined, role };
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
    onStartEditProduct(row) {
        var _a, _b;
        if (row.currentData && !row.currentData.parent) {
            if ((_a = this.filter) === null || _a === void 0 ? void 0 : _a.parent) {
                row.validator.patchValue({ parent: this.filter.parent });
            }
            else if (((_b = this.$parents.value) === null || _b === void 0 ? void 0 : _b.length) === 1) {
                row.validator.patchValue({ parent: this.$parents.value[0] });
            }
        }
    }
};
__decorate([
    Input(),
    __metadata("design:type", BehaviorSubject)
], ProductsTable.prototype, "$parents", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], ProductsTable.prototype, "parentAttributes", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ProductsTable.prototype, "showIdColumn", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ProductsTable.prototype, "showActionButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ProductsTable.prototype, "useSticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], ProductsTable.prototype, "showParent", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], ProductsTable.prototype, "showSaleType", null);
__decorate([
    Input(),
    __metadata("design:type", ProductFilter),
    __metadata("design:paramtypes", [ProductFilter])
], ProductsTable.prototype, "parentFilter", null);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], ProductsTable.prototype, "value", null);
ProductsTable = __decorate([
    Component({
        selector: 'app-products-table',
        templateUrl: 'products.table.html',
        styleUrls: ['products.table.scss'],
        providers: [
            {
                provide: InMemoryEntitiesService,
                useFactory: () => new InMemoryEntitiesService(Product, ProductFilter, {
                    equals: Product.equals
                })
            }
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        LocalSettingsService,
        InMemoryEntitiesService,
        ProductValidatorService])
], ProductsTable);
export { ProductsTable };
//# sourceMappingURL=products.table.js.map