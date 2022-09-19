import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'splitArrayInChunks'
})
export class SplitArrayInChunksPipe implements PipeTransform {

  transform<T>(value: T[], chunkSize: number): T[][] {
    if (!value) return [];
    if (!chunkSize || isNaN(chunkSize) || chunkSize < 1) {
      throw '[splitArrayInChunks] Number of row must be a positive number !';
    }
    const length = Math.trunc(value.length / chunkSize + 0.5);
    const result = new Array(length);
    for (let i = 0; i < length; i++) {
      let start = i * chunkSize;
      let end = start + chunkSize;
      result[i] = value.slice(start, end);
    }
    return result;
  }

}
