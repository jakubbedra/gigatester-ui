import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { GraphService, GraphSummary } from '../../service/graph.service';
import { SidebarRefreshService } from '../../service/sidebar-refresh.service';
import { PermissionService } from '../../service/permission.service';
import { Permission } from '../../models/models.d';

@Component({
  selector: 'app-graphs-list',
  templateUrl: './graphs-list.component.html',
  styleUrls: ['./graphs-list.component.css']
})
export class GraphsListComponent implements OnInit {
  graphs: GraphSummary[] = [];
  openMenuId: string | null = null;

  constructor(
    private graphService: GraphService,
    private router: Router,
    private translate: TranslateService,
    private permissionService: PermissionService,
    private sidebarRefreshService: SidebarRefreshService
  ) {}

  get canWrite(): boolean {
    return this.permissionService.hasPermission(Permission.GRAPHS_WRITE);
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.graphService.getGraphs().subscribe(list => {
      this.graphs = [...list].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  openNew() {
    this.router.navigate(['/admin/graph-lab']);
  }

  edit(id: string) {
    this.router.navigate(['/admin/graph-lab'], { queryParams: { graphId: id } });
  }

  play(event: Event, id: string) {
    event.stopPropagation();
    this.openMenuId = null;
    this.router.navigate(['/graphs/play'], { queryParams: { graphId: id } });
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
    if (confirm(this.translate.instant('TESTS_LIST.CONFIRM_DELETE_GRAPH'))) {
      this.graphService.deleteGraph(id).subscribe(() => {
        this.load();
        this.sidebarRefreshService.notify();
      });
    }
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }
}
