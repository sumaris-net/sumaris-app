import { Pipe, PipeTransform } from '@angular/core';
import { statusToColor } from '../model/model.utils';

@Pipe({
  name: 'statusToColor'
})
export class StatusToColorPipe implements PipeTransform {

  transform(statusId: number): string {
    return statusToColor(statusId);
  }
}
