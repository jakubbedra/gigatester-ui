import { Component, OnInit } from '@angular/core';
import { AccountService, UserResponse } from '../service/account.service';
import { AuthService } from '../service/auth.service';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css']
})
export class AccountComponent implements OnInit {

  user: UserResponse | null = null;

  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';
  passwordError = '';
  passwordSuccess = '';
  passwordLoading = false;

  pictureError = '';
  pictureLoading = false;

  constructor(private accountService: AccountService, private authService: AuthService) {}

  ngOnInit(): void {
    this.accountService.getMe().subscribe(u => this.user = u);
  }

  get displayName(): string {
    if (!this.user) return '';
    return this.user.username === 'admin' ? 'Janusz Pawlacz' : this.user.username;
  }

  get avatarUrl(): string | null {
    return this.user?.profilePictureUrl ?? null;
  }

  changePassword(): void {
    this.passwordError = '';
    this.passwordSuccess = '';
    if (!this.currentPassword || !this.newPassword) {
      this.passwordError = 'Fill in all fields.';
      return;
    }
    if (this.newPassword !== this.confirmNewPassword) {
      this.passwordError = 'New passwords do not match.';
      return;
    }
    this.passwordLoading = true;
    this.accountService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.passwordSuccess = 'Password changed successfully.';
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmNewPassword = '';
        this.passwordLoading = false;
      },
      error: () => {
        this.passwordError = 'Current password is incorrect.';
        this.passwordLoading = false;
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.pictureError = '';
    this.pictureLoading = true;
    this.accountService.uploadProfilePicture(file).subscribe({
      next: (res) => {
        this.user = res;
        this.pictureLoading = false;
      },
      error: () => {
        this.pictureError = 'Upload failed.';
        this.pictureLoading = false;
      }
    });
  }
}
