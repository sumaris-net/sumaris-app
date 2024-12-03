/**
 * See AbstractControl.status
 *
 * The validation status of the control. There are four possible
 * validation status values:
 *
 * * **VALID**: This control has passed all validation checks.
 * * **INVALID**: This control has failed at least one validation check.
 * * **PENDING**: This control is in the midst of conducting a validation check.
 * * **DISABLED**: This control is exempt from validation checks.
 *
 * These status values are mutually exclusive, so a control cannot be
 * both valid AND invalid or invalid AND disabled.
 */
import { AbstractControl, FormArray, FormControl, FormGroup, UntypedFormGroup } from '@angular/forms';
import { isNil } from '@sumaris-net/ngx-components';

export type FormControlStatus = 'VALID' | 'INVALID' | 'DISABLED' | 'PENDING';

export class AppSharedFormUtils {
  static dumpForm(form: AbstractControl): any {
    let target: any;

    if (form instanceof FormGroup) {
      target = { controls: {} };
      Object.keys(form.controls).forEach((key) => {
        const control = form.controls[key];
        target.controls[key] = this.dumpForm(control);
      });
    } else if (form instanceof FormArray) {
      target = [];
      for (let i = 0; i < form.length; i++) {
        const control = form.at(i);
        target[i] = this.dumpForm(control);
      }
    } else {
      target = { value: form.value, status: form.status };
    }

    return target;
  }

  static getFormValueOfDirtyControls(form: FormGroup): any {
    return AppSharedFormUtils.getFormValue(form, (control) => control.dirty);
  }

  static getFormValue(form: AbstractControl, controlFilter?: (control: FormControl) => boolean): any {
    // No filter: skip
    if (!controlFilter) return form.value;

    // Form group: iterate on each controls
    if (form instanceof FormGroup) {
      return Object.keys(form.controls).reduce((res, controlKey) => {
        const control = form.controls[controlKey];
        const value = this.getFormValue(control, controlFilter);
        if (value !== undefined) {
          res = res || {}; // Initialize the result
          res[controlKey] = value;
        }
        return res;
      }, undefined as any /*should return undefined if all controls are pristine */);
    }

    if (form instanceof FormControl) {
      if (controlFilter(form)) return form.value;
      return undefined;
    }

    if (form instanceof FormArray) {
      return form.controls.reduce((res, control, index) => {
        const value = this.getFormValue(control, controlFilter);
        if (value !== undefined) {
          // Create the array if not yet created, then fill with undefined value
          // At the next iteration, this array will be filled until the end.
          res = res || new Array(index).fill(undefined); // Initialize the result
          return res.concat(value);
        }
        if (res) {
          return res.concat(undefined);
        }
        return res;
      }, undefined as any /*should return undefined when all children controls are pristine */);
    }

    console.warn('Unknown form type', form);
    return undefined;
  }

  /**
   * Merges two objects deeply into a single object. Properties
   * from the second object will override those in the first object in case
   * of conflicts, while preserving other nested structures.
   *
   * @param {any} formValue1 - The first object to merge.
   * @param {any} formValue2 - The second object to merge, whose properties
   * will take precedence in case of conflicts.
   * @return {any} A new object resulting from the deep merging of the two form values.
   */
  static merge(formValue1: any, formValue2: any): any {
    if (isNil(formValue1)) {
      return formValue2 !== undefined ? formValue2 : formValue1;
    }
    if (isNil(formValue2)) {
      return formValue1 !== undefined ? formValue1 : formValue2;
    }

    // Array
    if (Array.isArray(formValue1) || Array.isArray(formValue2)) {
      if (Array.isArray(formValue1) !== Array.isArray(formValue2)) {
        console.error('[app-shared-form-utils] Cannot merge array and non-array values', formValue1, formValue2);
        return formValue1;
      }
      return new Array(Math.max(formValue1.length, formValue2.length))
        .fill(undefined)
        .map((_, index) => this.merge(formValue1[index], formValue2[index]));
    }

    // Copy value 1
    const result = { ...formValue1 };

    // Merge with value 2
    for (const key of Object.keys(formValue2)) {
      const value2 = formValue2[key];
      if (value2 !== undefined) {
        const value1 = formValue1[key];
        result[key] = this.merge(value1, value2);
      }
    }

    return result;
  }

  static isEmptyForm(form: UntypedFormGroup): boolean {
    const formValues = form.value;
    return Object.values(formValues).every(
      (value) => value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
    );
  }
}
