// function that returns `MarkedOptions` with renderer override
import { MarkdownModule, MARKED_OPTIONS, MarkedOptions } from 'ngx-markdown';
import { ModuleWithProviders, NgModule, SecurityContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MarkdownRenderer } from '@app/shared/markdown/markdown.render';
import { MarkdownAnchorService } from '@app/shared/markdown/markdown-anchor.service';
import { MarkdownAnchorDirective } from '@app/shared/markdown/markdown-anchor.directive';

@NgModule({
  imports: [MarkdownModule.forChild()],
  declarations: [
    // Directive
    MarkdownAnchorDirective,
  ],
  exports: [MarkdownModule, MarkdownAnchorDirective],
})
export class AppMarkdownModule {
  static forRoot(): ModuleWithProviders<AppMarkdownModule> {
    console.debug('[app-markdown] Creating module (root)');

    return {
      ngModule: AppMarkdownModule,
      providers: [
        MarkdownAnchorService,
        ...MarkdownModule.forRoot({
          loader: HttpClient, // Allow to load using [src]
          sanitize: SecurityContext.NONE,
          markedOptions: {
            provide: MARKED_OPTIONS,
            deps: [MarkdownAnchorService],
            useFactory: (anchorService: MarkdownAnchorService) => {
              return <MarkedOptions>{
                renderer: new MarkdownRenderer(anchorService),
                gfm: true,
                breaks: false,
                pedantic: false,
                smartLists: true,
                smartypants: false,
              };
            },
          },
        }).providers,
      ],
    };
  }
}
