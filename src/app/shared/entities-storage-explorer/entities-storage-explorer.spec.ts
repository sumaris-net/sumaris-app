import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { EntitiesStorageExplorer } from './entities-storage-explorer';

describe('EntitiesStorageExplorerComponent', () => {
  let component: EntitiesStorageExplorer;
  let fixture: ComponentFixture<EntitiesStorageExplorer>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ EntitiesStorageExplorer ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(EntitiesStorageExplorer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
