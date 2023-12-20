var PmfmQvFormField_1;
import { __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, forwardRef, Input, Optional, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { merge, of } from 'rxjs';
import { filter, map, takeUntil, tap } from 'rxjs/operators';
import { UntypedFormControl, FormGroupDirective, NG_VALUE_ACCESSOR, Validators } from '@angular/forms';
import { AppFormUtils, focusInput, isNotEmptyArray, isNotNil, LocalSettingsService, referentialToString, ReferentialUtils, SharedValidators, sort, StatusIds, suggestFromArray, toBoolean, toNumber, selectInputRange, isNotNilOrBlank } from '@sumaris-net/ngx-components';
import { PmfmIds } from '../../services/model/model.enum';
import { PmfmUtils } from '../../services/model/pmfm.model';
let PmfmQvFormField = PmfmQvFormField_1 = class PmfmQvFormField {
    constructor(settings, cd, formGroupDir) {
        this.settings = settings;
        this.cd = cd;
        this.formGroupDir = formGroupDir;
        this._onChangeCallback = (_) => { };
        this._onTouchedCallback = () => { };
        this.destroySubject = new EventEmitter(true);
        this._displayValue = '';
        this.onShowDropdown = new EventEmitter(true);
        this.selectedIndex = -1;
        this.showAllButtons = false;
        this.floatLabel = 'auto';
        this.readonly = false;
        this.compact = false;
        this.clearable = false;
        this.onPressEnter = new EventEmitter();
        this.focused = new EventEmitter();
        this.blurred = new EventEmitter();
        this.clicked = new EventEmitter();
        this.compareWith = ReferentialUtils.equals;
        this.selectInputContent = AppFormUtils.selectInputContent;
        this.mobile = settings.mobile;
    }
    get nativeElement() {
        return this.matInput && this.matInput.nativeElement;
    }
    get sortedQualitativeValues() {
        return this._sortedQualitativeValues;
    }
    set tabindex(value) {
        this._tabindex = value;
        this.markForCheck();
    }
    get tabindex() {
        return this._tabindex;
    }
    get disabled() {
        return this.formControl.disabled;
    }
    ngOnInit() {
        var _a;
        // Set defaults
        this.style = this.style || (this.mobile ? 'select' : 'autocomplete');
        this.formControl = this.formControl || this.formControlName && this.formGroupDir && this.formGroupDir.form.get(this.formControlName);
        if (!this.formControl)
            throw new Error('Missing mandatory attribute \'formControl\' or \'formControlName\' in <app-pmfm-qv-field>.');
        if (!this.pmfm)
            throw new Error('Missing mandatory attribute \'pmfm\' in <mat-qv-field>.');
        let qualitativeValues = this.pmfm.qualitativeValues || [];
        if (!qualitativeValues.length && PmfmUtils.isFullPmfm(this.pmfm)) {
            // Get qualitative values from parameter
            qualitativeValues = ((_a = this.pmfm.parameter) === null || _a === void 0 ? void 0 : _a.qualitativeValues) || [];
            if (!qualitativeValues.length) {
                console.warn(`Pmfm {id: ${this.pmfm.id}, label: '${this.pmfm.label}'} has no qualitative values, neither the parent PmfmStrategy!`, this.pmfm);
            }
        }
        // Exclude disabled values
        this._qualitativeValues = qualitativeValues.filter(qv => qv.statusId !== StatusIds.DISABLE);
        this.required = toBoolean(this.required, this.pmfm.required || false);
        this.formControl.setValidators(this.required ? [Validators.required, SharedValidators.entity] : SharedValidators.entity);
        const attributes = this.settings.getFieldDisplayAttributes('qualitativeValue', ['label', 'name']);
        const displayAttributes = this.compact && attributes.length > 1 ? ['label'] : attributes;
        this.searchAttributes = isNotEmptyArray(this.searchAttributes) && this.searchAttributes || attributes;
        this.sortAttribute = isNotNil(this.sortAttribute)
            ? this.sortAttribute
            : (this.style === 'button' ? 'name' : attributes[0]);
        // Sort values (but keep original order if LANDING/DISCARD or mobile)
        this._sortedQualitativeValues = (this.mobile || this.pmfm.id === PmfmIds.DISCARD_OR_LANDING)
            ? this._qualitativeValues
            : sort(this._qualitativeValues, this.sortAttribute, { numeric: true, sensitivity: 'base' });
        this.placeholder = this.placeholder || PmfmUtils.getPmfmName(this.pmfm, { withUnit: !this.compact });
        this.displayWith = this.displayWith || ((obj) => referentialToString(obj, displayAttributes));
        this.clearable = this.compact ? false : this.clearable;
        // On desktop, manage autocomplete
        if (!this.mobile) {
            if (!this._sortedQualitativeValues.length) {
                this._items$ = of([]);
            }
            else {
                this._items$ = merge(this.onShowDropdown
                    .pipe(filter(event => !event.defaultPrevented), map((_) => this._sortedQualitativeValues)), this.formControl.valueChanges
                    .pipe(filter(ReferentialUtils.isEmpty), map(value => suggestFromArray(this._sortedQualitativeValues, value, {
                    searchAttributes: this.searchAttributes
                })), map(res => res && res.data), tap(items => this.updateImplicitValue(items))))
                    .pipe(takeUntil(this.destroySubject));
            }
        }
        // If button, listen enable/disable changes (hack using statusChanges)
        if (this.style === 'button') {
            this.maxVisibleButtons = toNumber(this.maxVisibleButtons, 4);
            this.buttonsColCount = toNumber(this.buttonsColCount, Math.min(this.maxVisibleButtons, 4));
            if (this._qualitativeValues.length <= this.maxVisibleButtons) {
                this.maxVisibleButtons = 999; // Hide the expand button
            }
            this.formControl.statusChanges
                .pipe(takeUntil(this.destroySubject))
                .subscribe(() => {
                this.updateSelectedIndex(this.value, { emitEvent: false /*done after*/ });
                this.markForCheck();
            });
        }
    }
    ngOnDestroy() {
        this.destroySubject.emit();
    }
    get value() {
        return this.formControl.value;
    }
    writeValue(value, event) {
        if (value !== this.formControl.value) {
            this.formControl.patchValue(value, { emitEvent: false });
            this._onChangeCallback(value);
        }
        if (this.style === 'button') {
            this.updateSelectedIndex(value);
            if (event)
                this.onPressEnter.emit(event);
        }
    }
    registerOnChange(fn) {
        this._onChangeCallback = fn;
    }
    registerOnTouched(fn) {
        this._onTouchedCallback = fn;
    }
    setDisabledState(isDisabled) {
    }
    _onClick(event) {
        this.clicked.emit(event);
        this.onShowDropdown.emit(event);
    }
    filterInputTextFocusEvent(event) {
        var _a;
        if (!event || event.defaultPrevented)
            return;
        // Ignore event from mat-option
        if (event.relatedTarget instanceof HTMLElement && event.relatedTarget.tagName === 'MAT-OPTION') {
            event.preventDefault();
            if (event.stopPropagation)
                event.stopPropagation();
            event.returnValue = false;
            // DEBUG
            //if (this.debug) console.debug(this.logPrefix + ' Cancelling focus event');
            return false;
        }
        // DEBUG
        //if (this.debug) console.debug(this.logPrefix + ' Select input content');
        const hasContent = isNotNilOrBlank((_a = event.target) === null || _a === void 0 ? void 0 : _a.value);
        // If combo is empty, or if has content but should force to show panel on focus
        if (!hasContent) {
            // DEBUG
            //if (this.debug) console.debug(this.logPrefix + ' Emit focus event');
            this.focused.emit();
            this.onShowDropdown.emit(event);
            return true;
        }
        return false;
    }
    filterInputTextBlurEvent(event) {
        if (!event || event.defaultPrevented)
            return;
        // Ignore event from mat-option
        if (event.relatedTarget instanceof HTMLElement && event.relatedTarget.tagName === 'MAT-OPTION') {
            event.preventDefault();
            if (event.stopPropagation)
                event.stopPropagation();
            event.returnValue = false;
            // DEBUG
            //if (this.debug) console.debug(this.logPrefix + " Cancelling blur event");
            return false;
        }
        // When leave component without object, use implicit value if stored
        if (this._implicitValue && typeof this.formControl.value !== 'object') {
            this.writeValue(this._implicitValue);
        }
        this._implicitValue = null;
        this.checkIfTouched();
        // Move caret to the beginning (fix issue IMAGINE-469)
        selectInputRange(event.target, 0, 0);
        this.blurred.emit(event);
        return true;
    }
    filterMatSelectFocusEvent(event) {
        if (!event || event.defaultPrevented)
            return;
        // DEBUG
        // console.debug(this.logPrefix + " Received <mat-select> focus event", event);
        this.focused.emit(event);
    }
    filterMatSelectBlurEvent(event) {
        if (!event || event.defaultPrevented)
            return;
        // DEBUG
        // console.debug(this.logPrefix + " Received <mat-select> blur event", event);
        if (event.relatedTarget instanceof HTMLElement && (
        // Ignore event from mat-option
        (event.relatedTarget.tagName === 'MAT-OPTION')
            || (event.relatedTarget.tagName === 'INPUT') && event.relatedTarget.classList.contains('searchbar-input'))) {
            event.preventDefault();
            if (event.stopPropagation)
                event.stopPropagation();
            event.returnValue = false;
            // DEBUG
            // console.debug(this.logPrefix + " Cancelling <mat-select> blur event");
            return false;
        }
        // When leave component without object, use implicit value if stored
        if (this._implicitValue && typeof this.formControl.value !== 'object') {
            this.writeValue(this._implicitValue);
        }
        this._implicitValue = null;
        this.checkIfTouched();
        this.blurred.emit(event);
        return true;
    }
    clear() {
        this.formControl.setValue(null);
        this.markForCheck();
    }
    focus() {
        focusInput(this.matInput);
    }
    getQvId(item) {
        return item.id;
    }
    /* -- protected methods -- */
    updateImplicitValue(res) {
        // Store implicit value (will use it onBlur if not other value selected)
        if (res && res.length === 1) {
            this._implicitValue = res[0];
            this.formControl.setErrors(null);
        }
        else {
            this._implicitValue = undefined;
        }
    }
    updateSelectedIndex(value, opts = { emitEvent: true }) {
        const index = isNotNil(value === null || value === void 0 ? void 0 : value.id) ? this._sortedQualitativeValues.findIndex(qv => qv.id === value.id) : -1;
        if (this.selectedIndex !== index) {
            this.selectedIndex = index;
            if (this.selectedIndex > this.maxVisibleButtons) {
                this.showAllButtons = true;
            }
            if (!opts || opts.emitEvent !== false)
                this.markForCheck();
        }
    }
    checkIfTouched() {
        if (this.formControl.touched) {
            this.markForCheck();
            this._onTouchedCallback();
        }
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Function)
], PmfmQvFormField.prototype, "displayWith", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], PmfmQvFormField.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmQvFormField.prototype, "pmfm", void 0);
__decorate([
    Input(),
    __metadata("design:type", UntypedFormControl)
], PmfmQvFormField.prototype, "formControl", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PmfmQvFormField.prototype, "formControlName", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PmfmQvFormField.prototype, "placeholder", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PmfmQvFormField.prototype, "floatLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PmfmQvFormField.prototype, "appearance", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], PmfmQvFormField.prototype, "required", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmQvFormField.prototype, "readonly", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmQvFormField.prototype, "compact", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmQvFormField.prototype, "clearable", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PmfmQvFormField.prototype, "style", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], PmfmQvFormField.prototype, "searchAttributes", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PmfmQvFormField.prototype, "sortAttribute", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], PmfmQvFormField.prototype, "autofocus", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], PmfmQvFormField.prototype, "maxVisibleButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], PmfmQvFormField.prototype, "buttonsColCount", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], PmfmQvFormField.prototype, "showButtonIcons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], PmfmQvFormField.prototype, "tabindex", null);
__decorate([
    Output('keyup.enter'),
    __metadata("design:type", Object)
], PmfmQvFormField.prototype, "onPressEnter", void 0);
__decorate([
    Output('focus'),
    __metadata("design:type", Object)
], PmfmQvFormField.prototype, "focused", void 0);
__decorate([
    Output('blur'),
    __metadata("design:type", Object)
], PmfmQvFormField.prototype, "blurred", void 0);
__decorate([
    Output('click'),
    __metadata("design:type", Object)
], PmfmQvFormField.prototype, "clicked", void 0);
__decorate([
    ViewChild('matInput'),
    __metadata("design:type", ElementRef)
], PmfmQvFormField.prototype, "matInput", void 0);
__decorate([
    ViewChildren('button'),
    __metadata("design:type", QueryList)
], PmfmQvFormField.prototype, "buttons", void 0);
PmfmQvFormField = PmfmQvFormField_1 = __decorate([
    Component({
        selector: 'app-pmfm-qv-field',
        styleUrls: ['./pmfm-qv.form-field.component.scss'],
        templateUrl: './pmfm-qv.form-field.component.html',
        providers: [
            {
                provide: NG_VALUE_ACCESSOR,
                useExisting: forwardRef(() => PmfmQvFormField_1),
                multi: true
            }
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __param(2, Optional()),
    __metadata("design:paramtypes", [LocalSettingsService,
        ChangeDetectorRef,
        FormGroupDirective])
], PmfmQvFormField);
export { PmfmQvFormField };
//# sourceMappingURL=pmfm-qv.form-field.component.js.map