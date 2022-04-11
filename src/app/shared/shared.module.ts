import { ModuleWithProviders, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Environment, SharedModule } from '@sumaris-net/ngx-components';
import { Context, ContextService } from './context.service';
import { FormatPropertyPipe } from './pipes/format-property.pipe';

@NgModule({
  imports: [
    SharedModule
  ],
  declarations: [
    FormatPropertyPipe
  ],
  exports: [
    SharedModule,
    RouterModule,
    TranslateModule,

    // Pipes
    FormatPropertyPipe
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
