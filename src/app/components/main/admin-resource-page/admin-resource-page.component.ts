import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule, CheckBoxModule } from '@syncfusion/ej2-angular-buttons';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { GridModule, ResizeService, SortService } from '@syncfusion/ej2-angular-grids';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { DialogComponent, DialogModule } from '@syncfusion/ej2-angular-popups';
import { finalize, Observable } from 'rxjs';
import { AdminPagedResponse } from '../../../models/admin-resource';
import { AdminDataService } from '../../../services/admin-data.service';
import { LoginService } from '../../../services/login.service';

type DialogMode = 'create' | 'edit' | 'duplicate';

type ResourceConfig = {
  columns: Array<{ field: string; headerText: string; width?: number }>;
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
  imports: [CommonModule, GridModule, ReactiveFormsModule, TextBoxModule, DialogModule, ButtonModule, DropDownListModule, CheckBoxModule],
  providers: [ResizeService, SortService],
  templateUrl: './admin-resource-page.component.html',
  styleUrl: './admin-resource-page.component.scss'
})
export class AdminResourcePageComponent {
  @ViewChild('createDialog') createDialog!: DialogComponent;

  title = 'Gestao';
  subtitle = '';
  resource = 'placeholder';
  rows: any[] = [];
  filteredRows: any[] = [];
  columns: Array<{ field: string; headerText: string; width?: number }> = [];
  loading = true;
  saving = false;
  placeholder = false;
  placeholderMessage = 'Modulo em preparacao.';
  dialogMessage = '';
  createForm!: FormGroup;
  searchTerm = '';
  appliedSearch = '';
  pageSize = 20;
  offset = 0;
  currentPage = 1;
  totalItems = 0;
  sortField = 'created_at';
  sortDirection: 'asc' | 'desc' = 'desc';
  hasNext = false;
  returnedCount = 0;
  dialogMode: DialogMode = 'create';
  editingRow: any = null;
  planOptions: any[] = [];
  accountOptions: any[] = [];
  moduleOptions: any[] = [];
  supportOptionsLoaded = false;
  toasts: Array<{ id: number; type: 'success' | 'error' | 'info'; title: string; message: string }> = [];
  roleOptions = [
    { id: 'admin', text: 'Administrador' },
    { id: 'manager', text: 'Gestor' },
    { id: 'support', text: 'Suporte' }
  ];
  pageSizeOptions = [
    { id: 10, text: '10 por pagina' },
    { id: 20, text: '20 por pagina' },
    { id: 50, text: '50 por pagina' }
  ];
  sortOptions: Array<{ id: string; text: string }> = [];
  sortDirectionOptions = [
    { id: 'desc', text: 'Decrescente' },
    { id: 'asc', text: 'Crescente' }
  ];

  constructor(
    private route: ActivatedRoute,
    private loginService: LoginService,
    private adminDataService: AdminDataService,
    private fb: FormBuilder
  ) {}

  private toastSeed = 1;

  ngOnInit(): void {
    this.title = this.route.snapshot.data['title'] ?? 'Gestao';
    this.subtitle = this.route.snapshot.data['subtitle'] ?? '';
    this.resource = this.route.snapshot.data['resource'] ?? 'placeholder';

    if (this.resource === 'placeholder') {
      this.placeholder = true;
      this.loading = false;
      return;
    }

    const token = this.loginService.getToken();
    if (!token) {
      this.placeholder = true;
      this.placeholderMessage = 'Sessao master nao encontrada.';
      this.loading = false;
      return;
    }

    this.createForm = this.buildForm();
    const config = this.resourceConfig(token);
    this.columns = config.columns;
    this.sortOptions = config.columns.map((column) => ({
      id: column.field,
      text: column.headerText
    }));

    this.restoreState(config.sortField);
    this.loadPage();
  }

  private stateKey(): string {
    return `obrax.admin.${this.resource}.state`;
  }

