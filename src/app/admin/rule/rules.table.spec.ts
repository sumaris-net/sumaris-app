import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RulesTable } from './rules.table';

describe('AppRulesTable', () => {
  let component: RulesTable;
  let fixture: ComponentFixture<RulesTable>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [RulesTable],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(RulesTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
