import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import { GearPhysicalFeatures } from '@app/activity-calendar/model/gear-physical-features.model';
import { VesselUseFeatures } from '@app/activity-calendar/model/vessel-use-features.model';
import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';
import { ReferentialRef } from '@sumaris-net/ngx-components';

export class ActivityCalendarUtils {
  static merge(data: ActivityCalendar[]): ActivityCalendar {
    const target = new ActivityCalendar();

    target.vesselUseFeatures = data.flatMap((ac) => ac.vesselUseFeatures).filter(VesselUseFeatures.isNotEmpty);
    target.gearUseFeatures = data.flatMap((ac) => ac.gearUseFeatures).filter(GearUseFeatures.isNotEmpty);
    target.gearPhysicalFeatures = data.flatMap((ac) => ac.gearPhysicalFeatures).filter(GearPhysicalFeatures.isNotEmpty);

    return target;
  }

  static setYear(data: ActivityCalendar, year: number) {
    data.year = year;
    data.startDate = data.startDate?.year(year);
    (data.vesselUseFeatures || []).forEach((vuf) => {
      vuf.startDate = vuf.startDate.year(year);
      vuf.endDate = vuf.endDate?.year(year);
    });
    (data.gearUseFeatures || []).forEach((guf) => {
      guf.startDate = guf.startDate.year(year);
      guf.endDate = guf.endDate?.year(year);
    });
    (data.gearPhysicalFeatures || []).forEach((gpf) => {
      gpf.startDate = gpf.startDate.year(year);
      gpf.endDate = gpf.endDate?.year(year);
    });
  }

  static setProgram(data: ActivityCalendar, program: ReferentialRef) {
    data.program = program;
    (data.vesselUseFeatures || []).forEach((vuf) => {
      vuf.program = program;
    });
    (data.gearUseFeatures || []).forEach((guf) => {
      guf.program = program;
    });
    (data.gearPhysicalFeatures || []).forEach((gpf) => {
      gpf.program = program;
    });
  }
}
