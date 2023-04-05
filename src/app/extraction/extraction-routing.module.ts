import {RouterModule, Routes} from "@angular/router";
import { AuthGuardService, ComponentDirtyGuard } from '@sumaris-net/ngx-components';
import {NgModule} from "@angular/core";
import {ExtractionTablePage} from "./table/extraction-table.page";
import {ProductPage} from "./product/product.page";
import {ExtractionMapPage} from "./map/extraction-map.page";
import {SharedModule} from "@sumaris-net/ngx-components";
import {AppExtractionModule} from '@app/extraction/extraction.module';

const routes: Routes = [
  {
    path: 'data',
    pathMatch: 'full',
    component: ExtractionTablePage,
    runGuardsAndResolvers: 'pathParamsChange',
    data: {
      profile: 'GUEST'
    }
  },
  {
    path: 'product/:productId',
    component: ProductPage,
    data: {
      profile: 'SUPERVISOR',
      pathIdParam: 'productId'
    },
    runGuardsAndResolvers: 'pathParamsChange',
    canDeactivate: [ComponentDirtyGuard]
  },
  {
    path: 'map',
    canActivate: [AuthGuardService],
    children: [
      {
        path: '',
        component: ExtractionMapPage,
        runGuardsAndResolvers: 'pathParamsChange',
        data: {
          profile: 'USER'
        }
      }
    ]
  },

  // Device Position path
  {
    path: 'device-position',
    canActivate: [AuthGuardService],
    data: {
      profile: 'ADMIN'
    },
    loadChildren: () => import('./position/device-position-routing.module').then(m => m.DevicePositionRoutingModule)
  },
];

@NgModule({
  imports: [
    SharedModule,
    AppExtractionModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class AppExtractionRoutingModule {
}
