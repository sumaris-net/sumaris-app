import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldsSkeleton } from '@app/shared/material/skeleton/form-fields-skeleton';
import { IonicModule } from '@ionic/angular';
import { MatFormFieldModule } from '@angular/material/form-field';
let MatFormFieldsSkeletonModule = class MatFormFieldsSkeletonModule {
};
MatFormFieldsSkeletonModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            IonicModule,
            MatFormFieldModule
        ],
        declarations: [
            MatFormFieldsSkeleton
        ],
        exports: [
            MatFormFieldsSkeleton
        ]
    })
], MatFormFieldsSkeletonModule);
export { MatFormFieldsSkeletonModule };
//# sourceMappingURL=form-fields-skeleton.module.js.map