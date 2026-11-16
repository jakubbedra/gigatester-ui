import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Environment } from '../../../environment';

export interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  defaultValue: boolean;
}

@Injectable({ providedIn: 'root' })
export class FeatureFlagService {

  private readonly base = Environment.LOCALHOST_BASE_URL + 'api/v1/feature-flags';

  private readonly state = new BehaviorSubject<FeatureFlag[] | null>(null);

  /** null until the first load finishes. */
  readonly flags$ = this.state.asObservable();

  constructor(private http: HttpClient) {}

  load(): Observable<FeatureFlag[]> {
    return this.http.get<FeatureFlag[]>(this.base).pipe(
      catchError(() => of([] as FeatureFlag[])),
      tap(flags => this.state.next(flags))
    );
  }

  /** Reactive: emits false until the flags are loaded, then follows every change. */
  isEnabled$(key: string): Observable<boolean> {
    return this.flags$.pipe(map(flags => !!flags?.find(f => f.key === key)?.enabled));
  }

  /** For guards: uses the loaded flags, fetching them first if needed. */
  isEnabledNow(key: string): Observable<boolean> {
    const current = this.state.value;
    const flags$ = current ? of(current) : this.load();
    return flags$.pipe(map(flags => !!flags.find(f => f.key === key)?.enabled));
  }

  set(key: string, enabled: boolean): Observable<FeatureFlag> {
    return this.http.put<FeatureFlag>(`${this.base}/${key}`, { enabled }).pipe(
      tap(updated => {
        const flags = (this.state.value ?? []).map(f => f.key === updated.key ? updated : f);
        this.state.next(flags);
      })
    );
  }
}
