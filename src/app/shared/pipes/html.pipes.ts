import { Pipe, PipeTransform } from '@angular/core';
import { noHtml } from '@app/shared/functions';

@Pipe({
  name: 'noHtml',
})
/**
 * Remove all HTML tags, from an input string
 */
export class NoHtmlPipe implements PipeTransform {
  transform(value: string): string {
    return noHtml(value);
  }
}
