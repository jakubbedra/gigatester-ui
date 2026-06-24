import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from '../../../environment';

export type AccessStatus = 'PENDING' | 'APPROVED' | 'DENIED';

export interface MyAccessStatus {
  groupId: string;
  status: AccessStatus;
}

export interface AccessRequestResponse {
  id: string;
  userId: string;
  username: string;
  groupId: string;
  status: AccessStatus;
}

@Injectable({ providedIn: 'root' })
export class SubjectGroupAccessService {

  private readonly base = Environment.LOCALHOST_BASE_URL + 'api/v1/subject-groups';

  constructor(private http: HttpClient) {}

  requestAccess(groupId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${groupId}/request-access`, {});
  }

  getMyAccess(): Observable<MyAccessStatus[]> {
    return this.http.get<MyAccessStatus[]>(`${this.base}/my-access`);
  }

  getAccessRequests(groupId: string): Observable<AccessRequestResponse[]> {
    return this.http.get<AccessRequestResponse[]>(`${this.base}/${groupId}/access-requests`);
  }

  approve(requestId: string): Observable<void> {
    return this.http.put<void>(`${this.base}/access-requests/${requestId}/approve`, {});
  }

  deny(requestId: string): Observable<void> {
    return this.http.put<void>(`${this.base}/access-requests/${requestId}/deny`, {});
  }

  revoke(requestId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/access-requests/${requestId}`);
  }
}
