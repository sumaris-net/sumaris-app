import { Injectable, Pipe, PipeTransform } from '@angular/core';
import { isNil } from '@sumaris-net/ngx-components';

@Pipe({
  name: 'displayWith',
})
@Injectable({ providedIn: 'root' })
export class DisplayWithPipe implements PipeTransform {
  transform(value: any, displayFn: (any) => string): string {
    if (isNil(value) || !displayFn) return '';
    return displayFn(value);
  }
}
