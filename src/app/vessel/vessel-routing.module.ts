import {RouterModule, Routes} from "@angular/router";
import {NgModule} from "@angular/core";
import {VesselsPage} from "./list/vessels.page";
import {VesselPage} from "./page/vessel.page";
import {SharedRoutingModule} from "@sumaris-net/ngx-components";
import {VesselModule} from "./vessel.module";

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: VesselsPage,
    runGuardsAndResolvers: 'pathParamsChange',
    data: {
      profile: 'USER'
    }
  },
  {
    path: ':id',
    component: VesselPage,
    runGuardsAndResolvers: 'pathParamsChange',
    data: {
      profile: 'USER'
    }
  }
];

@NgModule({
  imports: [
    VesselModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class VesselRoutingModule { }
