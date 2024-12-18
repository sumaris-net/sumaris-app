import {
  booleanAttribute,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  numberAttribute,
  OnDestroy,
  OnInit,
  Optional,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
// import { setTimeout } from '@rx-angular/cdk/zone-less/browser';
import {
  AbstractControl,
  ControlValueAccessor,
  FormGroupDirective,
  NG_VALUE_ACCESSOR,
  UntypedFormArray,
  UntypedFormBuilder,
  UntypedFormControl,
} from '@angular/forms';
import {
  AppFloatLabelType,
  AppFormArray,
  filterNumberInput,
  focusInput,
  InputElement,
  IReferentialRef,
  isNil,
  isNilOrBlank,
  isNotNil,
  isNotNilOrBlank,
  LocalSettingsService,
  MatDateTime,
  selectInputContentFromEvent,
  setTabIndex,
  SuggestFn,
  toBoolean,
  toNumber,
} from '@sumaris-net/ngx-components';
import { IPmfm, PmfmUtils } from '../../services/model/pmfm.model';
import { PmfmValidators } from '../../services/validator/pmfm.validators';
import { PmfmLabelPatterns, UnitLabel, UnitLabelPatterns } from '../../services/model/model.enum';
import { PmfmQvFormFieldStyle } from '@app/referential/pmfm/field/pmfm-qv.form-field.component';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
import { Subscription } from 'rxjs';
import { RxState } from '@rx-angular/state';
import { filter, map } from 'rxjs/operators';
import { setTimeout } from '@rx-angular/cdk/zone-less/browser';
import { MatIconButton } from '@angular/material/button';

const noop = () => {};

export declare type PmfmFormFieldStyle = PmfmQvFormFieldStyle | 'radio' | 'checkbox';

export interface PmfmFormFieldState {
  type: string;
  pmfm: IPmfm;
  controlName: string;
  control: AbstractControl;
}

@Component({
  selector: 'app-pmfm-field',
  styleUrls: ['./pmfm.form-field.component.scss'],
  templateUrl: './pmfm.form-field.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PmfmFormField),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PmfmFormField extends RxState<PmfmFormFieldState> implements OnInit, OnDestroy, ControlValueAccessor, InputElement {
  private _onChangeCallback: (_: any) => void = noop;
  private _onTouchedCallback: () => void = noop;
  private _statusChangesSubscription: Subscription;

  protected type$ = this.select('type');
  protected control$ = this.select('control');
  protected numberInputStep: string;
  protected arrayEditingIndex: number = undefined;
  @ViewChild(MatDateTime) matDateTime: MatDateTime;

  /**
   * Same as `formControl`, but avoid to activate the Angular directive
   */
  @Input() set control(value: AbstractControl) {
    this.set('control', (_) => value);
  }

  get control(): AbstractControl {
    return this.get('control');
  }

  /**
   * Same as `formControlName`, but avoid to activate the Angular directive
   */
  @Input() set controlName(value: string) {
    this.set('controlName', (_) => value);
  }

  get controlName(): string {
    return this.get('controlName');
  }

  @Input() set pmfm(value: IPmfm) {
    this.set('pmfm', (_) => value);
  }

  get pmfm(): IPmfm {
    return this.get('pmfm');
  }

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

  @Input({ transform: booleanAttribute }) mobile: boolean;
  @Input({ transform: booleanAttribute }) required: boolean;
  @Input({ transform: booleanAttribute }) readonly = false;
  @Input({ transform: booleanAttribute }) hidden = false;
  @Input() placeholder: string;
  @Input({ transform: booleanAttribute }) compact = false;
  @Input() floatLabel: AppFloatLabelType = 'auto';
  @Input({ transform: numberAttribute }) tabindex: number;
  @Input({ transform: booleanAttribute }) autofocus: boolean;
  @Input() style: PmfmFormFieldStyle;
  @Input({ transform: booleanAttribute }) showButtonIcons: boolean;
  @Input({ transform: numberAttribute }) maxVisibleButtons: number;
  @Input({ transform: numberAttribute }) acquisitionNumber: number;
  @Input() defaultLatitudeSign: '+' | '-';
  @Input() defaultLongitudeSign: '+' | '-';
  @Input() i18nPrefix: string;
  @Input() i18nSuffix: string;
  @Input() qualitativeValueAttributes: string[];
  @Input({ transform: booleanAttribute }) disableRipple = false;
  @Input() panelClass: string;
  @Input() panelWidth: string;
  @Input() suggestFn: SuggestFn<IReferentialRef, any>;

  // When async validator (e.g. BatchForm), force update when error detected
  @Input({ transform: booleanAttribute }) listenStatusChanges = false;
  @Input({ transform: booleanAttribute }) selectInputContentOnFocus = false;

  set type(value: string) {
    this.set('type', (_) => value);
  }

  get type(): string {
    return this.get('type');
  }

  /**
   * @deprecated Use panelClass instead
   */
  @Input({ alias: 'class' }) set classList(value: string) {
    this.panelClass = value;
  }
  get classList(): string {
    return this.panelClass;
  }

  @Output('app.keyup.enter') onKeyupEnter = new EventEmitter<any>();
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output('focus') focused = new EventEmitter<FocusEvent>();
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output('blur') blurred = new EventEmitter<FocusEvent>();
  // eslint-disable-next-line @angular-eslint/no-output-native
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
  @ViewChildren('pmfmField') pmfmFields: QueryList<PmfmFormField>;
  @ViewChild('addButton') addButton: MatIconButton;

  constructor(
    protected settings: LocalSettingsService,
    protected cd: ChangeDetectorRef,
    protected formBuilder: UntypedFormBuilder,
    protected pmfmNamePipe: PmfmNamePipe,
    @Optional() private formGroupDir: FormGroupDirective
  ) {
    super();
    this.mobile = settings.mobile;

    // Fill controlName using the pmfm
    this.connect(
      'controlName',
      this.select('pmfm').pipe(
        filter(isNotNil),
        map((pmfm) => pmfm.id?.toString()),
        filter(isNotNilOrBlank)
      )
    );

    // get control from controlName
    if (this.formGroupDir) {
      this.connect(
        'control',
        this.select('controlName').pipe(
          filter(isNotNilOrBlank),
          map((controlName) => this.formGroupDir.form.get(controlName)),
          filter(isNotNil)
        )
      );
    }
  }

  ngOnInit() {
    this.autofocus = this.autofocus ?? false;
    this.connect(
      'type',
      this.select(['control', 'pmfm'], (_) => _).pipe(
        //debounceTime(1000),
        map(({ pmfm, control }) => {
          if (!pmfm) throw new Error("Missing mandatory attribute 'pmfm' in <app-pmfm-field>.");
          if (!control) throw new Error("Missing mandatory attribute 'formControl' or 'formControlName' in <app-pmfm-field>.");

          this._statusChangesSubscription?.unsubscribe();

          // Default values
          this.required = toBoolean(this.required, pmfm.required);

          if (control instanceof UntypedFormArray) {
            // Make sure to get an App form array (that can be resized)
            if (!(control instanceof AppFormArray))
              throw new Error('Please use AppFormArray instead of UntypedFormArray - check the validator service');

            this.acquisitionNumber = toNumber(this.acquisitionNumber, PmfmUtils.isDenormalizedPmfm(this.pmfm) ? this.pmfm.acquisitionNumber : -1);
            if (control.length === 0) control.resize(1);

            return 'array';
          } else if (control instanceof UntypedFormControl) {
            // DEBUG
            //if (PmfmUtils.isWeight(pmfm)) console.debug('[pmfm-form-field] Configuring for the pmfm: ' + pmfm.label);

            this.acquisitionNumber = 1; // Force to 1

            control.setValidators(PmfmValidators.create(pmfm));

            // Force a refresh, when control status changed (useful in some case - e.g. in BatchForm, weight pmfms can be updated with `opts={emitEvent: false}` )
            if (this.listenStatusChanges) {
              this._statusChangesSubscription = control.statusChanges.subscribe((_) => this.markForCheck());
            }

            // Default values
            this.placeholder =
              this.placeholder ||
              this.pmfmNamePipe.transform(pmfm, {
                withUnit: !this.compact,
                i18nPrefix: this.i18nPrefix,
                i18nContext: this.i18nSuffix,
              });

            // Compute the field type (use special case for Latitude/Longitude)
            let type = pmfm.type;
            if (this.hidden || pmfm.hidden) {
              type = 'hidden';
            } else if (type === 'double') {
              if (PmfmLabelPatterns.LATITUDE.test(pmfm.label)) {
                type = 'latitude';
              } else if (PmfmLabelPatterns.LONGITUDE.test(pmfm.label)) {
                type = 'longitude';
              } else if (pmfm.unitLabel === UnitLabel.DECIMAL_HOURS || UnitLabelPatterns.DECIMAL_HOURS.test(pmfm.unitLabel)) {
                type = 'duration';
              } else {
                this.numberInputStep = this.computeNumberInputStep(pmfm);
              }
            } else if (type === 'date') {
              if (pmfm.unitLabel === UnitLabel.DATE_TIME || UnitLabelPatterns.DATE_TIME.test(pmfm.unitLabel)) {
                type = 'dateTime';
              }
            }

            // Update tab index
            this.updateTabIndex();

            this.cd.detectChanges();

            return type;
          } else {
            throw new Error('Unknown control type: ' + control.constructor.name);
          }
        })
      )
    );
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this._statusChangesSubscription?.unsubscribe();
  }

  writeValue(value: any): void {
    if (this.type === 'array') {
      if (Array.isArray(value) && value !== this.control.value) {
        this.control.patchValue(value, { emitEvent: false });
        this._onChangeCallback(value);
      }
    } else {
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
      console.warn('Cannot focus an hidden measurement field!');
    } else if (this.matInput) {
      focusInput(this.matInput);
    } else if (this.pmfmFields.length) {
      this.pmfmFields.get(0).focus();
    }
  }

  /* -- protected method -- */

  protected onFocusInput(event: FocusEvent) {
    if (this.selectInputContentOnFocus) {
      selectInputContentFromEvent(event);
    }
    this.focused.emit(event);
  }

  protected computeNumberInputStep(pmfm: IPmfm): string {
    if (this.mobile && pmfm.type === 'double') {
      // Workaround for mobile (e.g. to force iOS to open the numeric keyboard)
      // Cf issue #856
      this.numberInputStep = 'any';
    } else {
      // FIXME: choisir la valeur min, ou vide ? - cf issue #554
      // return PmfmUtils.getOrComputePrecision(pmfm, 1)
      return PmfmUtils.getOrComputePrecision(pmfm, null)?.toString() || '';
    }
  }

  protected updateTabIndex() {
    if (isNil(this.tabindex) || this.tabindex === -1) return;
    setTimeout(() => {
      if (!this.matInput) return;
      setTabIndex(this.matInput, this.tabindex);
      this.markForCheck();
    });
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected formArrayAdd(event: UIEvent) {
    const autofocus = this.autofocus;
    this.autofocus = false;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    this.formArray.add(null, { emitEvent: false });
    this.arrayEditingIndex = this.formArray.length - 1;

    // Let the time for fields validation, then restore autofocus
    if (autofocus) {
      setTimeout(() => {
        this.autofocus = autofocus;
        this.markForCheck();
      }, 250);
    } else if (!this.compact) {
      setTimeout(() => {
        this.formArrayFocusAt(null, this.arrayEditingIndex);
      }, 250);
    }
  }

  protected formArrayRemoveAt(index: number, opts?: { markAsDirty: boolean }) {
    this.formArray.removeAt(index);
    if (!opts || opts.markAsDirty !== false) this.formArray.markAsDirty();
    this.markForCheck();
  }

  protected formArrayRemoveEmptyOnFocusLost(event: UIEvent, index: number) {
    if (!this.compact) return; // Skip if not in compact mode

    event.stopPropagation();

    // Remove when an empty field lost focus
    setTimeout(() => {
      const control = this.formArray.at(index);
      // If empty: remove it
      if (control && isNilOrBlank(control.value)) {
        this.formArray.removeAt(index);
        this.markForCheck();
      }
    }, 250);
  }

  protected formArrayFocusAt(event: KeyboardEvent | undefined, index: number) {
    if (index >= 0 && index <= this.pmfmFields.length - 1) {
      event?.preventDefault();
      event?.stopPropagation();
      this.pmfmFields.get(index)?.focus();
    } else if (this.addButton) {
      event?.preventDefault();
      event?.stopPropagation();
      setTimeout(() => {
        this.addButton.focus('keyboard');
        this.markForCheck();
      });
    }
  }
}
