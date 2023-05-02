import { EntityClass, FilterFn, fromDateISOString, isNil, isNotEmptyArray, isNotNil, isNotNilOrNaN, toDateISOString } from '@sumaris-net/ngx-components';
import { DataEntityFilter } from '@app/data/services/model/data-filter.model';
import { OperationGroup } from '@app/trip/trip/trip.model';
import { DataEntityAsObjectOptions } from '@app/data/services/model/data-entity.model';
import { Moment } from 'moment';
import { DataQualityStatusIdType } from '@app/data/services/model/model.utils';
import { Util } from 'leaflet';
import { BBox } from 'geojson';
import { Geometries } from '@app/shared/geometries.utils';
import { FishingAreaUtils } from '@app/data/fishing-area/fishing-area.model';

@EntityClass({typename: 'OperationGroupFilterVO'})
export class OperationGroupFilter extends DataEntityFilter<OperationGroupFilter, OperationGroup> {

  static fromObject: (source: any, opts?: any) => OperationGroupFilter;

  tripId?: number;
  vesselId?: number;
  excludeId?: number;
  includedIds?: number[];
  excludedIds?: number[];
  programLabel?: string;
  gearIds?: number[];
  physicalGearIds?: number[];
  taxonGroupLabels?: string[];
  dataQualityStatus?: DataQualityStatusIdType;
  boundingBox?: BBox;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.tripId = source.tripId;
    this.vesselId = source.vesselId;
    this.excludeId = source.excludeId;
    this.includedIds = source.includedIds;
    this.excludedIds = source.excludedIds;
    this.programLabel = source.programLabel || source.program?.label;
    this.gearIds = source.gearIds;
    this.physicalGearIds = source.physicalGearIds;
    this.taxonGroupLabels = source.taxonGroupLabels;
    this.dataQualityStatus = source.dataQualityStatus;
    this.boundingBox = source.boundingBox;
  }

  asObject(opts?: DataEntityAsObjectOptions): any {
    const target = super.asObject(opts);
    if (opts && opts.minify) {
      delete target.program;
      delete target.excludeId; // Not include in Pod
    }
    return target;
  }

  buildFilter(): FilterFn<OperationGroup>[] {
    const filterFns = super.buildFilter();

    // DEBUG
    //console.debug('filtering operations...', this);

    // Included ids
    if (isNotNil(this.includedIds)){
      const includedIds = this.includedIds;
      filterFns.push(o => includedIds.includes(o.id));
    }

    // Exclude id
    if (isNotNil(this.excludeId)) {
      const excludeId = this.excludeId;
      filterFns.push(o => o.id !== excludeId);
    }

    // Excluded ids
    if (isNotNil(this.excludedIds) && this.excludedIds.length > 0) {
      const excludedIds = this.excludedIds;
      filterFns.push(o => !excludedIds.includes(o.id));
    }

    // GearIds;
    if (isNotEmptyArray(this.gearIds) || (!Array.isArray(this.gearIds) && isNotNilOrNaN(this.gearIds))) {
      const gearIds = Array.isArray(this.gearIds) ? this.gearIds : [this.gearIds as number];
      filterFns.push(o => o.metier && isNotNil(o.metier.gear?.id) && gearIds.indexOf(o.metier.gear.id) !== -1);
    }

    // PhysicalGearIds;
    if (isNotEmptyArray(this.physicalGearIds)) {
      const physicalGearIds = this.physicalGearIds;
      filterFns.push(o => isNotNil(o.physicalGearId) && physicalGearIds.indexOf(o.physicalGearId) !== -1);
    }

    // taxonGroupIds
    if (isNotEmptyArray(this.taxonGroupLabels)) {
      const targetSpecieLabels = this.taxonGroupLabels;
      filterFns.push(o => isNotNil(o.metier?.taxonGroup) && targetSpecieLabels.indexOf(o.metier.taxonGroup.label) !== -1);
    }

    // Filter on dataQualityStatus
    if (isNotNil(this.dataQualityStatus)) {
      if (this.dataQualityStatus === 'MODIFIED') {
        filterFns.push(o => isNil(o.controlDate));
      }
      if (this.dataQualityStatus === 'CONTROLLED') {
        filterFns.push(o => isNotNil(o.controlDate));
      }
    }

    // Filter on position
    if (Geometries.checkBBox(this.boundingBox)) {
      const fishingAreaFilter = FishingAreaUtils.createBBoxFilter(this.boundingBox);
      filterFns.push(o => (o.fishingAreas || []).some(fishingAreaFilter));
    }

    // Filter on parent trip
    {
      // Trip
      if (isNotNil(this.tripId)) {
        const tripId = this.tripId;
        filterFns.push(o => o.tripId === tripId);
      }
    }

    return filterFns;
  }
}
