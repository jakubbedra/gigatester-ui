import { Component, OnInit } from '@angular/core';
import { UserService, UserResponse } from '../../service/user.service';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css']
})
export class UsersListComponent implements OnInit {
  users: UserResponse[] = [];
  loading = true;
  actionInProgress: string | null = null;
  resetLink: string | null = null;
  resetLinkUser: string | null = null;

  constructor(private userService: UserService, private authService: AuthService) {}

  get currentUserId(): string | undefined {
    return this.authService.getUser()?.id;
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.userService.findAll().subscribe(users => {
      this.users = users;
      this.loading = false;
    });
  }

  promote(user: UserResponse) {
    this.actionInProgress = user.id;
    this.userService.promote(user.id).subscribe({
      next: updated => {
        user.role = updated.role;
        this.actionInProgress = null;
      },
      error: () => { this.actionInProgress = null; }
    });
  }

  demote(user: UserResponse) {
    this.actionInProgress = user.id;
    this.userService.demote(user.id).subscribe({
      next: updated => {
        user.role = updated.role;
        this.actionInProgress = null;
      },
      error: () => { this.actionInProgress = null; }
    });
  }

  delete(user: UserResponse) {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    this.actionInProgress = user.id;
    this.userService.delete(user.id).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== user.id);
        this.actionInProgress = null;
      },
      error: () => { this.actionInProgress = null; }
    });
  }

  isCurrentUser(user: UserResponse): boolean {
    return user.id === this.currentUserId;
  }

  generateResetLink(user: UserResponse) {
    this.userService.generatePasswordResetToken(user.id).subscribe(token => {
      this.resetLink = `${window.location.origin}/reset-password?token=${token}`;
      this.resetLinkUser = user.username;
    });
  }

  copyResetLink() {
    if (this.resetLink) navigator.clipboard.writeText(this.resetLink);
  }

  closeResetLink() {
    this.resetLink = null;
    this.resetLinkUser = null;
  }
}
