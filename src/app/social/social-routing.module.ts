import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppCoreModule } from '@app/core/core.module';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./share/shared-page.module').then((m) => m.SharedPageModule),
    data: {
      preload: false,
    },
  },
];

@NgModule({
  imports: [AppCoreModule, RouterModule.forChild(routes)],
  declarations: [],
})
export class SocialRoutingModule {}
