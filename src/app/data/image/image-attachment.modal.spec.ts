import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { AppImageAttachmentsModal } from './image-attachment.modal';
import { AppImageAttachmentModule } from '@app/data/image/image-attachment.module';
import { ENVIRONMENT, ImageGalleryModule, StorageService } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { AppSharedModule } from '@app/shared/shared.module';
import { environment } from '@environments/environment.test';
import { AppCoreModule } from '@app/core/core.module';
import { MAT_MOMENT_DATE_ADAPTER_OPTIONS, MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { CacheModule } from 'ionic-cache';
import { ApolloModule } from 'apollo-angular';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ImageAttachment } from '@app/data/image/image-attachment.model';

describe('AppImageAttachmentsModal', () => {
  let component: AppImageAttachmentsModal;
  let fixture: ComponentFixture<AppImageAttachmentsModal>;

  // Images
  const images = [];
  images.push(<ImageAttachment>{
    url: 'https://test.sumaris.net/api/image/50',
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppImageAttachmentsModal],
      imports: [
        AppImageAttachmentModule,
        ImageGalleryModule,
        IonicModule.forRoot(),
        ApolloModule,
        AppSharedModule.forRoot(),
        AppCoreModule.forRoot(),
        TranslateModule.forRoot(),
        NoopAnimationsModule,
        CacheModule.forRoot({
          keyPrefix: '', // For compatibility
          ...environment.cache,
        }),
      ],
      providers: [
        StorageService,
        { provide: ENVIRONMENT, useValue: environment },
        { provide: MomentDateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS] },
        { provide: DateAdapter, useExisting: MomentDateAdapter },
      ],
    }).compileComponents();

    const storage = TestBed.inject(StorageService);
    await storage.ready();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppImageAttachmentsModal);
    component = fixture.componentInstance;

    component.data = images;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
