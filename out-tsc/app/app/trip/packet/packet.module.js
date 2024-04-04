import { __decorate, __metadata } from "tslib";
import { NgModule } from '@angular/core';
import { PacketsTable } from './packets.table';
import { PacketForm } from './packet.form';
import { PacketModal } from './packet.modal';
import { TranslateModule } from '@ngx-translate/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialModule } from '@app/referential/referential.module';
let AppPacketModule = class AppPacketModule {
    constructor() {
        console.debug('[packet] Creating module...');
    }
};
AppPacketModule = __decorate([
    NgModule({
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
    }),
    __metadata("design:paramtypes", [])
], AppPacketModule);
export { AppPacketModule };
//# sourceMappingURL=packet.module.js.map