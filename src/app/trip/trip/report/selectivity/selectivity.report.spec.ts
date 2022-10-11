import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectivityReport } from './selectivity.report';

describe('SelectivityReport', () => {
  let component: SelectivityReport;
  let fixture: ComponentFixture<SelectivityReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SelectivityReport ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectivityReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
