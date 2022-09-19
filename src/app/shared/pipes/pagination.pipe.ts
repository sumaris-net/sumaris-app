import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'paginationToString'
})
export class PaginationToStringPipe implements PipeTransform {

  transform(pageIndex: number, pageCount?: number): string {
    if (pageCount && pageCount > 1) {
      return `${pageIndex + 1} / ${pageCount}`;
    }
    return `${pageIndex + 1}`;
  }

}
