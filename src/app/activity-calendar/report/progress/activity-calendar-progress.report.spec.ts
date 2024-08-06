import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ActivityCalendarProgressReport } from './activity-calendar-progress.report';

describe('ActivityCalendarProgressReport', () => {
  let component: ActivityCalendarProgressReport;
  let fixture: ComponentFixture<ActivityCalendarProgressReport>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ActivityCalendarProgressReport],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(ActivityCalendarProgressReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
