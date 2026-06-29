import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from '../../../environment';

export interface DailyStatDto {
  date: string;
  testsTaken: number;
  testsPassed: number;
  questionsAnswered: number;
  questionsCorrect: number;
}

export interface ProgressResponse {
  totalTestsTaken: number;
  totalTestsPassed: number;
  totalQuestionsAnswered: number;
  totalQuestionsCorrect: number;
  dailyStats: DailyStatDto[];
}

export interface RankingEntryDto {
  rank: number;
  username: string;
  totalTestsTaken: number;
  totalTestsPassed: number;
  passRate: number;
  totalQuestionsCorrect: number;
}

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private readonly base = Environment.LOCALHOST_BASE_URL + 'api/v1/metrics';

  constructor(private http: HttpClient) {}

  getProgress(): Observable<ProgressResponse> {
    return this.http.get<ProgressResponse>(`${this.base}/progress`);
  }

  getRanking(): Observable<RankingEntryDto[]> {
    return this.http.get<RankingEntryDto[]>(`${this.base}/ranking`);
  }
}
