import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { interval } from 'rxjs';
import { CrosswordStateRequest, CrosswordStateResponse, CrosswordStateUpdateRequest } from '../models/models.d';
import { Environment } from '../../../environment';

export interface GenerationJobResponse { jobId: string; }
export interface JobStatusResponse { status: 'PENDING' | 'DONE' | 'FAILED' | 'CANCELLED'; stateId: string; error: string; }

@Injectable({ providedIn: 'root' })
export class CrosswordStateService {

  private readonly baseUrl = Environment.LOCALHOST_BASE_URL + 'api/v1/crossword-states';

  constructor(private http: HttpClient) {}

  getUserCrosswordState(crosswordId: string): Observable<CrosswordStateResponse> {
    return this.http.get<CrosswordStateResponse>(`${this.baseUrl}/by-crossword/${crosswordId}`);
  }

  createCrosswordState(request: CrosswordStateRequest): Observable<CrosswordStateResponse> {
    return this.http.post<CrosswordStateResponse>(this.baseUrl, request);
  }

  getCrosswordState(id: string): Observable<CrosswordStateResponse> {
    return this.http.get<CrosswordStateResponse>(`${this.baseUrl}/${id}`);
  }

  updateCrosswordState(id: string, request: CrosswordStateUpdateRequest): Observable<CrosswordStateResponse> {
    return this.http.put<CrosswordStateResponse>(`${this.baseUrl}/${id}`, request);
  }

  startGeneration(request: CrosswordStateRequest): Observable<GenerationJobResponse> {
    return this.http.post<GenerationJobResponse>(`${this.baseUrl}/generate`, request);
  }

  pollJob(jobId: string): Observable<JobStatusResponse> {
    return interval(1500).pipe(
      switchMap(() => this.http.get<JobStatusResponse>(`${this.baseUrl}/jobs/${jobId}`)),
      filter(r => r.status !== 'PENDING')
    );
  }

  cancelJob(jobId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/jobs/${jobId}`);
  }
}
