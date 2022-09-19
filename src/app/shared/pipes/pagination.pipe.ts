import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'paginationToString'
})
export class PaginationToStringPipe implements PipeTransform {

  transform(pageIndex: number, pageCount?: number, parenthesis?: boolean): string {
    if (pageCount === 1) return '';
    const prefix = parenthesis && '(' || '';
    const suffix = parenthesis && ')' || '';
    if (pageCount && pageCount > 1) {
      return `${prefix}${pageIndex + 1}/${pageCount}${suffix}`;
    }
    return `${prefix}${pageIndex + 1}${suffix}`;
  }

}
