import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../service/auth.service';

@Injectable({ providedIn: 'root' })
export class ModeratorGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    const role = this.authService.getUser()?.role;
    if (role === 'MODERATOR' || role === 'ADMIN') return true;
    this.router.navigate(['/account']);
    return false;
  }
}
