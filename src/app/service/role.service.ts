import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RoleRequest, RoleResponse } from '../models/models.d';
import { Environment } from '../../../environment';

@Injectable({ providedIn: 'root' })
export class RoleService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/roles';

  constructor(private http: HttpClient) {}

  getRoles(): Observable<RoleResponse[]> {
    return this.http.get<RoleResponse[]>(this.baseUrl);
  }

  createRole(request: RoleRequest): Observable<RoleResponse> {
    return this.http.post<RoleResponse>(this.baseUrl, request);
  }

  updateRole(id: string, request: RoleRequest): Observable<RoleResponse> {
    return this.http.put<RoleResponse>(`${this.baseUrl}/${id}`, request);
  }

  deleteRole(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

}
