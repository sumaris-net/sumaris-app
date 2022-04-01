import {BaseReferentialFilter} from "./referential.filter";
import {Program} from "../model/program.model";
import { EntityAsObjectOptions, EntityClass, fromDateISOString, toDateISOString } from '@sumaris-net/ngx-components';
import { Moment } from 'moment';

@EntityClass({typename: 'ProgramFilterVO'})
export class ProgramFilter extends BaseReferentialFilter<ProgramFilter, Program> {

  static ENTITY_NAME = 'Program';
  static fromObject: (source: any, opts?: any) => ProgramFilter;

  withProperty?: string;
  minUpdateDate?: Moment;
  acquisitionLevels?: string[];

  constructor() {
    super();
    this.entityName = ProgramFilter.ENTITY_NAME;
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.entityName = source.entityName || ProgramFilter.ENTITY_NAME;
    this.withProperty = source.withProperty;
    this.minUpdateDate = fromDateISOString(source.minUpdateDate);
    this.acquisitionLevels = source.acquisitionLevels;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    target.minUpdateDate = toDateISOString(this.minUpdateDate);
    return target;
  }
}
