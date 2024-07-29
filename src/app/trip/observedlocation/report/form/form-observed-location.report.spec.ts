import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { FormObservedLocationReport } from './form-observed-location.report';

describe('FormObservedLocationReport', () => {
  let component: FormObservedLocationReport;
  let fixture: ComponentFixture<FormObservedLocationReport>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [FormObservedLocationReport],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(FormObservedLocationReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
