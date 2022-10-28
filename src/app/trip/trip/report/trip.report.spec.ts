import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TripReport } from './trip.report';

describe('TripReport', () => {
  let component: TripReport;
  let fixture: ComponentFixture<TripReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    declarations: [TripReport],
    teardown: { destroyAfterEach: false }
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TripReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
