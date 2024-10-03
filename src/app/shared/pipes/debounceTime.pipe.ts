import { Pipe, PipeTransform } from '@angular/core';
import { isObservable, Observable, of } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { isNil } from '@sumaris-net/ngx-components';

@Pipe({
  name: 'debounceTime',
})
export class DebounceTimePipe implements PipeTransform {
  transform(value: Observable<any> | any, dueTime: number): Observable<any> {
    const obs = isObservable(value) ? value : of(value);
    if (isNil(dueTime) || dueTime <= 0) return obs;
    return obs.pipe(debounceTime(dueTime));
  }
}
