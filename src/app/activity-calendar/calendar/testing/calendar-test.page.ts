import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { CalendarComponent } from '@app/activity-calendar/calendar/calendar.component';
import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';

@Component({
  selector: 'app-calendar-test',
  templateUrl: './calendar-test.page.html',
  styleUrls: ['./calendar-test.page.scss'],
})
export class CalendarTestPage implements OnInit, AfterViewInit {
  protected data: ActivityCalendar;

  @ViewChild(CalendarComponent) calendar: CalendarComponent;

  constructor() {}

  ngOnInit() {
    this.data = new ActivityCalendar();
  }

  ngAfterViewInit() {
    this.calendar?.setValue(this.data);
  }
}
