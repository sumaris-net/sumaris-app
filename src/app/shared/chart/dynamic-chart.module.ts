import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { DynamicChartComponent } from './dynamic-chart.component';

@NgModule({
  declarations: [DynamicChartComponent],
  imports: [CommonModule, NgChartsModule],
  exports: [DynamicChartComponent],
})
export class AppDynamicChartModule {}
