import { Component, HostListener, OnInit } from '@angular/core';
import { UserService, UserResponse } from '../../service/user.service';
import { AuthService } from '../../service/auth.service';
import { RoleService } from '../../service/role.service';
import { RoleResponse } from '../../models/models.d';
import { SubjectGroupService } from '../../service/subject-group.service';
import { AccessRequestResponse, SubjectGroupAccessService } from '../../service/subject-group-access.service';

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

  // Group membership modal (admin assigns a user to subject groups by hand)
  groupsUser: UserResponse | null = null;
  allGroups: { id: string; name: string }[] = [];
  memberships = new Map<string, AccessRequestResponse>();
  groupsLoading = false;
  groupBusyId: string | null = null;

  openGroups(user: UserResponse) {
    this.groupsUser = user;
    this.groupsLoading = true;
    this.memberships = new Map();
    this.groupAccess.getAllAccessRequests().subscribe({
      next: requests => {
        requests.filter(r => r.userId === user.id)
          .forEach(r => this.memberships.set(r.groupId, r));
      }
    });
    this.groupService.getSubjectGroups().subscribe({
      next: res => {
        this.allGroups = [...res.subjectGroups].sort((a, b) => a.name.localeCompare(b.name));
        this.groupsLoading = false;
      },
      error: () => { this.groupsLoading = false; }
    });
  }

  closeGroups() {
    this.groupsUser = null;
  }

  isMember(groupId: string): boolean {
    return this.memberships.get(groupId)?.status === 'APPROVED';
  }

  isPending(groupId: string): boolean {
    return this.memberships.get(groupId)?.status === 'PENDING';
  }

  toggleMembership(groupId: string) {
    if (!this.groupsUser || this.groupBusyId) return;
    const user = this.groupsUser;
    this.groupBusyId = groupId;
    const existing = this.memberships.get(groupId);
    if (existing?.status === 'APPROVED') {
      this.groupAccess.revoke(existing.id).subscribe({
        next: () => { this.memberships.delete(groupId); this.groupBusyId = null; },
        error: () => { this.groupBusyId = null; }
      });
    } else {
      this.groupAccess.addMember(groupId, user.id).subscribe({
        next: req => { this.memberships.set(groupId, req); this.groupBusyId = null; },
        error: () => { this.groupBusyId = null; }
      });
    }
  }

  // Create-user modal
  showCreateModal = false;
  newUsername = '';
  newPassword = '';
  showNewPassword = false;
  creating = false;
  createError: string | null = null;

  openCreate() {
    this.newUsername = '';
    this.newPassword = '';
    this.showNewPassword = false;
    this.createError = null;
    this.usernameTouched = false;
    this.showCreateModal = true;
  }

  cancelCreate() {
    this.showCreateModal = false;
  }

  usernameTouched = false;

  get usernameInvalid(): boolean {
    return this.usernameTouched && !this.newUsername.trim();
  }

  get passwordLengthOk(): boolean {
    return this.newPassword.length >= 6;
  }

  /** 0 = empty, 1 = weak, 2 = okay, 3 = strong. Purely a hint; only the length is enforced. */
  get passwordStrength(): number {
    const p = this.newPassword;
    if (!p) return 0;
    if (p.length < 6) return 1;
    const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(p)).length;
    if (p.length >= 10 && variety >= 3) return 3;
    if (p.length >= 8 && variety >= 2) return 2;
    return 1;
  }

  get passwordStrengthKey(): string {
    return ['', 'USERS.STRENGTH_WEAK', 'USERS.STRENGTH_OK', 'USERS.STRENGTH_STRONG'][this.passwordStrength];
  }

  get canCreate(): boolean {
    return !!this.newUsername.trim() && this.newPassword.length >= 6 && !this.creating;
  }

  saveCreate() {
    if (!this.canCreate) return;
    this.creating = true;
    this.createError = null;
    this.userService.createUser(this.newUsername.trim(), this.newPassword).subscribe({
      next: user => {
        this.creating = false;
        this.showCreateModal = false;
        this.users = [...this.users, user].sort((a, b) => a.username.localeCompare(b.username));
      },
      error: err => {
        this.creating = false;
        this.createError = err?.status === 409 ? 'USERS.USERNAME_TAKEN' : 'USERS.CREATE_FAILED';
      }
    });
  }

  constructor(private userService: UserService, private authService: AuthService, private roleService: RoleService,
              private groupService: SubjectGroupService, private groupAccess: SubjectGroupAccessService) {}

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
