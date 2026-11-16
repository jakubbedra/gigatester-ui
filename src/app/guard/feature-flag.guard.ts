import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FeatureFlagService } from '../service/feature-flag.service';

/** Blocks a route while its feature flag is off. Set the flag on the route: data: { feature: 'FLAG_KEY' }. */
@Injectable({ providedIn: 'root' })
export class FeatureFlagGuard implements CanActivate {
  constructor(private flags: FeatureFlagService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    return this.flags.isEnabledNow(route.data['feature']).pipe(
      tap(enabled => { if (!enabled) this.router.navigate(['/home']); })
    );
  }
}
