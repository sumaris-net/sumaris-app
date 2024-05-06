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
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';

export class GearUseFeaturesComparators {
  static sortRankOrder(n1: GearUseFeatures, n2: GearUseFeatures): number {
    const d1 = toNumber(n1.rankOrder, 9999);
    const d2 = toNumber(n2.rankOrder, 9999);
    return d1 === d2 ? 0 : d1 > d2 ? 1 : -1;
  }
}

@EntityClass({ typename: 'GearUseFeaturesVO' })
export class GearUseFeatures extends DataEntity<GearUseFeatures> implements IWithProgramEntity<GearUseFeatures> {
  static fromObject: (source: any, options?: any) => GearUseFeatures;

  static equals(o1: GearUseFeatures, o2: GearUseFeatures) {
    return (!o1 && !o2) || (o1 && o1.equals(o2));
  }

  static isNotEmpty(o: GearUseFeatures) {
    return !GearUseFeatures.isEmpty(o);
  }

  static isEmpty(o: GearUseFeatures) {
    return (
      !o ||
      (ReferentialUtils.isEmpty(o.gear) &&
        ReferentialUtils.isEmpty(o.metier) &&
        MeasurementValuesUtils.isEmpty(o.measurementValues) &&
        (!o.fishingAreas || o.fishingAreas.every((fa) => FishingArea.isEmpty(fa))))
    );
  }

  program: ReferentialRef = null;
  vesselId: number = null;
  startDate: Moment = null;
  endDate: Moment = null;
  rankOrder: number = null;
  metier: Metier = null;
  gear: ReferentialRef = null;
  dataOrigins: DataOrigin[] = null;
  measurementValues: MeasurementModelValues | MeasurementFormValues = null;
  fishingAreas: FishingArea[] = null;

  //activityCalendarId: number;
  //dailyActivityCalendarId: number;

  constructor() {
    super(GearUseFeatures.TYPENAME);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target: any = super.asObject(opts);
    target.program = this.program?.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }) || undefined;
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
    target.fishingAreas = this.fishingAreas?.map((fa) => fa.asObject(opts)) || undefined;
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
    this.gear = source.gear && ReferentialRef.fromObject(source.gear);
    this.rankOrder = source.rankOrder;
    this.dataOrigins = source.dataOrigins?.map(DataOrigin.fromObject) || undefined;
    this.measurementValues = { ...source.measurementValues }; // Copy values
    this.fishingAreas = source.fishingAreas?.map(FishingArea.fromObject) || undefined;
    this.dataOrigins = source.dataOrigins?.map(DataOrigin.fromObject) || undefined;
  }

  equals(other: GearUseFeatures, opts = { withMeasurementValues: false }): boolean {
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
        //((!this.dailyActivityCalendarId && !other.dailyActivityCalendarId) || this.dailyActivityCalendarId === other.dailyActivityCalendarId) &&
        // Same program
        ReferentialUtils.equals(this.program, other.program) &&
        // Same measurementsValues
        (opts.withMeasurementValues !== true || MeasurementValuesUtils.equals(this.measurementValues, other.measurementValues)))
    );
  }
}
