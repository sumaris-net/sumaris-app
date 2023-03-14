import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { TranscribingItemsModal } from './transcribing-items.modal';

describe('TranscribingItemsModal', () => {
  let component: TranscribingItemsModal;
  let fixture: ComponentFixture<TranscribingItemsModal>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ TranscribingItemsModal ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(TranscribingItemsModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
