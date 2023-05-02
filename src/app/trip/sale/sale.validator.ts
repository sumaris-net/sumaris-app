import {Injectable} from "@angular/core";
import {AbstractControlOptions, UntypedFormBuilder, UntypedFormGroup, Validators} from "@angular/forms";
import { fromDateISOString, isNotNil, SharedFormGroupValidators, SharedValidators } from '@sumaris-net/ngx-components';
import {toBoolean} from "@sumaris-net/ngx-components";
import {LocalSettingsService}  from "@sumaris-net/ngx-components";
import {Sale} from "./sale.model";
import {
  DataRootEntityValidatorOptions,
  DataRootEntityValidatorService
} from "../../data/services/validator/root-data-entity.validator";
import { Moment } from 'moment';
import { DateAdapter } from '@angular/material/core';
import { TranslateService } from '@ngx-translate/core';

export interface SaleValidatorOptions extends DataRootEntityValidatorOptions {
  required?: boolean;
  withProgram?: boolean;
  minDate?: Moment;
}

@Injectable({providedIn: 'root'})
export class SaleValidatorService<O extends SaleValidatorOptions = SaleValidatorOptions>
  extends DataRootEntityValidatorService<Sale, SaleValidatorOptions> {

  constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService,
    protected dateAdapter: DateAdapter<Moment>,) {
    super(formBuilder, translate, settings);
  }

  getFormGroupConfig(data?: Sale, opts?: O): { [key: string]: any } {

    const formConfig = {
      __typename: [Sale.TYPENAME],
      id: [data && data.id || null],
      updateDate: [data && data.updateDate || null],
      creationDate: [data && data.creationDate || null],
      vesselSnapshot: [data && data.vesselSnapshot || null, !opts.required ? SharedValidators.entity : Validators.compose([Validators.required, SharedValidators.entity])],
      saleType: [data && data.saleType || null, !opts.required ? SharedValidators.entity : Validators.compose([Validators.required, SharedValidators.entity])],
      startDateTime: [data && data.startDateTime || null],
      endDateTime: [data && data.endDateTime || null, SharedValidators.dateRangeEnd('startDateTime')],
      saleLocation: [data && data.saleLocation || null, SharedValidators.entity],
      comments: [data && data.comments || null, Validators.maxLength(2000)]
    };

    return formConfig;
  }

  getFormGroupOptions(data?: Sale, opts?: SaleValidatorOptions): AbstractControlOptions {
    return <AbstractControlOptions>{
      validator: Validators.compose([
        SharedFormGroupValidators.requiredIf('saleLocation', 'saleType'),
        SharedFormGroupValidators.requiredIf('startDateTime', 'saleType')
      ])
    };
  }

  updateFormGroup(form: UntypedFormGroup, opts?: O): UntypedFormGroup {
    opts = this.fillDefaultOptions(opts);

    if (opts.required === true) {
      form.controls['vesselSnapshot'].setValidators([Validators.required, SharedValidators.entity]);
      form.controls['saleType'].setValidators([Validators.required, SharedValidators.entity]);
    }
    else {
      form.controls['vesselSnapshot'].setValidators(SharedValidators.entity);
      form.controls['saleType'].setValidators(SharedValidators.entity);
    }

    if (opts.minDate) {
      const minDate = fromDateISOString(opts.minDate);
      const minDateStr = this.dateAdapter.format(minDate, this.translate.instant('COMMON.DATE_TIME_PATTERN'));
      form.controls['startDateTime'].setValidators(SharedValidators.dateIsAfter(minDate, minDateStr));
    }
    const formGroupOptions = this.getFormGroupOptions(null, opts);
    form.setValidators(formGroupOptions?.validators);

    return form;
  }

  /* -- fill options defaults -- */

  protected fillDefaultOptions(opts?: O): O {
    opts = opts || {} as O;

    opts.isOnFieldMode = isNotNil(opts.isOnFieldMode) ? opts.isOnFieldMode : (this.settings?.isOnFieldMode() || false);

    opts.required = toBoolean(opts.required, true);

    opts.withProgram = toBoolean(opts.withProgram, false);

    return opts;
  }
}
