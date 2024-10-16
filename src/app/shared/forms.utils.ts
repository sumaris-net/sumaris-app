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
import { AbstractControl, FormArray, FormGroup, Validators } from '@angular/forms';
import { isNotNil } from '@sumaris-net/ngx-components';

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

  static enableControl(control: AbstractControl, opts?: { required?: boolean; onlySelf?: boolean; emitEvent?: boolean }) {
    this.setControlEnabled(control, true, opts);
  }

  static disableControl(control: AbstractControl, opts?: { required?: boolean; onlySelf?: boolean; emitEvent?: boolean }) {
    this.setControlEnabled(control, false, { required: false, ...opts });
  }

  static setControlEnabled(control: AbstractControl, enabled: boolean, opts?: { required?: boolean; onlySelf?: boolean; emitEvent?: boolean }) {
    if (!control) return; // Nothing to DO
    if (enabled) {
      if (isNotNil(opts?.required) && opts.required && !control.hasValidator(Validators.required)) {
        control.addValidators(Validators.required);
      }
      control.enable(opts);
    } else {
      control.disable(opts);
      if (isNotNil(opts?.required) && !opts.required && control.hasValidator(Validators.required)) {
        control.removeValidators(Validators.required);
      }
      control.reset(null, opts);
    }
  }
}
