import { Pipe, PipeTransform } from '@angular/core';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { referentialsToString, referentialToString } from '@sumaris-net/ngx-components';

@Pipe({
  name: 'physicalGearToString',
})
export class PhysicalGearToStringPipe implements PipeTransform {
  constructor() {}

  transform(
    value: PhysicalGear | PhysicalGear[] | any,
    opts?:
      | string[]
      | {
          compact?: boolean;
          properties?: string[];
          separator?: string;
          propertySeparator?: string;
        }
  ): string {
    let properties = Array.isArray(opts) ? opts : opts?.properties;

    // If compact, exclude gear name
    if (opts?.['compact'] === true && properties.length > 2) {
      properties = properties.filter((p) => p !== 'gear.name');
    }
    if (Array.isArray(value)) return referentialsToString(value, properties, opts?.['separator'], opts?.['propertySeparator']);
    return referentialToString(value, properties, opts?.['propertySeparator']);
  }
}
