import {Injectable} from '@angular/core';
import {ValidatorService} from '@e-is/ngx-material-table';
import {AbstractControl, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, ValidatorFn, Validators} from '@angular/forms';
import {QualityFlagIds} from '../../../referential/services/model/model.enum';
import {VesselFeatures} from '../model/vessel.model';
import { fromDateISOString, isNotNil, SharedValidators, toBoolean, toNumber } from '@sumaris-net/ngx-components';
import {VesselValidatorOptions} from '@app/vessel/services/validator/vessel.validator';
import {Moment, unitOfTime} from 'moment';
import {DateAdapter} from '@angular/material/core';
import {TranslateService} from '@ngx-translate/core';

@Injectable({providedIn: 'root'})
export class VesselFeaturesValidatorService<O extends VesselValidatorOptions = VesselValidatorOptions> implements ValidatorService {

  constructor(private formBuilder: UntypedFormBuilder,
              protected dateAdapter: DateAdapter<Moment>,
              protected translate: TranslateService) {
  }

  getRowValidator(): UntypedFormGroup {
    return this.getFormGroup();
  }

  getFormGroup(data?: VesselFeatures, opts?: O): UntypedFormGroup {
    opts = this.fillDefaultOptions(opts);

    return this.formBuilder.group({
      __typename: [VesselFeatures.TYPENAME],
      id: [toNumber(data?.id, null)],
      updateDate: [data?.updateDate || null],
      creationDate: [data?.creationDate || null],
      startDate: [data?.startDate || null, Validators.required],
      endDate: [data?.endDate || null],
      name: [data?.name || null, opts.withNameRequired ? Validators.required : null],
      exteriorMarking: [data?.exteriorMarking || null, Validators.required],
      administrativePower: [toNumber(data?.administrativePower, null), Validators.compose([Validators.min(0), SharedValidators.integer])],
      lengthOverAll: [toNumber(data?.lengthOverAll, null), Validators.compose([Validators.min(0), SharedValidators.decimal({maxDecimals: 2})])],
      grossTonnageGrt: [toNumber(data?.grossTonnageGrt, null), Validators.compose([Validators.min(0), SharedValidators.decimal({maxDecimals: 2})])],
      grossTonnageGt: [toNumber(data?.grossTonnageGt, null), Validators.compose([Validators.min(0), SharedValidators.decimal({maxDecimals: 2})])],
      constructionYear: [toNumber(data?.constructionYear, null), Validators.compose([Validators.min(1900), SharedValidators.integer])],
      ircs: [data?.ircs || null],
      hullMaterial: [data?.hullMaterial || null, SharedValidators.entity],
      basePortLocation: [data?.basePortLocation || null, Validators.compose([Validators.required, SharedValidators.entity])],
      comments: [data?.comments || null, Validators.maxLength(2000)],
      qualityFlagId: [data && data.qualityFlagId || QualityFlagIds.NOT_QUALIFIED]
    });
  }

  updateFormGroup(form: UntypedFormGroup, opts?: O) {
    opts = this.fillDefaultOptions(opts);
    const nameControl = form.get('name');
    const startDateControl = form.get('startDate');

    if (opts.withNameRequired) {
      nameControl.setValidators(Validators.required);
    } else {
      nameControl.clearValidators();
    }
    nameControl.updateValueAndValidity({emitEvent: false});

    if (opts.maxDate) {
      const maxDate = fromDateISOString(opts.maxDate);
      const maxDateStr = this.dateAdapter.format(maxDate, this.translate.instant('COMMON.DATE_TIME_PATTERN'));

      startDateControl.setValidators(Validators.compose([
        SharedValidators.dateIsBefore(opts.maxDate, maxDateStr, 'day'),
        Validators.required
      ]));
    } else {
      startDateControl.setValidators(Validators.required);
    }
  }

  protected fillDefaultOptions(opts?: O): O {
    opts = opts || {} as O;

    opts.withNameRequired = toBoolean(opts.withNameRequired, true);

    return opts;
  }

}
