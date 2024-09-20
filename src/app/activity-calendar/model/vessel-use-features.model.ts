import {
  DateUtils,
  EntityAsObjectOptions,
  EntityClass,
  fromDateISOString,
  isNil,
  isNotNil,
  ReferentialRef,
  ReferentialUtils,
  toDateISOString,
} from '@sumaris-net/ngx-components';
import { DataEntity } from '@app/data/services/model/data-entity.model';
import { MeasurementFormValues, MeasurementModelValues, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { DataOrigin } from '@app/activity-calendar/model/data-origin.model';
import { Moment } from 'moment';
import { IWithProgramEntity } from '@app/data/services/model/model.utils';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { IUseFeatures } from '@app/activity-calendar/model/use-features.model';

export const VesselUseFeaturesIsActiveEnum = {
  INACTIVE: 0,
  ACTIVE: 1,
  NOT_EXISTS: 2,
};

@EntityClass({ typename: 'VesselUseFeaturesVO' })
export class VesselUseFeatures
  extends DataEntity<VesselUseFeatures>
  implements IWithProgramEntity<VesselUseFeatures>, IUseFeatures<VesselUseFeatures>
{
  static fromObject: (source: any, options?: any) => VesselUseFeatures;
  static equals(o1: VesselUseFeatures, o2: VesselUseFeatures, opts = { withMeasurementValues: false }) {
    return (!o1 && !o2) || (o1 && VesselUseFeatures.fromObject(o1).equals(o2, opts));
  }
  static isNotEmpty(o: VesselUseFeatures): boolean {
    return !VesselUseFeatures.isEmpty(o);
  }

  static isEmpty(o: VesselUseFeatures): boolean {
    return !o || (isNil(o.isActive) && MeasurementValuesUtils.isEmpty(o.measurementValues));
  }

  program: ReferentialRef;
  vesselId: number = null;
  startDate: Moment;
  endDate: Moment;
  isActive: number;
  basePortLocation?: ReferentialRef;
  dataOrigins: DataOrigin[];
  measurementValues: MeasurementModelValues | MeasurementFormValues = null;

  constructor() {
    super(VesselUseFeatures.TYPENAME);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target: any = super.asObject(opts);
    target.program = this.program?.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }) || undefined;
    target.startDate = toDateISOString(this.startDate);
    target.endDate = toDateISOString(this.endDate);
    target.basePortLocation = this.basePortLocation?.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }) || undefined;
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
    this.isActive = source.isActive;
    this.basePortLocation = source.basePortLocation && ReferentialRef.fromObject(source.basePortLocation);
    this.dataOrigins = source.dataOrigins?.map(DataOrigin.fromObject) || undefined;
    this.measurementValues = { ...source.measurementValues }; // Copy values
  }

  equals(
    other: VesselUseFeatures,
    opts: { withProgram?: boolean; withMeasurementValues?: boolean } = { withProgram: true, withMeasurementValues: false }
  ): boolean {
    return (
      (super.equals(other) && isNotNil(this.id)) ||
      // Same isActive
      (this.isActive === other.isActive &&
        // Same date
        DateUtils.equals(this.startDate, other.startDate) &&
        DateUtils.equals(this.endDate, other.endDate) &&
        // Same parent (activity calendar or daily activity calendar)
        //((!this.activityCalendarId && !other.activityCalendarId) || this.activityCalendarId === other.activityCalendarId) &&
        //((!this.dailyActivityCalendarId && !other.dailyActivityCalendarId) || this.dailyActivityCalendarId === other.dailyActivityCalendarId) &&
        // Same program
        (opts.withProgram === false || ReferentialUtils.equals(this.program, other.program)) &&
        // Same basePortLocation
        ReferentialUtils.equals(this.basePortLocation, other.basePortLocation) &&
        // Same measurementsValues
        (opts.withMeasurementValues !== true || MeasurementValuesUtils.equals(this.measurementValues, other.measurementValues)))
    );
  }
}
