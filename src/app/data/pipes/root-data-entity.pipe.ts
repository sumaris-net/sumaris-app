import { Pipe, PipeTransform } from '@angular/core';
import { RootDataEntity } from '../services/model/root-data-entity.model';
import { TranslateService } from '@ngx-translate/core';
import { isNotNil } from '@sumaris-net/ngx-components';
import { MomentDateAdapter } from '@angular/material-moment-adapter';

@Pipe({
  name: 'rootDataQualityToString',
})
export class RootDataQualityToStringPipe implements PipeTransform {
  constructor(
    protected translate: TranslateService,
    protected dateAdapter: MomentDateAdapter
  ) {}

  transform(entity: RootDataEntity<any, any> | undefined, separator = ' - '): string {
    const datePattern = this.translate.instant('COMMON.DATE_TIME_PATTERN');
    const updateDate = entity?.updateDate;
    const controlDate = entity?.controlDate;
    const validationDate = entity?.validationDate;
    const resultPart = [];
    if (isNotNil(updateDate)) {
      resultPart.push(`${this.translate.instant('COMMON.UPDATED_ON')}&nbsp;${this.dateAdapter.format(updateDate, datePattern)}`);
    }
    if (isNotNil(controlDate)) {
      resultPart.push(`${this.translate.instant('QUALITY.CONTROLLED_ON')}&nbsp;${this.dateAdapter.format(updateDate, datePattern)}`);
    }
    if (isNotNil(validationDate)) {
      resultPart.push(`${this.translate.instant('QUALITY.VALIDATED_ON')}&nbsp;${this.dateAdapter.format(updateDate, datePattern)}`);
    }
    return resultPart.join(separator);
  }
}
