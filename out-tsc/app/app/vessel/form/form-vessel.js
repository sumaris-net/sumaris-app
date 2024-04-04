import { __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Directive, HostListener, Injector, Input } from '@angular/core';
import { VesselValidatorService } from '../services/validator/vessel.validator';
import { LocationLevelIds } from '@app/referential/services/model/model.enum';
import { AccountService, AppForm, AppFormUtils, isNil, LocalSettingsService, ReferentialRef, StatusById, StatusIds, StatusList, toBoolean } from '@sumaris-net/ngx-components';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { VESSEL_CONFIG_OPTIONS } from '@app/vessel/services/config/vessel.config';
// eslint-disable-next-line @angular-eslint/directive-selector
let ToRegistrationCodeDirective = class ToRegistrationCodeDirective {
    constructor() {
    }
    onInput(event) {
        // Filters only A-Z 0-9 characters
        event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
};
__decorate([
    HostListener('input', ['$event']),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ToRegistrationCodeDirective.prototype, "onInput", null);
ToRegistrationCodeDirective = __decorate([
    Directive({ selector: 'input[toRegistrationCode]' }),
    __metadata("design:paramtypes", [])
], ToRegistrationCodeDirective);
export { ToRegistrationCodeDirective };
let VesselForm = class VesselForm extends AppForm {
    constructor(injector, vesselValidatorService, referentialRefService, cd, settings, accountService) {
        super(injector, vesselValidatorService.getFormGroup());
        this.vesselValidatorService = vesselValidatorService;
        this.referentialRefService = referentialRefService;
        this.cd = cd;
        this.settings = settings;
        this.accountService = accountService;
        this._basePortLocationSuggestLengthThreshold = +VESSEL_CONFIG_OPTIONS.VESSEL_BASE_PORT_LOCATION_SEARCH_TEXT_MIN_LENGTH.defaultValue;
        this.statusList = StatusList;
        this.statusById = StatusById;
        this.filterNumberInput = AppFormUtils.filterNumberInput;
        this.mobile = settings.mobile;
        this.canEditStatus = this.accountService.isAdmin();
    }
    set defaultStatus(value) {
        if (this._defaultStatus !== value) {
            this._defaultStatus = value;
            console.debug('[form-vessel] Changing default status to:' + value);
            if (this.form) {
                this.form.patchValue({ statusId: this.defaultStatus });
            }
            this.canEditStatus = !this._defaultStatus || this.isAdmin();
        }
    }
    get defaultStatus() {
        return this._defaultStatus;
    }
    set defaultRegistrationLocation(value) {
        var _a;
        if (this._defaultRegistrationLocation !== value) {
            console.debug('[form-vessel] Changing default registration location to:' + value);
            this._defaultRegistrationLocation = value;
            // Apply value, if possible (not yt set)
            const registrationLocationControl = (_a = this.registrationForm) === null || _a === void 0 ? void 0 : _a.get('registrationLocation');
            if (registrationLocationControl && isNil(registrationLocationControl.value)) {
                registrationLocationControl.patchValue({ registrationLocation: value });
            }
        }
    }
    get defaultRegistrationLocation() {
        return this._defaultRegistrationLocation;
    }
    set basePortLocationSuggestLengthThreshold(value) {
        if (this._basePortLocationSuggestLengthThreshold !== value) {
            this._basePortLocationSuggestLengthThreshold = value;
            // Update fields
            if (this.autocompleteFields.basePortLocation) {
                this.autocompleteFields.basePortLocation.suggestLengthThreshold = value;
            }
        }
    }
    get basePortLocationSuggestLengthThreshold() {
        return this._basePortLocationSuggestLengthThreshold;
    }
    set withNameRequired(value) {
        if (this._withNameRequired !== value) {
            this._withNameRequired = value;
            if (this.form) {
                this.updateFormGroup();
            }
        }
    }
    get withNameRequired() {
        return this._withNameRequired;
    }
    set maxDate(value) {
        if (this._maxDate !== value) {
            this._maxDate = value;
            if (this.form) {
                this.updateFormGroup();
            }
        }
    }
    get maxDate() {
        return this._maxDate;
    }
    get registrationForm() {
        return this.form.controls.vesselRegistrationPeriod;
    }
    get featuresForm() {
        return this.form.controls.vesselFeatures;
    }
    ngOnInit() {
        super.ngOnInit();
        // Compute defaults
        this.showError = toBoolean(this.showError, true);
        this.canEditStatus = toBoolean(this.canEditStatus, !this._defaultStatus || this.isAdmin());
        // Combo location
        this.registerAutocompleteField('basePortLocation', {
            service: this.referentialRefService,
            filter: {
                entityName: 'Location',
                levelId: LocationLevelIds.PORT,
                statusId: StatusIds.ENABLE
            },
            suggestLengthThreshold: this._basePortLocationSuggestLengthThreshold,
            mobile: this.mobile
        });
        this.registerAutocompleteField('registrationLocation', {
            service: this.referentialRefService,
            filter: {
                entityName: 'Location',
                levelId: LocationLevelIds.COUNTRY,
                statusId: StatusIds.ENABLE
            },
            mobile: this.mobile
        });
        this.registerAutocompleteField('vesselType', {
            service: this.referentialRefService,
            attributes: ['name'],
            filter: {
                entityName: 'VesselType',
                statusId: StatusIds.ENABLE
            },
            mobile: this.mobile
        });
        // Combo hull material
        this.registerAutocompleteField('hullMaterial', {
            // TODO use suggest function, and load Pmfm qualitative value, using PmfmIds.HULL_MATERIAL
            service: this.referentialRefService,
            attributes: ['name'],
            filter: {
                entityName: 'QualitativeValue',
                levelLabel: 'HULL_MATERIAL',
                statusId: StatusIds.ENABLE
            },
            mobile: this.mobile
        });
        if (this._defaultStatus) {
            this.form.patchValue({
                statusId: this._defaultStatus
            });
        }
        if (this._defaultRegistrationLocation) {
            this.registrationForm.patchValue({
                registrationLocation: this._defaultRegistrationLocation
            });
        }
    }
    isAdmin() {
        return this.accountService.isAdmin();
    }
    /* -- protected methods -- */
    updateFormGroup(opts) {
        const validatorOpts = {
            withNameRequired: this.withNameRequired,
            maxDate: this.maxDate
        };
        // DEBUG
        console.debug(`[form-vessel] Updating form group (validators)`, validatorOpts);
        this.vesselValidatorService.updateFormGroup(this.form, validatorOpts);
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
    __metadata("design:type", Boolean)
], VesselForm.prototype, "canEditStatus", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], VesselForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], VesselForm.prototype, "defaultStatus", null);
__decorate([
    Input(),
    __metadata("design:type", ReferentialRef),
    __metadata("design:paramtypes", [ReferentialRef])
], VesselForm.prototype, "defaultRegistrationLocation", null);
__decorate([
    Input(),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], VesselForm.prototype, "basePortLocationSuggestLengthThreshold", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], VesselForm.prototype, "withNameRequired", null);
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], VesselForm.prototype, "maxDate", null);
VesselForm = __decorate([
    Component({
        selector: 'app-form-vessel',
        templateUrl: './form-vessel.html',
        styleUrls: ['./form-vessel.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        VesselValidatorService,
        ReferentialRefService,
        ChangeDetectorRef,
        LocalSettingsService,
        AccountService])
], VesselForm);
export { VesselForm };
//# sourceMappingURL=form-vessel.js.map