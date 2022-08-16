import { MeasurementFormValues, MeasurementModelValues, MeasurementUtils, MeasurementValuesUtils } from './measurement.model';
import { Moment } from 'moment';
import { IWithVesselSnapshotEntity, VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { Entity, EntityAsObjectOptions, EntityClass, EntityUtils, fromDateISOString, isEmptyArray, isNil, isNotNil, ReferentialRef, toDateISOString } from '@sumaris-net/ngx-components';
import { DataEntityAsObjectOptions } from '@app/data/services/model/data-entity.model';
import { SortDirection } from '@angular/material/sort';
import { SynchronizationStatus } from '@app/data/services/model/model.utils';
import { NOT_MINIFY_OPTIONS } from "@app/core/services/model/referential.utils";

@EntityClass({typename: 'VesselActivityVO'})
export class VesselActivity extends Entity<VesselActivity> {

  static fromObject: (source: any, opts?: any) => VesselActivity;

  date: Moment;
  rankOrder: number;
  comments: string;
  measurementValues: MeasurementModelValues | MeasurementFormValues;
  metiers: ReferentialRef[];
  observedLocationId: number;
  landingId: number;
  tripId: number;

  constructor() {
    super(VesselActivity.TYPENAME);
    this.date = null;
    this.rankOrder = null;
    this.comments = null;
    this.measurementValues = {};
    this.metiers = [];
    this.observedLocationId = null;
    this.landingId = null;
    this.tripId = null;
  }

  static isEmpty(value: VesselActivity) {
    return !value || (
      MeasurementValuesUtils.isEmpty(value.measurementValues)
      && isEmptyArray(value.metiers)
    );
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    target.date = toDateISOString(this.date);
    target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);
    target.metiers = this.metiers && this.metiers.filter(isNotNil).map(p => p && p.asObject({...opts, ...NOT_MINIFY_OPTIONS})) || undefined;
    return target;
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.date = fromDateISOString(source.date);
    this.rankOrder = source.rankOrder;
    this.comments = source.comments;
    this.measurementValues = source.measurementValues && {...source.measurementValues} || MeasurementUtils.toMeasurementValues(source.measurements);
    this.metiers = source.metiers && source.metiers.map(ReferentialRef.fromObject) || [];
    this.observedLocationId = source.observedLocationId;
    this.landingId = source.landingId;
    this.tripId = source.tripId;
  }

}

@EntityClass({typename: 'AggregatedLandingVO'})
export class AggregatedLanding extends Entity<AggregatedLanding, number, DataEntityAsObjectOptions> implements IWithVesselSnapshotEntity<AggregatedLanding> {

  static fromObject: (source: any, opts?: any) => AggregatedLanding;

  vesselSnapshot: VesselSnapshot;
  vesselActivities: VesselActivity[];

  // parent (for entity cache use only)
  observedLocationId: number;

  synchronizationStatus?: SynchronizationStatus = null;

  constructor() {
    super(AggregatedLanding.TYPENAME);
    this.vesselSnapshot = null;
    this.vesselActivities = [];
  }

  asObject(opts?: DataEntityAsObjectOptions): any {
    const target = super.asObject(opts);
    target.vesselSnapshot = this.vesselSnapshot && this.vesselSnapshot.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || undefined;
    target.vesselActivities = this.vesselActivities && this.vesselActivities.map(value => value.asObject(opts));
    if (opts?.minify) {
      if (opts.keepSynchronizationStatus !== true) {
        delete target.synchronizationStatus; // Remove by default, when minify, because not exists on pod's model
      }
    }
    return target;
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.vesselSnapshot = source.vesselSnapshot && VesselSnapshot.fromObject(source.vesselSnapshot);
    // this.id = this.vesselSnapshot.id;
    this.observedLocationId = source.observedLocationId;
    this.vesselActivities = source.vesselActivities && source.vesselActivities.map(VesselActivity.fromObject) || [];
    this.synchronizationStatus = source.synchronizationStatus;
  }
}

export class AggregatedLandingUtils {

  static sort(data: AggregatedLanding[], sortBy?: string, sortDirection?: SortDirection): AggregatedLanding[] {
    if (data?.length > 0 && sortBy === 'vessel') {
      return data.sort(AggregatedLandingUtils.naturalSortComparator('vesselSnapshot.exteriorMarking', sortDirection));
    }
    return data;
  }

  // todo move to ngx-sumaris-components
  static naturalSortComparator<E extends Entity<E, any>>(property: string, sortDirection?: SortDirection): (r1: E, r2: E) => number {
    const collator = new Intl.Collator(undefined, { numeric: true });
    const direction = !sortDirection || sortDirection === 'asc' ? 1 : -1;
    return (r1, r2) => {
      let v1 = EntityUtils.getPropertyByPath(r1, property);
      let v2 = EntityUtils.getPropertyByPath(r2, property);
      if (isNil(v1)) return -direction;
      if (isNil(v2)) return direction;
      if (EntityUtils.isNotEmpty(v1, 'id') && EntityUtils.isNotEmpty(v2, 'id')) {
        v1 = v1.id;
        v2 = v2.id;
      }
      return collator.compare(String(v1), String(v2)) * direction;
    };
  }
}
