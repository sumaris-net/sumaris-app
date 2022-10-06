import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectivityOperationReport } from './selectivity-operation.report';

describe('SelectivityOperationReport', () => {
  let component: SelectivityOperationReport;
  let fixture: ComponentFixture<SelectivityOperationReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SelectivityOperationReport ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectivityOperationReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
