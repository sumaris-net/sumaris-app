import { Pipe, PipeTransform } from '@angular/core';
import { translateQualityFlag } from '@app/data/services/model/model.utils';

@Pipe({
  name: 'qualityFlagToI18n',
})
export class QualityFlagToI18nPipe implements PipeTransform {
  transform = translateQualityFlag;
}
