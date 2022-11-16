import { Pipe, PipeTransform } from '@angular/core';
import { ReferentialUtils } from '@sumaris-net/ngx-components';

@Pipe({
  name: 'isNotEmptyReferential'
})
export class IsNotEmptyReferentialPipe implements PipeTransform {

  transform(obj: any): boolean {
    return ReferentialUtils.isNotEmpty(obj);
  }
}

@Pipe({
  name: 'isEmptyReferential'
})
export class IsEmptyReferentialPipe implements PipeTransform {

  transform(obj: any): boolean {
    return ReferentialUtils.isEmpty(obj);
  }
}
