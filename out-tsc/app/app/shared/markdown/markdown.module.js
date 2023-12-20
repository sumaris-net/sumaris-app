var AppMarkdownModule_1;
import { __decorate } from "tslib";
// function that returns `MarkedOptions` with renderer override
import { MarkdownModule, MarkedOptions } from 'ngx-markdown';
import { NgModule, SecurityContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MarkdownRenderer } from '@app/shared/markdown/markdown.render';
import { MarkdownAnchorService } from '@app/shared/markdown/markdown-anchor.service';
import { MarkdownAnchorDirective } from '@app/shared/markdown/markdown-anchor.directive';
export function markedOptionsFactory(markdownAnchorService) {
    return {
        renderer: new MarkdownRenderer(markdownAnchorService),
        gfm: true,
        breaks: false,
        pedantic: false,
        smartLists: true,
        smartypants: false,
    };
}
let AppMarkdownModule = AppMarkdownModule_1 = class AppMarkdownModule {
    static forRoot() {
        console.debug('[app-markdown] Creating module (root)');
        return {
            ngModule: AppMarkdownModule_1,
            providers: [
                MarkdownAnchorService,
                ...MarkdownModule.forRoot({
                    loader: HttpClient,
                    sanitize: SecurityContext.NONE,
                    markedOptions: {
                        provide: MarkedOptions,
                        deps: [MarkdownAnchorService],
                        useFactory: (s) => markedOptionsFactory(s),
                    }
                }).providers
            ],
        };
    }
};
AppMarkdownModule = AppMarkdownModule_1 = __decorate([
    NgModule({
        imports: [
            MarkdownModule.forChild()
        ],
        declarations: [
            // Directive
            MarkdownAnchorDirective
        ],
        exports: [
            MarkdownModule,
            MarkdownAnchorDirective
        ],
    })
], AppMarkdownModule);
export { AppMarkdownModule };
//# sourceMappingURL=markdown.module.js.map