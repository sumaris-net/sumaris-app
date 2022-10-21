import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldsSkeleton } from '@app/shared/material/skeleton/form-fields-skeleton';
import { IonicModule } from '@ionic/angular';
import { MatFormFieldModule } from '@angular/material/form-field';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    MatFormFieldModule
  ],
  declarations: [
    MatFormFieldsSkeleton
  ],
  exports: [
    MatFormFieldsSkeleton
  ]
})
export class MatFormFieldsSkeletonModule {

}
