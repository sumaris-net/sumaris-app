import { EntityAsObjectOptions, EntityClass, FilterFn, isNil, isNotEmptyArray, isNotNil } from '@sumaris-net/ngx-components';
import { DataEntityFilter } from '@app/data/services/model/data-filter.model';
import { GearPhysicalFeatures } from './gear-physical-features.model';

@EntityClass({ typename: 'GearPhysicalFeaturesFilterVO' })
export class GearPhysicalFeaturesFilter extends DataEntityFilter<GearPhysicalFeaturesFilter, GearPhysicalFeatures> {
  static fromObject: (source: any, opts?: any) => GearPhysicalFeaturesFilter;

  vesselId?: number;
  vesselIds?: number[];
  metierId?: number;
  gearId?: number;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.vesselId = source.vesselId;
    this.vesselIds = source.vesselIds;
    this.metierId = source.metierId;
    this.gearId = source.gearId;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    target.metierId = isNotNil(this.metierId) ? this.metierId : undefined;
    return target;
  }

  buildFilter(): FilterFn<GearPhysicalFeatures>[] {
    const filterFns = super.buildFilter();

    // Metier
    if (isNotNil(this.metierId)) {
      filterFns.push((t) => t.metier.id === this.metierId);
    }

    // Gear
    if (isNotNil(this.gearId)) {
      filterFns.push((t) => t.gear.id === this.gearId);
    }

    // Vessel
    if (isNotNil(this.vesselId)) {
      const vesselId = this.vesselId;
      filterFns.push((o) => isNil(o.vesselId) || o.vesselId === vesselId);
    } else if (isNotEmptyArray(this.vesselIds)) {
      const vesselIds = this.vesselIds;
      filterFns.push((o) => isNil(o.vesselId) || vesselIds.includes(o.vesselId));
    }
    return filterFns;
  }
}
