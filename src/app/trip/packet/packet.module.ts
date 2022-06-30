import { NgModule } from '@angular/core';
import { PacketsTable } from './packets.table';
import { PacketForm } from './packet.form';
import { PacketModal } from './packet.modal';
import { TranslateModule } from '@ngx-translate/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialModule } from '@app/referential/referential.module';


@NgModule({
  imports: [
    AppCoreModule,
    TranslateModule.forChild(),

    // Functional modules
    AppReferentialModule,
    //AppMeasurementModule,
  ],
  declarations: [
    PacketsTable,
    PacketForm,
    PacketModal
  ],
  exports: [
    PacketsTable
  ]
})
export class AppPacketModule {

  constructor() {
    console.debug('[packet] Creating module...');
  }
}
