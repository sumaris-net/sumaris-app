import { Entity, EntityClass, toBoolean } from '@sumaris-net/ngx-components';
import { StrataAreaType, StrataTimeType } from '@app/extraction/product/product.model';

export declare interface IAggregationStrata {
  spatialColumnName: StrataAreaType;
  timeColumnName: StrataTimeType;
  techColumnName?: string;
  aggColumnName?: string;
  aggFunction?: string;
}

@EntityClass({ typename: 'AggregationStrataVO' })
export class AggregationStrata extends Entity<AggregationStrata> implements IAggregationStrata {

  static fromObject: (source: any) => AggregationStrata;

  isDefault: boolean;
  sheetName: string;

  spatialColumnName: StrataAreaType;
  timeColumnName: StrataTimeType;
  aggColumnName: string;
  aggFunction: string;
  techColumnName: string;

  constructor() {
    super(AggregationStrata.TYPENAME);
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.sheetName = source.sheetName;
    this.isDefault = toBoolean(source.isDefault, false);
    this.spatialColumnName = source.spatialColumnName;
    this.timeColumnName = source.timeColumnName;
    this.aggColumnName = source.aggColumnName;
    this.aggFunction = source.aggFunction;
    this.techColumnName = source.techColumnName;
  }
}
