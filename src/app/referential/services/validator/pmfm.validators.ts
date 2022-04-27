import {ValidatorFn, Validators} from "@angular/forms";
import {isNil, isNotNil} from "@sumaris-net/ngx-components";
import {SharedValidators} from "@sumaris-net/ngx-components";
import {IPmfm} from "../model/pmfm.model";

const REGEXP_INTEGER = /^[+|-]?[0-9]+$/;
const REGEXP_DOUBLE = /^[+|-]?[0-9]+(\.[0-9]+)?$/;

export class PmfmValidators {

  static create(pmfm: IPmfm, validatorFns?: ValidatorFn[], opts?: { forceOptional?: boolean; } ): ValidatorFn {
    validatorFns = validatorFns || [];
    // Add required validator (if NOT force as optional - can occur when on field mode)
    if (pmfm.required && (!opts || opts.forceOptional !== true)) {
      validatorFns.push(Validators.required);
    }
    // If pmfm is alphanumerical
    if (pmfm.type === 'string') {
      validatorFns.push(Validators.maxLength(40));
    }
    // If pmfm is numerical
    else if (pmfm.type === 'integer' || pmfm.type === 'double') {

      if (isNotNil(pmfm.minValue)) {
        validatorFns.push(Validators.min(pmfm.minValue));
      }
      if (isNotNil(pmfm.maxValue)) {
        validatorFns.push(Validators.max(pmfm.maxValue));
      }

      // Pattern validation:
      // Integer or double with 0 decimals
      if (pmfm.type === 'integer' || pmfm.maximumNumberDecimals === 0) {
        validatorFns.push(Validators.pattern(REGEXP_INTEGER));
      }
      // Double without maximal decimals
      else if (pmfm.type === 'double' && isNil(pmfm.maximumNumberDecimals)) {
        validatorFns.push(Validators.pattern(REGEXP_DOUBLE));
      }
      // Double with a N decimal
      else if (pmfm.maximumNumberDecimals >= 1) {
        validatorFns.push(SharedValidators.decimal({maxDecimals: pmfm.maximumNumberDecimals}));
      }
    } else if (pmfm.type === 'qualitative_value') {
      validatorFns.push(SharedValidators.entity);
    }

    return validatorFns.length > 1 ? Validators.compose(validatorFns) : (validatorFns.length === 1 ? validatorFns[0] : null);
  }
}

