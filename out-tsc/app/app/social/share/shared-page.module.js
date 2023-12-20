import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { HttpClientModule } from '@angular/common/http';
import { SharedPage } from './shared-page.component';
import { TranslateModule } from '@ngx-translate/core';
let SharedPageModule = class SharedPageModule {
};
SharedPageModule = __decorate([
    NgModule({
        declarations: [SharedPage],
        imports: [
            CommonModule,
            IonicModule,
            TranslateModule.forChild(),
            HttpClientModule,
            RouterModule.forChild([
                {
                    path: ':uuid',
                    pathMatch: 'full',
                    component: SharedPage
                }
            ])
        ],
    })
], SharedPageModule);
export { SharedPageModule };
//# sourceMappingURL=shared-page.module.js.map