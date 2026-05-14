import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule, CheckBoxModule } from '@syncfusion/ej2-angular-buttons';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { DialogComponent, DialogModule } from '@syncfusion/ej2-angular-popups';
import { Observable, finalize } from 'rxjs';
import { AdminPagedResponse } from '../../../models/admin-resource';
import { AdminDataService } from '../../../services/admin-data.service';
import { LoginService } from '../../../services/login.service';

type DialogMode = 'create' | 'edit' | 'duplicate';

type ResourceColumn = {
  field: string;
  headerText: string;
  width: number;
};

type ResourceConfig = {
  columns: ResourceColumn[];
  sortField: string;
  supportsPaging?: boolean;
  list: (params: Record<string, any>) => Observable<any>;
  create: (payload: Record<string, any>) => Observable<any>;
  update: (payload: Record<string, any>) => Observable<any>;
  remove: (id: number) => Observable<any>;
};

@Component({
  selector: 'app-admin-resource-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TextBoxModule, DialogModule, ButtonModule, DropDownListModule, CheckBoxModule],
  templateUrl: './admin-resource-page.component.html',
  styleUrl: './admin-resource-page.component.scss'
})
export class AdminResourcePageComponent {
  @ViewChild('createDialog') createDialog!: DialogComponent;

  title = 'Gestão';
  subtitle = '';
  resource = 'placeholder';
  rows: any[] = [];
  filteredRows: any[] = [];
  columns: ResourceColumn[] = [];
  loading = true;
  saving = false;
  placeholder = false;
  placeholderMessage = 'Módulo em preparação.';
  dialogMessage = '';
  createForm!: FormGroup;
  searchTerm = '';
  appliedSearch = '';
  pageSize = 20;
  offset = 0;
  currentPage = 1;
  totalItems = 0;
  sortField = 'id';
  sortDirection: 'asc' | 'desc' = 'desc';
  hasNext = false;
  dialogMode: DialogMode = 'create';
  editingRow: any = null;
  planOptions: Array<{ id: number; text: string }> = [];
  accountOptions: Array<{ id: number; text: string }> = [];
  moduleOptions: Array<{ id: string; text: string }> = [];
  supportOptionsLoaded = false;
  toasts: Array<{ id: number; type: 'success' | 'error' | 'info'; title: string; message: string }> = [];

  readonly roleOptions = [
    { id: 'admin', text: 'Administrador' },
    { id: 'manager', text: 'Gestor' },
    { id: 'support', text: 'Suporte' },
    { id: 'user', text: 'Usuário' }
  ];

  readonly pageSizeOptions = [
    { id: 10, text: '10 por página' },
    { id: 20, text: '20 por página' },
    { id: 50, text: '50 por página' }
  ];

  sortOptions: Array<{ id: string; text: string }> = [];

  readonly sortDirectionOptions = [
    { id: 'desc', text: 'Decrescente' },
    { id: 'asc', text: 'Crescente' }
  ];

