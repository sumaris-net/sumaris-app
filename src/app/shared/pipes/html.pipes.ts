import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'noHtml',
})
/**
 * Remove all HTML tags, from an input string
 */
export class NoHtmlPipe implements PipeTransform {
  transform(value: string): string {
    if (value && typeof value === 'string') {
      // Use regular expression to remove all HTML tags
      return value.replace(/<[^>]*>.*?<\/[^>]*>|<[^>]+>/g, '');
    } else {
      return value;
    }
  }
}
