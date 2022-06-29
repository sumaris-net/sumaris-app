import { NgModule } from '@angular/core';
import { PacketsTable } from './packets.table';
import { PacketForm } from './packet.form';
import { PacketModal } from './packet.modal';
import { TranslateModule } from '@ngx-translate/core';
import { AppCoreModule } from '@app/core/core.module';


@NgModule({
  imports: [
    AppCoreModule,
    //AppDataModule,
    //AppReferentialModule,
    TranslateModule.forChild(),

    // Functional modules
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
