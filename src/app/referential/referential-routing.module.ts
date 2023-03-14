import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { ReferentialTable } from './table/referential.table';
import { ProgramPage } from './program/program.page';
import { SoftwarePage } from './software/software.page';
import { ParameterPage } from './pmfm/parameter.page';
import { PmfmPage } from './pmfm/pmfm.page';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';
import { AppReferentialModule } from './referential.module';
import { StrategyPage } from './strategy/strategy.page';
import { ProgramsPage } from './program/programs.page';
import { SamplingStrategyPage } from './strategy/sampling/sampling-strategy.page';
import { TaxonNamePage } from './taxon/taxon-name.page';
import { StrategiesPage } from './strategy/strategies.page';
import { TaxonGroupPage } from '@app/referential/taxon-group/taxon-group.page';
import { MethodPage } from '@app/referential/pmfm/method/method.page';

const routes: Routes = [
  {
    path: 'list',
    pathMatch: 'full',
    component: ReferentialTable,
    runGuardsAndResolvers: 'pathParamsChange',
    data: {
      profile: 'ADMIN'
    }
  },
  {
    path: 'programs',
    children: [
      {
        path: '',
        component: ProgramsPage,
        pathMatch: 'full',
        data: {
          profile: 'SUPERVISOR'
        },
        runGuardsAndResolvers: 'pathParamsChange'
      },
      {
        path: ':programId',
        data: {
          profile: 'SUPERVISOR',
          pathIdParam: 'programId'
        },
        children: [
          {
            path: '',
            pathMatch: 'full',
            component: ProgramPage,
            data: {
              profile: 'SUPERVISOR',
              pathIdParam: 'programId'
            },
            runGuardsAndResolvers: 'pathParamsChange',
            canDeactivate: [ComponentDirtyGuard]
          },
          {
            path: 'strategies',
            component: StrategiesPage,
            data: {
              profile: 'SUPERVISOR',
              pathIdParam: 'programId'
            },
            runGuardsAndResolvers: 'pathParamsChange',
            canDeactivate: [ComponentDirtyGuard]
          },
          {
            path: 'strategy/legacy/:strategyId',
            pathMatch: 'full',
            component: StrategyPage,
            data: {
              profile: 'SUPERVISOR',
              pathIdParam: 'strategyId'
            },
            runGuardsAndResolvers: 'pathParamsChange',
            canDeactivate: [ComponentDirtyGuard]
          },
          {
            path: 'strategy/sampling/:strategyId',
            pathMatch: 'full',
            component: SamplingStrategyPage,
            data: {
              profile: 'SUPERVISOR',
              pathIdParam: 'strategyId'
            },
            runGuardsAndResolvers: 'pathParamsChange',
            canDeactivate: [ComponentDirtyGuard]
          }
        ]
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
    path: 'method/:id',
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: MethodPage,
        data: {
          profile: 'ADMIN'
        }
      }
    ]
  },
  {
    path: 'taxonName/:id',
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: TaxonNamePage,
        data: {
          profile: 'ADMIN'
        }
      }
    ]
  },
  {
    path: 'taxonGroup/:id',
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: TaxonGroupPage,
        data: {
          profile: 'ADMIN'
        }
      }
    ]
  }
];

@NgModule({
  imports: [
    AppReferentialModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class ReferentialRoutingModule { }