  private toastSeed = 1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loginService: LoginService,
    private adminDataService: AdminDataService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.title = data['title'] ?? 'Gestão';
      this.subtitle = data['subtitle'] ?? '';
      this.resource = data['resource'] ?? 'placeholder';
      this.configurePage();
    });
  }

  openCreateDialog(): void {
    this.loadSupportOptions();
    this.dialogMode = 'create';
    this.editingRow = null;
    this.createForm = this.buildForm();
    this.dialogMessage = '';
    this.createDialog.show();
  }

  openEditDialog(row: any): void {
    this.loadSupportOptions();
    this.dialogMode = 'edit';
    this.editingRow = row;
    this.createForm = this.buildForm();
    this.createForm.patchValue(this.toFormValue(row, 'edit'));
    if (this.resource === 'masterUsers') {
      this.createForm.get('password')?.clearValidators();
      this.createForm.get('password')?.updateValueAndValidity();
    }
    this.dialogMessage = '';
    this.createDialog.show();
  }

  openDuplicateDialog(row: any): void {
    this.loadSupportOptions();
    this.dialogMode = 'duplicate';
    this.editingRow = row;
    this.createForm = this.buildForm();
    this.createForm.patchValue(this.toFormValue(row, 'duplicate'));
    this.dialogMessage = '';
    this.createDialog.show();
  }

  closeCreateDialog(): void {
    this.createDialog.hide();
  }

  submitCreate(): void {
    if (this.createForm.invalid || this.saving) {
      this.createForm.markAllAsTouched();
      return;
    }

    const token = this.loginService.getToken();
    if (!token) {
      this.redirectToLogin();
      return;
    }

    const payload = this.createPayload();
    const request$ = this.dialogMode === 'edit' ? this.updateRequest(token, payload) : this.createRequest(token, payload);

    this.saving = true;
    request$
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (response) => {
          if (!response.status) {
            if (this.isAuthenticationFailure(response?.message)) {
              this.redirectToLogin();
              return;
            }

            this.dialogMessage = response.message || 'Falha ao salvar o registro.';
            this.pushToast('error', 'Falha ao salvar', this.dialogMessage);
            return;
          }

          this.pushToast('success', this.dialogMode === 'edit' ? 'Registro atualizado' : 'Registro salvo', response.message || 'Operação concluida com sucesso.');
          this.closeCreateDialog();
          this.loadPage();
        },
        error: (error) => {
          if (this.isAuthenticationFailure(error?.error?.message)) {
            this.redirectToLogin();
            return;
          }

          this.dialogMessage = error?.error?.message || 'Não foi possível salvar o registro.';
          this.pushToast('error', 'Erro de operacao', this.dialogMessage);
        }
      });
  }

  deleteRow(row: any): void {
    const token = this.loginService.getToken();
    if (!token) {
      this.redirectToLogin();
      return;
    }

    if (!confirm(`Deseja remover este registro de ${this.title.toLowerCase()}?`)) {
      return;
    }

    this.loading = true;
    this.deleteRequest(token, row?.id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          if (!response.status) {
            if (this.isAuthenticationFailure(response?.message)) {
              this.redirectToLogin();
              return;
            }

            this.placeholder = true;
            this.placeholderMessage = response.message || 'Falha ao excluir o registro.';
            this.pushToast('error', 'Falha ao excluir', this.placeholderMessage);
            return;
          }

          this.pushToast('success', 'Registro removido', response.message || 'Exclusão realizada com sucesso.');
          if (this.rows.length === 1 && this.offset > 0) {
            this.offset = Math.max(0, this.offset - this.pageSize);
          }
          this.loadPage();
        },
        error: (error) => {
          if (this.isAuthenticationFailure(error?.error?.message)) {
            this.redirectToLogin();
            return;
          }

          this.placeholder = true;
          this.placeholderMessage = error?.error?.message || 'Não foi possível excluir o registro.';
          this.pushToast('error', 'Erro de exclusao', this.placeholderMessage);
        }
      });
  }

  applySearch(): void {
    this.appliedSearch = this.searchTerm.trim();
    this.offset = 0;
    this.loadPage();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.appliedSearch = '';
    this.offset = 0;
    this.loadPage();
  }

  changePageSize(size: number): void {
    this.pageSize = Number(size) || 20;
    this.offset = 0;
    this.loadPage();
  }

  previousPage(): void {
    if (this.offset <= 0) {
      return;
    }
    this.offset = Math.max(0, this.offset - this.pageSize);
    this.loadPage();
  }

  nextPage(): void {
    if (!this.hasNext) {
      return;
    }
    this.offset += this.pageSize;
    this.loadPage();
  }

  changeSortField(field: string): void {
    this.sortField = field;
    this.offset = 0;
    this.loadPage();
  }

  changeSortDirection(direction: string): void {
    this.sortDirection = direction === 'asc' ? 'asc' : 'desc';
    this.offset = 0;
    this.loadPage();
  }

  totalRowsLabel(): string {
    const start = this.rows.length ? this.offset + 1 : 0;
    const end = this.offset + this.rows.length;
    return `${start}-${end} de ${this.totalItems} registros`;
  }

  actionColumnWidth(): number {
    return 168;
  }

  isBadgeField(field: string): boolean {
    return ['statusDisplay', 'activeDisplay', 'roleDisplay'].includes(field);
  }

  badgeTone(field: string, value: any): string {
    const text = String(value ?? '').toLowerCase();
    if (field === 'roleDisplay') {
      return text.includes('admin') ? 'info' : text.includes('suporte') ? 'warning' : 'neutral';
    }
    if (text.includes('bloquead') || text.includes('inativ')) {
      return 'danger';
    }
    if (text.includes('suspens')) {
      return 'warning';
    }
    return 'success';
  }

  dialogTitle(): string {
    if (this.dialogMode === 'edit') {
      return `Editar registro - ${this.title}`;
    }
    if (this.dialogMode === 'duplicate') {
      return `Duplicar registro - ${this.title}`;
    }
    return `Novo registro - ${this.title}`;
  }

  canDelete(row: any): boolean {
    const session = this.loginService.getLocalToken();
    if (this.resource === 'masterUsers' && session?.user?.id === row?.id) {
      return false;
    }
    if (this.resource === 'modules' && ['DIARY', 'PRODUCTION', 'AUDIT'].includes(String(row?.code || '').toUpperCase())) {
      return false;
    }
    return true;
  }

  canEdit(_row: any): boolean {
    return true;
  }

  canDuplicate(_row: any): boolean {
    return this.resource !== 'accountModules';
  }

  disabledReason(row: any): string {
    if (this.resource === 'masterUsers' && this.loginService.getLocalToken()?.user?.id === row?.id) {
      return 'Você não pode remover a própria sessão master.';
    }
    if (this.resource === 'modules' && ['DIARY', 'PRODUCTION', 'AUDIT'].includes(String(row?.code || '').toUpperCase())) {
      return 'Os módulos base da plataforma não devem ser removidos.';
    }
    return '';
  }

  exportJson(): void {
    this.downloadBlob('application/json', JSON.stringify(this.filteredRows, null, 2), `${this.resource}-pagina-${this.currentPage}.json`);
    this.pushToast('info', 'Exportação JSON', 'Página atual exportada com sucesso.');
  }

  exportCsv(): void {
    const headers = [...this.columns.map((item) => item.headerText)];
    const fields = this.columns.map((item) => item.field);
    const rows = this.filteredRows.map((row) =>
      fields.map((field) => `"${String(row?.[field] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    this.downloadBlob('text/csv;charset=utf-8', csv, `${this.resource}-pagina-${this.currentPage}.csv`);
    this.pushToast('info', 'Exportação CSV', 'Página atual exportada com sucesso.');
  }

  maskField(controlName: string): void {
    const control = this.createForm.get(controlName);
    if (!control) {
      return;
    }

    const value = String(control.value ?? '');

    if (controlName === 'document') {
      const digits = value.replace(/\D/g, '').slice(0, 14);
      const masked = digits.length <= 11
        ? digits.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        : digits.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2}\.\d{3})(\d)/, '$1.$2').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
      control.setValue(masked, { emitEvent: false });
    }

    if (controlName === 'phone') {
      const digits = value.replace(/\D/g, '').slice(0, 11);
      const masked = digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
      control.setValue(masked, { emitEvent: false });
    }
  }

  fieldError(controlName: string): string {
    const control = this.createForm.get(controlName);
    if (!control || !control.touched || !control.errors) {
      return '';
    }
    if (control.errors['required']) {
      return 'Campo obrigatório.';
    }
    if (control.errors['email']) {
      return 'Informe um e-mail válido.';
    }
    if (control.errors['pattern']) {
      return 'Formato inválido.';
    }
    if (control.errors['min']) {
      return 'Valor abaixo do mínimo permitido.';
    }
    return 'Valor inválido.';
  }

  dismissToast(id: number): void {
    this.toasts = this.toasts.filter((item) => item.id !== id);
  }

  private configurePage(): void {
    if (this.resource === 'placeholder') {
      this.placeholder = true;
      this.loading = false;
      this.flushView();
      return;
    }

    const token = this.loginService.getToken();
    if (!token) {
      this.redirectToLogin();
      return;
    }

    this.placeholder = false;
    this.loading = true;
    this.rows = [];
    this.filteredRows = [];
    this.planOptions = [];
    this.accountOptions = [];
    this.moduleOptions = [];
    this.supportOptionsLoaded = false;
    this.createForm = this.buildForm();

    const config = this.resourceConfig(token);
    this.columns = config.columns;
    this.sortOptions = config.columns.map((column) => ({ id: column.field, text: column.headerText }));
    this.restoreState(config.sortField);
    this.flushView();
    this.loadSupportOptions();
    this.loadPage();
  }

  private resourceConfig(token: string): ResourceConfig {
    switch (this.resource) {
      case 'accounts':
        return {
          list: (params) => this.adminDataService.accounts(token, params),
          create: (payload) => this.adminDataService.createAccount(token, payload),
          update: (payload) => this.adminDataService.updateAccount(token, payload),
          remove: (id) => this.adminDataService.deleteAccount(token, id),
          sortField: 'code',
          supportsPaging: true,
          columns: [
            { field: 'code', headerText: 'Código', width: 180 },
            { field: 'name', headerText: 'Empresa / Conta', width: 300 },
            { field: 'document', headerText: 'Documento', width: 180 },
            { field: 'email', headerText: 'E-mail', width: 250 },
            { field: 'phone', headerText: 'Telefone', width: 170 },
            { field: 'statusDisplay', headerText: 'Status', width: 140 },
            { field: 'planDisplay', headerText: 'Plano', width: 220 },
            { field: 'storageLimitDisplay', headerText: 'Limite de armazenamento', width: 210 },
            { field: 'storageUsedDisplay', headerText: 'Armazenamento utilizado', width: 210 },
            { field: 'expirationDisplay', headerText: 'Vencimento', width: 150 },
            { field: 'activeDisplay', headerText: 'Situação', width: 130 }
          ]
        };
      case 'plans':
        return {
          list: (params) => this.adminDataService.plans(token, params),
          create: (payload) => this.adminDataService.createPlan(token, payload),
          update: (payload) => this.adminDataService.updatePlan(token, payload),
          remove: (id) => this.adminDataService.deletePlan(token, id),
          sortField: 'name',
          supportsPaging: true,
          columns: [
            { field: 'name', headerText: 'Plano', width: 220 },
            { field: 'description', headerText: 'Descrição', width: 360 },
            { field: 'priceDisplay', headerText: 'Preço', width: 170 },
            { field: 'maxCompaniesDisplay', headerText: 'Máximo de empresas', width: 190 },
            { field: 'maxUsersDisplay', headerText: 'Máximo de usuários', width: 190 },
            { field: 'maxWorksDisplay', headerText: 'Máximo de obras', width: 180 },
            { field: 'maxStorageDisplay', headerText: 'Armazenamento', width: 170 },
            { field: 'activeDisplay', headerText: 'Situação', width: 130 }
          ]
        };
      case 'modules':
        return {
          list: (params) => this.adminDataService.modules(token, params),
          create: (payload) => this.adminDataService.createModule(token, payload),
          update: (payload) => this.adminDataService.updateModule(token, payload),
          remove: (id) => this.adminDataService.deleteModule(token, id),
          sortField: 'name',
          supportsPaging: true,
          columns: [
            { field: 'code', headerText: 'Código', width: 180 },
            { field: 'name', headerText: 'Nome do módulo', width: 260 },
            { field: 'description', headerText: 'Descrição', width: 420 },
            { field: 'activeDisplay', headerText: 'Situação', width: 130 }
          ]
        };
      case 'masterUsers':
        return {
          list: (params) => this.adminDataService.masterUsers(token, params),
          create: (payload) => this.adminDataService.createMasterUser(token, payload),
          update: (payload) => this.adminDataService.updateMasterUser(token, payload),
          remove: (id) => this.adminDataService.deleteMasterUser(token, id),
          sortField: 'name',
          supportsPaging: false,
          columns: [
            { field: 'name', headerText: 'Nome', width: 240 },
            { field: 'login', headerText: 'Login', width: 180 },
            { field: 'email', headerText: 'E-mail', width: 260 },
            { field: 'roleDisplay', headerText: 'Perfil', width: 160 },
            { field: 'phone', headerText: 'Telefone', width: 170 },
            { field: 'activeDisplay', headerText: 'Situação', width: 130 }
          ]
        };
      case 'accountModules':
        return {
          list: (params) => this.adminDataService.accountModules(token, params),
          create: (payload) => this.adminDataService.createAccountModule(token, payload),
          update: (payload) => this.adminDataService.updateAccountModule(token, payload),
          remove: (id) => this.adminDataService.deleteAccountModule(token, id),
          sortField: 'account_name',
          supportsPaging: true,
          columns: [
            { field: 'accountDisplay', headerText: 'Conta', width: 320 },
            { field: 'moduleDisplay', headerText: 'Módulo', width: 280 },
            { field: 'activeDisplay', headerText: 'Situação', width: 130 }
          ]
        };
      default:
        return {
          list: (params) => this.adminDataService.accounts(token, params),
          create: (payload) => this.adminDataService.createAccount(token, payload),
          update: (payload) => this.adminDataService.updateAccount(token, payload),
          remove: (id) => this.adminDataService.deleteAccount(token, id),
          sortField: 'id',
          supportsPaging: true,
          columns: []
        };
    }
  }

  private extractItems<T>(data: T[] | AdminPagedResponse<T> | null | undefined): T[] {
    if (!data) {
      return [];
    }
    return Array.isArray(data) ? data : data.items ?? [];
  }

  private loadSupportOptions(): void {
    if (this.supportOptionsLoaded) {
      return;
    }

    const token = this.loginService.getToken();
    if (!token) {
      return;
    }

    this.supportOptionsLoaded = true;

    if (this.resource === 'accounts' || this.resource === 'accountModules') {
      this.adminDataService.plans(token).subscribe({
        next: (response) => {
          this.planOptions = this.extractItems(response?.data).map((item: any) => ({ id: item.id, text: item.name }));
          this.refreshGridRows();
        }
      });
    }

    if (this.resource === 'accountModules') {
      this.adminDataService.accounts(token).subscribe({
        next: (response) => {
          this.accountOptions = this.extractItems(response?.data).map((item: any) => ({ id: item.id, text: `${item.code} - ${item.name}` }));
          this.refreshGridRows();
        }
      });

      this.adminDataService.modules(token).subscribe({
        next: (response) => {
          this.moduleOptions = this.extractItems(response?.data).map((item: any) => ({ id: item.code, text: `${item.code} - ${item.name}` }));
          this.refreshGridRows();
        }
      });
    }
  }

  private loadPage(): void {
    const token = this.loginService.getToken();
    if (!token) {
      this.redirectToLogin();
      return;
    }

    this.loading = true;
    this.placeholder = false;
    this.persistState();

    const config = this.resourceConfig(token);
    const requestParams = config.supportsPaging === false
      ? {}
      : {
          search: this.appliedSearch,
          sort_field: this.sortField,
          sort_direction: this.sortDirection,
          limit: this.pageSize,
          offset: this.offset
        };

    config.list(requestParams)
      .pipe(finalize(() => {
        this.loading = false;
        this.flushView();
      }))
      .subscribe({
        next: (response) => {
          if (!response?.status) {
            if (this.isAuthenticationFailure(response?.message)) {
              this.redirectToLogin();
              return;
            }

            this.placeholder = true;
            this.placeholderMessage = response?.message || 'Falha ao carregar os dados.';
            this.rows = [];
            this.filteredRows = [];
            this.totalItems = 0;
            this.hasNext = false;
            return;
          }

          const payload = response.data as AdminPagedResponse<any> | any[];
          this.rows = this.extractItems(payload);
          this.filteredRows = this.mapRowsForDisplay(this.rows);
          const pagination = Array.isArray(payload) ? null : payload?.pagination;
          this.totalItems = pagination?.total ?? this.rows.length;
          this.hasNext = pagination?.has_next ?? false;
          this.currentPage = Math.floor(this.offset / this.pageSize) + 1;

          if (config.supportsPaging === false) {
            this.totalItems = this.rows.length;
            this.hasNext = false;
            this.currentPage = 1;
          }

          this.flushView();
        },
        error: (error) => {
          if (this.isAuthenticationFailure(error?.error?.message)) {
            this.redirectToLogin();
            return;
          }

          this.placeholder = true;
          this.placeholderMessage = error?.error?.message || 'Falha na conexão com a base de dados.';
          this.rows = [];
          this.filteredRows = [];
        }
      });
  }

  private mapRowsForDisplay(rows: any[]): any[] {
    return rows.map((row) => {
      if (this.resource === 'accounts') {
        return {
          ...row,
          statusDisplay: this.accountStatusLabel(row.status),
          planDisplay: this.planName(row.plan_id),
          storageLimitDisplay: this.formatStorage(row.storage_limit_mb),
          storageUsedDisplay: this.formatStorage(row.storage_used_mb),
          expirationDisplay: this.formatDate(row.expiration_date),
          activeDisplay: this.activityLabel(row.active)
        };
      }

      if (this.resource === 'plans') {
        return {
          ...row,
          priceDisplay: this.formatCurrency(row.price),
          maxCompaniesDisplay: new Intl.NumberFormat('pt-BR').format(Number(row.max_companies || 0)),
          maxUsersDisplay: new Intl.NumberFormat('pt-BR').format(Number(row.max_users || 0)),
          maxWorksDisplay: new Intl.NumberFormat('pt-BR').format(Number(row.max_works || 0)),
          maxStorageDisplay: this.formatStorage(row.max_storage_mb),
          activeDisplay: this.activityLabel(row.active)
        };
      }

      if (this.resource === 'modules') {
        return {
          ...row,
          activeDisplay: this.activityLabel(row.active)
        };
      }

      if (this.resource === 'masterUsers') {
        return {
          ...row,
          roleDisplay: this.roleLabel(row.role),
          activeDisplay: this.activityLabel(row.active)
        };
      }

      if (this.resource === 'accountModules') {
        return {
          ...row,
          accountDisplay: row.account_name || this.accountName(row.account_id),
          moduleDisplay: row.module_name || this.moduleName(row.module_code),
          activeDisplay: this.activityLabel(row.active)
        };
      }

      return row;
    });
  }

  private formatCurrency(value: any): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value ?? 0));
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

  private formatStorage(value: any): string {
    return `${new Intl.NumberFormat('pt-BR').format(Number(value ?? 0))} MB`;
  }

  private toBoolean(value: any): boolean {
    return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
  }

  private activityLabel(value: any): string {
    return this.toBoolean(value) ? 'Ativo' : 'Inativo';
  }

  private roleLabel(value: any): string {
    const role = String(value ?? '').toLowerCase();
    if (role === 'admin') return 'Administrador';
    if (role === 'manager') return 'Gestor';
    if (role === 'support') return 'Suporte';
    if (role === 'user') return 'Usuário';
    return String(value ?? '-');
  }

  private accountStatusLabel(value: any): string {
    const status = Number(value ?? 0);
    if (status === 1) return 'Ativa';
    if (status === 2) return 'Suspensa';
    if (status === 3) return 'Bloqueada';
    return String(value ?? '-');
  }

  private planName(planId: any): string {
    const option = this.planOptions.find((item) => Number(item.id) === Number(planId));
    return option?.text || `Plano #${planId ?? '-'}`;
  }

  private accountName(accountId: any): string {
    const option = this.accountOptions.find((item) => Number(item.id) === Number(accountId));
    return option?.text || `Conta #${accountId ?? '-'}`;
  }

  private moduleName(moduleCode: any): string {
    const option = this.moduleOptions.find((item) => String(item.id) === String(moduleCode));
    return option?.text?.split(' - ').slice(1).join(' - ') || `Módulo ${moduleCode ?? '-'}`;
  }

  private stateKey(): string {
    return `obrax.admin.${this.resource}.state`;
  }

  private persistState(): void {
    localStorage.setItem(this.stateKey(), JSON.stringify({
      searchTerm: this.searchTerm,
      appliedSearch: this.appliedSearch,
      pageSize: this.pageSize,
      offset: this.offset,
      sortField: this.sortField,
      sortDirection: this.sortDirection
    }));
  }

  private restoreState(defaultSortField: string): void {
    this.sortField = defaultSortField;
    const rawState = localStorage.getItem(this.stateKey());
    if (!rawState) {
      return;
    }

    try {
      const state = JSON.parse(rawState);
      this.searchTerm = state.searchTerm ?? '';
      this.appliedSearch = state.appliedSearch ?? '';
      this.pageSize = Number(state.pageSize ?? 20) || 20;
      this.offset = Number(state.offset ?? 0) || 0;
      this.sortField = state.sortField || defaultSortField;
      this.sortDirection = state.sortDirection === 'asc' ? 'asc' : 'desc';
    } catch {
      this.sortField = defaultSortField;
    }
  }

  private refreshGridRows(): void {
    if (!this.rows.length) {
      return;
    }
    this.filteredRows = this.mapRowsForDisplay(this.rows);
    this.flushView();
  }

  private flushView(): void {
    queueMicrotask(() => {
      window.dispatchEvent(new Event('resize'));
      this.cdr.detectChanges();
    });
  }

  private pushToast(type: 'success' | 'error' | 'info', title: string, message: string): void {
    const id = this.toastSeed++;
    this.toasts = [...this.toasts, { id, type, title, message }];
    setTimeout(() => this.dismissToast(id), 4200);
  }

  private downloadBlob(type: string, content: string, filename: string): void {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  private buildForm(): FormGroup {
    switch (this.resource) {
      case 'accounts':
        return this.fb.group({
          id: [null],
          code: ['', Validators.required],
          name: ['', Validators.required],
          document: ['', [Validators.required, Validators.pattern(/^[0-9./-]{11,18}$/)]],
          phone: [''],
          email: ['', [Validators.required, Validators.email]],
          status: [1, Validators.required],
          plan_id: [null, Validators.required],
          database_url: ['', [Validators.required, Validators.pattern(/^postgres(ql)?:\/\//i)]],
          storage_limit_mb: [2048, [Validators.required, Validators.min(1)]],
          expiration_date: ['2027-12-31', [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
          active: [true]
        });
      case 'plans':
        return this.fb.group({
          id: [null],
          name: ['', Validators.required],
          description: [''],
          price: [0, [Validators.required, Validators.min(0)]],
          max_companies: [1, [Validators.required, Validators.min(1)]],
          max_users: [25, [Validators.required, Validators.min(1)]],
          max_works: [10, [Validators.required, Validators.min(1)]],
          max_storage_mb: [2048, [Validators.required, Validators.min(1)]],
          active: [true]
        });
      case 'modules':
        return this.fb.group({
          id: [null],
          code: ['', Validators.required],
          name: ['', Validators.required],
          description: [''],
          active: [true]
        });
      case 'masterUsers':
        return this.fb.group({
          id: [null],
          name: ['', Validators.required],
          login: ['', Validators.required],
          email: ['', [Validators.required, Validators.email]],
          password: ['', Validators.required],
          phone: [''],
          role: ['admin', Validators.required],
          active: [true]
        });
      case 'accountModules':
        return this.fb.group({
          id: [null],
          account_id: [null, Validators.required],
          module_code: [null, Validators.required],
          active: [true]
        });
      default:
        return this.fb.group({});
    }
  }

  private toFormValue(row: any, mode: DialogMode): Record<string, any> {
    if (this.resource === 'accounts') {
      return {
        id: mode === 'edit' ? row.id : null,
        code: mode === 'duplicate' ? `${row.code}_copy` : row.code,
        name: mode === 'duplicate' ? `${row.name} - Copia` : row.name,
        document: row.document,
        phone: row.phone,
        email: mode === 'duplicate' ? `copy.${row.email}` : row.email,
        status: row.status,
        plan_id: row.plan_id,
        database_url: row.database_url,
        storage_limit_mb: row.storage_limit_mb,
        expiration_date: row.expiration_date,
        active: this.toBoolean(row.active)
      };
    }

    if (this.resource === 'plans') {
      return {
        id: mode === 'edit' ? row.id : null,
        name: mode === 'duplicate' ? `${row.name} Copia` : row.name,
        description: row.description,
        price: row.price,
        max_companies: row.max_companies,
        max_users: row.max_users,
        max_works: row.max_works,
        max_storage_mb: row.max_storage_mb,
        active: this.toBoolean(row.active)
      };
    }

    if (this.resource === 'modules') {
      return {
        id: mode === 'edit' ? row.id : null,
        code: mode === 'duplicate' ? `${row.code}_COPY` : row.code,
        name: mode === 'duplicate' ? `${row.name} Copia` : row.name,
        description: row.description,
        active: this.toBoolean(row.active)
      };
    }

    if (this.resource === 'masterUsers') {
      return {
        id: mode === 'edit' ? row.id : null,
        name: row.name,
        login: mode === 'duplicate' ? `${row.login}_copy` : row.login,
        email: mode === 'duplicate' ? `copy.${row.email}` : row.email,
        password: '',
        phone: row.phone,
        role: row.role,
        active: this.toBoolean(row.active ?? true)
      };
    }

    if (this.resource === 'accountModules') {
      return {
        id: mode === 'edit' ? row.id : null,
        account_id: row.account_id,
        module_code: row.module_code,
        active: this.toBoolean(row.active)
      };
    }

    return row ?? {};
  }

  private createPayload(): Record<string, any> {
    const raw = this.createForm.getRawValue();

    if (this.resource === 'accounts') {
      return {
        ...raw,
        database_host: '',
        database_port: 5432,
        database_name: '',
        database_user: '',
        database_password: '',
        database_sslmode: 'require',
        storage_used_mb: raw.storage_used_mb ?? 0
      };
    }

    if (this.resource === 'masterUsers' && !raw.password) {
      delete raw.password;
    }

    return raw;
  }

  private createRequest(token: string, payload: Record<string, any>): Observable<any> {
    switch (this.resource) {
      case 'accounts': return this.adminDataService.createAccount(token, payload);
      case 'plans': return this.adminDataService.createPlan(token, payload);
      case 'modules': return this.adminDataService.createModule(token, payload);
      case 'masterUsers': return this.adminDataService.createMasterUser(token, payload);
      case 'accountModules': return this.adminDataService.createAccountModule(token, payload);
      default: return this.adminDataService.createModule(token, payload);
    }
  }

  private updateRequest(token: string, payload: Record<string, any>): Observable<any> {
    switch (this.resource) {
      case 'accounts': return this.adminDataService.updateAccount(token, payload);
      case 'plans': return this.adminDataService.updatePlan(token, payload);
      case 'modules': return this.adminDataService.updateModule(token, payload);
      case 'masterUsers': return this.adminDataService.updateMasterUser(token, payload);
      case 'accountModules': return this.adminDataService.updateAccountModule(token, payload);
      default: return this.adminDataService.updateModule(token, payload);
    }
  }

  private deleteRequest(token: string, id: number): Observable<any> {
    switch (this.resource) {
      case 'accounts': return this.adminDataService.deleteAccount(token, id);
      case 'plans': return this.adminDataService.deletePlan(token, id);
      case 'modules': return this.adminDataService.deleteModule(token, id);
      case 'masterUsers': return this.adminDataService.deleteMasterUser(token, id);
      case 'accountModules': return this.adminDataService.deleteAccountModule(token, id);
      default: return this.adminDataService.deleteModule(token, id);
    }
  }

  private isAuthenticationFailure(message?: string): boolean {
    const normalized = String(message ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return normalized.includes('autentic') || normalized.includes('sessao') || normalized.includes('token');
  }

  private redirectToLogin(): void {
    this.loginService.clearToken();
    void this.router.navigate(['/login']);
  }
}


