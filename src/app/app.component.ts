import { Component } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './service/auth.service';
import { LanguageService } from './service/language.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  sidebarOpen = false;
  readonly authRoutes = ['/login', '/reset-password'];
  isLoginPage = true;

  constructor(private router: Router, private authService: AuthService, public lang: LanguageService) {
    this.lang.init();
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      const url = (e.urlAfterRedirects ?? e.url).split('?')[0];
      this.isLoginPage = this.authRoutes.includes(url);
      this.sidebarOpen = false;
    });
  }

  get user() { return this.authService.getUser(); }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar() { this.sidebarOpen = false; }
}
