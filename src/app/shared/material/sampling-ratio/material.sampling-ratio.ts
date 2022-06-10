import { ChangeDetectionStrategy, ChangeDetectorRef, Component, forwardRef, Input, OnDestroy, OnInit, Optional } from '@angular/core';
import { ControlValueAccessor, FormBuilder, FormControl, FormGroupDirective, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FloatLabelType } from '@angular/material/form-field';
import { AppFormUtils, isNil, isNotNilOrNaN } from '@sumaris-net/ngx-components';
import { filter } from 'rxjs/operators';
import { isNilOrNaN, roundHalfUp } from '@app/shared/functions';

const noop = () => {
};

export declare type SamplingRatioFormat = '%' | '1/w';

export const DEFAULT_MAX_DECIMALS = 6;

@Component({
  selector: 'mat-sampling-ratio-field',
  templateUrl: './material.sampling-ratio.html',
  styleUrls: ['./material.sampling-ratio.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: forwardRef(() => MatSamplingRatioField),
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatSamplingRatioField implements OnInit, OnDestroy, ControlValueAccessor {
  private _onChangeCallback: (_: any) => void = noop;
  private _onTouchedCallback: () => void = noop;
  private _subscription = new Subscription();
  private _disabling = false;
  private _writing = false;

  _readonly = false;
  _inputFormControl: FormControl;
  _inputMaxDecimals: number;
  _pattern: string;
  _format: SamplingRatioFormat = '%';
  _defaultPlaceholder: string;
  _placeholder: string;

  get disabled(): any {
    return this.readonly || this.formControl.disabled;
  }

  @Input() formControl: FormControl;
  @Input() formControlName: string;
  @Input() required = false;
  @Input() floatLabel: FloatLabelType = 'auto';
  @Input() tabindex: number;
  @Input() maxDecimals: number = DEFAULT_MAX_DECIMALS;
  @Input() autofocus: boolean;
  @Input('class') classList: string;

  @Input() set readonly(value: boolean){
    if (this._readonly !== value) {
      this._readonly = value;
      this.markForCheck();
    }
  }

  get readonly(): boolean {
    return this._readonly;
  }

  @Input() set placeholder(value: string){
    if (this._placeholder !== value) {
      this._placeholder = value;
      this.markForCheck();
    }
  }

  get placeholder(): string {
    return this._placeholder || this._defaultPlaceholder;
  }

  @Input() set format(value: SamplingRatioFormat) {
    if (this._format !== value) {
      this._format = value;
      this.onFormatChanged();
      this.markForCheck();
    }
  }

  get format(): SamplingRatioFormat {
    return this._format;
  }

  constructor(
    private formBuilder: FormBuilder,
    private cd: ChangeDetectorRef,
    @Optional() private formGroupDir: FormGroupDirective
  ) {
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

    this.formControl = this.formControl || this.formControlName && this.formGroupDir && this.formGroupDir.form.get(this.formControlName) as FormControl;
    if (!this.formControl) throw new Error('Missing mandatory attribute \'formControl\' or \'formControlName\' in <mat-latlong-field>.');


    this._inputFormControl = this.formBuilder.control([null]);
    this.onFormatChanged();

    this._subscription.add(
        this._inputFormControl.valueChanges
        .subscribe((value) => this.onFormChange(value))
    );

    // Listen status changes (when done outside the component  - e.g. when setErrors() is calling on the formControl)
    this._subscription.add(
      this.formControl.statusChanges
        .pipe(
          filter((_) => !this._readonly && !this._writing && !this._disabling) // Skip
        )
        .subscribe((_) => this.markForCheck())
    );
  }

  ngOnDestroy() {
    this._subscription.unsubscribe();
  }

  writeValue(obj: any): void {
    if (this._writing) return;

    const value = (typeof obj === 'string') ? parseFloat(obj.replace(/,/g, '.')) : obj;
    this._writing = true;

    let formValue: number = this.toFormValue(value);

    // DEBUG
    console.debug("[mat-sampling-ratio] formValue: " + formValue);

    this._inputFormControl.patchValue(formValue, {emitEvent: false});
    this._writing = false;
    this.markForCheck();
  }


  registerOnChange(fn: any): void {
    this._onChangeCallback = fn;
  }

  registerOnTouched(fn: any): void {
    this._onTouchedCallback = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (this._disabling) return;

    this._disabling = true;
    if (isDisabled) {
      this._inputFormControl.disable({onlySelf: true, emitEvent: false});
    } else {
      this._inputFormControl.enable({onlySelf: true, emitEvent: false});
    }
    this._disabling = false;
    this.markForCheck();
  }

  displayValue(modelValue: number): string {
    let formValue: number = this.toFormValue(modelValue);
    if (isNotNilOrNaN(modelValue)) {
      switch (this._format) {
        case '1/w':
          return `1/${formValue}`;
        case '%':
        default:
          return ''+formValue;
      }
    }
    return '';
  }

  private onFormatChanged() {
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

  private onFormChange(value: number): void {
    if (this._writing) return; // Skip if call by self
    this._writing = true;

    if (this._inputFormControl.invalid ) {
      this.formControl.markAsPending();
      this.formControl.setErrors({
        ...this.formControl.errors,
        ...this._inputFormControl.errors
      });
      this._writing = false;
      this.checkIfTouched();
      return;
    }

    let modelValue: number = null;
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
    console.debug('[mat-sampling-ratio] modelValue=', modelValue);

    // Set model value
    this.emitChange(modelValue);
    this._writing = false;
  }

  private emitChange(value: number) {
    if (this.formControl.value !== value) {

      // DEBUG
      console.debug('[mat-sampling-ratio] Emit new value: ' + value);

      // Changes comes from inside function: use the callback
      this._onChangeCallback(value);

      // Check if need to update controls
      this.checkIfTouched();
    }
  }

  private checkIfTouched(): boolean {
    if (this.formControl.touched || this._inputFormControl.touched) {
      this.markForCheck();
      this._onTouchedCallback();
      return true;
    }
    return false;
  }

  private toFormValue(value: number) : number {
    if (isNilOrNaN(value)) return null;
    switch (this.format) {
      case '1/w':
        return roundHalfUp(1 / value, this._inputMaxDecimals);
      case '%':
      default:
        return Math.min(100, roundHalfUp(value * 100, this._inputMaxDecimals));
    }
  }

  private markForCheck() {
    this.cd.markForCheck();
  }

  selectInputContent = AppFormUtils.selectInputContent;
}
