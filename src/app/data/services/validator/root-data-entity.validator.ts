import { LocalSettingsService, Person, SharedFormArrayValidators, SharedValidators } from '@sumaris-net/ngx-components';
import { UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { RootDataEntity } from '../model/root-data-entity.model';
import { IWithObserversEntity } from '../model/model.utils';
import { Program } from '../../../referential/services/model/program.model';
import { DataEntityValidatorOptions, DataEntityValidatorService } from './data-entity.validator';
import {OperationValidators} from '@app/trip/operation/operation.validator';
import { TranslateService } from '@ngx-translate/core';

export interface DataRootEntityValidatorOptions extends DataEntityValidatorOptions {
  withObservers?: boolean;
  program?: Program;
}

export abstract class DataRootEntityValidatorService<T extends RootDataEntity<T>, O extends DataRootEntityValidatorOptions = DataRootEntityValidatorOptions>
  extends DataEntityValidatorService<T, O> {

  protected constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService
    ) {
    super(formBuilder, translate, settings);
  }

  getFormGroupConfig(data?: T, opts?: O): {
    [key: string]: any;
  } {

    return Object.assign(
      super.getFormGroupConfig(data),
      {
        program: [data && data.program || null, Validators.compose([Validators.required, SharedValidators.entity])],
        creationDate: [data && data.creationDate || null],
        validationDate: [data && data.validationDate || null],
        recorderPerson: [data && data.recorderPerson || null, SharedValidators.entity],
        comments: [data && data.comments || null, Validators.maxLength(2000)],
        synchronizationStatus: [data && data.synchronizationStatus || null]
      });
  }

  getObserversFormArray(data?: IWithObserversEntity<T>) {
    return this.formBuilder.array(
      (data && data.observers || [null]).map(observer => this.getObserverControl(observer)),
      OperationValidators.requiredArrayMinLength(1)
    );
  }

  getObserverControl(observer?: Person): UntypedFormControl {
    return this.formBuilder.control(observer || null, [Validators.required, SharedValidators.entity]);
  }
}
