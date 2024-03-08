import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { SharedModule } from '@sumaris-net/ngx-components';
import { RevealComponent, RevealSectionDef, RevealSectionOutlet } from '@app/shared/report/reveal/reveal.component';
import { RevealSectionDirective } from '@app/shared/report/reveal/reveal-section.directive';
let RevealModule = class RevealModule {
};
RevealModule = __decorate([
    NgModule({
        imports: [
            SharedModule
        ],
        declarations: [
            RevealComponent,
            RevealSectionDirective,
            RevealSectionDef,
            RevealSectionOutlet,
        ],
        exports: [
            RevealComponent,
            RevealSectionDirective,
            RevealSectionDef,
            RevealSectionOutlet
        ]
    })
], RevealModule);
export { RevealModule };
//# sourceMappingURL=reveal.module.js.map