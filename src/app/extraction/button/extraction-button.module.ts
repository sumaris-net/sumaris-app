import { ElementRef, NgModule, ViewChild } from '@angular/core';
import { AppSharedModule } from '@app/shared/shared.module';
import { AppExtractionButton } from './extraction-button.component';
import { MatMenuTrigger } from '@angular/material/menu';

@NgModule({
  imports: [AppSharedModule],
  declarations: [
    // Components
    AppExtractionButton,
  ],
  exports: [
    // Components
    AppExtractionButton,
  ],
})
export class AppExtractionButtonModule {}
