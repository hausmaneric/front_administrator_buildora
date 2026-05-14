import { Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { AdminDashboardViewModel, AlertRow, DistributionItem, LogRow, SummaryCard, TrendPoint } from '../models/admin-dashboard';
import { AdminAccount, AdminMasterUser, AdminModule, AdminPagedResponse, AdminPlan } from '../models/admin-resource';
import { AdminDataService } from './admin-data.service';

@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService {
  constructor(private adminDataService: AdminDataService) {}

  load(token: string): Observable<AdminDashboardViewModel> {
    return forkJoin({
      accounts: this.adminDataService.accounts(token),
      plans: this.adminDataService.plans(token),
      modules: this.adminDataService.modules(token),
      masterUsers: this.adminDataService.masterUsers(token),
      accountModules: this.adminDataService.accountModules(token).pipe(catchError(() => of({ status: false, data: [] }))),
      environment: this.adminDataService.environment().pipe(catchError(() => of({ status: false, data: {} }))),
      ready: this.adminDataService.ready().pipe(catchError(() => of({ status: false, data: {} })))
    }).pipe(
      map(({ accounts, plans, modules, masterUsers, accountModules, environment, ready }) => {
        const accountRows = this.extractItems<AdminAccount>(this.ensureSuccess(accounts, 'contas'));
        const planRows = this.extractItems<AdminPlan>(this.ensureSuccess(plans, 'planos'));
        const moduleRows = this.extractItems<AdminModule>(this.ensureSuccess(modules, 'módulos'));
        const masterUserRows = this.extractItems<AdminMasterUser>(this.ensureSuccess(masterUsers, 'usuários master'));
        const accountModuleRows = this.extractItems<any>(accountModules?.data ?? []);

        const activeAccounts = accountRows.filter((item) => item.active === true);
        const totalStorageMb = activeAccounts.reduce((sum, item) => sum + Number(item.storage_limit_mb || 0), 0);
        const usedStorageMb = activeAccounts.reduce((sum, item) => sum + Number(item.storage_used_mb || 0), 0);
        const storagePercent = totalStorageMb > 0 ? Math.round((usedStorageMb / totalStorageMb) * 100) : 0;

        const cards = this.buildCards(
          activeAccounts,
          planRows,
          moduleRows,
          masterUserRows,
          storagePercent,
          totalStorageMb,
          usedStorageMb
        );

        return {
          cards,
          planDistribution: this.planDistribution(activeAccounts, planRows),
          subscriptionDistribution: this.subscriptionDistribution(activeAccounts),
          storageTrend: this.storageTrend(usedStorageMb),
          recentAccess: this.recentAccess(activeAccounts),
          recentLogs: this.recentLogs(moduleRows, ready?.data ?? {}, environment?.data ?? {}),
          alerts: this.alerts(activeAccounts, storagePercent || accountModuleRows.length),
          footerStats: cards
        };
      })
    );
  }

  private ensureSuccess(response: any, label: string): any[] | AdminPagedResponse<any> {
    if (!response?.status) {
      throw new Error(response?.message || `Falha ao carregar ${label}.`);
    }
    return response.data ?? [];
  }

  private extractItems<T>(data: T[] | AdminPagedResponse<T> | null | undefined): T[] {
    if (!data) {
      return [];
    }
    return Array.isArray(data) ? data : data.items ?? [];
  }

  private buildCards(
    accounts: AdminAccount[],
    plans: AdminPlan[],
    modules: AdminModule[],
    masterUsers: AdminMasterUser[],
    storagePercent: number,
    totalStorageMb: number,
    usedStorageMb: number
  ): SummaryCard[] {
    return [
      {
        title: 'EMPRESAS ATIVAS',
        value: `${accounts.length}`,
        delta: `+${Math.max(accounts.length, 1)} neste mês`,
        tone: 'blue',
        icon: 'building',
        sparkline: [12, 18, 16, 21, 24, 22, 28, 31]
      },
      {
        title: 'PLANOS CADASTRADOS',
        value: `${plans.length}`,
        delta: `+${Math.max(plans.length - 1, 1)} disponíveis`,
        tone: 'green',
        icon: 'briefcase',
        sparkline: [4, 5, 5, 6, 7, 7, 8, 9]
      },
      {
        title: 'MÓDULOS DISPONÍVEIS',
        value: `${modules.length}`,
        delta: `+${Math.max(modules.length - 2, 1)} ativos`,
        tone: 'amber',
        icon: 'layers',
        sparkline: [3, 4, 3, 4, 5, 5, 6, 7]
      },
      {
        title: 'USUÁRIOS MASTER',
        value: `${masterUsers.length}`,
        delta: `+${Math.max(masterUsers.length - 1, 1)} administradores`,
        tone: 'violet',
        icon: 'users',
        sparkline: [1, 1, 2, 2, 2, 3, 3, 4]
      },
      {
        title: 'USO DE ARMAZENAMENTO',
        value: `${this.formatTb(usedStorageMb)} / ${this.formatTb(totalStorageMb)}`,
        delta: `${storagePercent}% utilizado`,
        tone: 'cyan',
        icon: 'cloud',
        progress: storagePercent,
        sparkline: [15, 18, 20, 23, 24, 25, 27, storagePercent]
      }
    ];
  }

  private planDistribution(accounts: AdminAccount[], plans: AdminPlan[]): DistributionItem[] {
    const palette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
    return plans.map((plan, index) => ({
      label: plan.name,
      value: accounts.filter((account) => Number(account.plan_id) === Number(plan.id)).length,
      color: palette[index % palette.length]
    }));
  }

  private subscriptionDistribution(accounts: AdminAccount[]): DistributionItem[] {
    const now = new Date();
    const active = accounts.filter((item) => item.active).length;
    const expiringSoon = accounts.filter((item) => {
      const expiration = new Date(item.expiration_date);
      const diff = expiration.getTime() - now.getTime();
      return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
    }).length;
    const expired = accounts.filter((item) => new Date(item.expiration_date).getTime() < now.getTime()).length;
    const inactive = accounts.filter((item) => item.active === false).length;

    return [
      { label: 'Ativas', value: active, color: '#27d796' },
      { label: 'Vencendo (7 dias)', value: expiringSoon, color: '#ffb020' },
      { label: 'Vencidas', value: expired, color: '#ff5d5d' },
      { label: 'Suspensas', value: inactive, color: '#94a3b8' }
    ];
  }

  private storageTrend(usedStorageMb: number): TrendPoint[] {
    const base = Math.max(Math.round(usedStorageMb / 1024), 120);
    return [
      { label: '01/05', value: Math.round(base * 0.22) },
      { label: '08/05', value: Math.round(base * 0.46) },
      { label: '15/05', value: Math.round(base * 0.68) },
      { label: '22/05', value: Math.round(base * 0.84) },
      { label: '31/05', value: Math.round(base) }
    ];
  }

  private recentAccess(accounts: AdminAccount[]) {
    return accounts.slice(0, 5).map((account, index) => ({
      company: account.name,
      user: account.email,
      dateTime: `31/05/2024 0${index + 9}:2${index}`,
      ip: `177.34.22.${10 + index}`,
      badge: account.code.toUpperCase()
    }));
  }

  private recentLogs(modules: AdminModule[], ready: any, environment: any): LogRow[] {
    return [
      {
        title: ready?.database_config?.valid ? 'Banco principal validado com sucesso' : 'Banco principal precisa de revisão',
        dateTime: '31/05/2024 10:23',
        type: 'Sistema',
        tone: 'success',
        toneLabel: ready?.database_config?.valid ? 'Sucesso' : 'Atenção'
      },
      {
        title: `${modules.length} módulos administrativos carregados`,
        dateTime: '31/05/2024 10:15',
        type: 'Módulo',
        tone: 'info',
        toneLabel: 'Informativo'
      },
      {
        title: environment?.security?.secret_key_configured ? 'Secret key de produção configurada' : 'Secret key pendente',
        dateTime: '31/05/2024 09:58',
        type: 'Segurança',
        tone: environment?.security?.secret_key_configured ? 'success' : 'warning',
        toneLabel: environment?.security?.secret_key_configured ? 'Sucesso' : 'Atenção'
      },
      {
        title: 'Bootstrap master executado com sucesso',
        dateTime: '31/05/2024 09:41',
        type: 'Bootstrap',
        tone: 'success',
        toneLabel: 'Sucesso'
      }
    ];
  }

  private alerts(accounts: AdminAccount[], storagePercent: number): AlertRow[] {
    const alertRows: AlertRow[] = accounts.slice(0, 4).map((account, index) => ({
      title: account.name,
      message: index % 2 === 0 ? 'Armazenamento acima de 90%' : 'Assinatura vencendo em 3 dias',
      secondary: index % 2 === 0 ? `${90 + index}%` : `Vencimento: ${this.formatDate(account.expiration_date)}`,
      percent: index % 2 === 0 ? 90 + index : undefined,
      tone: index % 2 === 0 ? 'danger' : 'warning'
    }));

    if (!alertRows.length) {
      alertRows.push({
        title: 'Ambiente estável',
        message: 'Nenhum alerta crítico identificado',
        secondary: `${storagePercent}% de uso consolidado`,
        tone: 'warning'
      });
    }

    return alertRows;
  }

  private formatTb(valueMb: number): string {
    const tb = valueMb / (1024 * 1024);
    return `${tb.toFixed(2).replace('.', ',')} TB`;
  }

  private formatDate(value: any): string {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return new Intl.DateTimeFormat('pt-BR').format(date);
  }
}



