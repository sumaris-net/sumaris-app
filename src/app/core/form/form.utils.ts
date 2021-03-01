import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn
} from "@angular/forms";
import {isMoment} from "moment";
import {Entity} from "../services/model/entity.model";
import {timer} from "rxjs";
import {filter, first} from "rxjs/operators";
import {SharedFormArrayValidators} from "../../shared/validator/validators";
import {isNil, nullIfUndefined, round, sleep, toBoolean} from "../../shared/functions";
import {filterNumberInput, selectInputContent} from "../../shared/inputs";
import {toDateISOString} from "../../shared/dates";

export declare type IAppFormFactory = () => IAppForm;

export interface IAppForm  {
  invalid: boolean;
  valid: boolean;
  dirty: boolean;
  empty?: boolean;
  pending: boolean;
  error?: string;
  enabled: boolean;
  disabled: boolean;

  disable(opts?: {onlySelf?: boolean, emitEvent?: boolean; });
  enable(opts?: {onlySelf?: boolean, emitEvent?: boolean; });

  markAsPristine(opts?: {onlySelf?: boolean, emitEvent?: boolean; });
  markAsUntouched(opts?: {onlySelf?: boolean, emitEvent?: boolean; });
  markAsTouched(opts?: {onlySelf?: boolean, emitEvent?: boolean; });
  markAsDirty(opts?: {onlySelf?: boolean, emitEvent?: boolean; });
}

/**
 * A form that do nothing
 */
export class AppNullForm implements IAppForm {
  readonly invalid = false;
  readonly valid = false;
  readonly dirty = false;
  readonly empty = true;
  readonly pending = false;
  readonly error = null;
  readonly enabled = false;
  get disabled(): boolean {
    return !this.enabled;
  }

  disable(opts?: {onlySelf?: boolean, emitEvent?: boolean; }){}
  enable(opts?: {onlySelf?: boolean, emitEvent?: boolean; }){}

  markAsPristine(opts?: {onlySelf?: boolean, emitEvent?: boolean; }){}
  markAsUntouched(opts?: {onlySelf?: boolean, emitEvent?: boolean; }){}
  markAsTouched(opts?: {onlySelf?: boolean, emitEvent?: boolean; }){}
  markAsDirty(opts?: {onlySelf?: boolean, emitEvent?: boolean; }){}
}

export class AppFormHolder<F extends IAppForm = IAppForm> implements IAppForm {
  static NULL_FORM = new AppNullForm();

  constructor(private getter: () => F) {
  }

  private get delegate(): IAppForm {
    return this.getter() || AppFormHolder.NULL_FORM;
  }

  async waitDelegate(opts?: {checkTimeMs?: number; maxTimeoutMs?: number; startTime?: number}): Promise<F> {
    const content = this.getter();
    if (!content) {
      if (opts && opts.maxTimeoutMs && opts.startTime && (Date.now() >= opts.startTime + opts.maxTimeoutMs)) {
        throw new Error("Timeout exception. Cannot get form instance");
      }
      await sleep(opts && opts.checkTimeMs || 100);
      return this.waitDelegate({startTime: Date.now(), ...opts}); // Loop
    }
    return content;
  }

  /* -- delegated methods -- */
  get enabled(): boolean {
    return this.delegate.enabled;
  }
  get disabled(): boolean {
    return this.delegate.disabled;
  }
  get error(): string {
    return this.delegate.error;
  }
  get invalid(): boolean {
    return this.delegate.invalid;
  }
  get valid(): boolean {
    return this.delegate.valid;
  }
  get dirty(): boolean {
    return this.delegate.dirty;
  }
  get empty(): boolean {
    return this.delegate.empty;
  }
  get pending(): boolean {
    return this.delegate.pending;
  }
  disable(opts?: {onlySelf?: boolean, emitEvent?: boolean; }) {
    return this.delegate.disable(opts);
  }
  enable(opts?: {onlySelf?: boolean, emitEvent?: boolean; }) {
    return this.delegate.enable(opts);
  }
  markAsPristine(opts?: {onlySelf?: boolean, emitEvent?: boolean; }) {
    return this.delegate.markAsPristine(opts);
  }
  markAsUntouched(opts?: {onlySelf?: boolean, emitEvent?: boolean; }) {
    return this.delegate.markAsUntouched(opts);
  }
  markAsTouched(opts?: {onlySelf?: boolean, emitEvent?: boolean; }) {
    return this.delegate.markAsTouched(opts);
  }
  markAsDirty(opts?: {onlySelf?: boolean, emitEvent?: boolean; }) {
    return this.delegate.markAsDirty(opts);
  }
}

