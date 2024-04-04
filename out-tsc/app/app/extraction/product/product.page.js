import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, ViewChild } from '@angular/core';
import { ExtractionCategories, ExtractionFilter } from '../type/extraction-type.model';
import { UntypedFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { ValidatorService } from '@e-is/ngx-material-table';
import { AccountService, Alerts, AppEntityEditor, equals, isEmptyArray, isNil, isNotNil, LocalSettingsService, Toasts, } from '@sumaris-net/ngx-components';
import { ProductForm } from './product.form';
import { ExtractionProduct } from '@app/extraction/product/product.model';
import { ExtractionProductValidatorService } from '@app/extraction/product/product.validator';
import { ProductService } from '@app/extraction/product/product.service';
import { ExtractionTablePage } from '@app/extraction/table/extraction-table.page';
import { debounceTime, filter } from 'rxjs/operators';
import { environment } from '@environments/environment';
export const ProductPageTabs = {
    GENERAL: 0,
    DATASOURCE: 1,
    RESULT: 2,
};
let ProductPage = class ProductPage extends AppEntityEditor {
    constructor(injector, router, formBuilder, productService, accountService, validatorService, settings) {
        super(injector, ExtractionProduct, 
        // Data service
        {
            load: (id, options) => productService.load(id, options),
            canUserWrite: (data, opts) => productService.canUserWrite(data, opts),
            save: (data, _) => productService.save(data),
            delete: (data, _) => productService.deleteAll([data]),
            listenChanges: (id, opts) => productService.listenChanges(id, opts)
        }, 
        // Editor options
        {
            pathIdAttribute: 'productId',
            tabCount: 3
        });
        this.injector = injector;
        this.router = router;
        this.formBuilder = formBuilder;
        this.productService = productService;
        this.accountService = accountService;
        this.validatorService = validatorService;
        this.settings = settings;
        this.debug = !environment.production;
    }
    get form() {
        return this.productForm.form;
    }
    ngOnInit() {
        super.ngOnInit();
        this.registerSubscription(this.datasourceTable.filterChanges
            .pipe(filter(_ => !this.loading && !this.saving), debounceTime(450))
            .subscribe((filter) => {
            var _a;
            const json = filter.asObject({ minify: true });
            const filterControl = this.form.get('filter');
            const previousJson = (_a = ExtractionFilter.fromObject(filterControl === null || filterControl === void 0 ? void 0 : filterControl.value)) === null || _a === void 0 ? void 0 : _a.asObject({ minify: true });
            if (!equals(json, previousJson)) {
                this.form.patchValue({ filter: json });
                this.markAsDirty();
            }
        }));
    }
    enable(opts) {
        super.enable(opts);
        // Label always disable is saved
        if (!this.isNewData) {
            this.form.get('label').disable();
        }
    }
    openMap(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.dirty) {
                // Ask user confirmation
                const { confirmed, save } = yield Alerts.askSaveBeforeAction(this.alertCtrl, this.translate);
                if (!confirmed)
                    return;
                if (save)
                    yield this.save(event);
            }
            if (!this.data || isEmptyArray(this.data.stratum))
                return; // Unable to load the map
            return setTimeout(() => 
            // open the map
            this.router.navigate(['../../map'], {
                relativeTo: this.route,
                queryParams: {
                    category: this.data.category,
                    label: this.data.label,
                    sheet: this.data.stratum[0].sheetName
                }
            }), 200); // Add a delay need by matTooltip to be hide
        });
    }
    updateProduct(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.dirty) {
                // Ask user confirmation
                const { confirmed, save } = yield Alerts.askSaveBeforeAction(this.alertCtrl, this.translate, { valid: this.valid });
                if (!confirmed)
                    return;
                if (save)
                    yield this.save(event);
            }
            this.markAsLoading();
            try {
                const updatedEntity = yield this.productService.updateProduct(this.data.id);
                yield this.onEntityLoaded(updatedEntity);
                yield this.updateView(updatedEntity);
                Toasts.show(this.toastController, this.translate, {
                    type: 'info',
                    message: 'EXTRACTION.PRODUCT.INFO.UPDATED_SUCCEED'
                });
            }
            catch (err) {
                this.setError(err);
            }
            finally {
                this.markAsLoaded();
            }
            // Switch to result tab
            if (!this.data.isSpatial) {
                this.selectedTabIndex = ProductPageTabs.RESULT;
            }
        });
    }
    /* -- protected -- */
    setValue(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Apply data to form
            yield this.productForm.setValue(data.asObject());
            yield this.initDatasourceTable(data);
            if (!data.isSpatial) {
                yield this.initResultTable(data);
            }
        });
    }
    initDatasourceTable(data) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            // Apply to table
            try {
                let sourceTypeId;
                if (isNotNil(data.parentId)) {
                    sourceTypeId = data.parentId;
                }
                else {
                    yield this.datasourceTable.ready();
                    const types = this.datasourceTable.types;
                    // Resolve by format + version
                    const format = ((_a = data.format) === null || _a === void 0 ? void 0 : _a.startsWith('AGG_')) ? data.format.substring(4) : data.format;
                    sourceTypeId = (_b = types.find(t => t.format === format && t.version === data.version)) === null || _b === void 0 ? void 0 : _b.id;
                    // Or resolve by format only, if not found
                    if (isNil(sourceTypeId)) {
                        sourceTypeId = (_c = types.find(t => t.format === format)) === null || _c === void 0 ? void 0 : _c.id;
                    }
                    // Types not found: stop here
                    if (isNil(sourceTypeId)) {
                        console.warn(`[product] Unknown datasource type: unable to find the format '${data.format}' in types [${types.join(',')}]`);
                        this.datasourceTable.markAsLoaded();
                        return;
                    }
                }
                const filter = data.filter || (data.filterContent && JSON.parse(data.filterContent));
                // Load data
                yield this.datasourceTable.load(sourceTypeId, { filter,
                    // Should load data, if current tab
                    emitEvent: this.selectedTabIndex === ProductPageTabs.DATASOURCE
                });
            }
            catch (err) {
                console.error(err);
            }
        });
    }
    initResultTable(data) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            this.resultTable.types = [data];
            // Apply to table
            try {
                yield this.resultTable.load(data.id, {
                    filter: {
                        sheetName: (_a = data.sheetNames) === null || _a === void 0 ? void 0 : _a[0]
                    },
                    // Should load data, if current tab
                    emitEvent: this.selectedTabIndex === ProductPageTabs.RESULT
                });
            }
            catch (err) {
                console.error(err);
            }
        });
    }
    onTabChange(event, queryTabIndexParamName) {
        // If changed to dataset tab, make sure table has been loaded
        switch (event === null || event === void 0 ? void 0 : event.index) {
            case ProductPageTabs.DATASOURCE:
                this.datasourceTable.onRefresh.emit();
                break;
            case ProductPageTabs.RESULT:
                this.resultTable.onRefresh.emit();
                break;
        }
        return super.onTabChange(event, queryTabIndexParamName);
    }
    getValue() {
        const _super = Object.create(null, {
            getValue: { get: () => super.getValue }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield _super.getValue.call(this);
            // Re add label, because missing when field disable
            data.label = this.form.get('label').value;
            // Re add columns
            data.columns = this.columns;
            // Set default strata
            if (data.isSpatial) {
                (data.stratum || []).forEach((strata, index) => strata.isDefault = index === 0);
            }
            else {
                // No strata is not a spatial product
                data.stratum = null;
            }
            // Update filter
            data.filter = this.datasourceTable.getFilterValue();
            return data;
        });
    }
    computeTitle(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // new data
            if (!data || isNil(data.id)) {
                return yield this.translate.get('EXTRACTION.AGGREGATION.NEW.TITLE').toPromise();
            }
            // Existing data
            return yield this.translate.get('EXTRACTION.AGGREGATION.EDIT.TITLE', data).toPromise();
        });
    }
    computePageHistory(title) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.debug('[entity-editor] Computing page history, using url: ' + this.router.url);
            return {
                title,
                subtitle: this.translate.instant('EXTRACTION.TYPES_MENU.PRODUCT_DIVIDER'),
                icon: 'cloud-download-outline',
                path: `/extraction/product/${this.data.id}`
            };
        });
    }
    getFirstInvalidTabIndex() {
        return 0;
    }
    registerForms() {
        this.addChildForm(this.productForm);
        //this.addChildForm(this.datasourceTable);
    }
    onNewEntity(data, options) {
        const _super = Object.create(null, {
            onNewEntity: { get: () => super.onNewEntity }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.onNewEntity.call(this, data, options);
            this.markAsReady();
        });
    }
    onEntityLoaded(data, options) {
        const _super = Object.create(null, {
            onEntityLoaded: { get: () => super.onEntityLoaded }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.onEntityLoaded.call(this, data, options);
            yield this.productForm.updateLists(data);
            // Define default back link
            this.defaultBackHref = `̀/extraction/data?category=${ExtractionCategories.PRODUCT}&label=${data.label}`;
            this.markAsReady();
        });
    }
    onEntityDeleted(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Change back href
            this.defaultBackHref = '/extraction/data';
        });
    }
};
__decorate([
    ViewChild('productForm', { static: true }),
    __metadata("design:type", ProductForm)
], ProductPage.prototype, "productForm", void 0);
__decorate([
    ViewChild('datasourceTable', { static: true }),
    __metadata("design:type", ExtractionTablePage)
], ProductPage.prototype, "datasourceTable", void 0);
__decorate([
    ViewChild('resultTable', { static: true }),
    __metadata("design:type", ExtractionTablePage)
], ProductPage.prototype, "resultTable", void 0);
ProductPage = __decorate([
    Component({
        selector: 'app-product-page',
        templateUrl: './product.page.html',
        styleUrls: ['./product.page.scss'],
        providers: [
            { provide: ValidatorService, useExisting: ExtractionProductValidatorService }
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        Router,
        UntypedFormBuilder,
        ProductService,
        AccountService,
        ExtractionProductValidatorService,
        LocalSettingsService])
], ProductPage);
export { ProductPage };
//# sourceMappingURL=product.page.js.map