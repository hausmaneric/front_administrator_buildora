import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { forkJoin, Observable } from 'rxjs';
import { finalize } from 'rxjs';
import { AdminDataService } from '../../../services/admin-data.service';
import { LoginService } from '../../../services/login.service';

@Component({
  selector: 'app-admin-ops-page',
  standalone: true,
  imports: [CommonModule, GridModule, ButtonModule, TextBoxModule],
  templateUrl: './admin-ops-page.component.html',
  styleUrl: './admin-ops-page.component.scss'
})
export class AdminOpsPageComponent {
  title = '';
  subtitle = '';
  resource = '';
  loading = true;
  actionLoading = false;
  errorMessage = '';
  cards: Array<{ label: string; value: string; detail: string; tone?: string }> = [];
  rows: any[] = [];
  filteredRows: any[] = [];
  columns: Array<{ field: string; headerText: string; width?: number }> = [];
  panels: Array<{ title: string; lines: string[] }> = [];
  searchTerm = '';

  constructor(
    private route: ActivatedRoute,
    private loginService: LoginService,
    private adminDataService: AdminDataService
  ) {}

  ngOnInit(): void {
    this.title = this.route.snapshot.data['title'] ?? 'Controle';
    this.subtitle = this.route.snapshot.data['subtitle'] ?? '';
    this.resource = this.route.snapshot.data['resource'] ?? '';
    this.load();
  }

