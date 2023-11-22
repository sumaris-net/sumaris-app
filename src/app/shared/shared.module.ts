import { ModuleWithProviders, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {Environment, RxStateModule, SharedDebugModule, SharedModule} from '@sumaris-net/ngx-components';
import { ContextService } from './context.service';
import { DisplayWithPipe } from '@app/shared/pipes/display-with.pipe';
import { DelayPipe } from '@app/shared/pipes/delay.pipe';
import { SplitArrayInChunksPipe } from '@app/shared/pipes/arrays.pipe';
import { PaginationToStringPipe } from '@app/shared/pipes/pagination.pipe';
import { MatFormFieldsSkeletonModule } from '@app/shared/material/skeleton/form-fields-skeleton.module';
import {RxUnpatch} from '@rx-angular/template/unpatch';

@NgModule({
  providers: [
    ContextService
  ],
  imports: [
    SharedModule,
    SharedDebugModule,

    // Rx angular
    RxStateModule,
    RxUnpatch,

    // Sub modules
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

    //Sub modules
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
      ]
    };
  }
}
