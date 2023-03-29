import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { EntitiesStorageDumper } from './entities-storage-dumper.component';

describe('EntitiesStorageExplorerComponent', () => {
  let component: EntitiesStorageDumper;
  let fixture: ComponentFixture<EntitiesStorageDumper>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ EntitiesStorageDumper ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(EntitiesStorageDumper);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
