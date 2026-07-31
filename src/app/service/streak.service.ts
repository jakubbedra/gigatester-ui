import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from '../../../environment';

export interface StreakResponse {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
}

@Injectable({ providedIn: 'root' })
export class StreakService {
  private readonly base = Environment.LOCALHOST_BASE_URL + 'api/v1/streak';
  private readonly LAST_TOAST_KEY = 'gt_streak_last_toast_date';

  constructor(private http: HttpClient) {}

  getStreak(): Observable<StreakResponse> {
    return this.http.get<StreakResponse>(this.base);
  }

  /**
   * True only the first time (per browser) we observe the streak having been
   * bumped today — repeat completions on the same day, or fetches where the
   * streak was already up to date, don't re-trigger the toast.
   */
  wasJustBumpedToday(streak: StreakResponse): boolean {
    if (!streak.lastActivityDate) return false;
    const today = new Date().toISOString().slice(0, 10);
    if (streak.lastActivityDate !== today) return false;
    if (localStorage.getItem(this.LAST_TOAST_KEY) === today) return false;
    localStorage.setItem(this.LAST_TOAST_KEY, today);
    return true;
  }
}
