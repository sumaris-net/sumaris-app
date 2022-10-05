import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppRootDataReport } from './root-data-report.class';


describe('AppRootDataReport', () => {
  let component: AppRootDataReport;
  let fixture: ComponentFixture<AppRootDataReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AppRootDataReport ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppRootDataReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