// TODO continue to use this kind of declaration ?
export class AppFormUtils {
  static copyForm2Entity = copyForm2Entity;
  static copyEntity2Form = copyEntity2Form;
  static getFormValueFromEntity = getFormValueFromEntity;
  static logFormErrors = logFormErrors;
  static getControlFromPath = getControlFromPath;
  static filterNumberInput = filterNumberInput;
  static disableControls = disableControls;
  static selectInputContent = selectInputContent;
  static markAsTouched = markAsTouched;
  static markAsUntouched = markAsUntouched;
  static waitWhilePending = waitWhilePending;
  static updateValueAndValidity = updateValueAndValidity;

  static getFormErrors = getFormErrors;

  // ArrayForm
  static addValueInArray = addValueInArray;
  static removeValueInArray = removeValueInArray;
  static resizeArray = resizeArray;
  static clearValueInArray = clearValueInArray;

  // Calculated fields
  static calculatedSuffix = 'Calculated';
  static isControlHasInput = isControlHasInput;
  static setCalculatedValue = setCalculatedValue;
  static resetCalculatedValue = resetCalculatedValue;

}

/**
 * Fill an entity using the given form value
 * @param source a source form group
 * @param target an entity to fill
 */
export function copyForm2Entity(source: FormGroup, target: any): Object {
  target = target || {};
  for (const key in source.controls) {
    const control = source.controls[key];
    if (control instanceof FormGroup) {
      target[key] = this.copyForm2Entity(control as FormGroup, target[key]);
    } else {
      // Read the form value
      target[key] = control.value;
    }
  }
  return target;
}

/**
 * Fill a form using a source entity
 * @param target
 * @param source
 */
export function copyEntity2Form(source: any, target: FormGroup, opts?: { emitEvent?: boolean; onlySelf?: boolean; }) {
  const json = getFormValueFromEntity(source, target);
  target.patchValue(json, opts);
}

/**
 * Transform an entity into a simple object, compatible with the given form
 * @param source an entity (or subentity)
 * @param form
 */
export function getFormValueFromEntity(source: any, form: FormGroup): { [key: string]: any } {
  const value = {};
  for (const key in form.controls) {
    // If sub-group: recursive call
    if (form.controls[key] instanceof FormGroup) {
      value[key] = getFormValueFromEntity(source[key] || {}, form.controls[key] as FormGroup);
    }
    // If array: try to convert using the first sub-group found
    else if (form.controls[key] instanceof FormArray) {
      if (source[key] instanceof Array) {
        // Try to transform object to key/value
        const control = form.controls[key] as FormArray;
        if (control.length > 0) {
          // Use the first form group, as model
          const itemControl = control.at(0);
          if (itemControl instanceof FormGroup) {
            value[key] = (source[key] || []).map(item => getFormValueFromEntity(item || {}, itemControl));
            if (value[key].length !== control.length) {
              console.warn(`WARN: please resize the FormArray '${key}' to the same length of the input array`);
            }
          }
          else if (itemControl instanceof FormControl){
            value[key] = (source[key] || []).slice(); // copy input values
            // Add empty values if need
            if (value[key].length < control.length) {
              console.warn(`WARN: Adding null value to array values`);
              for (let i = value[key].length; i < control.length; i++) {
                value[key].push(null);
              }
            }
          }
        }
      }
      else if (source[key] === undefined) {
        console.warn(`Invalid value for property '${key}'. Unable to set form control. Expected array but found: undefined`);
        value[key] = [];
      }
    }
    // Date
    else if (isMoment(source[key])) {
      value[key] = toDateISOString(source[key]);
    }
    // Any other control: replace undefined by null value
    else {
      value[key] = nullIfUndefined(source[key]); // undefined not authorized as control value
    }
  }
  return value;
}

