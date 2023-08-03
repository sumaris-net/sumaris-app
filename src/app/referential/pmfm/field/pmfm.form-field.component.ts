import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  OnDestroy,
  OnInit,
  Optional,
  Output, QueryList,
  ViewChild, ViewChildren, ViewEncapsulation
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor, FormGroup,
  FormGroupDirective,
  NG_VALUE_ACCESSOR,
  UntypedFormArray,
  UntypedFormBuilder,
  UntypedFormControl
} from '@angular/forms';
import {FloatLabelType} from '@angular/material/form-field';
import {
  AppFormArray,
  filterNumberInput,
  focusInput,
  InputElement,
  isNil, isNilOrBlank,
  LocalSettingsService,
  setTabIndex,
  toBoolean,
  toNumber
} from '@sumaris-net/ngx-components';
import {IPmfm, PmfmUtils} from '../../services/model/pmfm.model';
import {PmfmValidators} from '../../services/validator/pmfm.validators';
import {PmfmLabelPatterns, UnitLabel, UnitLabelPatterns} from '../../services/model/model.enum';
import {PmfmQvFormFieldStyle} from '@app/referential/pmfm/field/pmfm-qv.form-field.component';
import {PmfmNamePipe} from '@app/referential/pipes/pmfms.pipe';
import {Subscription} from 'rxjs';

const noop = () => {
};

export declare type PmfmFormFieldStyle = PmfmQvFormFieldStyle | 'radio' | 'checkbox' ;

