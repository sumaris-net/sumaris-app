var AppCoreModule_1;
import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { IonicStorageModule } from '@ionic/storage-angular';
import { HttpClientModule } from '@angular/common/http';
import { CacheModule } from 'ionic-cache';
import { AppGraphQLModule, CoreModule } from '@sumaris-net/ngx-components';
import { AppSharedModule } from '@app/shared/shared.module';
import { IsEmptyReferentialPipe, IsNotEmptyReferentialPipe } from '@app/core/pipes/core.pipe';
let AppCoreModule = AppCoreModule_1 = class AppCoreModule {
    static forRoot() {
        return {
            ngModule: AppCoreModule_1,
            providers: [
                ...CoreModule.forRoot().providers
            ]
        };
    }
};
AppCoreModule = AppCoreModule_1 = __decorate([
    NgModule({
        imports: [
            CoreModule,
            HttpClientModule,
            CacheModule,
            IonicStorageModule,
            // App modules
            AppSharedModule,
            AppGraphQLModule
        ],
        declarations: [
            // Pipes
            IsNotEmptyReferentialPipe,
            IsEmptyReferentialPipe
        ],
        exports: [
            CoreModule,
            AppSharedModule,
            // Pipes
            IsNotEmptyReferentialPipe,
            IsEmptyReferentialPipe
        ]
    })
], AppCoreModule);
export { AppCoreModule };
//# sourceMappingURL=core.module.js.map