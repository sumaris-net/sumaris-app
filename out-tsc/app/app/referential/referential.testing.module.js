import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CoreModule, SharedModule } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { AppReferentialModule } from './referential.module';
import { PmfmStrategiesTableTestPage } from './strategy/sampling/testing/pmfm-strategies.table.test';
import { AppProgramModule } from '@app/referential/program/program.module';
export const REFERENTIAL_TESTING_PAGES = [
    { label: 'Referential module', divider: true },
    { label: 'Pmfm Strategies Table', page: '/testing/referential/pmfmStrategiesTable' }
];
const routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'pmfmStrategiesTable'
    },
    {
        path: 'pmfmStrategiesTable',
        pathMatch: 'full',
        component: PmfmStrategiesTableTestPage
    }
];
let ReferentialTestingModule = class ReferentialTestingModule {
};
ReferentialTestingModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            SharedModule,
            CoreModule,
            TranslateModule.forChild(),
            RouterModule.forChild(routes),
            AppReferentialModule,
            AppProgramModule
        ],
        declarations: [
            PmfmStrategiesTableTestPage
        ],
        exports: [
            PmfmStrategiesTableTestPage
        ]
    })
], ReferentialTestingModule);
export { ReferentialTestingModule };
//# sourceMappingURL=referential.testing.module.js.map