import { Pipe, PipeTransform } from '@angular/core';
import { statusToColor } from '../../data/services/model/model.utils';

@Pipe({
  name: 'vesselStatusToColorPipe'
})
export class VesselStatusToColorPipe implements PipeTransform {

  transform(statusId: number): string {
    return statusToColor(statusId);
  }
}
