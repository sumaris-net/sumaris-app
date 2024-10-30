import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { ReferentialTable } from './table/referential.table';
import { ProgramPage } from './program/program.page';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';
import { AppReferentialModule } from './referential.module';
import { StrategyPage } from './strategy/strategy.page';
import { ProgramsPage } from './program/programs.page';
import { SamplingStrategyPage } from './strategy/sampling/sampling-strategy.page';
import { StrategiesPage } from './strategy/strategies.page';

const routes: Routes = [
  {
    path: 'list',
    pathMatch: 'full',
    component: ReferentialTable,
    runGuardsAndResolvers: 'pathParamsChange',
    data: {
      profile: 'ADMIN',
    },
  },
  {
    path: 'programs',
    children: [
      {
        path: '',
        component: ProgramsPage,
        pathMatch: 'full',
        data: {
          profile: 'SUPERVISOR',
        },
        runGuardsAndResolvers: 'pathParamsChange',
      },
      {
        path: ':programId',
        data: {
          profile: 'SUPERVISOR',
          pathIdParam: 'programId',
        },
        children: [
          {
            path: '',
            pathMatch: 'full',
            component: ProgramPage,
            data: {
              profile: 'SUPERVISOR',
              pathIdParam: 'programId',
            },
            runGuardsAndResolvers: 'pathParamsChange',
            canDeactivate: [ComponentDirtyGuard],
          },
          {
            path: 'strategies',
            data: {
              profile: 'USER',
              pathIdParam: 'programId',
            },
            children: [
              {
                path: '',
                pathMatch: 'full',
                component: StrategiesPage,
                data: {
                  profile: 'USER',
                  pathIdParam: 'programId',
                },
                runGuardsAndResolvers: 'pathParamsChange',
                canDeactivate: [ComponentDirtyGuard],
              },
              {
                path: 'legacy/:strategyId',
                pathMatch: 'full',
                component: StrategyPage,
                data: {
                  profile: 'USER',
                  pathIdParam: 'strategyId',
                },
                runGuardsAndResolvers: 'pathParamsChange',
                canDeactivate: [ComponentDirtyGuard],
              },
              {
                path: 'sampling/:strategyId',
                pathMatch: 'full',
                component: SamplingStrategyPage,
                data: {
                  profile: 'USER',
                  pathIdParam: 'strategyId',
                },
                runGuardsAndResolvers: 'pathParamsChange',
                canDeactivate: [ComponentDirtyGuard],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: 'software',
    loadChildren: () => import('./software/software-routing.module').then((m) => m.AppSoftwareRoutingModule),
  },
  // Pmfm sub modules
  {
    path: 'pmfm',
    loadChildren: () => import('./pmfm/pmfm-routing.module').then((m) => m.AppPmfmRoutingModule),
  },
  {
    path: 'parameter',
    loadChildren: () => import('./pmfm/parameter/parameter-routing.module').then((m) => m.AppPmfmParameterRoutingModule),
  },
  {
    path: 'method',
    loadChildren: () => import('./pmfm/method/method-routing.module').then((m) => m.AppPmfmMethodRoutingModule),
  },
  {
    path: 'taxonGroup',
    loadChildren: () => import('./taxon-group/taxon-group-routing.module').then((m) => m.AppTaxonGroupRoutingModule),
  },
  {
    path: 'taxonName',
    loadChildren: () => import('./taxon-name/taxon-name-routing.module').then((m) => m.AppTaxonNameRoutingModule),
  },
  {
    path: 'metier',
    loadChildren: () => import('./metier/metier-routing.module').then((m) => m.AppMetierRoutingModule),
  },
  {
    path: 'user-expertise-area',
    loadChildren: () => import('./expertise-area/user-expertise-area-routing.module').then((m) => m.AppUserExpertiseAreaRoutingModule),
  },
];

@NgModule({
  imports: [AppReferentialModule, RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReferentialRoutingModule {}
