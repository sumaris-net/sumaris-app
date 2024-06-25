import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataEntityErrorPipe, DataEntityIsInvalidPipe } from './data-entity.pipes';
import { RootDataQualityToStringPipe } from './root-data-entity.pipe';

@NgModule({
  imports: [CommonModule],
  declarations: [DataEntityIsInvalidPipe, DataEntityErrorPipe, RootDataQualityToStringPipe],
  exports: [DataEntityIsInvalidPipe, DataEntityErrorPipe, RootDataQualityToStringPipe],
})
export class AppDataEntityPipesModule {}
