import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuardService } from '@sumaris-net/ngx-components';
import { ScientificCruiseTable } from '@app/trip/scientific-cruise/scientific-cruise.table';
import { AppScientificCruiseModule } from '@app/trip/scientific-cruise/scientific-cruise.module';

const routes: Routes = [
  // Table
  {
    path: '',
    pathMatch: 'full',
    canActivate: [AuthGuardService],
    component: ScientificCruiseTable,
  },
];


@NgModule({
  imports: [
    AppScientificCruiseModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    RouterModule
  ]
})
export class AppScientificCruiseRoutingModule {
}
