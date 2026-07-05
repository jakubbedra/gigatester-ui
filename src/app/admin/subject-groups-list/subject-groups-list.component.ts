import { Component, OnInit, HostListener } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { SubjectGroupService } from '../../service/subject-group.service';
import { SubjectsService, AuthorCandidate } from '../../service/subject.service';
import { AuthService } from '../../service/auth.service';
import { SubjectGroupResponse, SubjectAuthor, SubjectSummaryResponse } from '../../models/models.d';

interface SubjectGroupCard {
  id: string;
  name: string;
  subjects: SubjectSummaryResponse[];
  owners: SubjectAuthor[];
}

@Component({
  selector: 'app-subject-groups-list',
  templateUrl: './subject-groups-list.component.html',
  styleUrls: ['./subject-groups-list.component.css']
})
export class SubjectGroupsListComponent implements OnInit {
  groups: SubjectGroupCard[] = [];
  allSubjects: SubjectSummaryResponse[] = [];
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

  // Owner management
  groupOwners: SubjectAuthor[] = [];
  showOwnerPopup = false;
  ownerCandidates: AuthorCandidate[] = [];
  ownerCandidatesLoading = false;
  ownerSearch = '';

  constructor(
    private subjectGroupService: SubjectGroupService,
    private subjectsService: SubjectsService,
    private authService: AuthService
  ) {}

  get isAdmin(): boolean {
    return this.authService.getUser()?.role === 'ADMIN';
  }

  avatarFallback(username: string): string {
    return username?.charAt(0).toUpperCase() ?? '?';
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.subjectsService.getSubjects().pipe(
      switchMap(subjectsRes => {
        this.allSubjects = subjectsRes.subjects;
        return this.subjectGroupService.getSubjectGroups();
      }),
      switchMap(groupsRes => {
        if (groupsRes.subjectGroups.length === 0) return of([]);
        return forkJoin(groupsRes.subjectGroups.map(g => this.subjectGroupService.getSubjectGroup(g.id)));
      })
    ).subscribe((details: SubjectGroupResponse[]) => {
      this.groups = details.map(d => ({
        id: d.id,
        name: d.name,
        subjects: this.allSubjects.filter(s => d.subjects.includes(s.id)),
        owners: d.owners ?? []
      }));
    });
  }

  toggleMenu(event: Event, id: string) {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  @HostListener('document:click')
  closeMenu() {
    this.openMenuId = null;
  }

  openEdit(event: Event, group: SubjectGroupCard) {
    event.stopPropagation();
    this.openMenuId = null;
    this.subjectGroupService.getSubjectGroup(group.id).subscribe(detail => {
      this.editingGroup = detail;
      this.editName = detail.name;
      this.editSubjectIds = [...detail.subjects];
      this.groupOwners = [...(detail.owners ?? [])];
      this.subjectSearch = '';
      this.showOwnerPopup = false;
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
      next: () => {
        this.saving = false;
        this.showEditModal = false;
        this.load();
      },
      error: () => { this.saving = false; }
    });
  }

  cancelEdit() {
    this.showEditModal = false;
    this.editingGroup = null;
    this.showOwnerPopup = false;
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
      next: () => {
        this.adding = false;
        this.showAddModal = false;
        this.load();
      },
      error: () => { this.adding = false; }
    });
  }

  cancelAdd() {
    this.showAddModal = false;
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }

  // ── Owner management ──

  openOwnerPopup() {
    if (!this.editingGroup) return;
    this.showOwnerPopup = true;
    this.ownerSearch = '';
    this.ownerCandidatesLoading = true;
    this.subjectGroupService.getOwnerCandidates(this.editingGroup.id).subscribe({
      next: (list) => { this.ownerCandidates = list; this.ownerCandidatesLoading = false; },
      error: () => { this.ownerCandidatesLoading = false; }
    });
  }

  closeOwnerPopup() {
    this.showOwnerPopup = false;
  }

  get filteredOwnerCandidates(): AuthorCandidate[] {
    const q = this.ownerSearch.trim().toLowerCase();
    if (!q) return this.ownerCandidates;
    return this.ownerCandidates.filter(c => c.username.toLowerCase().includes(q));
  }

  selectOwner(candidate: AuthorCandidate) {
    if (!this.editingGroup) return;
    this.subjectGroupService.addOwner(this.editingGroup.id, candidate.id).subscribe({
      next: (group) => {
        this.groupOwners = group.owners ?? [];
        this.ownerCandidates = this.ownerCandidates.filter(c => c.id !== candidate.id);
      }
    });
  }

  removeOwner(userId: string) {
    if (!this.editingGroup) return;
    this.subjectGroupService.removeOwner(this.editingGroup.id, userId).subscribe({
      next: (group) => { this.groupOwners = group.owners ?? []; }
    });
  }
}