export function logFormErrors(control: AbstractControl, logPrefix?: string, path?: string) {
  if (control.valid) return;
  logPrefix = logPrefix || "";
  // Form group
  if (control instanceof FormGroup) {
    if (!path) console.warn(`${logPrefix} Form errors:`);
    if (control.errors) {
      Object.keys(control.errors).forEach(error =>
        console.warn(`${logPrefix} -> ${path || ''} (${error})`)
      );
    }
    if (control.controls) {
      Object.keys(control.controls).forEach(child =>
        logFormErrors(control.controls[child], logPrefix, (path ? `${path}/${child}` : child)) // Recursive call
      );
    }
  }
  // Form array
  else if (control instanceof FormArray) {
    if (control.errors) {
      Object.keys(control.errors).forEach(error =>
        console.warn(`${logPrefix} -> ${path || ''} (${error})`)
      );
    }
    control.controls.forEach((child, index) => {
      logFormErrors(child, logPrefix, (path ? `${path}#${index}` : `#${index}`)); // Recursive call
    });
  }
  // Other control's errors
  else if (control.errors) {
    Object.keys(control.errors).forEach(error =>
      console.warn(`${logPrefix} -> ${path || ''} (${error})`)
    );
  }
}

export interface FormErrors {
  [key: string]: ValidationErrors;
}
export function getFormErrors(control: AbstractControl, controlName?: string, result?: FormErrors): FormErrors {
  if (control.valid) return undefined;

  result = result || {};

  // Form group
  if (control instanceof FormGroup) {
    // Copy errors
    if (control.errors) {
      if (controlName) {
        result[controlName] = {
          ...control.errors
        };
      }
      else {
        result = {
          ...result,
          ...control.errors
        };
      }
    }

    // Loop on children controls
    for (const key in control.controls) {
      const child = control.controls[key];
      if (child && child.enabled) {
        getFormErrors(child, controlName ? [controlName, key].join('.') :  key, result);
      }
    }
  }
  // Form array
  else if (control instanceof FormArray) {
    control.controls.forEach((child, index) => {
      getFormErrors(child, (controlName || '') + '#' + index, result);
    });
  }
  // Other type of control
  else if (control.errors) {
    if (controlName) {
      result[controlName] = {
        ...control.errors
      };
    }
    else {
      result = {
        ...result,
        ...control.errors
      };
    }
  }
  return result;
}

export function getControlFromPath(form: FormGroup, path: string): AbstractControl {
  const i = path.indexOf('.');
  if (i === -1) {
    return form.controls[path];
  }
  const key = path.substring(0, i);
  if (form.controls[key] instanceof FormGroup) {
    return getControlFromPath((form.controls[key] as FormGroup), path.substring(i + 1));
  }
  throw new Error(`Invalid form path: '${key}' should be a form group.`);
}


export function disableControls(form: FormGroup, paths: string[], opts?: {onlySelf?: boolean; emitEvent?: boolean; }) {
  (paths || []).forEach(path => {
    const control = AppFormUtils.getControlFromPath(form, path);
    if (control) control.disable(opts);
  });
}


export function addValueInArray(arrayControl: FormArray,
                                createControl: (value?: any) => AbstractControl,
                                equals: (v1: any, v2: any) => boolean,
                                isEmpty: (value: any) => boolean,
                                value: any,
                                options?: { emitEvent: boolean; }): boolean {
  options = options || {emitEvent: true};

  let hasChanged = false;
  let index = -1;

  // Search if value already exists
  if (!isEmpty(value)) {
    index = (arrayControl.value || []).findIndex(v => equals(value, v));
  }

  // If value not exists, but last value is empty: use it
  if (index === -1 && arrayControl.length && isEmpty(arrayControl.at(arrayControl.length - 1).value)) {
    index = arrayControl.length - 1;
  }

  // Replace the existing value
  if (index !== -1) {
    if (!isEmpty(value)) {
      arrayControl.at(index).patchValue(value, options);
      hasChanged = true;
    }
  } else {
    const control = createControl(value);
    arrayControl.push(control);
    hasChanged = true;
  }

  if (hasChanged) {
    if (isNil(options.emitEvent) || options.emitEvent) {
      // Mark array control dirty
      if (!isEmpty(value)) {
        arrayControl.markAsDirty();
      }
    }
  }

  return hasChanged;
}

export function resizeArray(arrayControl: FormArray,
                            createControl: () => AbstractControl,
                            length: number): boolean {
  const hasChanged = arrayControl.length !== length;

  // Increase size
  if (arrayControl.length < length) {
    while (arrayControl.length < length) {
      arrayControl.push(createControl());
    }
  }

  // Or reduce
  else if (arrayControl.length > length) {
    while (arrayControl.length > length) {
      arrayControl.removeAt(arrayControl.length - 1);
    }
  }

  return hasChanged;
}

