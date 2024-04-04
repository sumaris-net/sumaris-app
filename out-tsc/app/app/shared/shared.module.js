var AppSharedModule_1;
import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { SharedDebugModule, SharedModule } from '@sumaris-net/ngx-components';
import { ContextService } from './context.service';
import { DisplayWithPipe } from '@app/shared/pipes/display-with.pipe';
import { DelayPipe } from '@app/shared/pipes/delay.pipe';
import { SplitArrayInChunksPipe } from '@app/shared/pipes/arrays.pipe';
import { PaginationToStringPipe } from '@app/shared/pipes/pagination.pipe';
import { MatFormFieldsSkeletonModule } from '@app/shared/material/skeleton/form-fields-skeleton.module';
import { UnpatchModule } from '@rx-angular/template/unpatch';
import { IfModule } from '@rx-angular/template/if';
import { ForModule } from '@rx-angular/template/for';
import { LetModule } from '@rx-angular/template/let';
import { PushModule } from '@rx-angular/template/push';
import { NoHtmlPipe } from '@app/shared/pipes/html.pipes';
let AppSharedModule = AppSharedModule_1 = class AppSharedModule {
    static forRoot(config) {
        console.debug('[app-shared] Creating module (root)');
        return {
            ngModule: AppSharedModule_1,
            providers: [
                ...SharedModule.forRoot(config).providers,
                // A context service
                {
                    provide: ContextService,
                    useValue: new ContextService({}),
                },
            ],
        };
    }
};
AppSharedModule = AppSharedModule_1 = __decorate([
    NgModule({
        imports: [
            SharedModule,
            SharedDebugModule,
            // Rx angular
            IfModule,
            ForModule,
            LetModule,
            PushModule,
            UnpatchModule,
            // Sub modules
            MatFormFieldsSkeletonModule,
        ],
        declarations: [
            // Pipes
            DisplayWithPipe,
            DelayPipe,
            SplitArrayInChunksPipe,
            PaginationToStringPipe,
            NoHtmlPipe,
        ],
        exports: [
            SharedModule,
            SharedDebugModule,
            RouterModule,
            TranslateModule,
            // Rx angular
            IfModule,
            ForModule,
            LetModule,
            PushModule,
            UnpatchModule,
            // Pipes
            DisplayWithPipe,
            DelayPipe,
            SplitArrayInChunksPipe,
            PaginationToStringPipe,
            NoHtmlPipe,
            //Sub modules
            MatFormFieldsSkeletonModule,
        ],
    })
], AppSharedModule);
export { AppSharedModule };
//# sourceMappingURL=shared.module.js.map