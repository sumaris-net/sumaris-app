import { Injectable, Pipe, PipeTransform } from '@angular/core';
import { Referential, ReferentialRef, referentialsToString, referentialToString } from '@sumaris-net/ngx-components';

@Pipe({
  name: 'referentialToString'
})
@Injectable({providedIn: 'root'})
export class ReferentialToStringPipe implements PipeTransform {

  constructor(
  ) {
  }

  transform(value: Referential | ReferentialRef | any, opts?: string[] | {properties?: string[]; separator?: string}): string {
    const properties = Array.isArray(opts) ? opts : opts && opts.properties;
    if (Array.isArray(value)) return referentialsToString(value, properties, opts && opts['separator']);
    return referentialToString(value, properties);
  }
}
