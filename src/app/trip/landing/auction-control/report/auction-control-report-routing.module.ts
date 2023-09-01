import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuctionControlReport } from './auction-control.report';
import { AuctionControlReportModule } from './auction-control.report.module';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: AuctionControlReport,
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    AuctionControlReportModule,
  ],
  exports: [RouterModule]
})
export class AuctionControlReportRoutingModule {}
