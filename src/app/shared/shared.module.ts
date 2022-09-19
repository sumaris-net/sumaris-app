import { ModuleWithProviders, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Environment, SharedModule } from '@sumaris-net/ngx-components';
import { Context, ContextService } from './context.service';
import { DisplayWithPipe } from '@app/shared/pipes/display-with.pipe';
import { DelayPipe } from '@app/shared/pipes/delay.pipe';
import { SplitArrayInChunksPipe } from './pipes/arrays.pipe';

@NgModule({
  imports: [
    SharedModule
  ],
  declarations: [
    // Pipes
    DisplayWithPipe,
    DelayPipe,
    SplitArrayInChunksPipe,
  ],
  exports: [
    SharedModule,
    RouterModule,
    TranslateModule,

    // Pipes
    DisplayWithPipe,
    DelayPipe,
    SplitArrayInChunksPipe,
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
