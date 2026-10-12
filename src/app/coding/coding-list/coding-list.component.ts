import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { CodingService, CodingTaskSummary } from '../../service/coding.service';
import { PermissionService } from '../../service/permission.service';
import { SidebarRefreshService } from '../../service/sidebar-refresh.service';
import { Permission } from '../../models/models.d';

@Component({
  selector: 'app-coding-list',
  templateUrl: './coding-list.component.html',
  styleUrls: ['./coding-list.component.css']
})
export class CodingListComponent implements OnInit {
  tasks: CodingTaskSummary[] = [];
  openMenuId: string | null = null;

  showAddModal = false;
  newName = '';
  adding = false;

  constructor(
    private codingService: CodingService,
    private router: Router,
    private translate: TranslateService,
    private permissionService: PermissionService,
    private sidebarRefreshService: SidebarRefreshService
  ) {}

  get canWrite(): boolean {
    return this.permissionService.hasPermission(Permission.CODING_WRITE);
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.codingService.list().subscribe(list => {
      this.tasks = [...list].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  open(id: string) {
    this.router.navigate(['/coding', id]);
  }

  edit(event: Event, id: string) {
    event.stopPropagation();
    this.openMenuId = null;
    this.router.navigate(['/admin/coding-tasks', id, 'edit']);
  }

  toggleMenu(event: Event, id: string) {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  @HostListener('document:click')
  closeMenu() {
    this.openMenuId = null;
  }

  delete(event: Event, id: string) {
    event.stopPropagation();
    this.openMenuId = null;
    if (confirm(this.translate.instant('CODING.CONFIRM_DELETE'))) {
      this.codingService.delete(id).subscribe(() => {
        this.load();
        this.sidebarRefreshService.notify();
      });
    }
  }

  openAdd() {
    this.newName = '';
    this.showAddModal = true;
  }

  cancelAdd() {
    this.showAddModal = false;
  }

  saveAdd() {
    if (!this.newName.trim() || this.adding) return;
    this.adding = true;
    this.codingService.create(CodingService.blankRequest(this.newName.trim())).subscribe({
      next: id => {
        this.adding = false;
        this.showAddModal = false;
        this.sidebarRefreshService.notify();
        this.router.navigate(['/admin/coding-tasks', id, 'edit']);
      },
      error: () => { this.adding = false; }
    });
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }
}
