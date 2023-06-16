import { ValidatorService } from '@e-is/ngx-material-table';
import { AbstractControlOptions, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { isNotNil, LocalSettingsService, SharedValidators, toNumber } from '@sumaris-net/ngx-components';
import { DataEntity } from '../model/data-entity.model';
import { QualityFlagIds } from '@app/referential/services/model/model.enum';
import { BaseValidatorService } from '@app/shared/service/base.validator.service';
import { TranslateService } from '@ngx-translate/core';

export declare type ControlUpdateOnType = 'change' | 'blur' | 'submit';
export interface DataEntityValidatorOptions {
  isOnFieldMode?: boolean;
  updateOn?: ControlUpdateOnType;
  debug?: boolean;
}

export abstract class DataEntityValidatorService<
  T extends DataEntity<T>,
  O extends DataEntityValidatorOptions = DataEntityValidatorOptions
  >
  extends BaseValidatorService<T, number, O>
  implements ValidatorService {

  protected constructor(
    protected formBuilder: UntypedFormBuilder,
    protected translate: TranslateService,
    protected settings: LocalSettingsService
    ) {
    super(formBuilder, translate);
  }

  getFormGroup(data?: T, opts?: O): UntypedFormGroup {

    opts = this.fillDefaultOptions(opts);

    return this.formBuilder.group(
      this.getFormGroupConfig(data, opts),
      this.getFormGroupOptions(data, opts)
    );
  }

  getFormGroupConfig(data?: T, opts?: O): {
    [key: string]: any;
  } {

    return {
      id: [toNumber(data && data.id, null)],
      updateDate: [data && data.updateDate || null],
      recorderDepartment: [data && data.recorderDepartment || null, SharedValidators.entity],
      // Quality properties
      controlDate: [data && data.controlDate || null],
      qualificationDate: [data && data.qualificationDate || null],
      qualificationComments: [data && data.qualificationComments || null],
      qualityFlagId: [toNumber(data && data.qualityFlagId, QualityFlagIds.NOT_QUALIFIED)]
    };
  }

  getFormGroupOptions(data?: T, opts?: O): AbstractControlOptions | null {
    return { updateOn: opts?.updateOn };
  }

  updateFormGroup(form: UntypedFormGroup, opts?: O) {
    // Must be override by subclasses
    console.warn(`${this.constructor.name}.updateFormGroup() not implemented yet!`);
  }

  /* -- protected methods -- */

  protected fillDefaultOptions(opts?: O): O {
    opts = opts || {} as O;

    opts.isOnFieldMode = isNotNil(opts.isOnFieldMode) ? opts.isOnFieldMode : (this.settings?.isOnFieldMode() || false);

    return opts;
  }
}
