import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'splitArrayInChunks'
})
export class SplitArrayInChunksPipe implements PipeTransform {

  transform<T>(val: T[], _nbPeerRow: number): Array<Array<T>> {
    if (! _nbPeerRow || _nbPeerRow < 1) {
      throw 'Number of row must be a positive number !';
    }
    const finalChunk = Math.floor(val.length / _nbPeerRow) + 1;
    let res = new Array(finalChunk);
    for (let i = 0 ; i < finalChunk ; i++) {
      let begin = i * _nbPeerRow;
      let ending = i+1 * _nbPeerRow;
      res[i] = val.slice(begin, ending);
    }
    return res;
  }

}