export function removeValueInArray(arrayControl: FormArray,
                                   isEmpty: (value: any) => boolean,
                                   index: number,
                                   opt?: {
                                     allowEmptyArray: boolean;
                                   }): boolean {
  arrayControl.removeAt(index);
  arrayControl.markAsDirty();
  return true;
}

export function clearValueInArray(arrayControl: FormArray,
                                  isEmpty: (value: any) => boolean,
                                  index: number): boolean {

  const control = arrayControl.at(index);
  if (isEmpty(control.value)) return false; // skip (not need to clear)

  if (control instanceof FormGroup) {
    AppFormUtils.copyEntity2Form({}, control);
  }
  else if (control instanceof FormArray) {
    control.setValue([]);
  }
  else {
    control.setValue(null);
  }
  arrayControl.markAsDirty();
  return true;
}

export function markAsTouched(control: AbstractControl, opts?: {onlySelf?: boolean; emitEvent?: boolean; }) {
  if (!control) return;
  if (control instanceof FormGroup) {
    markFormGroupAsTouched(control, { ...opts, onlySelf: true}); // recursive call
  }
  else if (control instanceof FormArray) {
    control.markAsTouched({onlySelf: true});
    (control.controls || []).forEach(c => markControlAsTouched(c, { ...opts, onlySelf: true})); // recursive call
  }
  else {
    control.markAsTouched({onlySelf: true});
    control.updateValueAndValidity({emitEvent: false, ...opts, onlySelf: true});
  }
}

export function markFormGroupAsTouched(form: FormGroup, opts?: {onlySelf?: boolean; emitEvent?: boolean; }) {
  if (!form) return;
  form.markAsTouched(opts);
  Object.keys(form.controls)
    .map(key => form.controls[key])
    .filter(control => control.enabled)
    .forEach(control => markControlAsTouched(control, opts));
}

export function markControlAsTouched(control: AbstractControl, opts?: {onlySelf?: boolean; emitEvent?: boolean; }) {
  if (!control) return;
  if (control instanceof FormGroup) {
    markAsTouched(control, { ...opts, onlySelf: true}); // recursive call
  }
  else if (control instanceof FormArray) {
    (control.controls || []).forEach(c => markControlAsTouched(c, { ...opts, onlySelf: true})); // recursive call
  }
  else {
    control.markAsTouched({onlySelf: true});
    control.updateValueAndValidity({emitEvent: false, ...opts, onlySelf: true});
  }
}

export function updateValueAndValidity(form: FormGroup, opts?: {onlySelf?: boolean; emitEvent?: boolean; }) {
  if (!form) return;
  form.updateValueAndValidity(opts);
  Object.keys(form.controls)
    .map(key => form.controls[key])
    .filter(control => control.enabled)
    .forEach(control => {
      if (control instanceof FormGroup) {
        updateValueAndValidity(control, {...opts, onlySelf: true}); // recursive call
      }
      else {
        control.updateValueAndValidity({...opts, onlySelf: true});
      }
    });
}

export function markAsUntouched(form: FormGroup, opts?: {onlySelf?: boolean; }) {
  if (!form) return;
  form.markAsUntouched(opts);
  Object.getOwnPropertyNames(form.controls)
    .forEach(key => {
      const control = form.get(key);
      if (control instanceof FormGroup) {
        markAsUntouched(control, {onlySelf: true}); // recursive call
      }
      else {
        control.markAsUntouched({onlySelf: true});
        control.setErrors(null);
      }
    });
}

/**
 * Wait end of async validation
 */
export function waitWhilePending<T extends {pending: boolean; }>(form: T, opts?: {
  checkPeriod?: number;
  timeout?: number;
}): Promise<any> {
  const period = opts && opts.checkPeriod || 300;
  if (!form.pending) return;
  let stop = false;
  if (opts && opts.timeout) {
    setTimeout(() => {
      console.warn(`Waiting async validator: timeout reached (after ${opts.timeout}ms)`);
      stop = true;
    }, opts.timeout);
  }
  return timer(period, period)
    .pipe(
      // For DEBUG :
      //tap(() => console.debug("Waiting async validator...", form)),
      filter(() => stop || !form.pending),
      first()
    ).toPromise();
}

