import {Injectable, Pipe, PipeTransform} from '@angular/core';
import {DateFormatPipe, FormFieldDefinition, isNil, isNotNil, referentialToString} from '@sumaris-net/ngx-components';

@Pipe({
  name: 'formatProperty'
})
@Injectable({providedIn: 'root'})
export class FormatPropertyPipe implements PipeTransform {

  constructor(private dateFormat: DateFormatPipe) {
  }

  transform(obj: any, keyOrDefinition: string|FormFieldDefinition): string | Promise<string> {
    if (!obj) return '';
    const definition = keyOrDefinition && (typeof keyOrDefinition === 'object') && keyOrDefinition;
    const key = definition?.key || keyOrDefinition as string;
    if (!key) {
      // Should never occur
      console.warn('Invalid use of pipe \'formatProperty\': missing key or definition');
      return '';
    }
    const value = obj[key];
    if (isNil(value)) return value;
    const type = definition?.type || typeof value;
    switch (type) {
      case 'date':
        return this.dateFormat.transform(value) as string;
      case 'dateTime':
        return this.dateFormat.transform(value, {time: true}) as string;
      case 'enum':
      {
        // DEBUG
        // console.debug('formatProperty by definition (type='enum', key=' +definition.key+ '):', value );
        const item = (definition.values as any[] || [value]).find(item => (isNotNil(item.key) ? item.key : item) === value);
        return item.value || item;
      }
      case 'entity':
      {
        const displayWith = definition.autocomplete?.displayWith || ((item) => referentialToString(item, definition.autocomplete?.attributes));
        return displayWith(value);
      }
      case 'string':
      default:
        return value;
    }
  }
}
