var PmfmFormField_1;
import { __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, forwardRef, Input, Optional, Output, ViewChild, } from '@angular/core';
import { AbstractControl, FormGroupDirective, NG_VALUE_ACCESSOR, UntypedFormArray, UntypedFormBuilder, UntypedFormControl, } from '@angular/forms';
import { AppFormArray, filterNumberInput, focusInput, isNil, isNilOrBlank, isNotNil, isNotNilOrBlank, LocalSettingsService, MatDateTime, setTabIndex, toBoolean, toNumber, } from '@sumaris-net/ngx-components';
import { PmfmUtils } from '../../services/model/pmfm.model';
import { PmfmValidators } from '../../services/validator/pmfm.validators';
import { PmfmLabelPatterns, UnitLabel, UnitLabelPatterns } from '../../services/model/model.enum';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
import { RxState } from '@rx-angular/state';
import { filter, map } from 'rxjs/operators';
const noop = () => { };
let PmfmFormField = PmfmFormField_1 = class PmfmFormField extends RxState {
    constructor(settings, cd, formBuilder, pmfmNamePipe, formGroupDir) {
        super();
        this.settings = settings;
        this.cd = cd;
        this.formBuilder = formBuilder;
        this.pmfmNamePipe = pmfmNamePipe;
        this.formGroupDir = formGroupDir;
        this._onChangeCallback = noop;
        this._onTouchedCallback = noop;
        this.type$ = this.select('type');
        this.control$ = this.select('control');
        this.arrayEditingIndex = undefined;
        this.readonly = false;
        this.hidden = false;
        this.compact = false;
        this.floatLabel = 'auto';
        // When async validator (e.g. BatchForm), force update when error detected
        this.listenStatusChanges = false;
        this.onPressEnter = new EventEmitter();
        this.focused = new EventEmitter();
        this.blurred = new EventEmitter();
        this.clicked = new EventEmitter();
        this.filterNumberInput = filterNumberInput;
        this.undefined = undefined;
        this.mobile = settings.mobile;
        // Fill controlName using the pmfm
        this.connect('controlName', this.select('pmfm').pipe(filter(isNotNil), map(pmfm => { var _a; return (_a = pmfm.id) === null || _a === void 0 ? void 0 : _a.toString(); }), filter(isNotNilOrBlank)));
        // get control from controlName
        if (this.formGroupDir) {
            this.connect('control', this.select('controlName').pipe(filter(isNotNilOrBlank), map(controlName => this.formGroupDir.form.get(controlName)), filter(isNotNil)));
        }
    }
    /**
     * Same as `formControl`, but avoid to activate the Angular directive
     */
    set control(value) {
        this.set('control', _ => value);
    }
    get control() {
        return this.get('control');
    }
    /**
     * Same as `formControlName`, but avoid to activate the Angular directive
     */
    set controlName(value) {
        this.set('controlName', _ => value);
    }
    get controlName() {
        return this.get('controlName');
    }
    set pmfm(value) {
        this.set('pmfm', _ => value);
    }
    get pmfm() {
        return this.get('pmfm');
    }
    set formControl(value) {
        this.control = value;
    }
    get formControl() {
        return this.control;
    }
    set formControlName(value) {
        this.controlName = value;
    }
    get formControlName() {
        return this.controlName;
    }
    set type(value) {
        this.set('type', _ => value);
    }
    get type() {
        return this.get('type');
    }
    get value() {
        return this.control.value;
    }
    get latLongFormat() {
        return this.settings.settings.latLongFormat || 'DDMM';
    }
    get disabled() {
        var _a;
        return (_a = this.control) === null || _a === void 0 ? void 0 : _a.disabled;
    }
    get formArray() {
        return this.control;
    }
    ngOnInit() {
        this.connect('type', this.select(['control', 'pmfm'], _ => _)
            .pipe(
        //debounceTime(1000),
        map(({ pmfm, control }) => {
            var _a;
            if (!pmfm)
                throw new Error('Missing mandatory attribute \'pmfm\' in <app-pmfm-field>.');
            if (!control)
                throw new Error('Missing mandatory attribute \'formControl\' or \'formControlName\' in <app-pmfm-field>.');
            (_a = this._statusChangesSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
            // Default values
            this.required = toBoolean(this.required, pmfm.required);
            if (control instanceof UntypedFormArray) {
                // Make sure to get an App form array (that can be resized)
                if (!(control instanceof AppFormArray))
                    throw new Error('Please use AppFormArray instead of UntypedFormArray - check the validator service');
                this.acquisitionNumber = toNumber(this.acquisitionNumber, PmfmUtils.isDenormalizedPmfm(this.pmfm) ? this.pmfm.acquisitionNumber : -1);
                if (control.length === 0)
                    control.resize(1);
                return 'array';
            }
            else if (control instanceof UntypedFormControl) {
                // DEBUG
                //if (PmfmUtils.isWeight(pmfm)) console.debug('[pmfm-form-field] Configuring for the pmfm: ' + pmfm.label);
                this.acquisitionNumber = 1; // Force to 1
                control.setValidators(PmfmValidators.create(pmfm));
                // Force a refresh, when control status changed (useful in some case - e.g. in BatchForm, weight pmfms can be updated with `opts={emitEvent: false}` )
                if (this.listenStatusChanges) {
                    this._statusChangesSubscription = control.statusChanges.subscribe((_) => this.markForCheck());
                }
                // Default values
                this.placeholder = this.placeholder || this.pmfmNamePipe.transform(pmfm, {
                    withUnit: !this.compact,
                    i18nPrefix: this.i18nPrefix,
                    i18nContext: this.i18nSuffix
                });
                // Compute the field type (use special case for Latitude/Longitude)
                let type = pmfm.type;
                if (this.hidden || pmfm.hidden) {
                    type = 'hidden';
                }
                else if (type === 'double') {
                    if (PmfmLabelPatterns.LATITUDE.test(pmfm.label)) {
                        type = 'latitude';
                    }
                    else if (PmfmLabelPatterns.LONGITUDE.test(pmfm.label)) {
                        type = 'longitude';
                    }
                    else if (pmfm.unitLabel === UnitLabel.DECIMAL_HOURS || UnitLabelPatterns.DECIMAL_HOURS.test(pmfm.unitLabel)) {
                        type = 'duration';
                    }
                    else {
                        this.numberInputStep = this.computeNumberInputStep(pmfm);
                    }
                }
                else if (type === 'date') {
                    if (pmfm.unitLabel === UnitLabel.DATE_TIME || UnitLabelPatterns.DATE_TIME.test(pmfm.unitLabel)) {
                        type = 'dateTime';
                    }
                }
                // Update tab index
                this.updateTabIndex();
                this.cd.detectChanges();
                return type;
            }
            else {
                throw new Error('Unknown control type: ' + control.constructor.name);
            }
        })));
    }
    ngOnDestroy() {
        var _a;
        super.ngOnDestroy();
        (_a = this._statusChangesSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
    }
    writeValue(value) {
        if (this.type === 'array') {
            if (Array.isArray(value) && value !== this.control.value) {
                this.control.patchValue(value, { emitEvent: false });
                this._onChangeCallback(value);
            }
        }
        else {
            // FIXME This is a hack, because some time invalid value are passed
            // Example: in the batch group table (inline edition)
            if (PmfmUtils.isNumeric(this.pmfm) && Number.isNaN(value)) {
                //console.warn("Trying to set NaN value, in a measurement field ! " + this.constructor.name);
                value = null;
                if (value !== this.control.value) {
                    this.control.patchValue(value, { emitEvent: false });
                    this._onChangeCallback(value);
                }
            }
        }
    }
    registerOnChange(fn) {
        this._onChangeCallback = fn;
    }
    registerOnTouched(fn) {
        this._onTouchedCallback = fn;
    }
    setDisabledState(isDisabled) {
        this.markForCheck();
    }
    markAsTouched() {
        var _a;
        if ((_a = this.control) === null || _a === void 0 ? void 0 : _a.touched) {
            this.markForCheck();
            this._onTouchedCallback();
        }
    }
    filterAlphanumericalInput(event) {
        // TODO: Add features (e.g. check against a regexp/pattern ?)
    }
    focus() {
        if (this.hidden) {
            console.warn('Cannot focus an hidden measurement field!');
        }
        else {
            focusInput(this.matInput);
        }
    }
    /* -- protected method -- */
    computeNumberInputStep(pmfm) {
        var _a;
        // FIXME: choisir la valeur min, ou vide ? - cf issue #554
        // return PmfmUtils.getOrComputePrecision(pmfm, 1)
        return ((_a = PmfmUtils.getOrComputePrecision(pmfm, null)) === null || _a === void 0 ? void 0 : _a.toString()) || '';
    }
    updateTabIndex() {
        if (isNil(this.tabindex) || this.tabindex === -1)
            return;
        setTimeout(() => {
            if (!this.matInput)
                return;
            setTabIndex(this.matInput, this.tabindex);
            this.markForCheck();
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    formArrayAdd(event) {
        const autofocus = this.autofocus;
        this.autofocus = false;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        this.formArray.add(null, { emitEvent: false });
        this.arrayEditingIndex = this.formArray.length - 1;
        // Let the time for fields validation
        setTimeout(() => {
            this.autofocus = autofocus;
            this.markForCheck();
        }, 250);
    }
    formArrayRemoveAt(index, opts) {
        this.formArray.removeAt(index);
        if (!opts || opts.markAsDirty !== false)
            this.formArray.markAsDirty();
        this.markForCheck();
    }
    formArrayRemoveEmptyOnFocusLost(event, index) {
        event.stopPropagation();
        setTimeout(() => {
            const control = this.formArray.at(index);
            // If empty: remove it
            if (control && isNilOrBlank(control.value)) {
                this.formArray.removeAt(index);
                this.markForCheck();
            }
        }, 250);
    }
};
__decorate([
    ViewChild(MatDateTime),
    __metadata("design:type", MatDateTime)
], PmfmFormField.prototype, "matDateTime", void 0);
__decorate([
    Input(),
    __metadata("design:type", AbstractControl),
    __metadata("design:paramtypes", [AbstractControl])
], PmfmFormField.prototype, "control", null);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], PmfmFormField.prototype, "controlName", null);
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], PmfmFormField.prototype, "pmfm", null);
__decorate([
    Input(),
    __metadata("design:type", UntypedFormControl),
    __metadata("design:paramtypes", [UntypedFormControl])
], PmfmFormField.prototype, "formControl", null);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], PmfmFormField.prototype, "formControlName", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], PmfmFormField.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], PmfmFormField.prototype, "required", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmFormField.prototype, "readonly", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmFormField.prototype, "hidden", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PmfmFormField.prototype, "placeholder", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmFormField.prototype, "compact", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PmfmFormField.prototype, "floatLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], PmfmFormField.prototype, "tabindex", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], PmfmFormField.prototype, "autofocus", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PmfmFormField.prototype, "style", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], PmfmFormField.prototype, "showButtonIcons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], PmfmFormField.prototype, "maxVisibleButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], PmfmFormField.prototype, "acquisitionNumber", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PmfmFormField.prototype, "defaultLatitudeSign", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PmfmFormField.prototype, "defaultLongitudeSign", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PmfmFormField.prototype, "i18nPrefix", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PmfmFormField.prototype, "i18nSuffix", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmFormField.prototype, "listenStatusChanges", void 0);
__decorate([
    Output('keyup.enter'),
    __metadata("design:type", Object)
], PmfmFormField.prototype, "onPressEnter", void 0);
__decorate([
    Output('focus'),
    __metadata("design:type", Object)
], PmfmFormField.prototype, "focused", void 0);
__decorate([
    Output('blur'),
    __metadata("design:type", Object)
], PmfmFormField.prototype, "blurred", void 0);
__decorate([
    Output('click'),
    __metadata("design:type", Object)
], PmfmFormField.prototype, "clicked", void 0);
__decorate([
    ViewChild('matInput'),
    __metadata("design:type", ElementRef)
], PmfmFormField.prototype, "matInput", void 0);
PmfmFormField = PmfmFormField_1 = __decorate([
    Component({
        selector: 'app-pmfm-field',
        styleUrls: ['./pmfm.form-field.component.scss'],
        templateUrl: './pmfm.form-field.component.html',
        providers: [
            {
                provide: NG_VALUE_ACCESSOR,
                useExisting: forwardRef(() => PmfmFormField_1),
                multi: true
            }
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __param(4, Optional()),
    __metadata("design:paramtypes", [LocalSettingsService,
        ChangeDetectorRef,
        UntypedFormBuilder,
        PmfmNamePipe,
        FormGroupDirective])
], PmfmFormField);
export { PmfmFormField };
//# sourceMappingURL=pmfm.form-field.component.js.map