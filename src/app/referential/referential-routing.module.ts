import {RouterModule, Routes} from "@angular/router";
import {NgModule} from "@angular/core";
import {ReferentialsPage} from "./list/referentials";
import {VesselsPage} from "./vessel/list/vessels.page";
import {VesselPage} from "./vessel/page/vessel.page";
import {ProgramPage} from "./program/program.page";
import {SimpleStrategyPage} from "./simpleStrategy/simpleStrategy.page";
import {SoftwarePage} from "./software/software.page";
import {ParameterPage} from "./pmfm/parameter.page";
import {PmfmPage} from "./pmfm/pmfm.page";
import {SharedRoutingModule} from "../shared/shared-routing.module";
import {ReferentialModule} from "./referential.module";

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: ReferentialsPage,
    data: {
      profile: 'ADMIN'
    }
  },
  {
    path: 'vessels',
    children: [
      {
        path: '',
        component: VesselsPage,
        data: {
          profile: 'USER'
        }
      },
      {
        path: ':id',
        component: VesselPage,
        data: {
          profile: 'USER'
        }
      }
    ]
  },
  {
    path: 'program/:id',
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: ProgramPage,
        data: {
          profile: 'ADMIN'
        }
      }
    ]
  },
  {
    path: 'software/:id',
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: SoftwarePage,
        data: {
          profile: 'ADMIN'
        }
      }
    ]
  },
  {
    path: 'parameter/:id',
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: ParameterPage,
        data: {
          profile: 'ADMIN'
        }
      }
    ]
  },
  {
    path: 'pmfm/:id',
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: PmfmPage,
        data: {
          profile: 'ADMIN'
        }
      }
    ]
  },
  {
  path: 'simpleStrategy/:id',
  children: [
    {
      path: '',
      pathMatch: 'full',
      component: SimpleStrategyPage,
      data: {
        profile: 'ADMIN'
      }
    }
  ]
},
];

@NgModule({
  imports: [
    SharedRoutingModule,
    ReferentialModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class ReferentialRoutingModule { }
