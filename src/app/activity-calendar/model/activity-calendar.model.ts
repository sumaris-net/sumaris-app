import {
  EntityAsObjectOptions,
  EntityClass,
  fromDateISOString,
  isNil,
  isNotNil,
  ReferentialUtils,
  toDateISOString,
} from '@sumaris-net/ngx-components';
import { DataRootVesselEntity } from '@app/data/services/model/root-vessel-entity.model';
import { MeasurementFormValues, MeasurementModelValues, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { VesselUseFeatures } from '@app/activity-calendar/model/vessel-use-features.model';
import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';
import { Moment } from 'moment';
import { ImageAttachment } from '@app/data/image/image-attachment.model';
import { GearPhysicalFeatures } from './gear-physical-features.model';
import { VesselRegistrationPeriod } from '@app/vessel/services/model/vessel.model';
import { VesselRegistrationPeriodsByPrivileges } from '../calendar/activity-month.model';

@EntityClass({ typename: 'ActivityCalendarVO' })
export class ActivityCalendar extends DataRootVesselEntity<ActivityCalendar> {
  static ENTITY_NAME = 'ActivityCalendar';
  static fromObject: (source: any, options?: any) => ActivityCalendar;

  year: number;
  startDate: Moment;
  directSurveyInvestigation: boolean;
  economicSurvey: boolean;
  measurementValues: MeasurementModelValues | MeasurementFormValues = null;
  vesselUseFeatures: VesselUseFeatures[];
  gearUseFeatures: GearUseFeatures[];
  gearPhysicalFeatures: GearPhysicalFeatures[];
  images: ImageAttachment[];
  vesselRegistrationPeriodsByPrivileges: VesselRegistrationPeriodsByPrivileges;

  constructor() {
    super(ActivityCalendar.TYPENAME);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target: any = super.asObject(opts);
    target.startDate = toDateISOString(this.startDate);
    target.year = target.year || this.startDate?.year() || null;
    target.vesselUseFeatures = (this.vesselUseFeatures && this.vesselUseFeatures.map((vuf) => vuf.asObject(opts))) || undefined;
    target.gearUseFeatures = (this.gearUseFeatures && this.gearUseFeatures.map((guf) => guf.asObject(opts))) || undefined;
    target.gearPhysicalFeatures = (this.gearPhysicalFeatures && this.gearPhysicalFeatures.map((gpf) => gpf.asObject(opts))) || undefined;
    target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);
    target.images = (this.images && this.images.map((image) => image.asObject(opts))) || undefined;
    target.vesselRegistrationPeriodsByPrivileges = Object.keys(this.vesselRegistrationPeriodsByPrivileges || {}).reduce((acc, key) => {
      acc[key] = this.vesselRegistrationPeriodsByPrivileges[key].map((vesselRegistrationPeriods) => vesselRegistrationPeriods.asObject(opts));
      return acc;
    }, {});
    if (opts?.minify) {
      delete target.startDate;
      delete target.vesselRegistrationPeriodsByPrivileges;
    }
    return target;
  }

  fromObject(source: any, opts?: EntityAsObjectOptions) {
    super.fromObject(source, opts);
    this.year = source.year;
    this.startDate = fromDateISOString(source.startDate);
    this.directSurveyInvestigation = source.directSurveyInvestigation;
    this.economicSurvey = source.economicSurvey;
    this.vesselUseFeatures = source.vesselUseFeatures?.map(VesselUseFeatures.fromObject) || undefined;
    this.gearUseFeatures = source.gearUseFeatures?.map(GearUseFeatures.fromObject) || undefined;
    this.gearPhysicalFeatures = source.gearPhysicalFeatures?.map(GearPhysicalFeatures.fromObject) || undefined;
    this.measurementValues = { ...source.measurementValues }; // Copy values
    this.images = (source.images && source.images.map(ImageAttachment.fromObject)) || undefined;
    this.vesselRegistrationPeriodsByPrivileges = Object.keys(source.vesselRegistrationPeriodsByPrivileges || {}).reduce((acc, key) => {
      acc[key] = source.vesselRegistrationPeriodsByPrivileges[key].map(VesselRegistrationPeriod.fromObject);
      return acc;
    }, {});
  }

  equals(other: ActivityCalendar, opts = { withMeasurementValues: false, withVesselUseFeatures: false, withGearUseFeatures: false }): boolean {
    return (
      (super.equals(other) && isNotNil(this.id)) ||
      // Same vessel
      (this.vesselSnapshot &&
        other.vesselSnapshot &&
        this.vesselSnapshot.id === other.vesselSnapshot.id &&
        // Same year
        this.year === other.year &&
        // Same program
        ReferentialUtils.equals(this.program, other.program) &&
        // Same measurement values
        (opts.withMeasurementValues !== true || MeasurementValuesUtils.equals(this.measurementValues, other.measurementValues)) &&
        // Same vuf
        (opts.withVesselUseFeatures !== true ||
          (isNil(this?.vesselUseFeatures) && isNil(other?.vesselUseFeatures)) ||
          (this?.vesselUseFeatures.length === other.vesselUseFeatures.length &&
            this?.vesselUseFeatures.every((vuf, index) => vuf.equals(other[index], { withMeasurementValues: true })))) &&
        (opts.withGearUseFeatures !== true ||
          (isNil(this?.gearUseFeatures) && isNil(other?.gearUseFeatures)) ||
          (this?.gearUseFeatures.length === other.gearUseFeatures.length &&
            this?.gearUseFeatures.every((vuf, index) => vuf.equals(other[index], { withMeasurementValues: true })))))
    );
  }
}
