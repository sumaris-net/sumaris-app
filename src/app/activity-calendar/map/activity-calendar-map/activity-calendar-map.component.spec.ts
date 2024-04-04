import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ActivityCalendarMapComponent } from './activity-calendar-map.component';

describe('ActivityCalendarMapComponent', () => {
  let component: ActivityCalendarMapComponent;
  let fixture: ComponentFixture<ActivityCalendarMapComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ActivityCalendarMapComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(ActivityCalendarMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
