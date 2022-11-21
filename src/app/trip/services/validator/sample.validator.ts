import { Injectable, Optional } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { AbstractControlOptions, UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { AppFormArray, AppValidatorService, FormArrayHelper, isNotEmptyArray, SharedFormGroupValidators, SharedValidators, toNumber } from '@sumaris-net/ngx-components';
import { Sample } from '../model/sample.model';
import { TranslateService } from '@ngx-translate/core';
import { ImageAttachmentValidator } from '@app/data/image/image-attachment.validator';

import { ImageAttachment } from '@app/data/image/image-attachment.model';
import { BaseValidatorService } from '@app/shared/service/base.validator.service';

export interface SampleValidatorOptions {
  requiredLabel?: boolean;
  withChildren?: boolean;
  measurementValuesAsGroup?: boolean;
  withImages?: boolean;
}

@Injectable({providedIn: 'root'})
export class SampleValidatorService<O extends SampleValidatorOptions = SampleValidatorOptions>
  extends BaseValidatorService<Sample, number, O>
  implements ValidatorService {

  constructor(
    protected formBuilder: UntypedFormBuilder,
    protected translate: TranslateService,
    @Optional() protected imageAttachmentValidator?: ImageAttachmentValidator
  ) {
    super(formBuilder, translate);
  }

  getFormGroupConfig(data?: any, opts?: O): { [p: string]: any } {
    const config = {
      __typename: [Sample.TYPENAME],
      id: [toNumber(data && data.id, null)],
      updateDate: [data && data.updateDate || null],
      creationDate: [data && data.creationDate || null],
      rankOrder: [toNumber(data && data.rankOrder, null), Validators.required],
      label: [data && data.label || null, (!opts || opts.requiredLabel !== false) ? Validators.required : null],
      individualCount: [toNumber(data && data.individualCount, null), Validators.compose([Validators.min(0), SharedValidators.integer])],
      sampleDate: [data && data.sampleDate || null, Validators.required],
      taxonGroup: [data && data.taxonGroup || null, SharedValidators.entity],
      taxonName: [data && data.taxonName || null, SharedValidators.entity],
      matrixId: [toNumber(data && data.matrixId, null)],
      batchId: [toNumber(data && data.batchId, null)],
      size: [toNumber(data && data.size, null)],
      sizeUnit: [data && data.sizeUnit || null],
      comments: [data && data.comments || null],
      children: this.formBuilder.array([]),
      parent: [data && data.parent || null, SharedValidators.entity],
      // Quality properties
      controlDate: [data && data.controlDate || null],
      qualificationDate: [data && data.qualificationDate || null],
      qualificationComments: [data && data.qualificationComments || null],
      qualityFlagId: [toNumber(data && data.qualityFlagId, 0)],
    }

    // Add children form array
    if (!opts || opts.withChildren !== false) {
      config['children'] = this.formBuilder.array([]);
    }

    // Add measurement values
    if (!opts || opts.measurementValuesAsGroup !== false) {
      config['measurementValues'] = this.formBuilder.group({});
    }
    else {
      config['measurementValues'] = this.formBuilder.control(data?.measurementValues || null);
    }

    // Add image attachments
    if (this.imageAttachmentValidator && (opts?.withImages === true)) {
      config['images'] = this.getImagesFormArray(data?.images);
    }

    return config;
  }

  getFormGroupOptions(data?: Sample, opts?: O): AbstractControlOptions | null {
    return {
      validators: [
        SharedFormGroupValidators.requiredIfEmpty('taxonGroup', 'taxonName'),
        SharedFormGroupValidators.requiredIfEmpty('taxonName', 'taxonGroup')
      ]
    };
  }

  getI18nError(errorKey: string, errorContent?: any): any {
    if (SAMPLE_VALIDATOR_I18N_ERROR_KEYS[errorKey]) return this.translate.instant(SAMPLE_VALIDATOR_I18N_ERROR_KEYS[errorKey], errorContent);
    return super.getI18nError(errorKey, errorContent);
  }

  protected getImagesFormArray(data?: ImageAttachment[], opts?: O) {
    const formArray = new AppFormArray(
      (image) => this.imageAttachmentValidator.getFormGroup(image),
      ImageAttachment.equals,
      ImageAttachment.isEmpty,
      {
        allowEmptyArray: true,
        resizeStrategy: 'reuse'
      }
    );

    formArray.statusChanges.subscribe(status => {
      console.warn('TODO status  formArray changes', status);
    })
    console.warn('TODO creating image formArray', formArray);
    if (isNotEmptyArray(data)) {
      //formArray.patchValue(data);
    }

    return formArray;
  }
}


export const SAMPLE_VALIDATOR_I18N_ERROR_KEYS = {
  missingWeightOrSize: 'TRIP.SAMPLE.ERROR.WEIGHT_OR_LENGTH_REQUIRED',
  tagIdLength: 'TRIP.SAMPLE.ERROR.INVALID_TAG_ID_LENGTH'
}
