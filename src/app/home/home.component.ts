import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { SubjectGroupService } from '../service/subject-group.service';
import { SubjectsService } from '../service/subject.service';
import { AuthService } from '../service/auth.service';
import { SubjectGroupAccessService, AccessStatus, AccessRequestResponse } from '../service/subject-group-access.service';
import { SubjectGroupResponse, SubjectSummaryResponse } from '../models/models.d';

interface GroupCard {
  id: string;
  name: string;
  subjects: SubjectSummaryResponse[];
  accessStatus: AccessStatus | null; // null = no request yet
  pendingRequests?: AccessRequestResponse[];
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  groups: GroupCard[] = [];
  allSubjects: SubjectSummaryResponse[] = [];
  loading = true;
  openMenuId: string | null = null;

  showEditModal = false;
  editingGroup: SubjectGroupResponse | null = null;
  editName = '';
  editSubjectIds: string[] = [];
  saving = false;
  subjectSearch = '';

  showAddModal = false;
  newGroupName = '';
  adding = false;

  showRequestsModal = false;
  requestsGroup: GroupCard | null = null;
  requestsLoading = false;

  requestingGroupId: string | null = null;

  constructor(
    private subjectGroupService: SubjectGroupService,
    private subjectsService: SubjectsService,
    private accessService: SubjectGroupAccessService,
    private authService: AuthService,
    private router: Router
  ) {}

  get canModify(): boolean {
    const role = this.authService.getUser()?.role;
    return role === 'MODERATOR' || role === 'ADMIN';
  }

  get isAdmin(): boolean {
    return this.authService.getUser()?.role === 'ADMIN';
  }

  canAccessGroup(group: GroupCard): boolean {
    if (this.canModify) return true;
    return group.accessStatus === 'APPROVED';
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    const subjects$ = this.subjectsService.getSubjects();
    const groups$ = subjects$.pipe(
      switchMap(subjectsRes => {
        this.allSubjects = subjectsRes.subjects;
        return this.subjectGroupService.getSubjectGroups();
      }),
      switchMap(groupsRes => {
        if (groupsRes.subjectGroups.length === 0) return of([]);
        return forkJoin(groupsRes.subjectGroups.map(g => this.subjectGroupService.getSubjectGroup(g.id)));
      })
    );

    const access$ = this.canModify ? of([]) : this.accessService.getMyAccess();

    forkJoin([groups$, access$]).subscribe(([details, accessStatuses]: [SubjectGroupResponse[], any[]]) => {
      const statusMap = new Map<string, AccessStatus>(
        accessStatuses.map((a: any) => [a.groupId, a.status])
      );
      this.groups = details.map(d => ({
        id: d.id,
        name: d.name,
        subjects: this.allSubjects.filter(s => d.subjects.includes(s.id)),
        accessStatus: statusMap.get(d.id) ?? null
      }));
      this.loading = false;
    });
  }

  goToSubject(id: string) {
    this.router.navigate(['/tests'], { queryParams: { subjectId: id } });
  }

  requestAccess(event: Event, group: GroupCard) {
    event.stopPropagation();
    this.requestingGroupId = group.id;
    this.accessService.requestAccess(group.id).subscribe({
      next: () => {
        group.accessStatus = 'PENDING';
        this.requestingGroupId = null;
      },
      error: () => { this.requestingGroupId = null; }
    });
  }

  openRequestsModal(event: Event, group: GroupCard) {
    event.stopPropagation();
    this.openMenuId = null;
    this.requestsGroup = group;
    this.requestsLoading = true;
    this.showRequestsModal = true;
    this.accessService.getAccessRequests(group.id).subscribe(reqs => {
      group.pendingRequests = reqs;
      this.requestsLoading = false;
    });
  }

  approve(req: AccessRequestResponse) {
    this.accessService.approve(req.id).subscribe(() => {
      if (this.requestsGroup) {
        const updated = { ...req, status: 'APPROVED' as const };
        this.requestsGroup.pendingRequests = this.requestsGroup.pendingRequests?.map(r => r.id === req.id ? updated : r);
      }
    });
  }

  deny(req: AccessRequestResponse) {
    this.accessService.deny(req.id).subscribe(() => {
      if (this.requestsGroup) {
        this.requestsGroup.pendingRequests = this.requestsGroup.pendingRequests?.filter(r => r.id !== req.id);
      }
    });
  }

  revoke(req: AccessRequestResponse) {
    this.accessService.revoke(req.id).subscribe(() => {
      if (this.requestsGroup) {
        this.requestsGroup.pendingRequests = this.requestsGroup.pendingRequests?.filter(r => r.id !== req.id);
      }
    });
  }

  pendingRequests(): AccessRequestResponse[] {
    return this.requestsGroup?.pendingRequests?.filter(r => r.status === 'PENDING') ?? [];
  }

  approvedMembers(): AccessRequestResponse[] {
    return this.requestsGroup?.pendingRequests?.filter(r => r.status === 'APPROVED') ?? [];
  }

  closeRequestsModal() {
    this.showRequestsModal = false;
    this.requestsGroup = null;
  }

  toggleMenu(event: Event, id: string) {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  @HostListener('document:click')
  closeMenu() {
    this.openMenuId = null;
  }

  openEdit(event: Event, group: GroupCard) {
    event.stopPropagation();
    this.openMenuId = null;
    this.subjectGroupService.getSubjectGroup(group.id).subscribe(detail => {
      this.editingGroup = detail;
      this.editName = detail.name;
      this.editSubjectIds = [...detail.subjects];
      this.subjectSearch = '';
      this.showEditModal = true;
    });
  }

  isSubjectAssigned(subjectId: string): boolean {
    return this.editSubjectIds.includes(subjectId);
  }

  toggleSubject(subjectId: string) {
    const idx = this.editSubjectIds.indexOf(subjectId);
    if (idx === -1) this.editSubjectIds.push(subjectId);
    else this.editSubjectIds.splice(idx, 1);
  }

  saveEdit() {
    if (!this.editingGroup || !this.editName.trim()) return;
    this.saving = true;
    this.subjectGroupService.updateSubjectGroup(this.editingGroup.id, {
      name: this.editName.trim(),
      subjects: this.editSubjectIds
    }).subscribe({
      next: () => { this.saving = false; this.showEditModal = false; this.load(); },
      error: () => { this.saving = false; }
    });
  }

  cancelEdit() {
    this.showEditModal = false;
    this.editingGroup = null;
  }

  delete(event: Event, id: string) {
    event.stopPropagation();
    this.openMenuId = null;
    if (confirm('Are you sure you want to delete this subject group?')) {
      this.subjectGroupService.deleteSubjectGroup(id).subscribe(() => this.load());
    }
  }

  openAdd() {
    this.newGroupName = '';
    this.showAddModal = true;
  }

  saveAdd() {
    if (!this.newGroupName.trim()) return;
    this.adding = true;
    this.subjectGroupService.addSubjectGroup({ name: this.newGroupName.trim(), subjects: [] }).subscribe({
      next: () => { this.adding = false; this.showAddModal = false; this.load(); },
      error: () => { this.adding = false; }
    });
  }

  cancelAdd() {
    this.showAddModal = false;
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }
}
