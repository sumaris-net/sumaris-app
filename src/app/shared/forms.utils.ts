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
import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

export type FormControlStatus = 'VALID'|'INVALID'|'DISABLED'|'PENDING';


export class AppSharedFormUtils {
  static dumpForm(form: AbstractControl): any {
    let target: any;

    if (form instanceof FormGroup) {
      target = { controls: {} };
      Object.keys(form.controls).forEach(key => {
        const control = form.controls[key];
        target.controls[key] = this.dumpForm(control);
      });
    }
    else if (form instanceof FormArray) {
      target = [];
      for(let i = 0; i < form.length; i++) {
        const control = form.at(i);
        target[i] = this.dumpForm(control);
      }
    }
    else {
      target = {value: form.value, status: form.status};
    }

    return target;
  }
}