export function isControlHasInput(controls: { [key:string]: AbstractControl}, controlName: string): boolean {
  // true if the control has a value and its 'calculated' control has the value 'false'
  return controls[controlName].value && !toBoolean(controls[controlName + AppFormUtils.calculatedSuffix].value, false);
}

export function setCalculatedValue(controls: { [key:string]: AbstractControl}, controlName: string, value: number | undefined) {
  // set value to control
  controls[controlName].setValue(round(value));
  // set 'calculated' control to 'true'
  controls[controlName + AppFormUtils.calculatedSuffix].setValue(true);
}

export function resetCalculatedValue(controls: { [key:string]: AbstractControl}, controlName: string) {
  if (!AppFormUtils.isControlHasInput(controls, controlName)) {
    // set undefined only if control already calculated
    AppFormUtils.setCalculatedValue(controls, controlName, undefined);
  }
}

export declare type FormArrayHelperOptions = {
  allowEmptyArray: boolean;
  validators?: ValidatorFn[];
}

export class FormArrayHelper<T = Entity<any>> {

  static getOrCreateArray(
    formBuilder: FormBuilder,
    form: FormGroup,
    arrayName: string): FormArray {
    let arrayControl = form.get(arrayName) as FormArray;
    if (!arrayControl) {
      arrayControl = formBuilder.array([]);
      form.addControl(arrayName, arrayControl);
    }
    return arrayControl;
  }

  private _allowEmptyArray: boolean;
  private readonly _validators: ValidatorFn[];

  get allowEmptyArray(): boolean {
    return this._allowEmptyArray;
  }

  set allowEmptyArray(value: boolean) {
    this.setAllowEmptyArray(value);
  }

  get formArray(): FormArray {
    return this._formArray;
  }

  constructor(
    private readonly _formArray: FormArray,
    private createControl: (value?: T) => AbstractControl,
    private equals: (v1: T, v2: T) => boolean,
    private isEmpty: (value: T) => boolean,
    options?: FormArrayHelperOptions
  ) {
    this._validators = options && options.validators;

    // empty array not allow by default
    this.setAllowEmptyArray(toBoolean(options && options.allowEmptyArray, false));
  }

  add(value?: T, options?: { emitEvent: boolean }): boolean {
    return addValueInArray(this._formArray, this.createControl, this.equals, this.isEmpty, value, options);
  }

  removeAt(index: number) {
    // Do not remove if last criterion
    if (!this._allowEmptyArray && this._formArray.length === 1) {
      return clearValueInArray(this._formArray, this.isEmpty, index);
    }
    else {
      return removeValueInArray(this._formArray, this.isEmpty, index);
    }
  }

  resize(length: number): boolean {
    return resizeArray(this._formArray, this.createControl, length);
  }

  clearAt(index: number): boolean {
    return clearValueInArray(this._formArray, this.isEmpty, index);
  }

  isLast(index: number): boolean {
    return (this._formArray.length - 1) === index;
  }

  removeAllEmpty() {
    let index = this._formArray.controls.findIndex(c => this.isEmpty(c.value));
    while(index !== -1) {
      this.removeAt(index);
      index = this._formArray.controls.findIndex(c => this.isEmpty(c.value));
    }
  }

  size(): number {
    return this._formArray.length;
  }

  at(index: number): AbstractControl {
    return this._formArray.at(index) as AbstractControl;
  }

  disable(opts?: {
    onlySelf?: boolean;
    emitEvent?: boolean;
  }) {
    this._formArray.controls.forEach(c => c.disable(opts));
  }

  enable(opts?: {
    onlySelf?: boolean;
    emitEvent?: boolean;
  }) {
    this._formArray.controls.forEach(c => c.enable(opts));
  }

  forEach(ite: (control: AbstractControl) => void ) {
    const size = this.size();
    for(let i = 0; i < size; i++) {
      const control = this._formArray.at(i);
      if (control) ite(control);
    }
  }

  /* -- internal methods -- */

  protected setAllowEmptyArray(value: boolean) {
    if (this._allowEmptyArray === value) return; // Skip if same

    this._allowEmptyArray = value;

    // Set required (or reste) min length validator
    if (this._allowEmptyArray) {
      this._formArray.setValidators(this._validators || null);
    }
    else {
      this._formArray.setValidators((this._validators || []).concat(SharedFormArrayValidators.requiredArrayMinLength(1)));
    }
  }
}
