import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaxonCardComponent } from './taxon-card.component';
import { IonicModule } from '@ionic/angular';

@NgModule({
  declarations: [TaxonCardComponent],
  imports: [CommonModule, IonicModule],
  exports: [TaxonCardComponent],
})
export class TaxonCardModule {}
