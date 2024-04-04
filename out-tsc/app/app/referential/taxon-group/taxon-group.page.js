import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, ViewChild } from '@angular/core';
import { isNotNil, joinPropertiesPath, Referential } from '@sumaris-net/ngx-components';
import { ReferentialService } from '@app/referential/services/referential.service';
import { RoundWeightConversionTable } from '@app/referential/taxon-group/round-weight-conversion/round-weight-conversion.table';
import { TaxonGroupValidatorService } from '@app/referential/taxon-group/taxon-group.validator';
import { AppReferentialEditor } from '@app/referential/form/referential-editor.class';
import { ReferentialForm } from '@app/referential/form/referential.form';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
let TaxonGroupPage = class TaxonGroupPage extends AppReferentialEditor {
    constructor(injector, dataService, validatorService) {
        super(injector, Referential, dataService, validatorService.getFormGroup(), {
            entityName: TaxonGroupRef.ENTITY_NAME,
            uniqueLabel: false,
            withLevels: true,
            tabCount: 2,
        });
    }
    ngOnInit() {
        super.ngOnInit();
        // Set entity name (required for referential form validator)
        this.referentialForm.entityName = TaxonGroupRef.ENTITY_NAME;
        const autocompleteConfig = {
            suggestFn: (value, opts) => this.referentialRefService.suggest(value, opts),
            displayWith: (value) => value && joinPropertiesPath(value, ['label', 'name']),
            attributes: ['label', 'name'],
            columnSizes: [6, 6],
        };
        this.registerFieldDefinition({
            key: 'level',
            label: `REFERENTIAL.TAXON_GROUP.TAXON_GROUP_TYPE`,
            type: 'entity',
            autocomplete: {
                items: this.$levels,
                displayWith: (value) => value && joinPropertiesPath(value, ['label', 'name']),
                attributes: ['label', 'name'],
                columnSizes: [6, 6],
            },
        });
        this.registerFieldDefinition({
            key: 'parent',
            label: `REFERENTIAL.TAXON_GROUP.PARENT`,
            type: 'entity',
            autocomplete: Object.assign(Object.assign({}, autocompleteConfig), { filter: { entityName: 'TaxonGroup', statusIds: [0, 1] } }),
        });
    }
    /* -- protected methods -- */
    registerForms() {
        this.addChildForms([this.referentialForm, this.rwcTable]);
    }
    setValue(data) {
        super.setValue(data);
        // Set table filter
        if (isNotNil(data === null || data === void 0 ? void 0 : data.id)) {
            this.rwcTable.setFilter({
                taxonGroupId: data.id,
            });
            this.rwcTable.markAsReady();
        }
    }
    onEntitySaved(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Save table
            if (this.rwcTable.dirty) {
                yield this.rwcTable.save();
            }
        });
    }
    getFirstInvalidTabIndex() {
        if (this.referentialForm.invalid)
            return 0;
        if (this.rwcTable.invalid)
            return 1;
        return -1;
    }
};
__decorate([
    ViewChild('referentialForm', { static: true }),
    __metadata("design:type", ReferentialForm)
], TaxonGroupPage.prototype, "referentialForm", void 0);
__decorate([
    ViewChild('rwcTable', { static: true }),
    __metadata("design:type", RoundWeightConversionTable)
], TaxonGroupPage.prototype, "rwcTable", void 0);
TaxonGroupPage = __decorate([
    Component({
        selector: 'app-taxon-group',
        templateUrl: 'taxon-group.page.html',
        styleUrls: ['taxon-group.page.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector, ReferentialService, TaxonGroupValidatorService])
], TaxonGroupPage);
export { TaxonGroupPage };
//# sourceMappingURL=taxon-group.page.js.map