import { __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, forwardRef, Input, Optional } from '@angular/core';
import { FormGroupDirective, NG_VALUE_ACCESSOR, UntypedFormBuilder, UntypedFormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AppFormUtils, isNil, isNotNilOrNaN } from '@sumaris-net/ngx-components';
import { filter } from 'rxjs/operators';
import { isNilOrNaN, roundHalfUp } from '@app/shared/functions';
const noop = () => { };
const DEFAULT_VALUE_ACCESSOR = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => MatSamplingRatioField),
    multi: true
};
export const DEFAULT_MAX_DECIMALS = 6;
let MatSamplingRatioField = class MatSamplingRatioField {
    constructor(formBuilder, cd, formGroupDir) {
        this.formBuilder = formBuilder;
        this.cd = cd;
        this.formGroupDir = formGroupDir;
        this._onChangeCallback = noop;
        this._onTouchedCallback = noop;
        this._subscription = new Subscription();
        this._disabling = false;
        this._writing = true; // Will be changed to 'false' by ngOnInit()
        this._readonly = false;
        this._format = '%';
        this.required = false;
        this.floatLabel = 'auto';
        this.maxDecimals = DEFAULT_MAX_DECIMALS;
        this.selectInputContent = AppFormUtils.selectInputContent;
    }
    get disabled() {
        return this.formControl.disabled;
    }
    set readonly(value) {
        if (this._readonly !== value) {
            this._readonly = value;
            this.markForCheck();
        }
    }
    get readonly() {
        return this._readonly;
    }
    set placeholder(value) {
        if (this._placeholder !== value) {
            this._placeholder = value;
            this.markForCheck();
        }
    }
    get placeholder() {
        return this._placeholder || this._defaultPlaceholder;
    }
    set format(value) {
        if (this._format !== value) {
            this._format = value;
            this._onFormatChanged();
            this.markForCheck();
        }
    }
    get format() {
        return this._format;
    }
    ngOnInit() {
        this.format = this.format || '%';
        if (isNil(this.maxDecimals)) {
            this.maxDecimals = DEFAULT_MAX_DECIMALS;
        }
        else if (this.maxDecimals < 0) {
            console.error('Invalid attribute \'maxDecimals\'. Must a positive value.');
            this.maxDecimals = DEFAULT_MAX_DECIMALS;
        }
        this.formControl = this.formControl || this.formControlName && this.formGroupDir && this.formGroupDir.form.get(this.formControlName);
        if (!this.formControl)
            throw new Error('Missing mandatory attribute \'formControl\' or \'formControlName\' in <mat-latlong-field>.');
        this._inputFormControl = this.formBuilder.control([null]);
        this._onFormatChanged();
        this._subscription.add(this._inputFormControl.valueChanges
            .subscribe((value) => this._onFormChange(value)));
        // Listen status changes (when done outside the component  - e.g. when setErrors() is calling on the formControl)
        this._subscription.add(this.formControl.statusChanges
            .pipe(filter((_) => !this._readonly && !this._writing && !this._disabling) // Skip
        )
            .subscribe((_) => this.markForCheck()));
        this._writing = false;
    }
    ngOnDestroy() {
        this._subscription.unsubscribe();
    }
    writeValue(obj) {
        if (this._writing)
            return; // Skip
        this._writing = true;
        try {
            const value = (typeof obj === 'string') ? parseFloat(obj.replace(/,/g, '.')) : obj;
            const formValue = this.toFormValue(value);
            // DEBUG
            //console.debug("[mat-sampling-ratio] formValue: " + formValue);
            this._inputFormControl.patchValue(formValue, { emitEvent: false });
        }
        finally {
            this._writing = false;
            this.markForCheck();
        }
    }
    registerOnChange(fn) {
        this._onChangeCallback = fn;
    }
    registerOnTouched(fn) {
        this._onTouchedCallback = fn;
    }
    setDisabledState(isDisabled) {
        if (this._disabling)
            return; // Skip
        this._disabling = true;
        // DEBUG
        console.debug('[mat-sampling-ratio] setDisabledState() with isDisabled=' + isDisabled);
        if (isDisabled) {
            this._inputFormControl.disable({ emitEvent: false });
        }
        else {
            this._inputFormControl.enable({ emitEvent: false });
        }
        this._disabling = false;
        this.markForCheck();
    }
    displayValue(modelValue) {
        const formValue = this.toFormValue(modelValue);
        if (isNotNilOrNaN(modelValue)) {
            switch (this._format) {
                case '1/w':
                    return `1/${formValue}`;
                case '%':
                default:
                    return '' + formValue;
            }
        }
        return '';
    }
    clear() {
        this.formControl.setValue(null);
        this.markAsTouched();
        this.markAsDirty();
    }
    /* -- protected functions -- */
    _onFormatChanged() {
        switch (this._format) {
            case '1/w':
                this._inputMaxDecimals = Math.max(0, this.maxDecimals - 2);
                const ngDigits = Math.max(3, this.maxDecimals);
                this._pattern = `[0-9]{1,${ngDigits}}([.][0-9]{0,${this._inputMaxDecimals}})?`;
                this._defaultPlaceholder = 'TRIP.BATCH.EDIT.SAMPLING_COEFFICIENT';
                break;
            case '%':
            default:
                // max 2 decimals
                this._inputMaxDecimals = Math.min(2, Math.max(0, this.maxDecimals - 2));
                this._pattern = `(100|[0-9]{1,2}([.][0-9]{0,${this._inputMaxDecimals}})?)`;
                this._defaultPlaceholder = 'TRIP.BATCH.EDIT.SAMPLING_RATIO_PCT';
                break;
        }
    }
    _onFormChange(value) {
        if (this._writing)
            return; // Skip if call by self
        this._writing = true;
        if (this._inputFormControl.invalid) {
            this.formControl.markAsPending();
            this.formControl.setErrors(Object.assign(Object.assign({}, this.formControl.errors), this._inputFormControl.errors));
            this._writing = false;
            this._checkIfTouched();
            return;
        }
        let modelValue = null;
        if (isNotNilOrNaN(value)) {
            switch (this._format) {
                case '1/w':
                    modelValue = roundHalfUp(1 / value, this.maxDecimals);
                    break;
                case '%':
                default:
                    modelValue = Math.min(1, roundHalfUp(value / 100, this.maxDecimals));
                    break;
            }
        }
        // DEBUG
        //console.debug('[mat-sampling-ratio] modelValue=', modelValue);
        // Set model value
        this.emitChange(modelValue);
        this._writing = false;
        this.markForCheck();
    }
    emitChange(value) {
        if (this.formControl.value !== value) {
            // DEBUG
            //console.debug('[mat-sampling-ratio] Emit new value: ' + value);
            // Changes come from inside function: use the callback
            this._onChangeCallback(value);
            // Check if need to update controls
            this._checkIfTouched();
        }
    }
    _checkIfTouched() {
        if (this.formControl.touched || this._inputFormControl.touched) {
            this.markForCheck();
            this._onTouchedCallback();
            return true;
        }
        return false;
    }
    toFormValue(value) {
        if (isNilOrNaN(value))
            return null;
        switch (this._format) {
            case '1/w':
                return roundHalfUp(1 / value, this._inputMaxDecimals);
            case '%':
            default:
                return Math.min(100, roundHalfUp(value * 100, this._inputMaxDecimals));
        }
    }
    markAsTouched(opts) {
        this._inputFormControl.markAsTouched(opts);
        this._onTouchedCallback();
        this.markForCheck();
    }
    markAsDirty(opts) {
        this.formControl.markAsDirty(opts);
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", UntypedFormControl)
], MatSamplingRatioField.prototype, "formControl", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], MatSamplingRatioField.prototype, "formControlName", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], MatSamplingRatioField.prototype, "required", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], MatSamplingRatioField.prototype, "floatLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], MatSamplingRatioField.prototype, "appearance", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], MatSamplingRatioField.prototype, "tabindex", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], MatSamplingRatioField.prototype, "maxDecimals", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], MatSamplingRatioField.prototype, "autofocus", void 0);
__decorate([
    Input('class'),
    __metadata("design:type", String)
], MatSamplingRatioField.prototype, "classList", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], MatSamplingRatioField.prototype, "readonly", null);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], MatSamplingRatioField.prototype, "placeholder", null);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], MatSamplingRatioField.prototype, "format", null);
MatSamplingRatioField = __decorate([
    Component({
        selector: 'mat-sampling-ratio-field',
        templateUrl: './material.sampling-ratio.html',
        styleUrls: ['./material.sampling-ratio.scss'],
        providers: [
            DEFAULT_VALUE_ACCESSOR
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __param(2, Optional()),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        ChangeDetectorRef,
        FormGroupDirective])
], MatSamplingRatioField);
export { MatSamplingRatioField };
//# sourceMappingURL=material.sampling-ratio.js.map