  load(): void {
    const token = this.loginService.getToken();
    if (!token) {
      this.errorMessage = 'Sessão master não encontrada.';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.requestFor(this.resource, token)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (payload: any) => this.mapPayload(payload),
        error: (error: any) => {
          this.errorMessage = error?.error?.message || 'Falha ao carregar dados operacionais.';
        }
      });
  }

  runAction(action: 'migrations' | 'bootstrap'): void {
    const token = this.loginService.getToken();
    if (!token || this.actionLoading) {
      return;
    }

    this.actionLoading = true;
    const request$ =
      action === 'migrations'
        ? this.adminDataService.applyMigrations(token)
        : this.adminDataService.bootstrapMaster(token, {});

    request$
      .pipe(finalize(() => (this.actionLoading = false)))
      .subscribe({
        next: () => this.load(),
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Falha ao executar ação administrativa.';
        }
      });
  }

  private requestFor(resource: string, token: string): Observable<any> {
    switch (resource) {
      case 'subscriptions':
        return this.adminDataService.accounts(token);
      case 'storage':
        return this.adminDataService.accounts(token);
      case 'logs':
        return this.adminDataService.routesCatalog();
      case 'auditing':
        return forkJoin({
          schema: this.adminDataService.schemaCompatibility(token),
          security: this.adminDataService.securityCheck(),
          ready: this.adminDataService.ready()
        });
      case 'backup':
        return forkJoin({
          migrations: this.adminDataService.migrationsStatus(token),
          bootstrap: this.adminDataService.bootstrapStatus(token),
          smoke: this.adminDataService.smokePlan()
        });
      case 'support-center':
        return forkJoin({
          routes: this.adminDataService.routesCatalog(),
          catalog: this.adminDataService.catalog(),
          environment: this.adminDataService.environment()
        });
      case 'metrics':
        return forkJoin({
          accounts: this.adminDataService.accounts(token),
          plans: this.adminDataService.plans(token),
          modules: this.adminDataService.modules(token)
        });
      case 'financial':
        return forkJoin({
          accounts: this.adminDataService.accounts(token),
          plans: this.adminDataService.plans(token)
        });
      case 'settings-page':
        return forkJoin({
          environment: this.adminDataService.environment(),
          security: this.adminDataService.securityCheck(),
          catalog: this.adminDataService.catalog()
        });
      default:
        return this.adminDataService.environment();
    }
  }

  private mapPayload(payload: any): void {
    this.cards = [];
    this.rows = [];
    this.filteredRows = [];
    this.columns = [];
    this.panels = [];

    switch (this.resource) {
      case 'subscriptions':
        this.mapSubscriptions(payload?.data ?? []);
        break;
      case 'storage':
        this.mapStorage(payload?.data ?? []);
        break;
      case 'logs':
        this.mapRoutes(payload?.data ?? {});
        break;
      case 'auditing':
        this.mapAuditing(payload);
        break;
      case 'backup':
        this.mapBackup(payload);
        break;
      case 'support-center':
        this.mapSupport(payload);
        break;
      case 'metrics':
        this.mapMetrics(payload);
        break;
      case 'financial':
        this.mapFinancial(payload);
        break;
      case 'settings-page':
        this.mapSettings(payload);
        break;
    }
  }

  onSearch(term: string): void {
    this.searchTerm = term ?? '';
    this.applyFilter();
  }

  totalRowsLabel(): string {
    const total = this.rows.length;
    const filtered = this.filteredRows.length;
    return filtered === total ? `${total} registros` : `${filtered} de ${total} registros`;
  }

  private mapSubscriptions(accounts: any[]): void {
    const now = new Date().getTime();
    const expiring = accounts.filter(item => {
      const diff = new Date(item.expiration_date).getTime() - now;
      return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
    }).length;
    const expired = accounts.filter(item => new Date(item.expiration_date).getTime() < now).length;

    this.cards = [
      { label: 'Contas ativas', value: `${accounts.filter(item => item.active).length}`, detail: 'Assinaturas habilitadas' },
      { label: 'Vencendo', value: `${expiring}`, detail: 'Nos próximos 7 dias', tone: 'warning' },
      { label: 'Vencidas', value: `${expired}`, detail: 'Exigem ação imediata', tone: 'danger' }
    ];
    this.rows = accounts;
    this.applyFilter();
    this.columns = [
      { field: 'name', headerText: 'Conta', width: 220 },
      { field: 'code', headerText: 'Código', width: 120 },
      { field: 'email', headerText: 'Email', width: 220 },
      { field: 'expiration_date', headerText: 'Vencimento', width: 140 }
    ];
  }

  private mapStorage(accounts: any[]): void {
    const total = accounts.reduce((sum, item) => sum + Number(item.storage_limit_mb || 0), 0);
    const used = accounts.reduce((sum, item) => sum + Number(item.storage_used_mb || 0), 0);
    const percent = total ? Math.round((used / total) * 100) : 0;

    this.cards = [
      { label: 'Storage total', value: `${total} MB`, detail: 'Limite consolidado' },
      { label: 'Storage usado', value: `${used} MB`, detail: `${percent}% do total` },
      { label: 'Contas monitoradas', value: `${accounts.length}`, detail: 'Base master' }
    ];
    this.rows = accounts.map(item => ({
      name: item.name,
      code: item.code,
      storage_limit_mb: item.storage_limit_mb,
      storage_used_mb: item.storage_used_mb,
      usage_percent: item.storage_limit_mb ? Math.round((Number(item.storage_used_mb || 0) / Number(item.storage_limit_mb || 1)) * 100) : 0
    }));
    this.applyFilter();
    this.columns = [
      { field: 'name', headerText: 'Conta', width: 220 },
      { field: 'code', headerText: 'Código', width: 120 },
      { field: 'storage_limit_mb', headerText: 'Limite MB', width: 120 },
      { field: 'storage_used_mb', headerText: 'Usado MB', width: 120 },
      { field: 'usage_percent', headerText: 'Uso %', width: 100 }
    ];
  }

  private mapRoutes(data: any): void {
    const routes = data.routes ?? [];
    this.cards = [
      { label: 'Total de rotas', value: `${data.total_routes ?? routes.length}`, detail: 'Catálogo publicado' },
      { label: 'API', value: `${data.name ?? 'OBRAX API'}`, detail: `${data.version ?? '1.0.0'}` }
    ];
    this.rows = routes.map((item: any) => ({
      method: item.methods?.join(', ') ?? '',
      path: item.path,
      requires_token: item.requires_token_id ? 'Sim' : 'Não'
    }));
    this.applyFilter();
    this.columns = [
      { field: 'method', headerText: 'Métodos', width: 140 },
      { field: 'path', headerText: 'Rota', width: 420 },
      { field: 'requires_token', headerText: 'Token', width: 90 }
    ];
  }

  private mapAuditing(payload: any): void {
    const schema = payload.schema?.data ?? {};
    const security = payload.security?.data ?? {};
    const ready = payload.ready?.data ?? {};

    this.cards = [
      { label: 'Schema compatível', value: schema.compatible ? 'Sim' : 'Não', detail: `${(schema.missing_tables ?? []).length} tabelas faltantes`, tone: schema.compatible ? 'success' : 'danger' },
      { label: 'Banco principal', value: ready.database_ping?.ok ? 'Online' : 'Falhou', detail: ready.database_config?.mode ?? 'desconhecido' },
      { label: 'Segurança', value: security.secret_key_changed ? 'OK' : 'Revisar', detail: security.database_ssl_required ? 'SSL requerido' : 'SSL pendente' }
    ];

    this.panels = [
      {
        title: 'Tabelas obrigatórias ausentes',
        lines: (schema.missing_tables ?? []).length ? schema.missing_tables : ['Nenhuma tabela pendente']
      },
      {
        title: 'Checklist de segurança',
        lines: [
          `Secret key alterada: ${security.secret_key_changed ? 'sim' : 'não'}`,
          `SSL no banco: ${security.database_ssl_required ? 'sim' : 'não'}`,
          `Senha configurada: ${security.database_password_configured ? 'sim' : 'não'}`
        ]
      }
    ];
  }

  private mapBackup(payload: any): void {
    const migrations = payload.migrations?.data ?? {};
    const bootstrap = payload.bootstrap?.data ?? {};
    const smoke = payload.smoke?.data ?? {};

    this.cards = [
      { label: 'Migrations aplicadas', value: `${(migrations.migrations ?? []).filter((item: any) => item.applied).length}`, detail: `${(migrations.pending ?? []).length} pendentes` },
      { label: 'Bootstrap master', value: bootstrap.master_seed ? 'Executado' : 'Pendente', detail: bootstrap.schema_version?.metadata_value ?? 'sem versão' },
      { label: 'Etapas smoke', value: `${(smoke.steps ?? []).length}`, detail: 'Checklist operacional' }
    ];

    this.rows = (migrations.migrations ?? []).map((item: any) => ({
      file: item.file,
      version: item.version,
      applied: item.applied ? 'Sim' : 'Não',
      applied_at: item.applied_at ?? '-'
    }));
    this.applyFilter();
    this.columns = [
      { field: 'file', headerText: 'Arquivo', width: 240 },
      { field: 'version', headerText: 'Versão', width: 100 },
      { field: 'applied', headerText: 'Aplicada', width: 90 },
      { field: 'applied_at', headerText: 'Registro', width: 180 }
    ];

    this.panels = [
      {
        title: 'Próximas ações administrativas',
        lines: ['Aplicar migrations pendentes', 'Revalidar smoke plan', 'Revisar bootstrap master']
      }
    ];
  }

  private mapSupport(payload: any): void {
    const routes = payload.routes?.data ?? {};
    const catalog = payload.catalog?.data ?? {};
    const environment = payload.environment?.data ?? {};

    this.cards = [
      { label: 'Módulos catalogados', value: `${Object.keys(catalog.modules ?? {}).length}`, detail: 'Catálogo modular da API' },
      { label: 'Rotas públicas', value: `${routes.total_routes ?? 0}`, detail: 'Mapeadas automaticamente' },
      { label: 'Runtime Python', value: environment.python_runtime ?? '-', detail: environment.name ?? 'OBRAX API' }
    ];

    this.panels = [
      {
        title: 'Links úteis do backend',
        lines: [
          '/api/v1/routes',
          '/api/v1/catalog',
          '/api/v1/environment',
          '/api/v1/security-check',
          '/api/v1/smoke-plan'
        ]
      }
    ];
  }

  private mapMetrics(payload: any): void {
    const accounts = payload.accounts?.data ?? [];
    const plans = payload.plans?.data ?? [];
    const modules = payload.modules?.data ?? [];

    this.cards = [
      { label: 'Empresas', value: `${accounts.length}`, detail: 'Contas cadastradas' },
      { label: 'Planos', value: `${plans.length}`, detail: 'Produtos disponíveis' },
      { label: 'Módulos', value: `${modules.length}`, detail: 'Módulos habilitáveis' }
    ];

    this.rows = plans.map((plan: any) => ({
      plan: plan.name,
      price: plan.price,
      max_users: plan.max_users,
      max_storage_mb: plan.max_storage_mb
    }));
    this.applyFilter();
    this.columns = [
      { field: 'plan', headerText: 'Plano', width: 220 },
      { field: 'price', headerText: 'Preço', width: 100 },
      { field: 'max_users', headerText: 'Usuários', width: 100 },
      { field: 'max_storage_mb', headerText: 'Storage MB', width: 120 }
    ];
  }

  private mapFinancial(payload: any): void {
    const accounts = (payload.accounts?.data ?? []) as any[];
    const plans = (payload.plans?.data ?? []) as any[];
    const planMap = new Map<number, any>(plans.map((item: any) => [Number(item.id), item]));
    const revenue = accounts.reduce((sum: number, account: any) => {
      const plan = planMap.get(Number(account.plan_id));
      return sum + Number(plan?.price || 0);
    }, 0);

    this.cards = [
      { label: 'Receita teórica', value: `R$ ${revenue.toFixed(2).replace('.', ',')}`, detail: 'Soma dos planos vinculados' },
      { label: 'Contas faturáveis', value: `${accounts.filter((item: any) => item.active).length}`, detail: 'Ativas no master' }
    ];

    this.rows = accounts.map((account: any) => {
      const plan = planMap.get(Number(account.plan_id));
      return {
      account: account.name,
      code: account.code,
      plan: plan?.name ?? '-',
      price: plan?.price ?? 0
    };
    });
    this.applyFilter();
    this.columns = [
      { field: 'account', headerText: 'Conta', width: 220 },
      { field: 'code', headerText: 'Código', width: 120 },
      { field: 'plan', headerText: 'Plano', width: 180 },
      { field: 'price', headerText: 'Preço', width: 100 }
    ];
  }

  private mapSettings(payload: any): void {
    const environment = payload.environment?.data ?? {};
    const security = payload.security?.data ?? {};
    const catalog = payload.catalog?.data ?? {};

    this.cards = [
      { label: 'API', value: environment.version ?? '1.0.0', detail: environment.name ?? 'OBRAX API' },
      { label: 'Módulos do catálogo', value: `${Object.keys(catalog.modules ?? {}).length}`, detail: 'Metadados públicos' },
      { label: 'Segurança', value: security.secret_key_changed ? 'Pronta' : 'Revisar', detail: security.default_local_user ? 'Usuário default presente' : 'Sem usuário local padrão' }
    ];

    this.panels = [
      {
        title: 'Configuração do ambiente',
        lines: [
          `Runtime: ${environment.python_runtime ?? '-'}`,
          `DB host: ${environment.database?.host ?? '-'}`,
          `DB sslmode: ${environment.database?.sslmode ?? '-'}`,
          `Connection string presente: ${environment.database?.connection_string_present ? 'sim' : 'não'}`
        ]
      }
    ];
  }

  private applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredRows = [...this.rows];
      return;
    }

    this.filteredRows = this.rows.filter((row) =>
      Object.values(row ?? {}).some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(term)
      )
    );
  }
}
