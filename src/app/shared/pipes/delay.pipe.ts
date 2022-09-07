import { Injectable, Pipe, PipeTransform } from '@angular/core';
import { isObservable, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { isNil } from '@sumaris-net/ngx-components';

@Pipe({
  name: 'delay'
})
@Injectable({providedIn: 'root'})
export class DelayPipe implements PipeTransform {

  transform(value: Observable<any>|any, delayMs: number): Observable<any> {
    const obs = isObservable(value) ? value : of(value);
    if (isNil(delayMs) || delayMs <= 0) return obs;
    return obs.pipe(delay(delayMs));
  }
}
