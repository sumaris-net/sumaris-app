import {EntityClass, FilterFn, fromDateISOString, isNil, isNotNil, isNotNilOrNaN} from '@sumaris-net/ngx-components';
import {DataEntityFilter} from '@app/data/services/model/data-filter.model';
import {Operation} from '@app/trip/services/model/trip.model';
import {DataEntityAsObjectOptions} from '@app/data/services/model/data-entity.model';
import {Moment} from 'moment';
import {DataQualityStatusIdType, SynchronizationStatus} from '@app/data/services/model/model.utils';
import {Util} from 'leaflet';
import isArray = Util.isArray;

@EntityClass({typename: 'OperationFilterVO'})
export class OperationFilter extends DataEntityFilter<OperationFilter, Operation> {

  tripId?: number;
  vesselId?: number;
  excludeId?: number;
  includedIds?: number[];
  excludedIds?: number[];
  programLabel?: string;
  excludeChildOperation?: boolean;
  hasNoChildOperation?: boolean;
  startDate?: Date | Moment;
  endDate?: Date | Moment;
  gearIds?: number[];
  physicalGearIds?: number[];
  taxonGroupLabels?: string[];
  synchronizationStatus?: SynchronizationStatus[];
  dataQualityStatus?: DataQualityStatusIdType;

  static fromObject: (source: any, opts?: any) => OperationFilter;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.tripId = source.tripId;
    this.vesselId = source.vesselId;
    this.excludeId = source.excludeId;
    this.includedIds = source.includedIds;
    this.excludedIds = source.excludedIds;
    this.programLabel = source.programLabel;
    this.excludeChildOperation = source.excludeChildOperation;
    this.hasNoChildOperation = source.hasNoChildOperation;
    this.startDate = source.startDate;
    this.endDate = source.endDate;
    this.gearIds = source.gearIds;
    this.physicalGearIds = source.physicalGearIds;
    this.taxonGroupLabels = source.taxonGroupLabels;
    this.dataQualityStatus = source.dataQualityStatus;
  }

  asObject(opts?: DataEntityAsObjectOptions): any {
    const target = super.asObject(opts);
    if (opts && opts.minify) {
      delete target.excludeId; // Not include in Pod
      delete target.synchronizationStatus;
    }
    return target;
  }

  countNotEmptyCriteria(): number {
    const nbDefaults = isNotNil(this.tripId) ? 1 : 0;
    return super.countNotEmptyCriteria() - nbDefaults;
  }

  buildFilter(): FilterFn<Operation>[] {
    const filterFns = super.buildFilter();

    // DEBUG
    //console.debug('TODO filter operations', this);

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

    // ExcludedIds
    if (isNotNil(this.excludedIds) && this.excludedIds.length > 0) {
      const excludedIds = this.excludedIds;
      filterFns.push(o => !excludedIds.includes(o.id));
    }

    // Only operation with no parents
    if (isNotNil(this.excludeChildOperation) && this.excludeChildOperation) {
      filterFns.push((o => (isNil(o.parentOperationId) && isNil(o.parentOperation))));
    }

    // Only operation with no child
    if (isNotNil(this.hasNoChildOperation) && this.hasNoChildOperation) {
      filterFns.push((o => (isNil(o.childOperationId) && isNil(o.childOperation))));
    }

    // StartDate
    if (isNotNil(this.startDate)) {
      const startDate = this.startDate;
      filterFns.push((o => ((isNotNil(o.endDateTime) && fromDateISOString(o.endDateTime).isAfter(startDate))
        || (isNotNil(o.fishingStartDateTime) && fromDateISOString(o.fishingStartDateTime).isAfter(startDate)))));
    }

    // EndDate
    if (isNotNil(this.endDate)) {
      const endDate = this.endDate;
      filterFns.push((o => ((isNotNil(o.endDateTime) && fromDateISOString(o.endDateTime).isBefore(endDate))
        || (isNotNil(o.fishingStartDateTime) && fromDateISOString(o.fishingStartDateTime).isBefore(endDate)))));
    }

    // GearIds;
    if (isNotNil(this.gearIds) && (isNotNilOrNaN(this.gearIds) || this.gearIds.length > 0)) {
      const gearIds = (isArray(this.gearIds) ? this.gearIds : [this.gearIds]) as number[];
      filterFns.push((o => isNotNil(o.physicalGear?.gear) && gearIds.includes(o.physicalGear.gear.id)));
    }

    // PhysicalGearIds;
    if (isNotNil(this.physicalGearIds) && this.physicalGearIds.length > 0) {
      const physicalGearIds = this.physicalGearIds;
      filterFns.push((o => isNotNil(o.physicalGear) && physicalGearIds.includes(o.physicalGear.id)));
    }

    // taxonGroupIds
    if (isNotNil(this.taxonGroupLabels) && this.taxonGroupLabels.length > 0) {
      const targetSpecieLabels = this.taxonGroupLabels;
      filterFns.push((o => isNotNil(o.metier) && isNotNil(o.metier.taxonGroup) && targetSpecieLabels.indexOf(o.metier.taxonGroup.label) !== -1));
    }

    // Filter on dataQualityStatus
    if (isNotNil(this.dataQualityStatus)) {
      if (this.dataQualityStatus === 'MODIFIED') {
        filterFns.push((o => (isNil(o.controlDate))));
      }
      if (this.dataQualityStatus === 'CONTROLLED') {
        filterFns.push((o => (isNotNil(o.controlDate))));
      }
    }

    // Filter on parent trip
    {
      // Trip
      if (isNotNil(this.tripId)) {
        const tripId = this.tripId;
        filterFns.push(o => o.tripId === tripId);
      }

      // Vessel
      if (isNotNil(this.vesselId)) {
        const vesselId = this.vesselId;
        filterFns.push(o => isNil(o.vesselId) || o.vesselId === vesselId);
      }

      // Program label
      if (isNotNil(this.programLabel)) {
        const programLabel = this.programLabel;
        filterFns.push(o => isNil(o.programLabel) || o.programLabel === programLabel);
      }
    }

    return filterFns;
  }
}
