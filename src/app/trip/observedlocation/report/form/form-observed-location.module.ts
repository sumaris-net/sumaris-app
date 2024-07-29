import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { FormObservedLocationReport } from './form-observed-location.report';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule],
  declarations: [FormObservedLocationReport],
  exports: [FormObservedLocationReport],
})
export class FormObservedLocationReportModule {}
