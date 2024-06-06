import {
  DateUtils,
  EntityAsObjectOptions,
  EntityClass,
  fromDateISOString,
  isNotNil,
  ReferentialRef,
  ReferentialUtils,
  toDateISOString,
  toNumber,
} from '@sumaris-net/ngx-components';
import { DataOrigin } from '@app/activity-calendar/model/data-origin.model';
import { MeasurementFormValues, MeasurementModelValues, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { Moment } from 'moment';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { Metier } from '@app/referential/metier/metier.model';
import { IWithProgramEntity } from '@app/data/services/model/model.utils';
import { DataEntity } from '@app/data/services/model/data-entity.model';
import { Trip } from '@app/trip/trip/trip.model';

export class GearPhysicalFeaturesComparators {
  static sortRankOrder(n1: GearPhysicalFeatures, n2: GearPhysicalFeatures): number {
    const d1 = toNumber(n1.rankOrder, 9999);
    const d2 = toNumber(n2.rankOrder, 9999);
    return d1 === d2 ? 0 : d1 > d2 ? 1 : -1;
  }
}

@EntityClass({ typename: 'GearPhysicalFeaturesVO' })
export class GearPhysicalFeatures extends DataEntity<GearPhysicalFeatures> implements IWithProgramEntity<GearPhysicalFeatures> {
  static fromObject: (source: any, options?: any) => GearPhysicalFeatures;

  static equals(o1: GearPhysicalFeatures, o2: GearPhysicalFeatures) {
    return (!o1 && !o2) || (o1 && o1.equals(o2));
  }

  static isNotEmpty(o: GearPhysicalFeatures) {
    return !GearPhysicalFeatures.isEmpty(o);
  }

  static isEmpty(o: GearPhysicalFeatures) {
    return !o || (ReferentialUtils.isEmpty(o.gear) && ReferentialUtils.isEmpty(o.metier) && MeasurementValuesUtils.isEmpty(o.measurementValues));
  }

  program: ReferentialRef = null;
  vesselId: number = null;
  startDate: Moment = null;
  endDate: Moment = null;
  rankOrder: number = null;
  metier: Metier = null;
  trip: Trip = null;
  gear: ReferentialRef = null;
  otherGear: ReferentialRef = null;
  dataOrigins: DataOrigin[] = null;
  measurementValues: MeasurementModelValues | MeasurementFormValues = null;

  // activityCalendarId: number;

  constructor() {
    super(GearPhysicalFeatures.TYPENAME);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target: any = super.asObject(opts);
    target.program = this.program?.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }) || undefined;
    target.startDate = toDateISOString(this.startDate);
    target.endDate = toDateISOString(this.endDate);
    target.metier =
      (this.metier && this.metier.asObject({ ...opts, ...NOT_MINIFY_OPTIONS /*Always minify=false, because of operations tables cache*/ })) ||
      undefined;
    target.trip =
      (this.trip && this.trip.asObject({ ...opts, ...NOT_MINIFY_OPTIONS /*Always minify=false, because of operations tables cache*/ })) || undefined;
    target.gear = (this.gear && this.gear.asObject({ ...opts, ...NOT_MINIFY_OPTIONS })) || undefined;
    target.otherGear = (this.otherGear && this.otherGear.asObject({ ...opts, ...NOT_MINIFY_OPTIONS })) || undefined;
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
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);
    this.metier = source.metier && Metier.fromObject(source.metier);
    this.trip = source.trip && Trip.fromObject(source.metier);
    this.gear = source.gear && ReferentialRef.fromObject(source.gear);
    this.otherGear = source.otherGear && ReferentialRef.fromObject(source.otherGear);
    this.rankOrder = source.rankOrder;
    this.dataOrigins = source.dataOrigins?.map(DataOrigin.fromObject) || undefined;
    this.measurementValues = { ...source.measurementValues }; // Copy values
    this.dataOrigins = source.dataOrigins?.map(DataOrigin.fromObject) || undefined;
  }

  equals(other: GearPhysicalFeatures, opts = { withMeasurementValues: false }): boolean {
    return (
      (super.equals(other) && isNotNil(this.id)) ||
      // Same metier
      (ReferentialUtils.equals(this.metier, other.metier) &&
        // Same gear
        ReferentialUtils.equals(this.gear, other.gear) &&
        // Same date
        DateUtils.equals(this.startDate, other.startDate) &&
        DateUtils.equals(this.endDate, other.endDate) &&
        // Same rankOrder
        this.rankOrder === other.rankOrder &&
        // Same parent (activity calendar or daily activity calendar)
        //((!this.activityCalendarId && !other.activityCalendarId) || this.activityCalendarId === other.activityCalendarId) &&
        // Same program
        ReferentialUtils.equals(this.program, other.program) &&
        // Same measurementsValues
        (opts.withMeasurementValues !== true || MeasurementValuesUtils.equals(this.measurementValues, other.measurementValues)))
      // Same parent (activity calendar or daily activity calendar)
      // && ((!this.activityCalendarId && !other.activityCalendarId) || this.activityCalendarId === other.activityCalendarId)
    );
  }
}
