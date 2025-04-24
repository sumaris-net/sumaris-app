import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { PhotoTabs } from './action-bar.component';

@NgModule({
  declarations: [PhotoTabs],
  imports: [CommonModule, IonicModule, RouterModule],
  exports: [PhotoTabs],
})
export class ActionBarModule {}
