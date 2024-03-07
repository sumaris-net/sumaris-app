import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild } from '@angular/core';
import { ExtractionFilterCriterion } from '../type/extraction-type.model';
import { UntypedFormBuilder } from '@angular/forms';
import { ReferentialForm } from '@app/referential/form/referential.form';
import { BehaviorSubject } from 'rxjs';
import { AppForm, arraySize, isNotNilOrBlank, LocalSettingsService, splitById, StatusIds } from '@sumaris-net/ngx-components';
import { debounceTime } from 'rxjs/operators';
import { ExtractionUtils } from '../common/extraction.utils';
import { ExtractionCriteriaForm } from '@app/extraction/criteria/extraction-criteria.form';
import { ExtractionProductValidatorService } from '@app/extraction/product/product.validator';
import { ProductService } from '@app/extraction/product/product.service';
import { ExtractionProduct, ProcessingFrequencyIds, ProcessingFrequencyItems } from '@app/extraction/product/product.model';
let ProductForm = class ProductForm extends AppForm {
    constructor(injector, formBuilder, settings, validatorService, service, cd) {
        super(injector, validatorService.getFormGroup());
        this.formBuilder = formBuilder;
        this.settings = settings;
        this.validatorService = validatorService;
        this.service = service;
        this.cd = cd;
        this.frequencyItems = ProcessingFrequencyItems;
        this.frequenciesById = splitById(ProcessingFrequencyItems);
        this.$sheetNames = new BehaviorSubject(undefined);
        this.$timeColumns = new BehaviorSubject(undefined);
        this.$spatialColumns = new BehaviorSubject(undefined);
        this.$aggColumns = new BehaviorSubject(undefined);
        this.$techColumns = new BehaviorSubject(undefined);
        this.aggFunctions = [
            {
                value: 'SUM',
                name: 'EXTRACTION.AGGREGATION.EDIT.AGG_FUNCTION.SUM'
            },
            {
                value: 'AVG',
                name: 'EXTRACTION.AGGREGATION.EDIT.AGG_FUNCTION.AVG'
            }
        ];
        this.showMarkdownPreview = true;
        this.$markdownContent = new BehaviorSubject(undefined);
        this.showError = true;
        this.showFilter = false;
        // Stratum
        this.stratumFormArray = this.form.controls.stratum;
        this.registerSubscription(this.form.get('documentation').valueChanges
            .pipe(debounceTime(350))
            .subscribe(md => this.$markdownContent.next(md)));
    }
    get value() {
        const json = this.form.value;
        // Re add label, because missing when field disable
        json.label = this.form.get('label').value;
        return json;
    }
    set value(value) {
        this.setValue(value);
    }
    get strataForms() {
        return this.stratumFormArray.controls;
    }
    get isSpatial() {
        return this.form.controls.isSpatial.value;
    }
    get processingFrequencyId() {
        return this.form.controls.processingFrequencyId.value;
    }
    get isManualProcessing() {
        return this.processingFrequencyId === ProcessingFrequencyIds.MANUALLY;
    }
    enable(opts) {
        super.enable(opts);
        if (!this.isSpatial) {
            this.stratumFormArray.disable();
        }
        // Keep enable, otherwise the form.getValue() will not return the isSpatial value, the product page - fix issue #382
        // this.form.get('isSpatial').disable();
    }
    updateLists(type) {
        return __awaiter(this, void 0, void 0, function* () {
            if (type) {
                this.data = type;
            }
            else if (this.data) {
                type = this.data;
            }
            else {
                return; // Skip
            }
            console.debug('[aggregation-form] Loading columns of type', type);
            // If spatial, load columns
            if (type.isSpatial || this.isSpatial) {
                const sheetNames = type.sheetNames || [];
                this.$sheetNames.next(sheetNames);
                const map = {};
                yield Promise.all(sheetNames.map(sheetName => this.service.loadColumns(type, sheetName)
                    .then(columns => {
                    columns = columns || [];
                    const columnMap = ExtractionUtils.dispatchColumns(columns);
                    Object.keys(columnMap).forEach(key => {
                        const m = map[key] || {};
                        m[sheetName] = columnMap[key];
                        map[key] = m;
                    });
                })));
                console.debug('[aggregation-type] Columns map:', map);
                this.$timeColumns.next(map.timeColumns);
                this.$spatialColumns.next(map.spatialColumns);
                this.$aggColumns.next(map.aggColumns);
                this.$techColumns.next(map.techColumns);
            }
        });
    }
    ngOnInit() {
        super.ngOnInit();
        // Set entity name (required for referential form validator)
        this.referentialForm.entityName = 'AggregationType';
        // Override status list i18n
        this.referentialForm.statusList = [
            {
                id: StatusIds.ENABLE,
                icon: 'eye',
                label: 'EXTRACTION.AGGREGATION.EDIT.STATUS_ENUM.PUBLIC'
            },
            {
                id: StatusIds.TEMPORARY,
                icon: 'eye-off',
                label: 'EXTRACTION.AGGREGATION.EDIT.STATUS_ENUM.PRIVATE'
            },
            {
                id: StatusIds.DISABLE,
                icon: 'close',
                label: 'EXTRACTION.AGGREGATION.EDIT.STATUS_ENUM.DISABLE'
            }
        ];
        this.registerSubscription(this.form.get('isSpatial').valueChanges
            .subscribe(isSpatial => {
            // Not need stratum
            if (!isSpatial) {
                this.stratumFormArray.resize(0);
                this.stratumFormArray.allowEmptyArray = true;
                this.stratumFormArray.disable();
            }
            else {
                if (this.stratumFormArray.length === 0) {
                    this.stratumFormArray.resize(1);
                }
                this.stratumFormArray.allowEmptyArray = false;
                this.stratumFormArray.enable();
                this.updateLists();
            }
        }));
    }
    ngOnDestroy() {
        super.ngOnDestroy();
        this.$sheetNames.complete();
        this.$timeColumns.complete();
        this.$spatialColumns.complete();
        this.$aggColumns.complete();
        this.$techColumns.complete();
    }
    toggleDocPreview() {
        this.showMarkdownPreview = !this.showMarkdownPreview;
        if (this.showMarkdownPreview) {
            this.markForCheck();
        }
    }
    reset(data, opts) {
        super.setValue(data || new ExtractionProduct(), opts);
    }
    setValue(data, opts) {
        const _super = Object.create(null, {
            setValue: { get: () => super.setValue }
        });
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ready();
            console.debug('[product-form] Setting value: ', data);
            // Set filter to criteria form
            this.criteriaForm.type = data;
            if ( /*!this.criteriaForm.sheetName && */(_a = data.sheetNames) === null || _a === void 0 ? void 0 : _a.length) {
                this.criteriaForm.sheetName = data.sheetNames[0];
            }
            if (data.filter) {
                const filter = (typeof data.filter === 'string') ? JSON.parse(data.filter) : data.filter;
                const criteria = ((filter === null || filter === void 0 ? void 0 : filter.criteria) || []).map(ExtractionFilterCriterion.fromObject);
                // TODO find a way to get columns, from source extraction type
                /*this.criteriaForm.columns = [<ExtractionColumn>{
                  columnName: "trip_code", type: 'integer', label: 'trip_code', name: 'trip_code'
                }];
                this.criteriaForm.waitIdle().then(() => {
                  console.debug('[product-form] Update criteria form:', criteria);
                  criteria.forEach(c => this.criteriaForm.addFilterCriterion(c));
                  this.showFilter = true;
                })*/
            }
            else {
                this.showFilter = false;
            }
            // If spatial, load columns
            if (data && data.isSpatial) {
                this.stratumFormArray.enable();
                this.stratumFormArray.allowEmptyArray = false;
                // If spatial product, make sure there is one stratum
                this.stratumFormArray.resize(Math.max(1, arraySize(data.stratum)));
            }
            else {
                this.stratumFormArray.disable();
                this.stratumFormArray.allowEmptyArray = true;
                this.stratumFormArray.resize(0);
            }
            // Show doc preview, if doc exists
            this.showMarkdownPreview = this.showMarkdownPreview && isNotNilOrBlank(data.documentation);
            _super.setValue.call(this, data, opts);
        });
    }
    removeStrata(index) {
        this.stratumFormArray.removeAt(index);
    }
    /* -- protected -- */
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], ProductForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ProductForm.prototype, "showFilter", void 0);
__decorate([
    ViewChild('referentialForm', { static: true }),
    __metadata("design:type", ReferentialForm)
], ProductForm.prototype, "referentialForm", void 0);
__decorate([
    ViewChild('criteriaForm', { static: true }),
    __metadata("design:type", ExtractionCriteriaForm)
], ProductForm.prototype, "criteriaForm", void 0);
ProductForm = __decorate([
    Component({
        selector: 'app-product-form',
        styleUrls: ['product.form.scss'],
        templateUrl: 'product.form.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        UntypedFormBuilder,
        LocalSettingsService,
        ExtractionProductValidatorService,
        ProductService,
        ChangeDetectorRef])
], ProductForm);
export { ProductForm };
//# sourceMappingURL=product.form.js.map