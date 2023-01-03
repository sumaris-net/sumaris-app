import {DataEntityFilter} from '../../../data/services/model/data-filter.model';
import {Sample} from '../model/sample.model';
import {EntityAsObjectOptions, EntityClass, FilterFn, isNotNil, isNotNilOrBlank} from '@sumaris-net/ngx-components';
import {PmfmIds} from '@app/referential/services/model/model.enum';
import {DenormalizedPmfmStrategy} from '@app/referential/services/model/pmfm-strategy.model';

@EntityClass({ typename: 'SampleFilterVO' })
export class SampleFilter extends DataEntityFilter<SampleFilter, Sample> {
  static fromObject: (source: any, opts?: any) => SampleFilter;

  operationId?: number;
  landingId?: number;
  observedLocationId?: number;
  observedLocationIds?: number[];
  parent?: Sample;
  tagId?: string;
  withTagId?: boolean;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.operationId = source.operationId;
    this.landingId = source.landingId;
    this.observedLocationId = source.observedLocationId;
    this.observedLocationIds = source.observedLocationIds;
    this.parent = source.parent;
    this.tagId = source.tagId;
    this.withTagId = source.withTagId;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    if (opts && opts.minify) {
      target.parentId = this.parent ? this.parent.id : undefined;
      delete target.parent;
    }
    else {
      target.parent = this.parent ? {id: this.parent.id, label: this.parent.label} : undefined;
    }
    return target;
  }

  buildFilter(): FilterFn<Sample>[] {
    const filterFns = super.buildFilter();

    // Landing
    if (isNotNil(this.landingId)) {
      filterFns.push(t => (t.landingId === this.landingId));
    }

    // Operation
    if (isNotNil(this.operationId)) {
      filterFns.push(t => (t.operationId === this.operationId));
    }

    // Parent
    if (isNotNil(this.parent)) {
      filterFns.push(t => (t.parentId === this.parent.id || this.parent.equals(t.parent)));
    }

    // Having a tag ID
    if (isNotNilOrBlank(this.tagId)) {
      filterFns.push(t =>  t.measurementValues && this.tagId === t.measurementValues[PmfmIds.TAG_ID]);
    }

    // With tag ID
    if (isNotNil(this.withTagId)) {
      filterFns.push(t =>  t.measurementValues && this.withTagId === isNotNilOrBlank(t.measurementValues[PmfmIds.TAG_ID]));
    }

    return filterFns;
  }
}

