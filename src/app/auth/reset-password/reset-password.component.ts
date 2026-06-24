import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Environment } from '../../../../environment';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';
  error = '';
  success = false;
  loading = false;

  constructor(private route: ActivatedRoute, private router: Router, private http: HttpClient) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.error = 'Invalid or missing reset token.';
    }
  }

  submit() {
    this.error = '';
    if (!this.newPassword || this.newPassword.length < 6) {
      this.error = 'Password must be at least 6 characters.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }
    this.loading = true;
    const params = new URLSearchParams({ token: this.token, newPassword: this.newPassword });
    this.http.post(`${Environment.LOCALHOST_BASE_URL}api/v1/auth/reset-password?${params}`, {}).subscribe({
      next: () => { this.success = true; this.loading = false; },
      error: () => { this.error = 'Reset failed. The link may have expired.'; this.loading = false; }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
