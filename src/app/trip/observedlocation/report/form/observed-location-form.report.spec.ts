import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ObservedLocationFromReport } from './observed-location-form.report';

describe('ObservedLocationFormReport', () => {
  let component: ObservedLocationFromReport;
  let fixture: ComponentFixture<ObservedLocationFromReport>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ObservedLocationFromReport],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(ObservedLocationFromReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
