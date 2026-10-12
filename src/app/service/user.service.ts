import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from '../../../environment';

export interface UserResponse {
  id: string;
  username: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  type?: 'SELF_REGISTERED' | 'ADMIN_CREATED';
  assignedRoleId?: string | null;
  assignedRoleName?: string | null;
  profilePictureUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class UserService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/users';

  constructor(private http: HttpClient) {}

  findAll(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(this.baseUrl);
  }

  createUser(username: string, password: string): Observable<UserResponse> {
    return this.http.post<UserResponse>(this.baseUrl, { username, password });
  }

  assignRole(id: string, roleId: string | null): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.baseUrl}/${id}/role`, { roleId });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  generatePasswordResetToken(id: string): Observable<string> {
    return this.http.post(`${this.baseUrl}/${id}/password-reset-token`, {}, { responseType: 'text' });
  }
}
