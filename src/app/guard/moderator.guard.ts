import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { PermissionService } from '../service/permission.service';

@Injectable({ providedIn: 'root' })
export class ModeratorGuard implements CanActivate {

  constructor(private permissionService: PermissionService, private router: Router) {}

  canActivate(): boolean {
    if (this.permissionService.isStaff()) return true;
    this.router.navigate(['/account']);
    return false;
  }
}
