import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MasterLoginData, MasterLoginPayload, NxResult, StoredSession } from '../models/login';
import * as resources from '../resources';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  constructor(private http: HttpClient) {}

  private decodePayload(token: string): Record<string, any> | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) {
        return null;
      }

      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '='));
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.decodePayload(token);
    const exp = Number(payload?.['exp'] ?? 0);
    if (!exp) {
      return true;
    }
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return exp <= nowInSeconds;
  }

  masterLogin(payload: MasterLoginPayload): Observable<NxResult<MasterLoginData>> {
    return this.http.post<NxResult<MasterLoginData>>(`${resources.apiURL}auth/master/login/`, payload);
  }

  session(token: string): Observable<NxResult<any>> {
    return this.http.get<NxResult<any>>(`${resources.apiURL}session/${token}`);
  }

  featureMap(token: string): Observable<NxResult<any>> {
    return this.http.get<NxResult<any>>(`${resources.apiURL}feature-map/${token}`);
  }

  saveLocalToken(data: StoredSession): void {
    localStorage.setItem(resources.sessionStorageKey, JSON.stringify(data));
  }

  getLocalToken(): StoredSession | null {
    const stored = localStorage.getItem(resources.sessionStorageKey);
    if (!stored) {
      return null;
    }

    try {
      const parsed = JSON.parse(stored) as StoredSession;
      if (!parsed?.token || this.isTokenExpired(parsed.token)) {
        this.clearToken();
        return null;
      }
      return parsed;
    } catch {
      this.clearToken();
      return null;
    }
  }

  getToken(): string {
    return this.getLocalToken()?.token ?? '';
  }

  clearToken(): void {
    localStorage.removeItem(resources.sessionStorageKey);
  }

  isAuthenticated(): boolean {
    return this.getToken().trim().length > 0;
  }

  isAuthenticationError(message?: string): boolean {
    const normalized = String(message ?? '').toLowerCase();
    return normalized.includes('autenticação') || normalized.includes('autenticacao') || normalized.includes('token');
  }
}
