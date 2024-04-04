import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, Input } from '@angular/core';
import { AccountService, isNotNil, PlatformService, referentialToString } from '@sumaris-net/ngx-components';
import { UntypedFormBuilder } from '@angular/forms';
import { MetierService } from '@app/referential/services/metier.service';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { OperationGroupValidatorService } from '@app/trip/operationgroup/operation-group.validator';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
let OperationGroupForm = class OperationGroupForm extends MeasurementValuesForm {
    constructor(injector, measurementsValidatorService, formBuilder, programRefService, platform, validatorService, referentialRefService, metierService, accountService) {
        super(injector, measurementsValidatorService, formBuilder, programRefService, validatorService.getFormGroup(null, {
            withMeasurements: false
        }));
        this.measurementsValidatorService = measurementsValidatorService;
        this.formBuilder = formBuilder;
        this.programRefService = programRefService;
        this.platform = platform;
        this.validatorService = validatorService;
        this.referentialRefService = referentialRefService;
        this.metierService = metierService;
        this.accountService = accountService;
        this.showComment = true;
        this.showError = true;
        this.referentialToString = referentialToString;
        // Set defaults
        this.acquisitionLevel = AcquisitionLevelCodes.OPERATION;
        this.debug = !environment.production;
    }
    ;
    ngOnInit() {
        var _a;
        super.ngOnInit();
        // Default values
        this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;
        // From data
        this.gear = (_a = this.data.metier) === null || _a === void 0 ? void 0 : _a.gear;
        this.metier = this.data.metier;
        this.displayAttributes = {
            gear: this.settings.getFieldDisplayAttributes('gear'),
            taxonGroup: ['taxonGroup.label', 'taxonGroup.name']
        };
        // Metier combo
        const metierAttributes = this.settings.getFieldDisplayAttributes('metier');
        this.registerAutocompleteField('metier', {
            items: this.metiers,
            attributes: metierAttributes,
            columnSizes: metierAttributes.map(attr => attr === 'label' ? 3 : undefined),
            mobile: this.mobile
        });
        this.registerSubscription(this.form.get('metier').valueChanges
            .subscribe(metier => this.updateGearAndTargetSpecies(metier)));
    }
    updateGearAndTargetSpecies(metier) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[operation-group.form] Update Gear and Target Species', metier);
            if (metier && metier.id) {
                this.data.metier = yield this.metierService.load(metier.id);
                this.metier = this.data.metier;
                console.debug('[operation-group.form] Taxon group : ', this.metier.taxonGroup);
                if (this.data.physicalGearId !== this.data.metier.gear.id) {
                    this.data.physicalGearId = this.data.physicalGearId || null;
                    this.gear = this.data.metier.gear;
                }
            }
        });
    }
    /* -- protected methods -- */
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Number)
], OperationGroupForm.prototype, "tabindex", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationGroupForm.prototype, "showComment", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationGroupForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationGroupForm.prototype, "metiers", void 0);
OperationGroupForm = __decorate([
    Component({
        selector: 'app-operation-group-form',
        templateUrl: './operation-group.form.html',
        styleUrls: ['./operation-group.form.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        MeasurementsValidatorService,
        UntypedFormBuilder,
        ProgramRefService,
        PlatformService,
        OperationGroupValidatorService,
        ReferentialRefService,
        MetierService,
        AccountService])
], OperationGroupForm);
export { OperationGroupForm };
//# sourceMappingURL=operation-group.form.js.map