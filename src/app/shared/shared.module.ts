import { ModuleWithProviders, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Environment, SharedModule } from '@sumaris-net/ngx-components';
import { Context, ContextService } from './context.service';
import { FormatPropertyPipe } from './pipes/format-property.pipe';
import { AutoTitleDirective } from '@app/shared/pipes/auto-title.directive';

@NgModule({
  imports: [
    SharedModule
  ],
  declarations: [
    FormatPropertyPipe,
    AutoTitleDirective // TODO: move it to ngx-components
  ],
  exports: [
    SharedModule,
    RouterModule,
    TranslateModule,

    // Pipes
    FormatPropertyPipe,
    AutoTitleDirective
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
