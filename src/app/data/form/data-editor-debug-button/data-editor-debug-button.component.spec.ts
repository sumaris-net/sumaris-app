import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { AppDataEditorDebugButtonComponent } from './data-editor-debug-button.component';

describe('DataEditorDebugButtonComponent', () => {
  let component: AppDataEditorDebugButtonComponent;
  let fixture: ComponentFixture<AppDataEditorDebugButtonComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AppDataEditorDebugButtonComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(AppDataEditorDebugButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
