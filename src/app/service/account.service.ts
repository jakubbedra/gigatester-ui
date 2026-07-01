import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Environment } from '../../../environment';
import { AuthService } from './auth.service';

export interface UserResponse {
  id: string;
  username: string;
  role: string;
  profilePictureUrl: string | null;
  bio: string | null;
}

@Injectable({ providedIn: 'root' })
export class AccountService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/users';

  constructor(private http: HttpClient, private authService: AuthService) {}

  getMe(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/me`);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/me/password`, { currentPassword, newPassword });
  }

  uploadProfilePicture(file: File): Observable<UserResponse> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<UserResponse>(`${this.baseUrl}/me/profile-picture`, form).pipe(
      tap(res => this.authService.updateStoredUser(res))
    );
  }

  updateBio(bio: string): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.baseUrl}/me/bio`, { bio });
  }

  getUserById(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/${id}`);
  }
}
