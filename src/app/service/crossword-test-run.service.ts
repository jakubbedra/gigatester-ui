import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from '../../../environment';

const BASE = Environment.LOCALHOST_BASE_URL + 'api/v1/crosswords';

export interface TestRunTerm {
  id: string;
  clue: string;
  clueType: string;
  term: string;
  termLength: number;
}

export interface StartTestRunResponse {
  terms: TestRunTerm[];
}

export interface TestRunResult {
  id: string;
  wrongTermIds: string[];
  wrongTermCount: number;
  totalTerms: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class CrosswordTestRunService {

  constructor(private http: HttpClient) {}

  startTestRun(crosswordId: string, mode: 'ALL' | 'WRONG_ONLY'): Observable<StartTestRunResponse> {
    return this.http.post<StartTestRunResponse>(`${BASE}/${crosswordId}/test-runs/start`, { mode });
  }

  completeTestRun(crosswordId: string, wrongTermIds: string[], totalTerms: number): Observable<TestRunResult> {
    return this.http.post<TestRunResult>(`${BASE}/${crosswordId}/test-runs/complete`, { wrongTermIds, totalTerms });
  }

  getLatestRun(crosswordId: string): Observable<TestRunResult> {
    return this.http.get<TestRunResult>(`${BASE}/${crosswordId}/test-runs/latest`);
  }
}
