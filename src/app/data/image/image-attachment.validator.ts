import { Injectable } from '@angular/core';
import { AppValidatorService, SharedValidators, toNumber } from '@sumaris-net/ngx-components';
import { ImageAttachment } from '@app/data/image/image-attachment.model';
import { Validators } from '@angular/forms';
import { QualityFlagIds } from '@app/referential/services/model/model.enum';

@Injectable({ providedIn: 'root' })
export class ImageAttachmentValidator extends AppValidatorService {
  getFormGroupConfig(data?: any): { [p: string]: any } {
    return {
      __typename: ImageAttachment.TYPENAME,
      id: [toNumber(data?.id, null)],
      url: [data?.url || null],
      dataUrl: [data?.dataUrl || null],
      objectTypeId: [toNumber(data?.objectTypeId, null)],
      objectId: [toNumber(data?.objectId, null)],
      dateTime: [data?.dateTime || null],
      comments: [data?.comments || null, Validators.maxLength(2000)],
      updateDate: [data?.updateDate || null],
      creationDate: [data?.creationDate || null],
      recorderDepartment: [data?.recorderDepartment || null, SharedValidators.entity],
      recorderPerson: [data?.recorderPerson || null, SharedValidators.entity],
      // Quality properties
      controlDate: [data?.controlDate || null],
      validationDate: [data?.validationDate || null],
      qualificationDate: [data?.qualificationDate || null],
      qualificationComments: [data?.qualificationComments || null],
      qualityFlagId: [toNumber(data?.qualityFlagId, QualityFlagIds.NOT_QUALIFIED)],
    };
  }
}
