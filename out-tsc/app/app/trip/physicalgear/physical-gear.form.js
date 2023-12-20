import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, Input, QueryList, ViewChildren } from '@angular/core';
import { PhysicalGearValidatorService } from './physicalgear.validator';
import { filter, mergeMap } from 'rxjs/operators';
import { MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { UntypedFormBuilder } from '@angular/forms';
import { focusNextInput, getFocusableInputElements, isNotNil, isNotNilOrBlank, ReferentialRef, ReferentialUtils, selectInputContent, toBoolean, toNumber, waitFor, } from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { OperationService } from '@app/trip/operation/operation.service';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
let PhysicalGearForm = class PhysicalGearForm extends MeasurementValuesForm {
    constructor(injector, measurementsValidatorService, formBuilder, programRefService, validatorService, operationService, referentialRefService) {
        super(injector, measurementsValidatorService, formBuilder, programRefService, validatorService.getFormGroup());
        this.measurementsValidatorService = measurementsValidatorService;
        this.formBuilder = formBuilder;
        this.programRefService = programRefService;
        this.validatorService = validatorService;
        this.operationService = operationService;
        this.referentialRefService = referentialRefService;
        this.gears$ = this._state.select('gears');
        this.canEditRankOrder = false;
        this.canEditGear = true;
        this.maxItemCountForButtons = 12;
        this.showGear = true;
        this.showError = false;
        this.i18nSuffix = null;
        this.selectInputContent = selectInputContent;
        this._enable = true;
        // Set defaults
        this.acquisitionLevel = AcquisitionLevelCodes.PHYSICAL_GEAR;
        this.requiredGear = true;
        this.i18nPmfmPrefix = 'TRIP.PHYSICAL_GEAR.PMFM.';
        // Load gears from program
        this._state.connect('gears', this.programLabel$
            .pipe(mergeMap(programLabel => this.programRefService.loadGears(programLabel))));
        this.debug = !environment.production;
    }
    set gears(value) {
        this._state.set('gears', (_) => value);
    }
    get gears() {
        return this._state.get('gears');
    }
    ngOnInit() {
        var _a;
        super.ngOnInit();
        this.mobile = toBoolean(this.mobile, this.settings.mobile);
        this.tabindex = toNumber(this.tabindex, 1);
        this.showComment = !this.mobile || isNotNilOrBlank((_a = this.data) === null || _a === void 0 ? void 0 : _a.comments);
        // Combo: gears
        this.registerAutocompleteField('gear', {
            items: this.gears$,
            mobile: this.mobile,
            showAllOnFocus: true
        });
        // Disable gear field
        const gearControl = this.form.get('gear');
        if (!this.canEditGear && gearControl.enabled) {
            gearControl.disable();
        }
        // Propagate data.gear into gearId
        this.registerSubscription(this.form.get('gear').valueChanges
            .pipe(filter(ReferentialUtils.isNotEmpty))
            .subscribe(gear => {
            this.data = this.data || new PhysicalGear();
            this.data.gear = gear;
            this.gearId = gear.id;
            this.markForCheck();
        }));
    }
    enable(opts) {
        super.enable(opts);
        if (!this.canEditGear) {
            this.form.get('gear').disable(opts);
        }
    }
    focusFirstInput() {
        return __awaiter(this, void 0, void 0, function* () {
            yield waitFor(() => this.enabled, { timeout: 2000 });
            const inputElements = getFocusableInputElements(this.matInputs);
            if (inputElements.length)
                inputElements[0].focus();
        });
    }
    focusNextInput(event, opts) {
        // DEBUG
        //return focusNextInput(event, this.inputFields, opts{debug: this.debug, ...opts});
        return focusNextInput(event, this.matInputs, opts);
    }
    setValue(data, opts) {
        const _super = Object.create(null, {
            setValue: { get: () => super.setValue }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // For ce to clean previous gearId (to for pmfms recomputation)
            if (isNotNil(this.gearId)) {
                this.gearId = null;
            }
            // Can edite only if not used yet, in any operation
            if (isNotNil(data === null || data === void 0 ? void 0 : data.tripId) && this.canEditGear) {
                this.canEditGear = yield this.operationService.areUsedPhysicalGears(data.tripId, [data.id]);
            }
            this.showComment = this.showComment || isNotNilOrBlank(data.comments);
            yield _super.setValue.call(this, data, opts);
        });
    }
    getValue() {
        const target = super.getValue();
        // Re Add gear, if control has been disabled
        const jsonGear = this.form.get('gear').value;
        target.gear = jsonGear && ReferentialRef.fromObject(jsonGear);
        return target;
    }
    toggleComment() {
        if (this.disabled)
            return;
        this.showComment = !this.showComment;
        if (!this.showComment) {
            this.form.get('comments').setValue(null);
        }
        this.markForCheck();
    }
    /* -- protected methods -- */
    onApplyingEntity(data, opts) {
        if (!data)
            return; // Skip
        super.onApplyingEntity(data, opts);
        // Propagate the gear
        if (ReferentialUtils.isNotEmpty(data.gear)) {
            this.gearId = data.gear.id;
        }
    }
};
__decorate([
    Input(),
    __metadata("design:type", Number)
], PhysicalGearForm.prototype, "tabindex", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PhysicalGearForm.prototype, "canEditRankOrder", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PhysicalGearForm.prototype, "canEditGear", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PhysicalGearForm.prototype, "maxItemCountForButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], PhysicalGearForm.prototype, "maxVisibleButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PhysicalGearForm.prototype, "showGear", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PhysicalGearForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], PhysicalGearForm.prototype, "showComment", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PhysicalGearForm.prototype, "i18nSuffix", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], PhysicalGearForm.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], PhysicalGearForm.prototype, "gears", null);
__decorate([
    ViewChildren('matInput'),
    __metadata("design:type", QueryList)
], PhysicalGearForm.prototype, "matInputs", void 0);
PhysicalGearForm = __decorate([
    Component({
        selector: 'app-physical-gear-form',
        templateUrl: './physical-gear.form.html',
        styleUrls: ['./physical-gear.form.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        MeasurementsValidatorService,
        UntypedFormBuilder,
        ProgramRefService,
        PhysicalGearValidatorService,
        OperationService,
        ReferentialRefService])
], PhysicalGearForm);
export { PhysicalGearForm };
//# sourceMappingURL=physical-gear.form.js.map