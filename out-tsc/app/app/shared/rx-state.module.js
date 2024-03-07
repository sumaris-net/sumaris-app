import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { PushModule } from '@rx-angular/template/push';
import { ForModule } from '@rx-angular/template/for';
import { IfModule } from '@rx-angular/template/if';
import { LetModule } from '@rx-angular/template/let';
let RxStateModule = class RxStateModule {
};
RxStateModule = __decorate([
    NgModule({
        imports: [
            PushModule, ForModule, IfModule, LetModule
        ],
        exports: [
            PushModule, ForModule, IfModule, LetModule
        ]
    })
], RxStateModule);
export { RxStateModule };
//# sourceMappingURL=rx-state.module.js.map