import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { AppImageAttachmentsModal } from './image-attachment.modal';
import { AppImageAttachmentModule } from '@app/data/image/image-attachment.module';
import { ImageGalleryModule } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { AppSharedModule } from '@app/shared/shared.module';
import { environment } from '@environments/environment';
import { AppCoreModule } from '@app/core/core.module';

describe('AppImageAttachmentsModal', () => {
  let component: AppImageAttachmentsModal;
  let fixture: ComponentFixture<AppImageAttachmentsModal>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AppImageAttachmentsModal],
      imports: [
        AppImageAttachmentModule,
        ImageGalleryModule,
        IonicModule.forRoot(),
        AppSharedModule.forRoot(environment),
        AppCoreModule.forRoot(),
        TranslateModule.forRoot(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppImageAttachmentsModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
