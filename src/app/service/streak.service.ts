import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from '../../../environment';

export interface StreakResponse {
  currentStreak: number;
  longestStreak: number;
}

@Injectable({ providedIn: 'root' })
export class StreakService {
  private readonly base = Environment.LOCALHOST_BASE_URL + 'api/v1/streak';

  constructor(private http: HttpClient) {}

  getStreak(): Observable<StreakResponse> {
    return this.http.get<StreakResponse>(this.base);
  }
}
