import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataEntityErrorPipe, DataEntityIsInvalidPipe } from './data-entity.pipes';
let AppDataEntityPipesModule = class AppDataEntityPipesModule {
};
AppDataEntityPipesModule = __decorate([
    NgModule({
        imports: [
            CommonModule
        ],
        declarations: [
            DataEntityIsInvalidPipe,
            DataEntityErrorPipe
        ],
        exports: [
            DataEntityIsInvalidPipe,
            DataEntityErrorPipe
        ]
    })
], AppDataEntityPipesModule);
export { AppDataEntityPipesModule };
//# sourceMappingURL=pipes.module.js.map