import { DataEntityFilter } from '@app/data/services/model/data-filter.model';
import { DenormalizedBatch } from './denormalized-batch.model';
import { EntityClass } from '@sumaris-net/ngx-components';

@EntityClass({ typename: 'DenormalizedBatchFilterVO' })
export class DenormalizedBatchFilter extends DataEntityFilter<DenormalizedBatchFilter, DenormalizedBatch> {
  tripId: number;
  operationId: number;
  operationIds: number[];
  isLanding: boolean;
  isDiscard: boolean;

  static fromObject: (source: any, opts?: any) => DenormalizedBatchFilter;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.tripId = source.tripId;
    this.operationId = source.operationId;
    this.isLanding = source.isLanding;
    this.isDiscard = source.isDiscard;
  }
}
