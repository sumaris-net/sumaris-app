import { EntityAsObjectOptions, EntityClass, fromDateISOString, isNotNil, ReferentialUtils, toDateISOString } from '@sumaris-net/ngx-components';
import { DataRootVesselEntity } from '@app/data/services/model/root-vessel-entity.model';
import { MeasurementFormValues, MeasurementModelValues, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { VesselUseFeatures } from '@app/activity-calendar/model/vessel-use-features.model';
import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';
import { Moment } from 'moment';
import { ImageAttachment } from '@app/data/image/image-attachment.model';

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
  images: ImageAttachment[];

  constructor() {
    super(ActivityCalendar.TYPENAME);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target: any = super.asObject(opts);
    target.startDate = toDateISOString(this.startDate);
    target.year = target.year || this.startDate?.year() || null;
    target.vesselUseFeatures = (this.vesselUseFeatures && this.vesselUseFeatures.map((vuf) => vuf.asObject(opts))) || undefined;
    target.gearUseFeatures = (this.gearUseFeatures && this.gearUseFeatures.map((guf) => guf.asObject(opts))) || undefined;
    target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);
    target.images = (this.images && this.images.map((image) => image.asObject(opts))) || undefined;
    if (opts?.minify) {
      delete target.startDate;
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
    this.measurementValues = { ...source.measurementValues }; // Copy values
    this.images = (source.images && source.images.map(ImageAttachment.fromObject)) || undefined;
  }

  equals(other: ActivityCalendar): boolean {
    return (
      (super.equals(other) && isNotNil(this.id)) ||
      // Same vessel
      (this.vesselSnapshot &&
        other.vesselSnapshot &&
        this.vesselSnapshot.id === other.vesselSnapshot.id &&
        // Same year
        this.year === other.year &&
        // Same program
        ReferentialUtils.equals(this.program, other.program))
    );
  }
}
