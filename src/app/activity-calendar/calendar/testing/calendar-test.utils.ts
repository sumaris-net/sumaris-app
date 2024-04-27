import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import { DateUtils, ReferentialRef, StatusIds } from '@sumaris-net/ngx-components';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { VesselUseFeatures } from '@app/activity-calendar/model/vessel-use-features.model';

export class ActivityCalendarTestUtils {
  static EXAMPLES = ['default', 'empty'];

  static getExample(key: string): Partial<ActivityCalendar> {
    switch (key) {
      case 'default': {
        const data = new ActivityCalendar();
        const year = DateUtils.moment().year() - 1;

        // Vessel
        data.vesselSnapshot = VesselSnapshot.fromObject({
          id: 1,
          registrationLocation: { id: 25, label: 'FRBES', name: 'Brest' },
        });

        // January
        const january = new VesselUseFeatures();
        january.isActive = StatusIds.ENABLE;
        january.startDate = DateUtils.moment().utc(false).year(year).month(0).startOf('year');
        january.vesselId = data.vesselSnapshot?.id;
        january.basePortLocation = ReferentialRef.fromObject({ id: 10, label: 'XBR', name: 'Brest' });

        data.vesselUseFeatures = [january];
        return data;
      }
      case 'empty': {
        return {};
      }
    }
  }
}
