import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FabButtonComponent } from './fab-button.component';
import { IonicModule } from '@ionic/angular';

@NgModule({
  declarations: [FabButtonComponent],
  imports: [CommonModule, IonicModule],
  exports: [FabButtonComponent],
})
export class FabButtonModule {}
