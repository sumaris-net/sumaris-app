import {Injectable, Pipe, PipeTransform} from '@angular/core';
import {qualityFlagInvalid, qualityFlagToColor} from '../model/model.utils';
import {QualityFlagIds} from '@app/referential/services/model/model.enum';

@Pipe({
  name: 'qualityFlagInvalid'
})
export class QualityFlagInvalidPipe implements PipeTransform {

  transform(qualityFlagId: number): boolean {
    return qualityFlagInvalid(qualityFlagId);
  }
}
