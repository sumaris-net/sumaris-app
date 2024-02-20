import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { CalendarComponent } from '@app/activity-calendar/calendar/calendar.component';
import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import { VesselUseFeatures } from '@app/activity-calendar/model/vessel-use-features.model';
import { AccountService, DateUtils, ReferentialRef, StatusIds } from '@sumaris-net/ngx-components';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';

@Component({
  selector: 'app-calendar-test',
  templateUrl: './calendar-test.page.html',
  styleUrls: ['./calendar-test.page.scss'],
})
export class CalendarTestPage implements OnInit, AfterViewInit {
  protected data: ActivityCalendar;

  @ViewChild(CalendarComponent) calendar: CalendarComponent;

  constructor(private accountService: AccountService) {}

  ngOnInit() {
    const year = DateUtils.moment().year() - 1;

    this.data = new ActivityCalendar();

    // Vessel
    this.data.vesselSnapshot = VesselSnapshot.fromObject({
      id: 1,
      registrationLocation: { id: 10, label: 'XBR', name: 'Brest' },
    });

    // January
    const january = new VesselUseFeatures();
    january.isActive = StatusIds.ENABLE;
    january.startDate = DateUtils.moment().utc(false).year(year).month(0).startOf('year');
    january.vesselId = this.data.vesselSnapshot?.id;
    january.basePortLocation = ReferentialRef.fromObject({ id: 10, label: 'XBR', name: 'Brest' });

    this.data.vesselUseFeatures = [january];
  }

  ngAfterViewInit() {
    // this.accountService.onLogin.subscribe(() => {
    //   this.calendar?.setValue(this.data);
    // });

    this.accountService.ready().then(() => {
      return this.calendar?.setValue(this.data);
    });
  }
}
