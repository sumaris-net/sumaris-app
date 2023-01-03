import {Pipe, PipeTransform} from '@angular/core';
import {QualityFlagIds} from '@app/referential/services/model/model.enum';

@Pipe({
  name: 'qualityFlagToIcon'
})
export class QualityFlagToIconPipe implements PipeTransform {

  transform(qualityFlagId: number): string {
    switch (qualityFlagId) {
      case QualityFlagIds.BAD:
        return 'alert-circle';
    }
    return null;
  }
}
