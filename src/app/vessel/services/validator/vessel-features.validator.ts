import {Injectable} from '@angular/core';
import {ValidatorService} from '@e-is/ngx-material-table';
import {AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators} from '@angular/forms';
import {QualityFlagIds} from '../../../referential/services/model/model.enum';
import {VesselFeatures} from '../model/vessel.model';
import {fromDateISOString, isNotNil, SharedValidators, toBoolean} from '@sumaris-net/ngx-components';
import {VesselValidatorOptions} from '@app/vessel/services/validator/vessel.validator';
import {Moment, unitOfTime} from 'moment';
import {DateAdapter} from '@angular/material/core';
import {TranslateService} from '@ngx-translate/core';

@Injectable({providedIn: 'root'})
export class VesselFeaturesValidatorService<O extends VesselValidatorOptions = VesselValidatorOptions> implements ValidatorService {

  constructor(private formBuilder: FormBuilder,
              protected dateAdapter: DateAdapter<Moment>,
              protected translate: TranslateService) {
  }

  getRowValidator(): FormGroup {
    return this.getFormGroup();
  }

  getFormGroup(data?: VesselFeatures, opts?: O): FormGroup {
    opts = this.fillDefaultOptions(opts);

    return this.formBuilder.group({
      __typename: [VesselFeatures.TYPENAME],
      id: [null],
      updateDate: [null],
      creationDate: [null],
      startDate: [null, Validators.required],
      endDate: [null],
      name: ['', opts.withNameRequired ? Validators.required : null],
      exteriorMarking: ['', Validators.required],
      administrativePower: ['', Validators.compose([Validators.min(0), SharedValidators.integer])],
      lengthOverAll: ['', Validators.compose([Validators.min(0), SharedValidators.decimal({maxDecimals: 2})])],
      grossTonnageGrt: ['', Validators.compose([Validators.min(0), SharedValidators.decimal({maxDecimals: 2})])],
      grossTonnageGt: ['', Validators.compose([Validators.min(0), SharedValidators.decimal({maxDecimals: 2})])],
      basePortLocation: ['', Validators.compose([Validators.required, SharedValidators.entity])],
      comments: ['', Validators.maxLength(2000)],
      qualityFlagId: [data && data.qualityFlagId || QualityFlagIds.NOT_QUALIFIED]
    });
  }

  updateFormGroup(form: FormGroup, opts?: O) {
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
