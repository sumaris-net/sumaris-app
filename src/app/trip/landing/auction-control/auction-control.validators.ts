import { UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, filter, map, startWith, tap } from 'rxjs/operators';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { AppFormUtils, isNil, isNotNilOrBlank, SharedValidators } from '@sumaris-net/ngx-components';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';

export class AuctionControlValidators {
  static addSampleValidators(form: UntypedFormGroup, pmfms: IPmfm[], opts?: { markForCheck: () => void }): Subscription {
    if (!form) {
      console.warn("Argument 'form' required");
      return null;
    }

    // DEBUG
    //console.debug('AuctionControlValidators.addSampleValidators()', form);

    // Label:
    // - remove 'required'
    // - add pattern
    form.get('label').setValidators(Validators.pattern(/^[0-9]*$/));
    form.get('label').updateValueAndValidity({ onlySelf: true, emitEvent: false });

    // Disable computed pmfms
    AppFormUtils.disableControls(
      form,
      pmfms.filter((p) => p.isComputed).map((p) => `measurementValues.${p.id}`),
      { onlySelf: true, emitEvent: false }
    );

    const $errors = new Subject<ValidationErrors | null>();
    form.setAsyncValidators((control) => $errors);

    let computing = false;
    const subscription = form.valueChanges
      .pipe(
        startWith<any, any>(form.value),
        filter(() => !computing),
        debounceTime(250),
        // Protected against loop
        tap(() => (computing = true)),
        map(() => AuctionControlValidators.computeAndValidate(form, pmfms, { ...opts, emitEvent: false, onlySelf: false })),
        tap((errors) => {
          computing = false;
          $errors.next(errors);
          if (opts?.markForCheck) opts.markForCheck();
        })
      )
      .subscribe();

    // When unsubscribe, remove async validator
    subscription.add(() => {
      $errors.next(null);
      $errors.complete();
      form.clearAsyncValidators();
      if (opts?.markForCheck) opts.markForCheck();
    });

    return subscription;
  }

