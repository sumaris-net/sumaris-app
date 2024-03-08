import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, ViewChild } from '@angular/core';
import { isNotNil, joinPropertiesPath } from '@sumaris-net/ngx-components';
import { TaxonName } from '../services/model/taxon-name.model';
import { TaxonNameService } from '../services/taxon-name.service';
import { TaxonNameValidatorService } from '../services/validator/taxon-name.validator';
import { WeightLengthConversionTable } from '@app/referential/taxon-name/weight-length-conversion/weight-length-conversion.table';
import { AppReferentialEditor } from '@app/referential/form/referential-editor.class';
import { ReferentialForm } from '@app/referential/form/referential.form';
let TaxonNamePage = class TaxonNamePage extends AppReferentialEditor {
    constructor(injector, dataService, validatorService) {
        super(injector, TaxonName, dataService, validatorService.getFormGroup(), {
            entityName: TaxonName.ENTITY_NAME,
            tabCount: 2,
        });
        this.injector = injector;
    }
    get useExistingReferenceTaxon() {
        return this.form.controls.useExistingReferenceTaxon.value;
    }
    ngOnInit() {
        super.ngOnInit();
        const autocompleteConfig = {
            suggestFn: (value, opts) => this.referentialRefService.suggest(value, opts),
            displayWith: (value) => value && joinPropertiesPath(value, ['label', 'name']),
            attributes: ['label', 'name'],
            columnSizes: [6, 6],
        };
        this.registerFieldDefinition({
            key: 'parentTaxonName',
            label: `REFERENTIAL.TAXON_NAME.PARENT`,
            type: 'entity',
            autocomplete: Object.assign(Object.assign({}, autocompleteConfig), { filter: { entityName: 'TaxonName', statusIds: [0, 1] } }),
        });
        this.registerFieldDefinition({
            key: `taxonomicLevel`,
            label: `REFERENTIAL.TAXON_NAME.TAXONOMIC_LEVEL`,
            type: 'entity',
            autocomplete: Object.assign(Object.assign({}, autocompleteConfig), { filter: { entityName: 'TaxonomicLevel' } }),
        });
        this.registerFieldDefinition({
            key: `isReferent`,
            label: `REFERENTIAL.TAXON_NAME.IS_REFERENT`,
            type: 'boolean',
        });
        this.registerFieldDefinition({
            key: `isNaming`,
            label: `REFERENTIAL.TAXON_NAME.IS_NAMING`,
            type: 'boolean',
        });
        this.registerFieldDefinition({
            key: `isVirtual`,
            label: `REFERENTIAL.TAXON_NAME.IS_VIRTUAL`,
            type: 'boolean',
        });
    }
    enable() {
        //When reload after save new Taxon name, super.enable() set referenceTaxonId to null, that why we save the value before.
        const referenceTaxonId = this.form.get('referenceTaxonId').value;
        super.enable();
        if (!this.isNewData) {
            this.form.get('referenceTaxonId').setValue(referenceTaxonId);
            this.form.get('referenceTaxonId').disable();
        }
    }
    /* -- protected methods -- */
    registerForms() {
        this.addChildForms([this.referentialForm, this.wlcTable]);
    }
    setValue(data) {
        if (!data)
            return; // Skip
        super.setValue(data);
        // Set table's filter
        if (isNotNil(data.referenceTaxonId)) {
            this.wlcTable.setFilter({
                referenceTaxonId: data.referenceTaxonId,
            });
            this.wlcTable.markAsReady();
        }
    }
    getValue() {
        const _super = Object.create(null, {
            getValue: { get: () => super.getValue }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield _super.getValue.call(this);
            // Re add reference taxon (field can be disabled)
            data.referenceTaxonId = this.form.get('referenceTaxonId').value;
            return data;
        });
    }
    onEntitySaved(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Save table
            if (this.wlcTable.dirty) {
                yield this.wlcTable.save();
            }
        });
    }
    getFirstInvalidTabIndex() {
        if (this.referentialForm.invalid)
            return 0;
        if (this.wlcTable.invalid)
            return 1;
        return -1;
    }
    onNewEntity(data, options) {
        const _super = Object.create(null, {
            onNewEntity: { get: () => super.onNewEntity }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // Check Reference Taxon exists
            this.form.get('referenceTaxonId').setAsyncValidators((control) => __awaiter(this, void 0, void 0, function* () {
                const useExistingReferenceTaxon = this.form.get('useExistingReferenceTaxon').value;
                if (this.isNewData && useExistingReferenceTaxon) {
                    const referenceTaxon = control.enabled && control.value;
                    if (!referenceTaxon) {
                        return { required: true };
                    }
                    else if (!(yield this.dataService.referenceTaxonExists(referenceTaxon))) {
                        return { not_exist: true };
                    }
                }
                return null;
            }));
            this.form.get('useExistingReferenceTaxon').setAsyncValidators((control) => __awaiter(this, void 0, void 0, function* () {
                const useExistingReferenceTaxon = this.form.controls['useExistingReferenceTaxon'].value;
                if (useExistingReferenceTaxon) {
                    this.form.get('referenceTaxonId').updateValueAndValidity();
                }
                else {
                    this.form.get('referenceTaxonId').setValue(null);
                }
                return null;
            }));
            yield _super.onNewEntity.call(this, data, options);
        });
    }
};
__decorate([
    ViewChild('referentialForm', { static: true }),
    __metadata("design:type", ReferentialForm)
], TaxonNamePage.prototype, "referentialForm", void 0);
__decorate([
    ViewChild('wlcTable', { static: true }),
    __metadata("design:type", WeightLengthConversionTable)
], TaxonNamePage.prototype, "wlcTable", void 0);
TaxonNamePage = __decorate([
    Component({
        selector: 'app-taxon-name',
        templateUrl: 'taxon-name.page.html',
        styleUrls: ['taxon-name.page.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector, TaxonNameService, TaxonNameValidatorService])
], TaxonNamePage);
export { TaxonNamePage };
//# sourceMappingURL=taxon-name.page.js.map