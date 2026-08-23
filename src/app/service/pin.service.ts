import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from '../../../environment';

export type PinnedEntityType = 'TEST' | 'CROSSWORD';

export interface PinResponse {
  entityType: PinnedEntityType;
  entityId: string;
}

@Injectable({ providedIn: 'root' })
export class PinService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/pins';

  constructor(private http: HttpClient) {}

  getPins(): Observable<PinResponse[]> {
    return this.http.get<PinResponse[]>(this.baseUrl);
  }

  pin(entityType: PinnedEntityType, entityId: string): Observable<void> {
    return this.http.post<void>(this.baseUrl, { entityType, entityId });
  }

  unpin(entityType: PinnedEntityType, entityId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${entityType}/${entityId}`);
  }
}