  private persistState(): void {
    localStorage.setItem(
      this.stateKey(),
      JSON.stringify({
        searchTerm: this.searchTerm,
        appliedSearch: this.appliedSearch,
        pageSize: this.pageSize,
        offset: this.offset,
        sortField: this.sortField,
        sortDirection: this.sortDirection
      })
    );
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

  private extractItems<T>(data: T[] | AdminPagedResponse<T> | null | undefined): T[] {
    if (!data) {
      return [];
    }
    return Array.isArray(data) ? data : data.items ?? [];
  }

  private resourceConfig(token: string): ResourceConfig {
    switch (this.resource) {
      case 'accounts':
        return {
          list: (params) => this.adminDataService.accounts(token, params),
          create: (payload) => this.adminDataService.createAccount(token, payload),
          update: (payload) => this.adminDataService.updateAccount(token, payload),
          remove: (id) => this.adminDataService.deleteAccount(token, id),
          sortField: 'id',
          supportsPaging: true,
          columns: [
            { field: 'code', headerText: 'Codigo', width: 110 },
            { field: 'name', headerText: 'Conta', width: 220 },
            { field: 'document', headerText: 'Documento', width: 150 },
            { field: 'email', headerText: 'Email', width: 220 },
            { field: 'expiration_date', headerText: 'Expiracao', width: 130 }
          ]
        };
      case 'plans':
        return {
          list: (params) => this.adminDataService.plans(token, params),
          create: (payload) => this.adminDataService.createPlan(token, payload),
          update: (payload) => this.adminDataService.updatePlan(token, payload),
          remove: (id) => this.adminDataService.deletePlan(token, id),
          sortField: 'id',
          supportsPaging: true,
          columns: [
            { field: 'name', headerText: 'Plano', width: 220 },
            { field: 'description', headerText: 'Descricao', width: 260 },
            { field: 'price', headerText: 'Preco', width: 120 },
            { field: 'max_users', headerText: 'Usuarios', width: 110 },
            { field: 'max_storage_mb', headerText: 'Armazenamento MB', width: 160 }
          ]
        };
      case 'modules':
        return {
          list: (params) => this.adminDataService.modules(token, params),
          create: (payload) => this.adminDataService.createModule(token, payload),
          update: (payload) => this.adminDataService.updateModule(token, payload),
          remove: (id) => this.adminDataService.deleteModule(token, id),
          sortField: 'id',
          supportsPaging: true,
          columns: [
            { field: 'code', headerText: 'Codigo', width: 120 },
            { field: 'name', headerText: 'Nome', width: 220 },
            { field: 'description', headerText: 'Descricao', width: 280 }
          ]
        };
      case 'masterUsers':
        return {
          list: (params) => this.adminDataService.masterUsers(token, params),
          create: (payload) => this.adminDataService.createMasterUser(token, payload),
          update: (payload) => this.adminDataService.updateMasterUser(token, payload),
          remove: (id) => this.adminDataService.deleteMasterUser(token, id),
          sortField: 'id',
          supportsPaging: false,
          columns: [
            { field: 'name', headerText: 'Nome', width: 220 },
            { field: 'login', headerText: 'Login', width: 150 },
            { field: 'email', headerText: 'Email', width: 220 },
            { field: 'role', headerText: 'Perfil', width: 120 }
          ]
        };
      case 'accountModules':
        return {
          list: (params) => this.adminDataService.accountModules(token, params),
          create: (payload) => this.adminDataService.createAccountModule(token, payload),
          update: (payload) => this.adminDataService.updateAccountModule(token, payload),
          remove: (id) => this.adminDataService.deleteAccountModule(token, id),
          sortField: 'id',
          supportsPaging: true,
          columns: [
            { field: 'account_name', headerText: 'Conta', width: 220 },
            { field: 'module_code', headerText: 'Modulo', width: 140 },
            { field: 'module_name', headerText: 'Nome do modulo', width: 220 },
            { field: 'active', headerText: 'Ativo', width: 90 }
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

  private loadSupportOptions(token: string): void {
    this.supportOptionsLoaded = true;
    if (this.resource === 'accounts' || this.resource === 'accountModules') {
      this.adminDataService.plans(token).subscribe({
        next: (response) => {
          this.planOptions = this.extractItems(response.data).map((item: any) => ({ id: item.id, text: item.name }));
        }
      });
    }

    if (this.resource === 'accountModules') {
      this.adminDataService.accounts(token).subscribe({
        next: (response) => {
          this.accountOptions = this.extractItems(response.data).map((item: any) => ({ id: item.id, text: `${item.code} - ${item.name}` }));
        }
      });
      this.adminDataService.modules(token).subscribe({
        next: (response) => {
          this.moduleOptions = this.extractItems(response.data).map((item: any) => ({ id: item.code, text: `${item.code} - ${item.name}` }));
        }
      });
    }
  }

  private ensureSupportOptionsLoaded(): void {
    if (this.supportOptionsLoaded) {
      return;
    }

    const token = this.loginService.getToken();
    if (!token) {
      return;
    }

    this.loadSupportOptions(token);
  }

  private loadPage(): void {
    const token = this.loginService.getToken();
    if (!token) {
      return;
    }

    this.loading = true;
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
    config
      .list(requestParams)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          const payload = response.data as AdminPagedResponse<any> | any[];
          this.rows = this.extractItems(payload);
          this.filteredRows = [...this.rows];
          const pagination = !Array.isArray(payload) ? payload?.pagination : null;
          this.returnedCount = pagination?.returned ?? this.rows.length;
          this.totalItems = pagination?.total ?? this.rows.length;
          this.hasNext = pagination?.has_next ?? false;
          this.currentPage = Math.floor(this.offset / this.pageSize) + 1;
          if (config.supportsPaging === false) {
            this.returnedCount = this.rows.length;
            this.totalItems = this.rows.length;
            this.hasNext = false;
            this.currentPage = 1;
          }
        },
        error: (error: any) => {
          this.placeholder = true;
          this.placeholderMessage = error?.error?.message || 'Falha ao carregar dados administrativos.';
        }
      });
  }

  openCreateDialog(): void {
    this.ensureSupportOptionsLoaded();
    this.dialogMode = 'create';
    this.editingRow = null;
    this.createForm = this.buildForm();
    this.dialogMessage = '';
    this.createDialog.show();
  }

  openEditDialog(row: any): void {
    this.ensureSupportOptionsLoaded();
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
    this.ensureSupportOptionsLoaded();
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
      this.dialogMessage = 'Sessao master nao encontrada.';
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
            this.dialogMessage = response.message || 'Falha ao salvar registro.';
            this.pushToast('error', 'Falha ao salvar', this.dialogMessage);
            return;
          }

          this.pushToast('success', this.dialogMode === 'edit' ? 'Registro atualizado' : 'Registro salvo', response.message || 'Operação concluída com sucesso.');
          this.closeCreateDialog();
          this.loadPage();
        },
        error: (error) => {
          this.dialogMessage = error?.error?.message || 'Nao foi possivel salvar o registro.';
          this.pushToast('error', 'Erro de operação', this.dialogMessage);
        }
      });
  }

  deleteRow(row: any): void {
    const token = this.loginService.getToken();
    if (!token) {
      return;
    }

    const confirmed = confirm(`Deseja remover este registro de ${this.title.toLowerCase()}?`);
    if (!confirmed) {
      return;
    }

    this.loading = true;
    this.deleteRequest(token, row?.id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          if (!response.status) {
            this.placeholder = true;
            this.placeholderMessage = response.message || 'Falha ao excluir registro.';
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
          this.placeholder = true;
          this.placeholderMessage = error?.error?.message || 'Nao foi possivel excluir o registro.';
          this.pushToast('error', 'Erro de exclusão', this.placeholderMessage);
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

  changeSortDirection(direction: 'asc' | 'desc'): void {
    this.sortDirection = direction;
    this.offset = 0;
    this.loadPage();
  }

  totalRowsLabel(): string {
    const start = this.rows.length ? this.offset + 1 : 0;
    const end = this.offset + this.rows.length;
    return `${start}-${end} de ${this.totalItems} registros`;
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
      return 'Você não pode remover sua própria sessão master.';
    }
    if (this.resource === 'modules' && ['DIARY', 'PRODUCTION', 'AUDIT'].includes(String(row?.code || '').toUpperCase())) {
      return 'Módulos base da plataforma não devem ser removidos visualmente.';
    }
    return '';
  }

  exportJson(): void {
    this.downloadBlob('application/json', JSON.stringify(this.rows, null, 2), `${this.resource}-page-${this.currentPage}.json`);
    this.pushToast('info', 'Exportação JSON', 'Página atual exportada com sucesso.');
  }

  exportCsv(): void {
    const headers = this.columns.map((item) => item.field);
    const rows = this.rows.map((row) =>
      headers
        .map((header) => `"${String(row?.[header] ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    this.downloadBlob('text/csv;charset=utf-8', csv, `${this.resource}-page-${this.currentPage}.csv`);
    this.pushToast('info', 'Exportação CSV', 'Página atual exportada com sucesso.');
  }

  maskField(controlName: string): void {
    const control = this.createForm.get(controlName);
    const value = String(control?.value ?? '');
    if (!control) {
      return;
    }
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
        name: mode === 'duplicate' ? `${row.name} - Cópia` : row.name,
        document: row.document,
        phone: row.phone,
        email: mode === 'duplicate' ? `copy.${row.email}` : row.email,
        status: row.status,
        plan_id: row.plan_id,
        database_url: row.database_url,
        storage_limit_mb: row.storage_limit_mb,
        expiration_date: row.expiration_date,
        active: row.active
      };
    }

    if (this.resource === 'plans') {
      return {
        id: mode === 'edit' ? row.id : null,
        name: mode === 'duplicate' ? `${row.name} Copy` : row.name,
        description: row.description,
        price: row.price,
        max_companies: row.max_companies,
        max_users: row.max_users,
        max_works: row.max_works,
        max_storage_mb: row.max_storage_mb,
        active: row.active
      };
    }

    if (this.resource === 'modules') {
      return {
        id: mode === 'edit' ? row.id : null,
        code: mode === 'duplicate' ? `${row.code}_COPY` : row.code,
        name: mode === 'duplicate' ? `${row.name} Copy` : row.name,
        description: row.description,
        active: row.active
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
        active: row.active ?? true
      };
    }

    if (this.resource === 'accountModules') {
      return {
        id: mode === 'edit' ? row.id : null,
        account_id: row.account_id,
        module_code: row.module_code,
        active: row.active
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
      case 'accounts':
        return this.adminDataService.createAccount(token, payload);
      case 'plans':
        return this.adminDataService.createPlan(token, payload);
      case 'modules':
        return this.adminDataService.createModule(token, payload);
      case 'masterUsers':
        return this.adminDataService.createMasterUser(token, payload);
      case 'accountModules':
        return this.adminDataService.createAccountModule(token, payload);
      default:
        return this.adminDataService.createModule(token, payload);
    }
  }

  private updateRequest(token: string, payload: Record<string, any>): Observable<any> {
    switch (this.resource) {
      case 'accounts':
        return this.adminDataService.updateAccount(token, payload);
      case 'plans':
        return this.adminDataService.updatePlan(token, payload);
      case 'modules':
        return this.adminDataService.updateModule(token, payload);
      case 'masterUsers':
        return this.adminDataService.updateMasterUser(token, payload);
      case 'accountModules':
        return this.adminDataService.updateAccountModule(token, payload);
      default:
        return this.adminDataService.updateModule(token, payload);
    }
  }

  private deleteRequest(token: string, id: number): Observable<any> {
    switch (this.resource) {
      case 'accounts':
        return this.adminDataService.deleteAccount(token, id);
      case 'plans':
        return this.adminDataService.deletePlan(token, id);
      case 'modules':
        return this.adminDataService.deleteModule(token, id);
      case 'masterUsers':
        return this.adminDataService.deleteMasterUser(token, id);
      case 'accountModules':
        return this.adminDataService.deleteAccountModule(token, id);
      default:
        return this.adminDataService.deleteModule(token, id);
    }
  }
}
