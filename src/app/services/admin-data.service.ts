import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { AdminAccount, AdminAccountModule, AdminMasterUser, AdminModule, AdminPagedResponse, AdminPlan } from '../models/admin-resource';
import { NxResult } from '../models/login';
import * as resources from '../resources';

@Injectable({
  providedIn: 'root'
})
export class AdminDataService {
  private getCache = new Map<string, Observable<any>>();

  constructor(private http: HttpClient) {}

  private queryParams(params: Record<string, any>): string {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });
    const query = search.toString();
    return query ? `?${query}` : '';
  }

  private cachedGet<T>(url: string): Observable<T> {
    const cached = this.getCache.get(url);
    if (cached) {
      return cached as Observable<T>;
    }

    const request$ = this.http.get<T>(url).pipe(shareReplay(1));
    this.getCache.set(url, request$);
    return request$;
  }

  private invalidate(prefixes: string[]): void {
    const keys = Array.from(this.getCache.keys());
    for (const key of keys) {
      if (prefixes.some((prefix) => key.includes(prefix))) {
        this.getCache.delete(key);
      }
    }
  }

  accounts(token: string, params: Record<string, any> = {}): Observable<NxResult<AdminAccount[] | AdminPagedResponse<AdminAccount>>> {
    return this.cachedGet<NxResult<AdminAccount[] | AdminPagedResponse<AdminAccount>>>(`${resources.apiURL}admin/accounts/${token}${this.queryParams(params)}`);
  }

  createAccount(token: string, payload: Partial<AdminAccount> & Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['admin/accounts/', 'admin/account_modules/']);
    return this.http.post<NxResult<any>>(`${resources.apiURL}admin/accounts/${token}`, payload);
  }

  updateAccount(token: string, payload: Partial<AdminAccount> & Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['admin/accounts/', 'admin/account_modules/']);
    return this.http.put<NxResult<any>>(`${resources.apiURL}admin/accounts/${token}`, payload);
  }

  deleteAccount(token: string, id: number): Observable<NxResult<any>> {
    this.invalidate(['admin/accounts/', 'admin/account_modules/']);
    return this.http.delete<NxResult<any>>(`${resources.apiURL}admin/accounts/${token}${this.queryParams({ id })}`);
  }

  plans(token: string, params: Record<string, any> = {}): Observable<NxResult<AdminPlan[] | AdminPagedResponse<AdminPlan>>> {
    return this.cachedGet<NxResult<AdminPlan[] | AdminPagedResponse<AdminPlan>>>(`${resources.apiURL}admin/plans/${token}${this.queryParams(params)}`);
  }

  createPlan(token: string, payload: Partial<AdminPlan> & Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['admin/plans/', 'admin/accounts/']);
    return this.http.post<NxResult<any>>(`${resources.apiURL}admin/plans/${token}`, payload);
  }

  updatePlan(token: string, payload: Partial<AdminPlan> & Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['admin/plans/', 'admin/accounts/']);
    return this.http.put<NxResult<any>>(`${resources.apiURL}admin/plans/${token}`, payload);
  }

  deletePlan(token: string, id: number): Observable<NxResult<any>> {
    this.invalidate(['admin/plans/', 'admin/accounts/']);
    return this.http.delete<NxResult<any>>(`${resources.apiURL}admin/plans/${token}${this.queryParams({ id })}`);
  }

  modules(token: string, params: Record<string, any> = {}): Observable<NxResult<AdminModule[] | AdminPagedResponse<AdminModule>>> {
    return this.cachedGet<NxResult<AdminModule[] | AdminPagedResponse<AdminModule>>>(`${resources.apiURL}admin/modules/${token}${this.queryParams(params)}`);
  }

  createModule(token: string, payload: Partial<AdminModule> & Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['admin/modules/', 'admin/account_modules/']);
    return this.http.post<NxResult<any>>(`${resources.apiURL}admin/modules/${token}`, payload);
  }

  updateModule(token: string, payload: Partial<AdminModule> & Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['admin/modules/', 'admin/account_modules/']);
    return this.http.put<NxResult<any>>(`${resources.apiURL}admin/modules/${token}`, payload);
  }

  deleteModule(token: string, id: number): Observable<NxResult<any>> {
    this.invalidate(['admin/modules/', 'admin/account_modules/']);
    return this.http.delete<NxResult<any>>(`${resources.apiURL}admin/modules/${token}${this.queryParams({ id })}`);
  }

  masterUsers(token: string, params: Record<string, any> = {}): Observable<NxResult<AdminMasterUser[] | AdminPagedResponse<AdminMasterUser>>> {
    return this.cachedGet<NxResult<AdminMasterUser[] | AdminPagedResponse<AdminMasterUser>>>(`${resources.apiURL}admin/master_users/${token}${this.queryParams(params)}`);
  }

  createMasterUser(token: string, payload: Partial<AdminMasterUser> & Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['admin/master_users/']);
    return this.http.post<NxResult<any>>(`${resources.apiURL}admin/master_users/${token}`, payload);
  }

  updateMasterUser(token: string, payload: Partial<AdminMasterUser> & Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['admin/master_users/']);
    return this.http.put<NxResult<any>>(`${resources.apiURL}admin/master_users/${token}`, payload);
  }

  deleteMasterUser(token: string, id: number): Observable<NxResult<any>> {
    this.invalidate(['admin/master_users/']);
    return this.http.delete<NxResult<any>>(`${resources.apiURL}admin/master_users/${token}${this.queryParams({ id })}`);
  }

  accountModules(token: string, params: Record<string, any> = {}): Observable<NxResult<AdminAccountModule[] | AdminPagedResponse<AdminAccountModule>>> {
    return this.cachedGet<NxResult<AdminAccountModule[] | AdminPagedResponse<AdminAccountModule>>>(`${resources.apiURL}admin/account_modules/${token}${this.queryParams(params)}`);
  }

  createAccountModule(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['admin/account_modules/']);
    return this.http.post<NxResult<any>>(`${resources.apiURL}admin/account_modules/${token}`, payload);
  }

  updateAccountModule(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['admin/account_modules/']);
    return this.http.put<NxResult<any>>(`${resources.apiURL}admin/account_modules/${token}`, payload);
  }

  deleteAccountModule(token: string, id: number): Observable<NxResult<any>> {
    this.invalidate(['admin/account_modules/']);
    return this.http.delete<NxResult<any>>(`${resources.apiURL}admin/account_modules/${token}${this.queryParams({ id })}`);
  }

  bootstrapTenant(token: string, accountCode: string, payload: Record<string, any>): Observable<NxResult<any>> {
    const headers = new HttpHeaders({
      'X-Account-Code': accountCode
    });
    return this.http.post<NxResult<any>>(`${resources.apiURL}tenant/bootstrap/${token}`, payload, { headers });
  }

  environment(): Observable<NxResult<any>> {
    return this.cachedGet<NxResult<any>>(`${resources.apiURL}environment`);
  }

  ready(): Observable<NxResult<any>> {
    return this.cachedGet<NxResult<any>>(`${resources.apiURL}ready`);
  }

  securityCheck(): Observable<NxResult<any>> {
    return this.cachedGet<NxResult<any>>(`${resources.apiURL}security-check`);
  }

  routesCatalog(): Observable<NxResult<any>> {
    return this.cachedGet<NxResult<any>>(`${resources.apiURL}routes`);
  }

  smokePlan(): Observable<NxResult<any>> {
    return this.cachedGet<NxResult<any>>(`${resources.apiURL}smoke-plan`);
  }

  catalog(): Observable<NxResult<any>> {
    return this.cachedGet<NxResult<any>>(`${resources.apiURL}catalog`);
  }

  schemaCompatibility(token: string): Observable<NxResult<any>> {
    return this.cachedGet<NxResult<any>>(`${resources.apiURL}admin/schema-compatibility/${token}`);
  }

  migrationsStatus(token: string): Observable<NxResult<any>> {
    return this.cachedGet<NxResult<any>>(`${resources.apiURL}admin/migrations/${token}`);
  }

  applyMigrations(token: string): Observable<NxResult<any>> {
    this.invalidate(['admin/migrations/', 'admin/schema-compatibility/']);
    return this.http.post<NxResult<any>>(`${resources.apiURL}admin/migrations/${token}`, {});
  }

  bootstrapStatus(token: string): Observable<NxResult<any>> {
    return this.cachedGet<NxResult<any>>(`${resources.apiURL}admin/bootstrap/${token}`);
  }

  bootstrapMaster(token: string, payload: Record<string, any>): Observable<NxResult<any>> {
    this.invalidate(['admin/bootstrap/', 'admin/schema-compatibility/', 'admin/migrations/']);
    return this.http.post<NxResult<any>>(`${resources.apiURL}admin/bootstrap/${token}`, payload);
  }
}
