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
    return stored ? JSON.parse(stored) : null;
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
}
