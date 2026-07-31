import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Environment } from '../../../environment';
import { Permission } from '../models/models.d';

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  assignedRoleId?: string | null;
  assignedRoleName?: string | null;
  permissions?: Permission[];
  profilePictureUrl?: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/auth';
  private readonly TOKEN_KEY = 'gt_token';
  private readonly USER_KEY = 'gt_user';

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, { username, password }).pipe(
      tap(res => this.storeSession(res))
    );
  }

  register(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, { username, password }).pipe(
      tap(res => this.storeSession(res))
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getUser(): AuthUser | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  updateStoredUser(user: Partial<AuthUser>): void {
    const current = this.getUser();
    if (current) {
      localStorage.setItem(this.USER_KEY, JSON.stringify({ ...current, ...user }));
    }
  }

  /**
   * Re-fetches the current user (role, assignedRole, permissions) and syncs
   * it into local storage. Permissions are only ever set at login time
   * otherwise, so an admin granting/changing a role while the user is
   * already logged in wouldn't take effect client-side without this — the
   * sidebar calls this periodically so it shows up without a re-login.
   */
  refreshMe(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${Environment.LOCALHOST_BASE_URL}api/v1/users/me`).pipe(
      tap(user => this.updateStoredUser(user))
    );
  }

  private storeSession(res: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, res.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
  }
}
