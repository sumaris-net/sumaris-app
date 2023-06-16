import {Pipe, PipeTransform} from '@angular/core';
import {qualityFlagInvalid} from '../services/model/model.utils';

@Pipe({
  name: 'qualityFlagInvalid'
})
export class QualityFlagInvalidPipe implements PipeTransform {

  transform(qualityFlagId: number): boolean {
    return qualityFlagInvalid(qualityFlagId);
  }
}
