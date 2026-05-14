import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { Observable, finalize, forkJoin } from 'rxjs';
import { AdminDataService } from '../../../services/admin-data.service';
import { LoginService } from '../../../services/login.service';

@Component({
  selector: 'app-admin-ops-page',
  standalone: true,
  imports: [CommonModule, ButtonModule, TextBoxModule],
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
    private router: Router,
    private loginService: LoginService,
    private adminDataService: AdminDataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.title = data['title'] ?? 'Controle';
      this.subtitle = data['subtitle'] ?? '';
      this.resource = data['resource'] ?? '';
      this.loading = true;
      this.errorMessage = '';
      this.cards = [];
      this.rows = [];
      this.filteredRows = [];
      this.columns = [];
      this.panels = [];
      this.flushView();
      this.load();
    });
  }

  load(): void {
    const token = this.loginService.getToken();
    if (!token) {
      this.redirectToLogin();
      this.loading = false;
      this.flushView();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.requestFor(this.resource, token)
      .pipe(finalize(() => {
        this.loading = false;
        this.flushView();
      }))
      .subscribe({
        next: (payload) => this.mapPayload(payload),
        error: (error) => {
          const message = error?.error?.message || 'Falha ao carregar dados operacionais.';
          if (this.isAuthenticationFailure(message)) {
            this.redirectToLogin();
            return;
          }
          this.errorMessage = message;
          this.flushView();
        }
      });
  }

  runAction(action: 'migrations' | 'bootstrap'): void {
    const token = this.loginService.getToken();
    if (!token || this.actionLoading) {
      return;
    }

    this.actionLoading = true;
    const request$ = action === 'migrations'
      ? this.adminDataService.applyMigrations(token)
      : this.adminDataService.bootstrapMaster(token, {});

    request$
      .pipe(finalize(() => {
        this.actionLoading = false;
        this.flushView();
      }))
      .subscribe({
        next: () => this.load(),
        error: (error) => {
          const message = error?.error?.message || 'Falha ao executar a acao administrativa.';
          if (this.isAuthenticationFailure(message)) {
            this.redirectToLogin();
            return;
          }
          this.errorMessage = message;
          this.flushView();
        }
      });
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

  totalRowsMinWidth(): number {
    return this.columns.reduce((sum, column) => sum + Number(column.width || 180), 0);
  }

  isBadgeField(field: string): boolean {
    return ['ativo', 'tokenRequired'].includes(field);
  }

  badgeTone(value: any): string {
    const text = String(value ?? '').toLowerCase();
    if (text.includes('não') || text.includes('nao') || text.includes('inativo')) {
      return 'danger';
    }
    return 'success';
  }

  private requestFor(resource: string, token: string): Observable<any> {
    switch (resource) {
      case 'subscriptions':
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

    this.flushView();
  }

  private mapSubscriptions(accounts: any[]): void {
    const now = Date.now();
    const expiring = accounts.filter((item) => {
      const diff = new Date(item.expiration_date).getTime() - now;
      return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
    }).length;
    const expired = accounts.filter((item) => new Date(item.expiration_date).getTime() < now).length;

    this.cards = [
      { label: 'Contas ativas', value: `${accounts.filter((item) => item.active).length}`, detail: 'Assinaturas habilitadas' },
      { label: 'Vencendo', value: `${expiring}`, detail: 'Nos proximos 7 dias', tone: 'warning' },
      { label: 'Vencidas', value: `${expired}`, detail: 'Exigem acao imediata', tone: 'danger' }
    ];
    this.rows = accounts.map((item) => ({
      name: item.name,
      code: item.code,
      email: item.email,
      expirationDate: this.formatDate(item.expiration_date)
    }));
    this.columns = [
      { field: 'name', headerText: 'Conta', width: 260 },
      { field: 'code', headerText: 'Código', width: 150 },
      { field: 'email', headerText: 'E-mail', width: 260 },
      { field: 'expirationDate', headerText: 'Vencimento', width: 160 }
    ];
    this.applyFilter();
  }

  private mapStorage(accounts: any[]): void {
    const total = accounts.reduce((sum, item) => sum + Number(item.storage_limit_mb || 0), 0);
    const used = accounts.reduce((sum, item) => sum + Number(item.storage_used_mb || 0), 0);
    const percent = total ? Math.round((used / total) * 100) : 0;

    this.cards = [
      { label: 'Armazenamento total', value: this.formatStorage(total), detail: 'Limite consolidado' },
      { label: 'Armazenamento usado', value: this.formatStorage(used), detail: `${percent}% do total` },
      { label: 'Contas monitoradas', value: `${accounts.length}`, detail: 'Base master' }
    ];
    this.rows = accounts.map((item) => ({
      name: item.name,
      code: item.code,
      storageLimit: this.formatStorage(item.storage_limit_mb),
      storageUsed: this.formatStorage(item.storage_used_mb),
      usagePercent: `${item.storage_limit_mb ? Math.round((Number(item.storage_used_mb || 0) / Number(item.storage_limit_mb || 1)) * 100) : 0}%`
    }));
    this.columns = [
      { field: 'name', headerText: 'Conta', width: 260 },
      { field: 'code', headerText: 'Código', width: 150 },
      { field: 'storageLimit', headerText: 'Limite', width: 170 },
      { field: 'storageUsed', headerText: 'Uso atual', width: 170 },
      { field: 'usagePercent', headerText: 'Uso', width: 110 }
    ];
    this.applyFilter();
  }

  private mapRoutes(data: any): void {
    const routes = data.routes ?? [];
    this.cards = [
      { label: 'Total de rotas', value: `${data.total_routes ?? routes.length}`, detail: 'Catálogo publicado' },
      { label: 'API', value: `${data.name ?? 'OBRAX API'}`, detail: `${data.version ?? '1.0.0'}` }
    ];
    this.rows = routes.map((item: any) => ({
      methods: item.methods?.join(', ') ?? '',
      path: item.path,
      tokenRequired: item.requires_token_id ? 'Sim' : 'Não'
    }));
    this.columns = [
      { field: 'methods', headerText: 'Métodos', width: 160 },
      { field: 'path', headerText: 'Rota', width: 520 },
      { field: 'tokenRequired', headerText: 'Exige token', width: 140 }
    ];
    this.applyFilter();
  }

  private mapAuditing(payload: any): void {
    const schema = payload.schema?.data ?? {};
    const security = payload.security?.data ?? {};
    const ready = payload.ready?.data ?? {};

    this.cards = [
      { label: 'Schema compatível', value: schema.compatible ? 'Sim' : 'Não', detail: `${(schema.missing_tables ?? []).length} tabelas faltantes`, tone: schema.compatible ? 'success' : 'danger' },
      { label: 'Banco principal', value: ready.database_ping?.ok ? 'Online' : 'Falhou', detail: ready.database_config?.mode ?? 'desconhecido' },
      { label: 'Seguranca', value: security.secret_key_changed ? 'OK' : 'Revisar', detail: security.database_ssl_required ? 'SSL requerido' : 'SSL pendente' }
    ];

    this.panels = [
      {
        title: 'Tabelas obrigatorias ausentes',
        lines: (schema.missing_tables ?? []).length ? schema.missing_tables : ['Nenhuma tabela pendente']
      },
      {
        title: 'Checklist de seguranca',
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
      { label: 'Migrations pendentes', value: `${(migrations.pending ?? []).length}`, detail: `${(migrations.applied ?? []).length} aplicadas` },
      { label: 'Bootstrap master', value: bootstrap.seeded ? 'Concluído' : 'Pendente', detail: bootstrap.schema_version ?? 'sem versão' },
      { label: 'Etapas smoke', value: `${(smoke.stages ?? []).length}`, detail: 'Checklist operacional' }
    ];

    this.panels = [
      {
        title: 'Migrations pendentes',
        lines: (migrations.pending ?? []).length ? migrations.pending : ['Nenhuma migration pendente']
      },
      {
        title: 'Plano de smoke test',
        lines: (smoke.stages ?? []).map((item: any) => `${item.title}: ${item.goal}`) || ['Sem etapas cadastradas']
      }
    ];
  }

  private mapSupport(payload: any): void {
    const routes = payload.routes?.data ?? {};
    const catalog = payload.catalog?.data ?? {};
    const environment = payload.environment?.data ?? {};

    this.cards = [
      { label: 'Rotas publicas', value: `${routes.total_routes ?? 0}`, detail: 'Mapa de suporte' },
      { label: 'Módulos documentados', value: `${Object.keys(catalog.modules ?? {}).length}`, detail: 'Catálogo publicado' },
      { label: 'Runtime Python', value: environment.python_runtime ?? '-', detail: 'Ambiente atual' }
    ];

    this.panels = [
      {
        title: 'Módulos disponíveis',
        lines: Object.keys(catalog.modules ?? {}).length ? Object.keys(catalog.modules ?? {}) : ['Nenhum módulo documentado']
      },
      {
        title: 'Banco principal',
        lines: [
          `Host: ${environment.database?.host ?? '-'}`,
          `Porta: ${environment.database?.port ?? '-'}`,
          `SSL: ${environment.database?.sslmode ?? '-'}`
        ]
      }
    ];
  }

  private mapMetrics(payload: any): void {
    const accounts = payload.accounts?.data ?? [];
    const plans = payload.plans?.data ?? [];
    const modules = payload.modules?.data ?? [];

    this.cards = [
      { label: 'Contas', value: `${accounts.length}`, detail: 'Base master atual' },
      { label: 'Planos', value: `${plans.length}`, detail: 'Catálogo comercial' },
      { label: 'Módulos', value: `${modules.length}`, detail: 'Componentes da plataforma' }
    ];

    this.rows = accounts.map((item: any) => ({
      conta: item.name,
      plano: plans.find((plan: any) => Number(plan.id) === Number(item.plan_id))?.name ?? `Plano #${item.plan_id}`,
      armazenamento: this.formatStorage(item.storage_used_mb),
      ativo: item.active ? 'Ativo' : 'Inativo'
    }));
    this.columns = [
      { field: 'conta', headerText: 'Conta', width: 260 },
      { field: 'plano', headerText: 'Plano', width: 220 },
      { field: 'armazenamento', headerText: 'Armazenamento', width: 170 },
      { field: 'ativo', headerText: 'Situação', width: 140 }
    ];
    this.applyFilter();
  }

  private mapFinancial(payload: any): void {
    const accounts = payload.accounts?.data ?? [];
    const plans = payload.plans?.data ?? [];
    const projected = accounts.reduce((sum: number, account: any) => {
      const plan = plans.find((item: any) => Number(item.id) === Number(account.plan_id));
      return sum + Number(plan?.price || 0);
    }, 0);

    this.cards = [
      { label: 'Receita mensal projetada', value: this.formatCurrency(projected), detail: 'Somando planos vinculados' },
      { label: 'Contas faturáveis', value: `${accounts.length}`, detail: 'Base contratual' },
      { label: 'Ticket médio', value: this.formatCurrency(accounts.length ? projected / accounts.length : 0), detail: 'Por conta ativa' }
    ];

    this.rows = accounts.map((item: any) => {
      const plan = plans.find((entry: any) => Number(entry.id) === Number(item.plan_id));
      return {
        conta: item.name,
        plano: plan?.name ?? `Plano #${item.plan_id}`,
        valor: this.formatCurrency(plan?.price || 0),
        vencimento: this.formatDate(item.expiration_date)
      };
    });
    this.columns = [
      { field: 'conta', headerText: 'Conta', width: 260 },
      { field: 'plano', headerText: 'Plano', width: 220 },
      { field: 'valor', headerText: 'Valor', width: 150 },
      { field: 'vencimento', headerText: 'Vencimento', width: 150 }
    ];
    this.applyFilter();
  }

  private mapSettings(payload: any): void {
    const environment = payload.environment?.data ?? {};
    const security = payload.security?.data ?? {};
    const catalog = payload.catalog?.data ?? {};

    this.cards = [
      { label: 'Secret key', value: security.secret_key_changed ? 'OK' : 'Revisar', detail: 'Seguranca de producao' },
      { label: 'Conexão principal', value: environment.database?.validation?.valid ? 'Válida' : 'Inválida', detail: environment.database?.validation?.mode ?? '-' },
      { label: 'Módulos visíveis', value: `${Object.keys(catalog.modules ?? {}).length}`, detail: 'Catálogo atual' }
    ];

    this.panels = [
      {
        title: 'Validação do banco',
        lines: (environment.database?.validation?.issues ?? []).length
          ? environment.database.validation.issues
          : ['Sem inconsistências de configuração']
      },
      {
        title: 'Seguranca',
        lines: [
          `Secret key configurada: ${security.secret_key_configured ? 'sim' : 'não'}`,
          `Secret key alterada: ${security.secret_key_changed ? 'sim' : 'não'}`,
          `SSL requerido: ${security.database_ssl_required ? 'sim' : 'não'}`
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
      Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(term))
    );
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
  }

  private formatStorage(value: number): string {
    return `${new Intl.NumberFormat('pt-BR').format(Number(value || 0))} MB`;
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

  private isAuthenticationFailure(message?: string): boolean {
    const normalized = String(message ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return normalized.includes('autentic') || normalized.includes('sessao') || normalized.includes('token');
  }

  private redirectToLogin(): void {
    this.loginService.clearToken();
    void this.router.navigate(['/login']);
  }

  private flushView(): void {
    queueMicrotask(() => {
      window.dispatchEvent(new Event('resize'));
      this.cdr.detectChanges();
    });
  }
}




