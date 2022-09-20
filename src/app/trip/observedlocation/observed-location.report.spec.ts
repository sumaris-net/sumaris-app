import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservedLocationReport } from './observed-location.report';

describe('ObservedLocationReport', () => {
  let component: ObservedLocationReport;
  let fixture: ComponentFixture<ObservedLocationReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ObservedLocationReport ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservedLocationReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
