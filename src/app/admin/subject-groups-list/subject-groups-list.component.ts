import { Component, OnInit, HostListener } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { SubjectGroupService } from '../../service/subject-group.service';
import { SubjectsService } from '../../service/subject.service';
import { SubjectGroupResponse, SubjectSummaryResponse } from '../../models/models.d';

interface SubjectGroupCard {
  id: string;
  name: string;
  subjects: SubjectSummaryResponse[];
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

  constructor(
    private subjectGroupService: SubjectGroupService,
    private subjectsService: SubjectsService
  ) {}

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
        subjects: this.allSubjects.filter(s => d.subjects.includes(s.id))
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
}
