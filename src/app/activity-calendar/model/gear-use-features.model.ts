import {
  DateUtils,
  EntityAsObjectOptions,
  EntityClass,
  fromDateISOString,
  isNotNil,
  ReferentialRef,
  ReferentialUtils,
  toDateISOString,
} from '@sumaris-net/ngx-components';
import { DataEntity } from '@app/data/services/model/data-entity.model';
import { IWithVesselSnapshotEntity, VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { DataOrigin } from '@app/activity-calendar/model/data-origin.model';
import { MeasurementFormValues, MeasurementModelValues, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { Moment } from 'moment';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { Metier } from '@app/referential/metier/metier.model';

@EntityClass({ typename: 'GearUseFeaturesVO' })
export class GearUseFeatures extends DataEntity<GearUseFeatures> implements IWithVesselSnapshotEntity<GearUseFeatures> {
  static fromObject: (source: any, options?: any) => GearUseFeatures;

  program: ReferentialRef = null;
  vesselId: number = null;
  vesselSnapshot: VesselSnapshot = null;
  startDate: Moment = null;
  endDate: Moment = null;
  rankOrder: number = null;
  metier: Metier = null;
  gear: ReferentialRef = null;
  dataOrigins: DataOrigin[] = null;
  measurementValues: MeasurementModelValues | MeasurementFormValues = null;

  activityCalendarId: number;
  dailyActivityCalendarId: number;

  constructor() {
    super(GearUseFeatures.TYPENAME);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target: any = super.asObject(opts);
    target.program = this.program?.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }) || undefined;
    target.vesselSnapshot = this.vesselSnapshot?.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }) || undefined;
    target.startDate = toDateISOString(this.startDate);
    target.endDate = toDateISOString(this.endDate);
    target.metier =
      (this.metier && this.metier.asObject({ ...opts, ...NOT_MINIFY_OPTIONS /*Always minify=false, because of operations tables cache*/ })) ||
      undefined;
    target.gear = (this.gear && this.gear.asObject({ ...opts, ...NOT_MINIFY_OPTIONS })) || undefined;
    if (target.gear && !target.gear.entityName) {
      console.warn('Fixme: manually set gear entityName!');
      target.gear.entityName = 'GearVO';
    }
    target.dataOrigins = this.dataOrigins?.map((origin) => origin.asObject(opts)) || undefined;
    target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);

    return target;
  }

  fromObject(source: any, opts?: EntityAsObjectOptions) {
    super.fromObject(source, opts);
    this.program = source.program && ReferentialRef.fromObject(source.program);
    this.vesselId = source.vesselId;
    this.vesselSnapshot = source.vesselSnapshot && VesselSnapshot.fromObject(source.vesselSnapshot);
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);
    this.metier = (source.metier && Metier.fromObject(source.metier, { useChildAttributes: 'TaxonGroup' })) || undefined;
    this.gear = source.gear && ReferentialRef.fromObject(source.gear);
    this.rankOrder = source.rankOrder;
    this.dataOrigins = source.dataOrigins?.map(DataOrigin.fromObject) || undefined;
    this.measurementValues = { ...source.measurementValues }; // Copy values
  }

  equals(other: GearUseFeatures, opts = { withMeasurementValues: false }): boolean {
    return (
      (super.equals(other) && isNotNil(this.id)) ||
      // Same metier
      (ReferentialUtils.equals(this.metier, other.metier) &&
        // Same gear
        ReferentialUtils.equals(this.gear, other.gear) &&
        // Same vessel
        ReferentialUtils.equals(this.vesselSnapshot, other.vesselSnapshot) &&
        // Same date
        DateUtils.equals(this.startDate, other.startDate) &&
        DateUtils.equals(this.endDate, other.endDate) &&
        // Same rankOrder
        this.rankOrder === other.rankOrder &&
        // Same parent (activity calendar or daily activity calendar)
        ((!this.activityCalendarId && !other.activityCalendarId) || this.activityCalendarId === other.activityCalendarId) &&
        ((!this.dailyActivityCalendarId && !other.dailyActivityCalendarId) || this.dailyActivityCalendarId === other.dailyActivityCalendarId) &&
        // Same program
        ReferentialUtils.equals(this.program, other.program) &&
        // Same measurementsValues
        (opts.withMeasurementValues !== true || MeasurementValuesUtils.equals(this.measurementValues, other.measurementValues)))
    );
  }
}
