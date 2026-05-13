import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { MainComponent } from './components/main/main.component';
import { DashboardComponent } from './components/main/dashboard/dashboard.component';
import { AdminResourcePageComponent } from './components/main/admin-resource-page/admin-resource-page.component';
import { AdminOpsPageComponent } from './components/main/admin-ops-page/admin-ops-page.component';
import { TenantBootstrapPageComponent } from './components/main/tenant-bootstrap-page/tenant-bootstrap-page.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: 'main',
    component: MainComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      {
        path: 'accounts',
        component: AdminResourcePageComponent,
        data: {
          title: 'Empresas / Contas',
          subtitle: 'Gestão das contas master da plataforma',
          resource: 'accounts'
        }
      },
      {
        path: 'plans',
        component: AdminResourcePageComponent,
        data: {
          title: 'Planos',
          subtitle: 'Catálogo de planos comerciais',
          resource: 'plans'
        }
      },
      {
        path: 'modules',
        component: AdminResourcePageComponent,
        data: {
          title: 'Módulos',
          subtitle: 'Módulos administrativos disponíveis',
          resource: 'modules'
        }
      },
      {
        path: 'master-users',
        component: AdminResourcePageComponent,
        data: {
          title: 'Usuários Master',
          subtitle: 'Equipe administrativa global',
          resource: 'masterUsers'
        }
      },
      {
        path: 'account-modules',
        component: AdminResourcePageComponent,
        data: {
          title: 'Módulos por Conta',
          subtitle: 'Vinculação dos módulos disponíveis para cada tenant',
          resource: 'accountModules'
        }
      },
      {
        path: 'tenant-bootstrap',
        component: TenantBootstrapPageComponent,
        data: {
          title: 'Onboarding Tenant',
          subtitle: 'Preparação inicial do ambiente do tenant'
        }
      },
      {
        path: 'subscriptions',
        component: AdminOpsPageComponent,
        data: {
          title: 'Assinaturas',
          subtitle: 'Acompanhamento dos vencimentos e status das contas',
          resource: 'subscriptions'
        }
      },
      {
        path: 'storage',
        component: AdminOpsPageComponent,
        data: {
          title: 'Armazenamento',
          subtitle: 'Consumo consolidado por conta',
          resource: 'storage'
        }
      },
      {
        path: 'logs',
        component: AdminOpsPageComponent,
        data: {
          title: 'Logs',
          subtitle: 'Catálogo técnico das rotas e superfície pública da API',
          resource: 'logs'
        }
      },
      {
        path: 'auditing',
        component: AdminOpsPageComponent,
        data: {
          title: 'Auditoria',
          subtitle: 'Saúde do schema, segurança e prontidão do ambiente',
          resource: 'auditing'
        }
      },
      {
        path: 'backup',
        component: AdminOpsPageComponent,
        data: {
          title: 'Backup e Migrations',
          subtitle: 'Operação do versionamento e bootstrap master',
          resource: 'backup'
        }
      },
      {
        path: 'support-center',
        component: AdminOpsPageComponent,
        data: {
          title: 'Suporte',
          subtitle: 'Referências técnicas e apoio operacional',
          resource: 'support-center'
        }
      },
      {
        path: 'metrics',
        component: AdminOpsPageComponent,
        data: {
          title: 'Métricas',
          subtitle: 'Visão resumida de planos, contas e módulos',
          resource: 'metrics'
        }
      },
      {
        path: 'financial',
        component: AdminOpsPageComponent,
        data: {
          title: 'Financeiro',
          subtitle: 'Receita teórica com base nos planos vinculados',
          resource: 'financial'
        }
      },
      {
        path: 'settings-page',
        component: AdminOpsPageComponent,
        data: {
          title: 'Configurações',
          subtitle: 'Runtime, segurança e metadados da plataforma',
          resource: 'settings-page'
        }
      },
      {
        path: ':section',
        component: AdminResourcePageComponent,
        data: {
          title: 'Módulo em preparação',
          subtitle: 'Base estrutural pronta para evolução',
          resource: 'placeholder'
        }
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
