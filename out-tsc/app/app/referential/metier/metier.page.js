import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, ViewChild } from '@angular/core';
import { StatusIds } from '@sumaris-net/ngx-components';
import { AppReferentialEditor } from '@app/referential/form/referential-editor.class';
import { ReferentialForm } from '@app/referential/form/referential.form';
import { MetierValidatorService } from '@app/referential/metier/metier.validator';
import { MetierService } from '@app/referential/metier/metier.service';
import { Metier } from '@app/referential/metier/metier.model';
import { TaxonGroupTypeIds } from '@app/referential/services/model/taxon-group.model';
import { GearLevelIds } from '@app/referential/services/model/model.enum';
let MetierPage = class MetierPage extends AppReferentialEditor {
    constructor(injector, dataService, validatorService) {
        super(injector, Metier, dataService, validatorService.getFormGroup(), {
            entityName: Metier.ENTITY_NAME,
            uniqueLabel: true,
            withLevels: false,
            tabCount: 1,
        });
        this.registerFieldDefinition({
            key: 'gear',
            label: `REFERENTIAL.METIER.GEAR`,
            type: 'entity',
            autocomplete: {
                suggestFn: (value, filter) => this.referentialRefService.suggest(value, filter),
                filter: {
                    entityName: 'Gear',
                    statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
                    levelIds: [GearLevelIds.FAO],
                },
            },
        });
        this.registerFieldDefinition({
            key: 'taxonGroup',
            label: `REFERENTIAL.METIER.TAXON_GROUP`,
            type: 'entity',
            autocomplete: {
                suggestLengthThreshold: 2,
                suggestFn: (value, filter) => this.referentialRefService.suggest(value, filter),
                filter: {
                    entityName: 'TaxonGroup',
                    statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
                    levelIds: [TaxonGroupTypeIds.METIER_DCF_5, TaxonGroupTypeIds.METIER_NATIONAL],
                },
            },
        });
    }
    /* -- protected Metiers -- */
    registerForms() {
        this.addChildForms([this.referentialForm]);
    }
    setValue(data) {
        super.setValue(data);
    }
    onEntitySaved(data) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    getFirstInvalidTabIndex() {
        if (this.referentialForm.invalid)
            return 0;
        return -1;
    }
};
__decorate([
    ViewChild('referentialForm', { static: true }),
    __metadata("design:type", ReferentialForm)
], MetierPage.prototype, "referentialForm", void 0);
MetierPage = __decorate([
    Component({
        selector: 'app-metier',
        templateUrl: 'metier.page.html',
        styleUrls: ['metier.page.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector, MetierService, MetierValidatorService])
], MetierPage);
export { MetierPage };
//# sourceMappingURL=metier.page.js.map