import { ModuleWithProviders, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Environment, SharedModule } from '@sumaris-net/ngx-components';
import { Context, ContextService } from './context.service';
import { DisplayWithPipe } from '@app/shared/pipes/display-with.pipe';
import { DelayPipe } from '@app/shared/pipes/delay.pipe';
import { SplitArrayInChunksPipe } from '@app/shared/pipes/arrays.pipe';
import { PaginationToStringPipe } from '@app/shared/pipes/pagination.pipe';
import { AppSharedDebugModule } from '@app/shared/debug/debug.module';
import { MatFormFieldsSkeletonModule } from '@app/shared/material/skeleton/form-fields-skeleton.module';

@NgModule({
  imports: [
    SharedModule,
    // Sub modules
    AppSharedDebugModule,
    MatFormFieldsSkeletonModule
  ],
  declarations: [
    // Pipes
    DisplayWithPipe,
    DelayPipe,
    SplitArrayInChunksPipe,
    PaginationToStringPipe
  ],
  exports: [
    SharedModule,
    RouterModule,
    TranslateModule,

    // Pipes
    DisplayWithPipe,
    DelayPipe,
    SplitArrayInChunksPipe,
    PaginationToStringPipe,

    //Sub modules
    AppSharedDebugModule,
    MatFormFieldsSkeletonModule
  ]
})
export class AppSharedModule {
  static forRoot(environment: Environment): ModuleWithProviders<AppSharedModule> {

    console.debug('[app-shared] Creating module (root)');

    return {
      ngModule: AppSharedModule,
      providers: [
        ...SharedModule.forRoot(environment).providers,

        // A context service
        {
          provide: ContextService,
          useValue: new ContextService<Context>({})
        }
      ]
    };
  }
}
