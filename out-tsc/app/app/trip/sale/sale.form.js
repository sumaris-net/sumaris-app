import { __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { SaleValidatorService } from './sale.validator';
import { AppForm, referentialToString, toNumber } from '@sumaris-net/ngx-components';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { LocationLevelIds } from '@app/referential/services/model/model.enum';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
let SaleForm = class SaleForm extends AppForm {
    constructor(injector, validatorService, vesselSnapshotService, referentialRefService, cd) {
        super(injector, validatorService.getFormGroup());
        this.validatorService = validatorService;
        this.vesselSnapshotService = vesselSnapshotService;
        this.referentialRefService = referentialRefService;
        this.cd = cd;
        this._minDate = null;
        this.required = true;
        this.showError = true;
        this.showVessel = true;
        this.showEndDateTime = true;
        this.showComment = true;
        this.showButtons = true;
        this.referentialToString = referentialToString;
    }
    set minDate(value) {
        if (value && (!this._minDate || !this._minDate.isSame(value))) {
            this._minDate = value;
            if (!this.loading)
                this.updateFormGroup();
        }
    }
    get empty() {
        const value = this.value;
        return ((!value.saleLocation || !value.saleLocation.id) &&
            !value.startDateTime &&
            !value.endDateTime &&
            (!value.saleType || !value.saleType.id) &&
            (!value.comments || !value.comments.length));
    }
    get valid() {
        return this.form && (this.required ? this.form.valid : this.form.valid || this.empty);
    }
    ngOnInit() {
        super.ngOnInit();
        // Set defaults
        this.tabindex = toNumber(this.tabindex, 0);
        // Combo: vessels (if need)
        if (this.showVessel) {
            // Combo: vessels
            this.vesselSnapshotService.getAutocompleteFieldOptions().then((opts) => this.registerAutocompleteField('vesselSnapshot', opts));
        }
        else {
            this.form.get('vesselSnapshot').clearValidators();
        }
        // Combo: sale locations
        this.registerAutocompleteField('location', {
            service: this.referentialRefService,
            filter: {
                entityName: 'Location',
                levelId: LocationLevelIds.PORT,
            },
        });
        // Combo: sale types
        this.registerAutocompleteField('saleType', {
            service: this.referentialRefService,
            attributes: ['name'],
            filter: {
                entityName: 'SaleType',
            },
        });
    }
    ngOnReady() {
        this.updateFormGroup();
    }
    updateFormGroup(opts) {
        console.info('[sale-form] Updating form group...');
        this.validatorService.updateFormGroup(this.form, {
            required: this.required,
            minDate: this._minDate,
        });
        if (!opts || opts.emitEvent !== false) {
            this.form.updateValueAndValidity();
            this.markForCheck();
        }
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], SaleForm.prototype, "required", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SaleForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SaleForm.prototype, "showVessel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SaleForm.prototype, "showEndDateTime", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SaleForm.prototype, "showComment", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SaleForm.prototype, "showButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], SaleForm.prototype, "minDate", null);
SaleForm = __decorate([
    Component({
        selector: 'app-form-sale',
        templateUrl: './sale.form.html',
        styleUrls: ['./sale.form.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector,
        SaleValidatorService,
        VesselSnapshotService,
        ReferentialRefService,
        ChangeDetectorRef])
], SaleForm);
export { SaleForm };
//# sourceMappingURL=sale.form.js.map