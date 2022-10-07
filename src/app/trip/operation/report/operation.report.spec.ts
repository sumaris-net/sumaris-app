import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationReport as OperationReport } from './operation.report';

describe('OperationReport', () => {
  let component: OperationReport;
  let fixture: ComponentFixture<OperationReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OperationReport ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OperationReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
