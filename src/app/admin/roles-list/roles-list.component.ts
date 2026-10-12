import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RoleService } from '../../service/role.service';
import { Permission, RoleResponse } from '../../models/models.d';

interface PermissionGroup {
  label: string;
  icon: string;
  read: Permission;
  write: Permission;
}

@Component({
  selector: 'app-roles-list',
  templateUrl: './roles-list.component.html',
  styleUrls: ['./roles-list.component.css']
})
export class RolesListComponent implements OnInit {
  roles: RoleResponse[] = [];
  loading = true;
  saving = false;

  readonly permissionGroups: PermissionGroup[] = [
    { label: 'Subjects', icon: '📚', read: Permission.SUBJECTS_READ, write: Permission.SUBJECTS_WRITE },
    { label: 'Tests', icon: '📝', read: Permission.TESTS_READ, write: Permission.TESTS_WRITE },
    { label: 'Crosswords', icon: '🔠', read: Permission.CROSSWORDS_READ, write: Permission.CROSSWORDS_WRITE },
    { label: 'Graphs', icon: '🕸️', read: Permission.GRAPHS_READ, write: Permission.GRAPHS_WRITE },
    { label: 'Coding tasks', icon: '💻', read: Permission.CODING_READ, write: Permission.CODING_WRITE },
  ];

  private readonly impliedReadByWrite: Partial<Record<Permission, Permission>> = {
    [Permission.SUBJECTS_READ]: Permission.SUBJECTS_WRITE,
    [Permission.TESTS_READ]: Permission.TESTS_WRITE,
    [Permission.CROSSWORDS_READ]: Permission.CROSSWORDS_WRITE,
    [Permission.GRAPHS_READ]: Permission.GRAPHS_WRITE,
    [Permission.CODING_READ]: Permission.CODING_WRITE,
  };

  showEditModal = false;
  editingRole: RoleResponse | null = null;
  editName = '';
  editPermissions = new Set<Permission>();

  roleToDelete: RoleResponse | null = null;
  deleteError: string | null = null;

  constructor(private roleService: RoleService, private router: Router) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.roleService.getRoles().subscribe(roles => {
      this.roles = roles;
      this.loading = false;
    });
  }

  openCreate() {
    this.editingRole = null;
    this.editName = '';
    this.editPermissions = new Set<Permission>();
    this.showEditModal = true;
  }

  openEdit(role: RoleResponse) {
    this.editingRole = role;
    this.editName = role.name;
    this.editPermissions = new Set(role.permissions);
    this.showEditModal = true;
  }

  closeEdit() {
    this.showEditModal = false;
  }

  togglePermission(permission: Permission) {
    if (this.isImplied(permission)) return;
    if (this.editPermissions.has(permission)) {
      this.editPermissions.delete(permission);
    } else {
      this.editPermissions.add(permission);
    }
  }

  /** Explicitly granted or implicitly covered (WRITE implies READ; SUBJECTS_WRITE implies everything). */
  isChecked(permission: Permission): boolean {
    return this.editPermissions.has(permission) || this.isImplied(permission);
  }

  /** Granted only because a broader permission covers it — not itself explicitly set, so not directly togglable. */
  isImplied(permission: Permission): boolean {
    if (this.editPermissions.has(permission)) return false;
    if (permission !== Permission.SUBJECTS_WRITE && this.editPermissions.has(Permission.SUBJECTS_WRITE)) return true;
    const impliedByWrite = this.impliedReadByWrite[permission];
    return !!impliedByWrite && this.editPermissions.has(impliedByWrite);
  }

  save() {
    const name = this.editName.trim();
    if (!name) return;
    this.saving = true;
    const request = { name, permissions: Array.from(this.editPermissions) };
    const save$ = this.editingRole
      ? this.roleService.updateRole(this.editingRole.id, request)
      : this.roleService.createRole(request);
    save$.subscribe({
      next: () => {
        this.saving = false;
        this.showEditModal = false;
        this.load();
      },
      error: () => { this.saving = false; }
    });
  }

  confirmDelete(role: RoleResponse) {
    this.roleToDelete = role;
    this.deleteError = null;
  }

  cancelDelete() {
    this.roleToDelete = null;
  }

  deleteRole() {
    if (!this.roleToDelete) return;
    const role = this.roleToDelete;
    this.roleService.deleteRole(role.id).subscribe({
      next: () => {
        this.roles = this.roles.filter(r => r.id !== role.id);
        this.roleToDelete = null;
      },
      error: () => {
        this.deleteError = 'Failed to delete role.';
      }
    });
  }

  permissionLabel(permission: Permission): string {
    return permission.replace('_', ' ');
  }

  back() {
    this.router.navigate(['/admin/users']);
  }
}
