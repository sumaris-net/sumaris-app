import { Pipe, PipeTransform } from '@angular/core';
import { qualityFlagInvalid } from '../services/model/model.utils';

@Pipe({
  name: 'qualityFlagValid',
})
export class QualityFlagValidPipePipe implements PipeTransform {
  transform(qualityFlagId: number): boolean {
    return !qualityFlagInvalid(qualityFlagId);
  }
}
