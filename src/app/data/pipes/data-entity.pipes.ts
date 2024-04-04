import { Pipe, PipeTransform } from '@angular/core';
import { DataEntity, DataEntityUtils } from '@app/data/services/model/data-entity.model';

@Pipe({
  name: 'dataEntityIsInvalid',
})
export class DataEntityIsInvalidPipe implements PipeTransform {
  constructor() {}

  transform(entity: DataEntity<any, any> | undefined): boolean {
    return DataEntityUtils.isInvalid(entity);
  }
}

@Pipe({
  name: 'dataEntityError',
})
export class DataEntityErrorPipe implements PipeTransform {
  constructor() {}

  transform(entity: DataEntity<any, any> | undefined): string {
    return DataEntityUtils.isInvalid(entity) ? entity.qualificationComments : undefined;
  }
}
