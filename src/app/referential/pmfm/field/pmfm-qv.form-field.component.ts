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
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { merge, Observable, of } from 'rxjs';
import { filter, map, takeUntil, tap } from 'rxjs/operators';

import { ControlValueAccessor, FormGroupDirective, NG_VALUE_ACCESSOR, UntypedFormControl, Validators } from '@angular/forms';
import { MatFormFieldAppearance } from '@angular/material/form-field';

import {
  AppFloatLabelType,
  AppFormUtils,
  focusInput,
  InputElement,
  IReferentialRef,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  LocalSettingsService,
  ReferentialRef,
  referentialToString,
  ReferentialUtils,
  selectInputRange,
  SharedValidators,
  sort,
  StatusIds,
  suggestFromArray,
  toBoolean,
  toNumber,
} from '@sumaris-net/ngx-components';
import { PmfmIds } from '../../services/model/model.enum';
import { IPmfm, PmfmUtils } from '../../services/model/pmfm.model';
import { IonButton } from '@ionic/angular';

export declare type PmfmQvFormFieldStyle = 'autocomplete' | 'select' | 'button';

@Component({
  selector: 'app-pmfm-qv-field',
  styleUrls: ['./pmfm-qv.form-field.component.scss'],
  templateUrl: './pmfm-qv.form-field.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PmfmQvFormField),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PmfmQvFormField implements OnInit, OnDestroy, ControlValueAccessor, InputElement {
  private _onChangeCallback = (_: any) => {};
  private _onTouchedCallback = () => {};
  private _implicitValue: IReferentialRef | any;
  private destroySubject = new EventEmitter(true);
  private _qualitativeValues: IReferentialRef[];
  private _sortedQualitativeValues: IReferentialRef[];

  protected _displayValue = '';
  protected _items$: Observable<IReferentialRef[]>;
  protected _tabindex: number;

  onShowDropdown = new EventEmitter<Event>(true);
  selectedIndex = -1;
  showAllButtons = false;

  get nativeElement(): any {
    return this.matInput && this.matInput.nativeElement;
  }

  get sortedQualitativeValues(): any {
    return this._sortedQualitativeValues;
  }

  @Input()
  displayWith: (obj: ReferentialRef | any) => string;

  @Input() mobile: boolean;
  @Input() pmfm: IPmfm;
  @Input() formControl: UntypedFormControl;
  @Input() formControlName: string;
  @Input() placeholder: string;
  @Input() floatLabel: AppFloatLabelType = 'auto';
  @Input() appearance: MatFormFieldAppearance;
  @Input() required: boolean;
  @Input() readonly = false;
  @Input() compact = false;
  @Input() clearable = false;
  @Input() style: PmfmQvFormFieldStyle;
  @Input() searchAttributes: string[];
  @Input() sortAttribute: string;
  @Input() autofocus: boolean;
  @Input() maxVisibleButtons: number;
  @Input() buttonsColCount: number;
  @Input() showButtonIcons: boolean;

  @Input() set tabindex(value: number) {
    this._tabindex = value;
    this.markForCheck();
  }

  get tabindex(): number {
    return this._tabindex;
  }

  get disabled(): boolean {
    return this.formControl.disabled;
  }

  @Output('keyup.enter') onPressEnter = new EventEmitter<any>();
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output('focus') focused = new EventEmitter<FocusEvent>();
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output('blur') blurred = new EventEmitter<FocusEvent>();
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output('click') clicked = new EventEmitter<Event>();

  @ViewChild('matInput') matInput: ElementRef;
  @ViewChildren('button') buttons: QueryList<IonButton>;

  constructor(
    private settings: LocalSettingsService,
    private cd: ChangeDetectorRef,
    @Optional() private formGroupDir: FormGroupDirective
  ) {
    this.mobile = settings.mobile;
  }

  ngOnInit() {
    // Set defaults
    this.style = this.style || (this.mobile ? 'select' : 'autocomplete');

    this.formControl =
      this.formControl || (this.formControlName && this.formGroupDir && (this.formGroupDir.form.get(this.formControlName) as UntypedFormControl));
    if (!this.formControl) throw new Error("Missing mandatory attribute 'formControl' or 'formControlName' in <app-pmfm-qv-field>.");

    if (!this.pmfm) throw new Error("Missing mandatory attribute 'pmfm' in <mat-qv-field>.");
    let qualitativeValues: IReferentialRef[] = this.pmfm.qualitativeValues || [];
    if (!qualitativeValues.length && PmfmUtils.isFullPmfm(this.pmfm)) {
      // Get qualitative values from parameter
      qualitativeValues = this.pmfm.parameter?.qualitativeValues || [];
      if (!qualitativeValues.length) {
        console.warn(
          `Pmfm {id: ${this.pmfm.id}, label: '${this.pmfm.label}'} has no qualitative values, neither the parent PmfmStrategy!`,
          this.pmfm
        );
      }
    }
    // Exclude disabled values
    this._qualitativeValues = qualitativeValues.filter((qv) => qv.statusId !== StatusIds.DISABLE);

    this.required = toBoolean(this.required, this.pmfm.required || false);

    this.formControl.setValidators(this.required ? [Validators.required, SharedValidators.entity] : SharedValidators.entity);

    const attributes = this.settings.getFieldDisplayAttributes('qualitativeValue', ['label', 'name']);
    const displayAttributes = this.compact && attributes.length > 1 ? ['label'] : attributes;
    this.searchAttributes = (isNotEmptyArray(this.searchAttributes) && this.searchAttributes) || attributes;
    this.sortAttribute = isNotNil(this.sortAttribute) ? this.sortAttribute : this.style === 'button' ? 'name' : attributes[0];

    // Sort values (but keep original order if LANDING/DISCARD or mobile)
    this._sortedQualitativeValues =
      this.mobile || this.pmfm.id === PmfmIds.DISCARD_OR_LANDING
        ? this._qualitativeValues
        : sort(this._qualitativeValues, this.sortAttribute, { numeric: true, sensitivity: 'base' });

    this.placeholder = this.placeholder || PmfmUtils.getPmfmName(this.pmfm, { withUnit: !this.compact });
    this.displayWith = this.displayWith || ((obj) => referentialToString(obj, displayAttributes));
    this.clearable = this.compact ? false : this.clearable;

    // On desktop, manage autocomplete
    if (!this.mobile) {
      if (!this._sortedQualitativeValues.length) {
        this._items$ = of([]);
      } else {
        this._items$ = merge(
          this.onShowDropdown.pipe(
            filter((event) => !event.defaultPrevented),
            map((_) => this._sortedQualitativeValues)
          ),
          this.formControl.valueChanges.pipe(
            filter(ReferentialUtils.isEmpty),
            map((value) =>
              suggestFromArray(this._sortedQualitativeValues, value, {
                searchAttributes: this.searchAttributes,
              })
            ),
            map((res) => res && res.data),
            tap((items) => this.updateImplicitValue(items))
          )
        ).pipe(takeUntil(this.destroySubject));
      }
    }

    // If button, listen enable/disable changes (hack using statusChanges)
    if (this.style === 'button') {
      this.maxVisibleButtons = toNumber(this.maxVisibleButtons, 4);
      this.buttonsColCount = toNumber(this.buttonsColCount, Math.min(this.maxVisibleButtons, 4));
      if (this._qualitativeValues.length <= this.maxVisibleButtons) {
        this.maxVisibleButtons = 999; // Hide the expand button
      }

      this.formControl.statusChanges.pipe(takeUntil(this.destroySubject)).subscribe(() => {
        this.updateSelectedIndex(this.value, { emitEvent: false /*done after*/ });
        this.markForCheck();
      });
    }
  }

  ngOnDestroy(): void {
    this.destroySubject.emit();
  }

  get value(): any {
    return this.formControl.value;
  }

  writeValue(value: any, event?: Event) {
    if (value !== this.formControl.value) {
      this.formControl.patchValue(value, { emitEvent: false });
      this._onChangeCallback(value);
    }

    if (this.style === 'button') {
      this.updateSelectedIndex(value);

      if (event) this.onPressEnter.emit(event);
    }
  }

  registerOnChange(fn: any): void {
    this._onChangeCallback = fn;
  }

  registerOnTouched(fn: any): void {
    this._onTouchedCallback = fn;
  }

  setDisabledState(isDisabled: boolean): void {}

  _onClick(event: MouseEvent) {
    this.clicked.emit(event);
    this.onShowDropdown.emit(event);
  }

  filterInputTextFocusEvent(event: FocusEvent) {
    if (!event || event.defaultPrevented) return;

    // Ignore event from mat-option
    if (event.relatedTarget instanceof HTMLElement && event.relatedTarget.tagName === 'MAT-OPTION') {
      event.preventDefault();
      if (event.stopPropagation) event.stopPropagation();
      event.returnValue = false;

      // DEBUG
      //if (this.debug) console.debug(this.logPrefix + ' Cancelling focus event');

      return false;
    }

    // DEBUG
    //if (this.debug) console.debug(this.logPrefix + ' Select input content');
    const hasContent = isNotNilOrBlank((event.target as any)?.value);

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

  filterInputTextBlurEvent(event: FocusEvent) {
    if (!event || event.defaultPrevented) return;

    // Ignore event from mat-option
    if (event.relatedTarget instanceof HTMLElement && event.relatedTarget.tagName === 'MAT-OPTION') {
      event.preventDefault();
      if (event.stopPropagation) event.stopPropagation();
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
    selectInputRange(event.target as any, 0, 0);

    this.blurred.emit(event);
    return true;
  }

  filterMatSelectFocusEvent(event: FocusEvent) {
    if (!event || event.defaultPrevented) return;
    // DEBUG
    // console.debug(this.logPrefix + " Received <mat-select> focus event", event);
    this.focused.emit(event);
  }

  filterMatSelectBlurEvent(event: FocusEvent) {
    if (!event || event.defaultPrevented) return;

    // DEBUG
    // console.debug(this.logPrefix + " Received <mat-select> blur event", event);

    if (
      event.relatedTarget instanceof HTMLElement &&
      // Ignore event from mat-option
      (event.relatedTarget.tagName === 'MAT-OPTION' ||
        (event.relatedTarget.tagName === 'INPUT' && event.relatedTarget.classList.contains('searchbar-input')))
    ) {
      event.preventDefault();
      if (event.stopPropagation) event.stopPropagation();
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

  getQvId(item: ReferentialRef) {
    return item.id;
  }

  compareWith = ReferentialUtils.equals;

  selectInputContent = AppFormUtils.selectInputContent;

  /* -- protected methods -- */

  protected updateImplicitValue(res: any[]) {
    // Store implicit value (will use it onBlur if not other value selected)
    if (res && res.length === 1) {
      this._implicitValue = res[0];
      this.formControl.setErrors(null);
    } else {
      this._implicitValue = undefined;
    }
  }

  protected updateSelectedIndex(value: any, opts = { emitEvent: true }) {
    const index = isNotNil(value?.id) ? this._sortedQualitativeValues.findIndex((qv) => qv.id === value.id) : -1;
    if (this.selectedIndex !== index) {
      this.selectedIndex = index;
      if (this.selectedIndex > this.maxVisibleButtons) {
        this.showAllButtons = true;
      }

      if (!opts || opts.emitEvent !== false) this.markForCheck();
    }
  }

  protected checkIfTouched() {
    if (this.formControl.touched) {
      this.markForCheck();
      this._onTouchedCallback();
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
