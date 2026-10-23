import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ArticleService, ArticleSummary } from '../../service/article.service';
import { PermissionService } from '../../service/permission.service';
import { SidebarRefreshService } from '../../service/sidebar-refresh.service';
import { Permission } from '../../models/models.d';

@Component({
  selector: 'app-article-list',
  templateUrl: './article-list.component.html',
  styleUrls: ['./article-list.component.css']
})
export class ArticleListComponent implements OnInit {
  articles: ArticleSummary[] = [];
  openMenuId: string | null = null;

  showAddModal = false;
  newName = '';
  adding = false;

  constructor(
    private articleService: ArticleService,
    private router: Router,
    private translate: TranslateService,
    private permissionService: PermissionService,
    private sidebarRefreshService: SidebarRefreshService
  ) {}

  get canWrite(): boolean {
    return this.permissionService.hasPermission(Permission.ARTICLES_WRITE);
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.articleService.list().subscribe(list => {
      this.articles = [...list].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  open(id: string) {
    this.router.navigate(['/articles', id]);
  }

  edit(event: Event, id: string) {
    event.stopPropagation();
    this.openMenuId = null;
    this.router.navigate(['/admin/articles', id, 'edit']);
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
    if (confirm(this.translate.instant('ARTICLES.CONFIRM_DELETE'))) {
      this.articleService.delete(id).subscribe(() => {
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
    this.articleService.create({ name: this.newName.trim(), content: '', published: false, relatedTestId: null }).subscribe({
      next: id => {
        this.adding = false;
        this.showAddModal = false;
        this.sidebarRefreshService.notify();
        this.router.navigate(['/admin/articles', id, 'edit']);
      },
      error: () => { this.adding = false; }
    });
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }
}