  /**
   * Validate and compute
   *
   * @param form
   * @param pmfms
   * @param opts
   */
  static computeAndValidate(
    form: UntypedFormGroup,
    pmfms: IPmfm[],
    opts?: {
      emitEvent?: boolean;
      onlySelf?: boolean;
    }
  ): ValidationErrors | null {
    // DEBUG
    const now = Date.now();
    console.debug('[auction-control-validator] Starting computation and validation...');

    let errors: any;

    // Read pmfms
    const weightPmfm = pmfms.find((p) => p.label.endsWith('_WEIGHT'));
    const indivCountPmfm = pmfms.find((p) => p.id === PmfmIds.SAMPLE_INDIV_COUNT);

    // Get controls
    const measFormGroup = form.controls['measurementValues'] as UntypedFormGroup;
    const outOfSizeWeightControl = measFormGroup.controls[PmfmIds.OUT_OF_SIZE_WEIGHT];
    const outOfSizeCountControl = measFormGroup.controls[PmfmIds.OUT_OF_SIZE_INDIV_COUNT];
    const outOfSizePctControl = measFormGroup.controls[PmfmIds.OUT_OF_SIZE_PCT];
    const parasitizedCountControl = measFormGroup.controls[PmfmIds.PARASITIZED_INDIV_COUNT];
    const dirtyCountControl = measFormGroup.controls[PmfmIds.DIRTY_INDIV_COUNT];

    // Get PMFM values
    const weight = weightPmfm ? +measFormGroup.controls[weightPmfm.id].value : undefined;
    const indivCount = indivCountPmfm ? +measFormGroup.controls[indivCountPmfm.id].value : undefined;
    const outOfSizeWeight = outOfSizeWeightControl ? +outOfSizeWeightControl.value : undefined;
    const outOfSizeCount = outOfSizeCountControl ? +outOfSizeCountControl.value : undefined;

    // Out of size: compute percentage
    if (outOfSizePctControl) {
      // From a weight ratio
      if (isNotNilOrBlank(weight) && isNotNilOrBlank(outOfSizeWeight) && outOfSizeWeight <= weight) {
        const pct = Math.trunc((10000 * outOfSizeWeight) / weight) / 100;
        outOfSizePctControl.setValue(pct, opts);
        SharedValidators.clearError(outOfSizeWeightControl, 'max');
        outOfSizeWeightControl.updateValueAndValidity({ onlySelf: true });
      }
      // Or a individual count ratio
      else if (isNotNilOrBlank(indivCount) && isNotNilOrBlank(outOfSizeCount) && outOfSizeCount <= indivCount) {
        const pct = Math.trunc((10000 * outOfSizeCount) / indivCount) / 100;
        outOfSizePctControl.setValue(pct, opts);
        SharedValidators.clearError(outOfSizeCountControl, 'max');
      } else {
        outOfSizePctControl.setValue(null, opts); // Reset
      }
    }

    // Out of size: check max
    if (outOfSizeWeightControl) {
      if (isNotNilOrBlank(outOfSizeWeight) && isNotNilOrBlank(weight) && outOfSizeWeight > weight) {
        const error = { max: { actual: outOfSizeWeight, max: weight } };
        outOfSizeWeightControl.markAsPending(opts);
        outOfSizeWeightControl.setErrors(error);
        errors = { ...errors, ...error };
      } else {
        SharedValidators.clearError(outOfSizeWeightControl, 'max');
      }
    }
    if (outOfSizeCountControl) {
      if (isNotNilOrBlank(outOfSizeCount) && isNotNilOrBlank(indivCount) && outOfSizeCount > indivCount) {
        const error = { max: { actual: outOfSizeCount, max: indivCount } };
        outOfSizeCountControl.setErrors(error, opts);
        errors = { ...errors, ...error };
      } else {
        SharedValidators.clearError(outOfSizeCountControl, 'max');
      }
    }

    // Parasitized: compute percentile
    const parasitizedCount = parasitizedCountControl ? +parasitizedCountControl.value : undefined;
    const parasitizedPctControl = measFormGroup.controls[PmfmIds.PARASITIZED_INDIV_PCT];
    // Compute out of size percentage
    if (parasitizedPctControl) {
      if (isNotNilOrBlank(indivCount) && isNotNilOrBlank(parasitizedCount) && parasitizedCount <= indivCount) {
        const pct = Math.trunc((10000 * parasitizedCount) / indivCount) / 100;
        parasitizedPctControl.setValue(pct, opts);
        SharedValidators.clearError(parasitizedCountControl, 'max');
      } else {
        parasitizedPctControl.setValue(null, opts); // Reset
      }
    }
    // Parasitized: check max
    if (parasitizedCountControl) {
      if (isNotNilOrBlank(parasitizedCount) && isNotNilOrBlank(indivCount) && parasitizedCount > indivCount) {
        const error = { max: { actual: parasitizedCount, max: indivCount } };
        parasitizedCountControl.setErrors(error, opts);
        errors = { ...errors, ...error };
      } else {
        SharedValidators.clearError(parasitizedCountControl, 'max');
      }
    }

    // Dirty: compute percentile
    const dirtyCount = dirtyCountControl ? +dirtyCountControl.value : undefined;
    const dirtyPctControl = measFormGroup.controls[PmfmIds.DIRTY_INDIV_PCT];
    if (dirtyPctControl) {
      if (isNotNilOrBlank(indivCount) && isNotNilOrBlank(parasitizedCount) && dirtyCount <= indivCount) {
        const pct = Math.trunc((10000 * dirtyCount) / indivCount) / 100;
        dirtyPctControl.setValue(pct, opts);
        SharedValidators.clearError(dirtyCountControl, 'max');
      } else {
        dirtyPctControl.setValue(null, opts); // Reset
      }
    }
    // Dirty: check max
    if (dirtyCountControl) {
      if (isNotNilOrBlank(dirtyCount) && isNotNilOrBlank(indivCount) && dirtyCount > indivCount) {
        const error = { max: { actual: dirtyCount, max: indivCount } };
        dirtyCountControl.setErrors(error, opts);
        errors = { ...errors, ...error };
      } else {
        SharedValidators.clearError(dirtyCountControl, 'max');
      }
    }

    // Density per kg (indiv/kg)
    const numberDensityPerKgControl = measFormGroup.controls[PmfmIds.INDIVIDUALS_DENSITY_PER_KG];
    if (numberDensityPerKgControl) {
      if (isNotNilOrBlank(indivCount) && isNotNilOrBlank(weight) && indivCount !== 0 && weight !== 0) {
        // compute (truncate the value to the hundredth)
        const numberDensityPerKgValue = Math.trunc((indivCount / PmfmValueUtils.toModelValueAsNumber(weight, weightPmfm)) * 100) / 100;
        numberDensityPerKgControl.setValue(numberDensityPerKgValue, opts);
      } else {
        numberDensityPerKgControl.setValue(null, opts); // Reset
      }
    }

    // Compliant: disable some pmfms if compliant, and manage some default value
    const compliantProductControl = measFormGroup.controls[PmfmIds.COMPLIANT_PRODUCT];
    if (compliantProductControl) {
      const controlCorrectiveActionPmfm = pmfms.find((pmfm) => pmfm.id === PmfmIds.CONTROL_CORRECTIVE_ACTION);
      const controlCorrectiveActionControl = controlCorrectiveActionPmfm && measFormGroup.controls[PmfmIds.CONTROL_CORRECTIVE_ACTION];
      if (controlCorrectiveActionControl) {
        const defaultValue =
          PmfmValueUtils.fromModelValue(controlCorrectiveActionPmfm.defaultValue, controlCorrectiveActionPmfm) ||
          controlCorrectiveActionPmfm.qualitativeValues?.find((qv) => qv.label === 'NSP');

        if (compliantProductControl.value) {
          controlCorrectiveActionControl.setValue(null);
          controlCorrectiveActionControl.disable();
          controlCorrectiveActionControl.setValidators(null);
        } else {
          if (compliantProductControl.value === false && isNil(controlCorrectiveActionControl.value))
            controlCorrectiveActionControl.setValue(defaultValue);
          if (controlCorrectiveActionPmfm.required) {
            controlCorrectiveActionControl.setValidators(Validators.required);
          }
          controlCorrectiveActionControl.enable();
        }
      }

      const productDestinationPmfm = pmfms.find((pmfm) => pmfm.id === PmfmIds.PRODUCT_DESTINATION);
      const productDestinationControl = productDestinationPmfm && measFormGroup.controls[PmfmIds.PRODUCT_DESTINATION];
      if (productDestinationControl) {
        const defaultValue =
          PmfmValueUtils.fromModelValue(productDestinationPmfm.defaultValue, productDestinationPmfm) ||
          productDestinationPmfm.qualitativeValues?.find((qv) => qv.label === 'NSP');

        if (compliantProductControl.value) {
          productDestinationControl.setValue(null);
          productDestinationControl.disable();
          productDestinationControl.setValidators(null);
        } else {
          if (compliantProductControl.value === false && isNil(productDestinationControl.value)) productDestinationControl.setValue(defaultValue);
          productDestinationControl.enable();
          if (productDestinationPmfm.required) {
            productDestinationControl.setValidators(Validators.required);
          }
        }
      }
    }

    // DEBUG
    console.debug(`[auction-control-validator] Computation and validation finished in ${Date.now() - now}ms`);

    return errors;
  }
}
