import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../service/auth.service';
import { LanguageService } from '../../service/language.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  mode: 'login' | 'register' = 'login';
  username = '';
  password = '';
  confirmPassword = '';
  error = '';
  loading = false;

  private returnUrl = '/home';

  constructor(private authService: AuthService, private router: Router, private route: ActivatedRoute, public lang: LanguageService) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
      return;
    }
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] ?? '/home';
  }

  submit(): void {
    this.error = '';
    if (!this.username.trim() || !this.password) {
      this.error = 'Please fill in all fields.';
      return;
    }
    if (this.mode === 'register' && this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    const req = this.mode === 'login'
      ? this.authService.login(this.username, this.password)
      : this.authService.register(this.username, this.password);

    req.subscribe({
      next: () => this.router.navigateByUrl(this.returnUrl),
      error: () => {
        this.error = this.mode === 'login' ? 'Invalid username or password.' : 'Registration failed. Username may already be taken.';
        this.loading = false;
      }
    });
  }

  switchMode(mode: 'login' | 'register'): void {
    this.mode = mode;
    this.error = '';
    this.password = '';
    this.confirmPassword = '';
  }
}
