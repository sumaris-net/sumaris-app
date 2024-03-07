import { ModuleWithProviders, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { RxStateModule, SharedDebugModule, SharedModule, SharedModuleConfig } from '@sumaris-net/ngx-components';
import { APP_MAIN_CONTEXT_SERVICE, Context, ContextService } from './context.service';
import { DisplayWithPipe } from '@app/shared/pipes/display-with.pipe';
import { DelayPipe } from '@app/shared/pipes/delay.pipe';
import { SplitArrayInChunksPipe } from '@app/shared/pipes/arrays.pipe';
import { PaginationToStringPipe } from '@app/shared/pipes/pagination.pipe';
import { MatFormFieldsSkeletonModule } from '@app/shared/material/skeleton/form-fields-skeleton.module';
import { RxUnpatch } from '@rx-angular/template/unpatch';
import { NoHtmlPipe } from '@app/shared/pipes/html.pipes';

@NgModule({
  imports: [
    SharedModule,
    SharedDebugModule,

    // Rx angular
    RxStateModule,
    RxUnpatch,

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
    RxStateModule,
    RxUnpatch,

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
export class AppSharedModule {
  static forRoot(config?: SharedModuleConfig): ModuleWithProviders<AppSharedModule> {
    console.debug('[app-shared] Creating module (root)');

    return {
      ngModule: AppSharedModule,
      providers: [
        ...SharedModule.forRoot(config).providers,

        // A context service
        {
          provide: ContextService,
          useFactory: () => new ContextService<Context>({}),
        },
        {
          provide: APP_MAIN_CONTEXT_SERVICE,
          useExisting: ContextService,
        },
      ],
    };
  }
}
