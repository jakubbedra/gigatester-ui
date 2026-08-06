import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
  resumedIndex: number;
  resumedWrongTermIds: string[];
}

export interface TestRunResult {
  id: string;
  wrongTermIds: string[];
  wrongTermCount: number;
  totalTerms: number;
  createdAt: string;
}

export interface TestRunProgress {
  mode: 'ALL' | 'WRONG_ONLY';
  currentIndex: number;
  totalTerms: number;
  wrongTermCount: number;
}

@Injectable({ providedIn: 'root' })
export class CrosswordTestRunService {

  constructor(private http: HttpClient) {}

  startTestRun(crosswordId: string, mode: 'ALL' | 'WRONG_ONLY', resume = false): Observable<StartTestRunResponse> {
    return this.http.post<StartTestRunResponse>(`${BASE}/${crosswordId}/test-runs/start`, { mode, resume });
  }

  getInProgressRun(crosswordId: string): Observable<TestRunProgress | null> {
    return this.http.get<TestRunProgress>(`${BASE}/${crosswordId}/test-runs/in-progress`).pipe(
      catchError(() => of(null))
    );
  }

  updateProgress(crosswordId: string, currentIndex: number, wrongTermIds: string[]): Observable<void> {
    return this.http.put<void>(`${BASE}/${crosswordId}/test-runs/progress`, { currentIndex, wrongTermIds });
  }

  completeTestRun(crosswordId: string, wrongTermIds: string[], totalTerms: number): Observable<TestRunResult> {
    return this.http.post<TestRunResult>(`${BASE}/${crosswordId}/test-runs/complete`, { wrongTermIds, totalTerms });
  }

  getLatestRun(crosswordId: string): Observable<TestRunResult> {
    return this.http.get<TestRunResult>(`${BASE}/${crosswordId}/test-runs/latest`);
  }
}
