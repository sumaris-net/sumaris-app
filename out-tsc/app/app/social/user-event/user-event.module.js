import { __decorate } from "tslib";
import { SocialModule, UserEventModule } from '@sumaris-net/ngx-components';
import { AppCoreModule } from '@app/core/core.module';
import { NgModule } from '@angular/core';
import { UserEventsTable } from '@app/social/user-event/user-events.table';
let AppUserEventModule = class AppUserEventModule {
};
AppUserEventModule = __decorate([
    NgModule({
        imports: [
            AppCoreModule,
            SocialModule,
            UserEventModule
        ],
        declarations: [
            UserEventsTable
        ],
        exports: [
            // Components
            UserEventsTable
        ]
    })
], AppUserEventModule);
export { AppUserEventModule };
//# sourceMappingURL=user-event.module.js.map