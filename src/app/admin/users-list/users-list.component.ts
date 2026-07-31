import { Component, HostListener, OnInit } from '@angular/core';
import { UserService, UserResponse } from '../../service/user.service';
import { AuthService } from '../../service/auth.service';
import { RoleService } from '../../service/role.service';
import { RoleResponse } from '../../models/models.d';

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css']
})
export class UsersListComponent implements OnInit {
  users: UserResponse[] = [];
  roles: RoleResponse[] = [];
  loading = true;
  actionInProgress: string | null = null;
  resetLink: string | null = null;
  resetLinkUser: string | null = null;
  userToDelete: UserResponse | null = null;

  assigningRoleTo: UserResponse | null = null;
  selectedRoleId: string | null = null;
  roleDropdownOpen = false;

  constructor(private userService: UserService, private authService: AuthService, private roleService: RoleService) {}

  get currentUserId(): string | undefined {
    return this.authService.getUser()?.id;
  }

  ngOnInit() {
    this.load();
    this.roleService.getRoles().subscribe(roles => { this.roles = roles; });
  }

  load() {
    this.userService.findAll().subscribe(users => {
      this.users = users;
      this.loading = false;
    });
  }

  openAssignRole(user: UserResponse) {
    this.assigningRoleTo = user;
    this.selectedRoleId = user.assignedRoleId ?? null;
    this.roleDropdownOpen = false;
  }

  cancelAssignRole() {
    this.assigningRoleTo = null;
    this.roleDropdownOpen = false;
  }

  toggleRoleDropdown(event: Event) {
    event.stopPropagation();
    this.roleDropdownOpen = !this.roleDropdownOpen;
  }

  @HostListener('document:click')
  closeRoleDropdown() {
    this.roleDropdownOpen = false;
  }

  selectRole(roleId: string | null) {
    this.selectedRoleId = roleId;
    this.roleDropdownOpen = false;
  }

  get selectedRoleName(): string {
    if (!this.selectedRoleId) return '';
    return this.roles.find(r => r.id === this.selectedRoleId)?.name ?? '';
  }

  saveAssignRole() {
    if (!this.assigningRoleTo) return;
    const user = this.assigningRoleTo;
    this.actionInProgress = user.id;
    this.userService.assignRole(user.id, this.selectedRoleId).subscribe({
      next: updated => {
        user.assignedRoleId = updated.assignedRoleId;
        user.assignedRoleName = updated.assignedRoleName;
        this.actionInProgress = null;
        this.assigningRoleTo = null;
      },
      error: () => { this.actionInProgress = null; }
    });
  }

  delete(user: UserResponse) {
    this.userToDelete = user;
  }

  confirmDelete() {
    if (!this.userToDelete) return;
    const user = this.userToDelete;
    this.userToDelete = null;
    this.actionInProgress = user.id;
    this.userService.delete(user.id).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== user.id);
        this.actionInProgress = null;
      },
      error: () => { this.actionInProgress = null; }
    });
  }

  cancelDelete() {
    this.userToDelete = null;
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
