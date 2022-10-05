import {Injectable} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';
import {LocalSettingsService} from '@sumaris-net/ngx-components';
import {IPmfm} from '@app/referential/services/model/pmfm.model';
import {MeasurementsValidatorService} from '@app/trip/services/validator/measurement.validator';
import {DataEntityValidatorOptions} from '@app/data/services/validator/data-entity.validator';
import {BatchModel} from '@app/trip/batch/tree/batch-tree.model';
import {BatchAsObjectOptions, BatchFromObjectOptions} from '@app/trip/batch/common/batch.model';
import {BatchValidatorService} from '@app/trip/batch/common/batch.validator';

export interface BatchValidatorOptions extends DataEntityValidatorOptions {
  withWeight?: boolean;
  withChildrenWeight?: boolean;
  weightRequired?: boolean;
  rankOrderRequired?: boolean;
  labelRequired?: boolean;
  withMeasurements?: boolean;
  withMeasurementTypename?: boolean;
  pmfms?: IPmfm[];

  // Children
  withChildren?: boolean;
  childrenPmfms?: IPmfm[];
  qvPmfm?: IPmfm;
}

@Injectable()
export class BatchModelValidatorService<
  T extends BatchModel<T> = BatchModel,
  O extends BatchValidatorOptions = BatchValidatorOptions,
  AO extends BatchAsObjectOptions = BatchAsObjectOptions,
  FO extends BatchFromObjectOptions = BatchFromObjectOptions
  > extends BatchValidatorService<T, O> {


  constructor(
    formBuilder: FormBuilder,
    measurementsValidatorService: MeasurementsValidatorService,
    settings?: LocalSettingsService
  ) {
    super(formBuilder, measurementsValidatorService, settings);
  }

  getFormGroupConfig(data?: T, opts?: O): { [key: string]: any } {
    const config = super.getFormGroupConfig(data, opts);
    return config;
  }

  getFormGroup(data?: T, opts?: O): FormGroup {
    const form = super.getFormGroup(data, opts);

    return form;
  }

}
