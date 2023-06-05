import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { isNil, isNotNil, SharedValidators } from '@sumaris-net/ngx-components';
import { IPmfm, PmfmUtils } from '../model/pmfm.model';

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
      else if (pmfm.maximumNumberDecimals > 0) {
        validatorFns.push(SharedValidators.decimal({ maxDecimals: pmfm.maximumNumberDecimals }));
      }

      // Significant figures number
      if (pmfm.signifFiguresNumber > 0) {
        // TODO test this, and add i18n validator message
        console.warn('/!\ Enabling \'significantFiguresNumber\' validator (found in a pmfm)', pmfm);
        validatorFns.push(PmfmValidators.significantFiguresNumber(pmfm.signifFiguresNumber));
      }

      // Precision (only if defined, or if maximumNumberDecimals is defined)
      const precision = PmfmUtils.getOrComputePrecision(pmfm, null);
      if (precision > 0) {
        validatorFns.push(SharedValidators.precision(precision));
      }

    } else if (pmfm.type === 'qualitative_value') {
      validatorFns.push(SharedValidators.entity);
    }

    return validatorFns.length > 1 ? Validators.compose(validatorFns) : (validatorFns.length === 1 ? validatorFns[0] : null);
  }

  static significantFiguresNumber(n: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      let significantFigures;

      let strValue: string = (typeof value === 'string') ? value : ((typeof value === 'number') ? String(value) : '');
      if (strValue) {
        strValue = strValue.replace(/^[\s0]+|\s$/g, '');  // Remove leading zeros/space, and trailing space

        // If there is a decimal point
        if (strValue.includes('.')) {
          const [wholePart, fractionalPart] = strValue.split('.');
          // If 0.00xxx => ignore starting 0.00
          if (wholePart.length === 0) {
            const leadingDecimalZeros = fractionalPart.match(/^0*/)[0].length;
            significantFigures = fractionalPart.slice(leadingDecimalZeros).replace(/^0+$/g, '').length;
          }
          // value > 1: count every figures numbers
          else {
            significantFigures = wholePart.length + fractionalPart.length;
          }
        }
        // If there is no decimal point: count every non-trailing zeros
        else {
          significantFigures = strValue.replace(/0+$/g, '').length;  // Remove trailing zeros
        }
      }

      // Check if value has n significant figures
      return significantFigures <= n ? null : { 'significantFiguresNumber': {significantFiguresNumber: n} };
    };
  }
}

export const PMFM_VALIDATOR_I18N_ERROR_KEYS = {
  significantFiguresNumber: 'REFERENTIAL.PMFM.ERROR.FIELD_SIGNIF_FIGURES_NUMBER'
}
