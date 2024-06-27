import { Injectable, Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'check',
})
@Injectable({ providedIn: 'root' })
export class CheckPipe implements PipeTransform {
  transform(value: any, checkFn: (any) => boolean): boolean {
    if (!checkFn) return null;
    return checkFn(value);
  }
}
