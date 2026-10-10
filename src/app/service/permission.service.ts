import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Permission } from '../models/models.d';

/**
 * Client-side permission checks, mirroring the backend's Permission.impliedBy
 * semantics (WRITE implies READ; SUBJECTS_WRITE implies everything). These
 * are unscoped (they don't know which subject groups the user owns) — they
 * exist purely to decide what to show in the UI. The backend still enforces
 * the real, group-scoped authorization on every request.
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {

  constructor(private authService: AuthService) {}

  isAdmin(): boolean {
    return this.authService.getUser()?.role === 'ADMIN';
  }

  /** True if the user holds any permission at all (or is admin) — the old "is staff" gate. */
  isStaff(): boolean {
    if (this.isAdmin()) return true;
    const permissions = this.authService.getUser()?.permissions;
    return !!permissions && permissions.length > 0;
  }

  hasPermission(permission: Permission): boolean {
    if (this.isAdmin()) return true;
    const granted = this.authService.getUser()?.permissions ?? [];
    if (granted.includes(permission)) return true;
    if (granted.includes(Permission.SUBJECTS_WRITE)) return true;
    switch (permission) {
      case Permission.SUBJECTS_READ:
        return granted.includes(Permission.SUBJECTS_WRITE);
      case Permission.TESTS_READ:
        return granted.includes(Permission.TESTS_WRITE);
      case Permission.CROSSWORDS_READ:
        return granted.includes(Permission.CROSSWORDS_WRITE);
      case Permission.GRAPHS_READ:
        return granted.includes(Permission.GRAPHS_WRITE);
      default:
        return false;
    }
  }

}