@Component({
  selector: 'app-pmfm-field',
  styleUrls: ['./pmfm.form-field.component.scss'],
  templateUrl: './pmfm.form-field.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PmfmFormField),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PmfmFormField implements OnInit, OnDestroy, ControlValueAccessor, InputElement {

  private _onChangeCallback: (_: any) => void = noop;
  private _onTouchedCallback: () => void = noop;
  private _subscription = new Subscription();

  protected type: string;
  protected numberInputStep: string;
  protected arrayEditingIndex: number = undefined;

  /**
   * Same as `formControl`, but avoid to activate the Angular directive
   */
  @Input() control: AbstractControl;

  /**
   * Same as `formControlName`, but avoid to activate the Angular directive
   */
  @Input() controlName: string;

  @Input() set formControl(value: UntypedFormControl) {
    this.control = value;
  }

  get formControl(): UntypedFormControl {
    return this.control as UntypedFormControl;
  }

  @Input() set formControlName(value: string) {
    this.controlName = value;
  }

  get formControlName(): string {
    return this.controlName;
  }

  @Input() mobile: boolean;
  @Input() pmfm: IPmfm;
  @Input() required: boolean;
  @Input() readonly = false;
  @Input() hidden = false;
  @Input() placeholder: string;
  @Input() compact = false;
  @Input() floatLabel: FloatLabelType = "auto";
  @Input() tabindex: number;
  @Input() autofocus: boolean;
  @Input() style: PmfmFormFieldStyle;
  @Input() showButtonIcons: boolean;
  @Input() maxVisibleButtons: number;
  @Input() acquisitionNumber: number;
  @Input() defaultLatitudeSign: '+' | '-';
  @Input() defaultLongitudeSign: '+' | '-';
  @Input() i18nPrefix: string;
  @Input() i18nSuffix: string;

  // When async validator (e.g. BatchForm), force update when error detected
  @Input() listenStatusChanges = false;

  @Output('keyup.enter') onPressEnter = new EventEmitter<any>();
  @Output('focus') focused = new EventEmitter<FocusEvent>();
  @Output('blur') blurred = new EventEmitter<FocusEvent>();
  @Output('click') clicked = new EventEmitter<MouseEvent>();

  get value(): any {
    return this.control.value;
  }

  get latLongFormat(): string {
    return this.settings.settings.latLongFormat || 'DDMM';
  }

  get disabled(): boolean {
    return this.control?.disabled;
  }

  get formArray(): AppFormArray<any, UntypedFormControl> {
    return this.control as AppFormArray<any, UntypedFormControl>;
  }

  @ViewChild('matInput') matInput: ElementRef;

  constructor(
    protected settings: LocalSettingsService,
    protected cd: ChangeDetectorRef,
    protected formBuilder: UntypedFormBuilder,
    protected pmfmNamePipe: PmfmNamePipe,
    @Optional() private formGroupDir: FormGroupDirective
  ) {
    this.mobile = settings.mobile;
  }

  ngOnInit() {

    if (!this.pmfm) throw new Error("Missing mandatory attribute 'pmfm' in <app-pmfm-field>.");
    if (typeof this.pmfm !== 'object') throw new Error("Invalid attribute 'pmfm' in <app-pmfm-field>. Should be an object.");
    this.controlName = this.controlName || this.pmfm.id?.toString();

    let control = this.control || (this.controlName && this.formGroupDir?.form.get(this.controlName));
    if (!control) throw new Error("Missing mandatory attribute 'formControl' or 'formControlName' in <app-pmfm-field>.");

    this.required = toBoolean(this.required, this.pmfm.required);

    if (control instanceof UntypedFormArray) {
      this.control = control;
      this.acquisitionNumber = toNumber(this.acquisitionNumber, PmfmUtils.isDenormalizedPmfm(this.pmfm) ? this.pmfm.acquisitionNumber : -1);
      this.type = 'array';

      // Make sure to get an App form array (that can be resized)
      if (!(control instanceof AppFormArray)) throw new Error('Please use AppFormArray instead of UntypedFormArray - check the validator service');

      if (control.length === 0) control.resize(1);
    }
    else if (control instanceof UntypedFormControl) {
      this.control = control;
      this.acquisitionNumber = 1; // Force to 1
      control.setValidators(PmfmValidators.create(this.pmfm));

      // Force a refresh, when control status changed (useful in some case - e.g. in BatchForm, weight pmfms can be updated with `opts={emitEvent: false}` )
      if (this.listenStatusChanges) {
        this._subscription.add(
          control.statusChanges
            .subscribe((_) => this.markForCheck())
          );
      }

      this.placeholder = this.placeholder || this.pmfmNamePipe.transform(this.pmfm, {
        withUnit: !this.compact,
        i18nPrefix: this.i18nPrefix,
        i18nContext: this.i18nSuffix
      });

      this.updateTabIndex();

      // Compute the field type (use special case for Latitude/Longitude)
      let type = this.pmfm.type;
      if (this.hidden || this.pmfm.hidden) {
        type = "hidden";
      }
      else if (type === "double") {
        if (PmfmLabelPatterns.LATITUDE.test(this.pmfm.label) ) {
          type = "latitude";
        } else if (PmfmLabelPatterns.LONGITUDE.test(this.pmfm.label)) {
          type = "longitude";
        }
        else if (this.pmfm.unitLabel === UnitLabel.DECIMAL_HOURS || UnitLabelPatterns.DECIMAL_HOURS.test(this.pmfm.unitLabel)) {
          type = "duration";
        }
        else {
          this.numberInputStep = this.computeNumberInputStep(this.pmfm);
        }
      }
      else if (type === "date") {
        if (this.pmfm.unitLabel === UnitLabel.DATE_TIME || UnitLabelPatterns.DATE_TIME.test(this.pmfm.unitLabel)) {
           type = 'dateTime';
        }
      }
      this.type = type;
    }
    else {
      throw new Error('Unknown control type: ' + control.constructor.name);
    }
  }

  ngOnDestroy() {
    this._subscription.unsubscribe();
  }

  writeValue(value: any): void {
    if (this.type === 'array') {
      if (Array.isArray(value) && value !== this.control.value) {
        this.control.patchValue(value, {emitEvent: false});
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
          this.control.patchValue(value, {emitEvent: false});
          this._onChangeCallback(value);
        }
      }
    }
  }

  registerOnChange(fn: any): void {
    this._onChangeCallback = fn;
  }

  registerOnTouched(fn: any): void {
    this._onTouchedCallback = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.markForCheck();
  }

  markAsTouched() {
    if (this.control?.touched) {
      this.markForCheck();
      this._onTouchedCallback();
    }
  }

  filterNumberInput = filterNumberInput;

  filterAlphanumericalInput(event: KeyboardEvent) {
    // TODO: Add features (e.g. check against a regexp/pattern ?)
  }

  focus() {
    if (this.hidden) {
      console.warn("Cannot focus an hidden measurement field!")
    }
    else {
      focusInput(this.matInput);
    }
  }

  /* -- protected method -- */

  protected computeNumberInputStep(pmfm: IPmfm): string {
    return PmfmUtils.getOrComputePrecision(pmfm, 1)
      .toString();
  }

  protected updateTabIndex() {
    if (isNil(this.tabindex) || this.tabindex === -1) return;
    setTimeout(() => {
      if (!this.matInput) return;
      setTabIndex(this.matInput, this.tabindex);
      this.cd.markForCheck();
    });
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected formArrayAdd(event: UIEvent) {
    const autofocus = this.autofocus;
    this.autofocus = false;

    event.stopImmediatePropagation();

    this.formArray.add(null, {emitEvent: false});
    this.arrayEditingIndex = this.formArray.length - 1;

    // Let the time for fields validation
    setTimeout(() => {
        this.autofocus = autofocus;
        this.markForCheck();
    });

  }

  protected formArrayRemoveAt(index: number, opts?: {markAsDirty :boolean}) {
    this.formArray.removeAt(index);
    if (!opts || opts.markAsDirty !== false) this.formArray.markAsDirty();
    this.markForCheck();
  }

  protected formArrayRemoveEmptyOnFocusLost(event: UIEvent, index: number) {
    event.stopPropagation();
    setTimeout(() => {
      const control = this.formArray.at(index);
      // If empty: remove it
      if (isNilOrBlank(control.value)) {
        this.formArray.removeAt(index);
        this.markForCheck();
      }
    }, 250);
  }
}
