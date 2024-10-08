import { AppFormArray, Person, ReferentialUtils, SharedFormArrayValidators, SharedValidators } from '@sumaris-net/ngx-components';
import { UntypedFormControl, Validators } from '@angular/forms';
import { RootDataEntity } from '../model/root-data-entity.model';
import { Program } from '@app/referential/services/model/program.model';
import { DataEntityValidatorOptions, DataEntityValidatorService } from './data-entity.validator';
import { Strategy } from '@app/referential/services/model/strategy.model';

export interface DataRootEntityValidatorOptions extends DataEntityValidatorOptions {
  withObservers?: boolean;
  program?: Program;
  strategy?: Strategy;
}

export abstract class DataRootEntityValidatorService<
  T extends RootDataEntity<T>,
  O extends DataRootEntityValidatorOptions = DataRootEntityValidatorOptions,
> extends DataEntityValidatorService<T, O> {
  protected constructor() {
    super();
  }

  getFormGroupConfig(
    data?: T,
    opts?: O
  ): {
    [key: string]: any;
  } {
    return Object.assign(super.getFormGroupConfig(data), {
      program: [data?.program || null, Validators.compose([Validators.required, SharedValidators.entity])],
      creationDate: [data?.creationDate || null],
      validationDate: [data?.validationDate || null],
      recorderPerson: [data?.recorderPerson || null, SharedValidators.entity],
      comments: [data?.comments || null, Validators.maxLength(2000)],
      synchronizationStatus: [data?.synchronizationStatus || null],
    });
  }

  getObserversFormArray(data?: Person[], opts?: { required?: boolean }) {
    const required = !opts || opts.required !== false;
    const formArray = new AppFormArray<Person, UntypedFormControl>(
      (value) => this.getObserverControl(value, { required }),
      ReferentialUtils.equals,
      ReferentialUtils.isEmpty,
      {
        allowEmptyArray: false,
        validators: required ? SharedFormArrayValidators.requiredArrayMinLength(1) : null,
      }
    );
    if (data || required) {
      formArray.patchValue(data || [null]);
    }
    return formArray;
  }

  getObserverControl(observer?: Person, opts?: { required?: boolean }): UntypedFormControl {
    return this.formBuilder.control(observer || null, opts?.required ? [Validators.required, SharedValidators.entity] : SharedValidators.entity);
  }
}
