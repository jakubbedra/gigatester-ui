import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from '../../../environment';

export interface DailyStatDto {
  date: string;
  testsTaken: number;
  testsPassed: number;
  questionsAnswered: number;
  questionsCorrect: number;
}

export interface TestSummaryForMetricsDto {
  id: string;
  name: string;
}

export interface TagAccuracyDto {
  tagId: string;
  tagKey: string;
  timesAnswered: number;
  timesCorrect: number;
  accuracy: number;
}

export interface ProgressResponse {
  totalTestsTaken: number;
  totalTestsPassed: number;
  totalQuestionsAnswered: number;
  totalQuestionsCorrect: number;
  dailyStats: DailyStatDto[];
  myTests: TestSummaryForMetricsDto[];
  tagStats: TagAccuracyDto[];
}

export interface RankingEntryDto {
  rank: number;
  userId: string;
  username: string;
  totalTestsTaken: number;
  totalTestsPassed: number;
  passRate: number;
  totalQuestionsCorrect: number;
  currentStreak: number;
}

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private readonly base = Environment.LOCALHOST_BASE_URL + 'api/v1/metrics';

  constructor(private http: HttpClient) {}

  getProgress(testId?: string): Observable<ProgressResponse> {
    let params = new HttpParams();
    if (testId) params = params.set('testId', testId);
    return this.http.get<ProgressResponse>(`${this.base}/progress`, { params });
  }

  getRanking(testId?: string, sortBy?: string): Observable<RankingEntryDto[]> {
    let params = new HttpParams();
    if (testId) params = params.set('testId', testId);
    if (sortBy) params = params.set('sortBy', sortBy);
    return this.http.get<RankingEntryDto[]>(`${this.base}/ranking`, { params });
  }
}
