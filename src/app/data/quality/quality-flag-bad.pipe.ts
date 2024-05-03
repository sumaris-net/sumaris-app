import { Pipe, PipeTransform } from '@angular/core';
import { QualityFlagIds } from '@app/referential/services/model/model.enum';

@Pipe({
  name: 'qualityFlagBad',
})
export class QualityFlagBadPipe implements PipeTransform {
  transform(qualityFlagId: number): boolean {
    return qualityFlagId === QualityFlagIds.BAD;
  }
}
