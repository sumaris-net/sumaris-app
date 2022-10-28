import {Injectable} from '@angular/core';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import {FormArrayHelper, isNotEmptyArray, LocalSettingsService} from '@sumaris-net/ngx-components';
import {IPmfm} from '@app/referential/services/model/pmfm.model';
import {MeasurementsValidatorService} from '@app/trip/services/validator/measurement.validator';
import {DataEntityValidatorOptions} from '@app/data/services/validator/data-entity.validator';
import {Batch, BatchAsObjectOptions, BatchFromObjectOptions} from '@app/trip/batch/common/batch.model';
import {BatchValidatorService} from '@app/trip/batch/common/batch.validator';
import {MeasurementValuesUtils} from '@app/trip/services/model/measurement.model';

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
  T extends Batch<T> = Batch,
  O extends BatchValidatorOptions = BatchValidatorOptions,
  AO extends BatchAsObjectOptions = BatchAsObjectOptions,
  FO extends BatchFromObjectOptions = BatchFromObjectOptions
  > extends BatchValidatorService<T, O> {

  constructor(
    formBuilder: UntypedFormBuilder,
    measurementsValidatorService: MeasurementsValidatorService,
    settings?: LocalSettingsService
  ) {
    super(formBuilder, measurementsValidatorService, settings);
  }



  getFormGroup(data?: T, opts?: O): UntypedFormGroup {

    const form = super.getFormGroup(data, {...opts,
      withChildren: false, // Skip inherited children logic: avoid to create an unused sampling batch. See bellow
      withMeasurements: false, // Skip inherited measurement logic, to use 'opts.pmfms' (instead of 'opts.childrenPmfms')
      qvPmfm: null
    });

    // Children array:
    if (opts?.withChildren) {

      // DEBUG
      console.debug(`[batch-model-validator] Creating children form array, with pmfms: `, opts.childrenPmfms);

      const childrenFormHelper: FormArrayHelper<Batch> = this.getChildrenFormHelper(form, {
        withWeight: true,
        withMeasurements: true,
        ...opts,
        withChildren: this.enableSamplingBatch,
        withChildrenWeight: true,
        pmfms: opts.childrenPmfms || null,
        childrenPmfms: null
      });
      // Normalize children
      // data.children.forEach(child => {
      //   child.measurementValues = MeasurementValuesUtils.normalizeValuesToForm(child.measurementValues, opts.childrenPmfms);
      // })
      // childrenFormHelper.resize(data.children?.length);
      // childrenFormHelper.formArray.patchValue(data.children);
      childrenFormHelper.patchValue(data?.children || []);
    }

    // Add measurement values
    if (opts?.withMeasurements) {
      let measControl: AbstractControl;
      if (isNotEmptyArray(opts.pmfms)) {
        measControl = this.getMeasurementValuesForm(data?.measurementValues, {
          pmfms: opts.pmfms,
          forceOptional: false, // We always need full validation, in model form
          withTypename: opts.withMeasurementTypename
        });
      }
      else {
        // WARN: we need to keep existing measurement (e.g. for individual sub-batch)
        // => create a simple control, without PMFMs validation. This should be done in sub-batch form/modal
        measControl = this.formBuilder.control(data?.measurementValues || null);
      }
      if (form.contains('measurementValues')) form.setControl('measurementValues', measControl);
      else form.addControl('measurementValues', measControl);
    }

    return form;
  }

  getFormGroupConfig(data?: T, opts?: O): { [key: string]: any } {

    const config = super.getFormGroupConfig(data, opts);

    delete config.parent;

    return config;
  }

}
