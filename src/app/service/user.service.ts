import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from '../../../environment';

export interface UserResponse {
  id: string;
  username: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  profilePictureUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class UserService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/users';

  constructor(private http: HttpClient) {}

  findAll(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(this.baseUrl);
  }

  promote(id: string): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.baseUrl}/${id}/promote`, {});
  }

  demote(id: string): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.baseUrl}/${id}/demote`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  generatePasswordResetToken(id: string): Observable<string> {
    return this.http.post(`${this.baseUrl}/${id}/password-reset-token`, {}, { responseType: 'text' });
  }
}
