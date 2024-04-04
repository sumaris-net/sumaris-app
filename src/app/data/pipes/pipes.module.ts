import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataEntityErrorPipe, DataEntityIsInvalidPipe } from './data-entity.pipes';

@NgModule({
  imports: [CommonModule],
  declarations: [DataEntityIsInvalidPipe, DataEntityErrorPipe],
  exports: [DataEntityIsInvalidPipe, DataEntityErrorPipe],
})
export class AppDataEntityPipesModule {}
