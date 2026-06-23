import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CrosswordStateRequest, CrosswordStateResponse, CrosswordStateUpdateRequest } from '../models/models.d';
import { Environment } from '../../../environment';

@Injectable({ providedIn: 'root' })
export class CrosswordStateService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/crossword-states';

  constructor(private http: HttpClient) {}

  createCrosswordState(request: CrosswordStateRequest): Observable<CrosswordStateResponse> {
    return this.http.post<CrosswordStateResponse>(this.baseUrl, request);
  }

  getCrosswordState(id: string): Observable<CrosswordStateResponse> {
    return this.http.get<CrosswordStateResponse>(`${this.baseUrl}/${id}`);
  }

  updateCrosswordState(id: string, request: CrosswordStateUpdateRequest): Observable<CrosswordStateResponse> {
    return this.http.put<CrosswordStateResponse>(`${this.baseUrl}/${id}`, request);
  }

}
