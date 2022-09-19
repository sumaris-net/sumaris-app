import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'splitArrayInChunks'
})
export class SplitArrayInChunksPipe implements PipeTransform {

  transform<T>(val: T[], nbPeerRow: number): Array<Array<T>> {
    if (!nbPeerRow || isNaN(nbPeerRow) || nbPeerRow < 1) {
      throw '[splitArrayInChunks] Number of row must be a positive number !';
    }
    const finalChunk = Math.floor(val.length / nbPeerRow) + 1;
    let res = new Array(finalChunk);
    for (let i = 0; i < finalChunk; i++) {
      let begin = i * nbPeerRow;
      let ending = (i + 1) * nbPeerRow;
      res[i] = val.slice(begin, ending);
    }
    return res;
  }

}
