import { inject, Injectable } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { AbstractControlOptions, UntypedFormGroup, Validators } from '@angular/forms';
import { AppFormArray, SharedFormGroupValidators, SharedValidators, toNumber } from '@sumaris-net/ngx-components';
import { Sample } from './sample.model';
import { ImageAttachmentValidator } from '@app/data/image/image-attachment.validator';

import { ImageAttachment } from '@app/data/image/image-attachment.model';
import { BaseValidatorService } from '@app/shared/service/base.validator.service';
import { QualityFlagIds } from '@app/referential/services/model/model.enum';

export interface SampleValidatorOptions {
  requiredLabel?: boolean;
  withChildren?: boolean;
  measurementValuesAsGroup?: boolean;
  withImages?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SampleValidatorService<O extends SampleValidatorOptions = SampleValidatorOptions>
  extends BaseValidatorService<Sample, number, O>
  implements ValidatorService
{
  protected readonly imageAttachmentValidator = inject(ImageAttachmentValidator, { optional: true });

  constructor() {
    super();
  }

  getFormGroupConfig(data?: any, opts?: O): { [p: string]: any } {
    const config = {
      __typename: [Sample.TYPENAME],
      id: [toNumber(data?.id, null)],
      updateDate: [data?.updateDate || null],
      creationDate: [data?.creationDate || null],
      rankOrder: [toNumber(data?.rankOrder, null), Validators.required],
      label: [data?.label || null, !opts || opts.requiredLabel !== false ? Validators.required : null],
      individualCount: [toNumber(data?.individualCount, null), Validators.compose([Validators.min(0), SharedValidators.integer])],
      sampleDate: [data?.sampleDate || null, Validators.required],
      taxonGroup: [data?.taxonGroup || null, SharedValidators.entity],
      taxonName: [data?.taxonName || null, SharedValidators.entity],
      matrixId: [toNumber(data?.matrixId, null)],
      batchId: [toNumber(data?.batchId, null)],
      size: [toNumber(data?.size, null)],
      sizeUnit: [data?.sizeUnit || null],
      comments: [data?.comments || null],
      parent: [data?.parent || null, SharedValidators.entity],
      // Quality properties
      controlDate: [data?.controlDate || null],
      validationDate: [data?.validationDate || null],
      qualificationDate: [data?.qualificationDate || null],
      qualificationComments: [data?.qualificationComments || null],
      qualityFlagId: [toNumber(data?.qualityFlagId, QualityFlagIds.NOT_QUALIFIED)],
    };

    // Add children form array
    if (!opts || opts.withChildren !== false) {
      config['children'] = this.formBuilder.array([]);
    }

    // Add measurement values
    if (!opts || opts.measurementValuesAsGroup !== false) {
      config['measurementValues'] = this.formBuilder.group({});
    } else {
      config['measurementValues'] = this.formBuilder.control(data?.measurementValues || null);
    }

    // Add image attachments
    if (this.imageAttachmentValidator && opts?.withImages === true) {
      config['images'] = this.getImagesFormArray(data?.images);
    }

    return config;
  }

  getFormGroupOptions(data?: Sample, opts?: O): AbstractControlOptions | null {
    return {
      validators: [
        SharedFormGroupValidators.requiredIfEmpty('taxonGroup', 'taxonName'),
        SharedFormGroupValidators.requiredIfEmpty('taxonName', 'taxonGroup'),
      ],
    };
  }

  updateFormGroup(form: UntypedFormGroup, opts?: O) {
    console.debug('[sample-validator] Updating form group...', opts);

    // Label required validator
    const labelControl = form.get('label');
    if (!opts || opts.requiredLabel !== false) {
      if (labelControl && !labelControl.hasValidator(Validators.required)) {
        labelControl.setValidators(Validators.required);
      }
    } else if (labelControl && labelControl.hasValidator(Validators.required)) {
      labelControl.removeValidators(Validators.required);
    }

    // Add image attachments
    let imageFormArray = form.get('images');
    if (this.imageAttachmentValidator && opts?.withImages === true) {
      if (!imageFormArray) {
        imageFormArray = this.getImagesFormArray();
        form.addControl('images', imageFormArray);
      }
    } else if (imageFormArray) {
      form.removeControl('images');
    }
  }

  getI18nError(errorKey: string, errorContent?: any): any {
    if (SAMPLE_VALIDATOR_I18N_ERROR_KEYS[errorKey]) return this.translate.instant(SAMPLE_VALIDATOR_I18N_ERROR_KEYS[errorKey], errorContent);
    return super.getI18nError(errorKey, errorContent);
  }

  protected getImagesFormArray(data?: ImageAttachment[], opts?: O) {
    const formArray = new AppFormArray((image) => this.imageAttachmentValidator.getFormGroup(image), ImageAttachment.equals, ImageAttachment.isEmpty);
    if (data) formArray.patchValue(data);
    return formArray;
  }
}

export const SAMPLE_VALIDATOR_I18N_ERROR_KEYS = {
  missingWeightOrSize: 'TRIP.SAMPLE.ERROR.WEIGHT_OR_LENGTH_REQUIRED',
  tagIdLength: 'TRIP.SAMPLE.ERROR.INVALID_TAG_ID_LENGTH',
  outOfRange: 'TRIP.SAMPLE.ERROR.OUT_OF_RANGE',
};
