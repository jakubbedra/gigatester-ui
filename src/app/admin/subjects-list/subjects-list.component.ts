import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { SubjectsService } from '../../service/subject.service';
import { TestService } from '../../service/test.service';
import { CrosswordService } from '../../service/crossword.service';
import { SubjectResponse, TestSummaryResponse, CrosswordSummaryResponse } from '../../models/models.d';

interface SubjectCard {
  id: string;
  name: string;
  tests: TestSummaryResponse[];
  crosswords: CrosswordSummaryResponse[];
}

@Component({
  selector: 'app-subjects-list',
  templateUrl: './subjects-list.component.html',
  styleUrls: ['./subjects-list.component.css']
})
export class SubjectsListComponent implements OnInit {
  subjects: SubjectCard[] = [];
  allTests: TestSummaryResponse[] = [];
  allCrosswords: CrosswordSummaryResponse[] = [];
  openMenuId: string | null = null;

  // Edit modal
  showEditModal = false;
  editingSubject: SubjectResponse | null = null;
  editName = '';
  editDescription = '';
  editDifficulty = 0;
  editTestIds: string[] = [];
  editCrosswordIds: string[] = [];
  saving = false;
  testSearch = '';
  crosswordSearch = '';

  quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ size: ['small', false, 'large', 'huge'] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean']
    ]
  };

  // Add modal
  showAddModal = false;
  newSubjectName = '';
  adding = false;

  constructor(
    private subjectsService: SubjectsService,
    private testService: TestService,
    private crosswordService: CrosswordService,
    private router: Router
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    forkJoin([
      this.testService.getTests(),
      this.crosswordService.getCrosswords()
    ]).pipe(
      switchMap(([testsRes, crosswordsRes]) => {
        this.allTests = testsRes.tests;
        this.allCrosswords = crosswordsRes.crosswords;
        return this.subjectsService.getSubjects();
      }),
      switchMap(subjectsRes => {
        if (subjectsRes.subjects.length === 0) return of([]);
        return forkJoin(subjectsRes.subjects.map(s => this.subjectsService.getSubject(s.id)));
      })
    ).subscribe((details: SubjectResponse[]) => {
      this.subjects = details.map(d => ({
        id: d.id,
        name: d.name,
        tests: this.allTests.filter(t => d.tests.includes(t.id)),
        crosswords: this.allCrosswords.filter(c => (d.crosswords ?? []).includes(c.id))
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

  openEdit(event: Event, subject: SubjectCard) {
    event.stopPropagation();
    this.openMenuId = null;
    this.subjectsService.getSubject(subject.id).subscribe(detail => {
      this.editingSubject = detail;
      this.editName = detail.name;
      this.editDescription = detail.description ?? '';
      this.editDifficulty = detail.difficulty ?? 0;
      this.editTestIds = [...detail.tests];
      this.editCrosswordIds = [...(detail.crosswords ?? [])];
      this.testSearch = '';
      this.crosswordSearch = '';
      this.showEditModal = true;
    });
  }

  isTestAssigned(testId: string): boolean {
    return this.editTestIds.includes(testId);
  }

  toggleTest(testId: string) {
    const idx = this.editTestIds.indexOf(testId);
    if (idx === -1) this.editTestIds.push(testId);
    else this.editTestIds.splice(idx, 1);
  }

  isCrosswordAssigned(crosswordId: string): boolean {
    return this.editCrosswordIds.includes(crosswordId);
  }

  toggleCrossword(crosswordId: string) {
    const idx = this.editCrosswordIds.indexOf(crosswordId);
    if (idx === -1) this.editCrosswordIds.push(crosswordId);
    else this.editCrosswordIds.splice(idx, 1);
  }

  saveEdit() {
    if (!this.editingSubject || !this.editName.trim()) return;
    this.saving = true;
    this.subjectsService.updateSubject(this.editingSubject.id, {
      name: this.editName.trim(),
      description: this.editDescription,
      difficulty: this.editDifficulty,
      tests: this.editTestIds,
      crosswords: this.editCrosswordIds
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
    this.editingSubject = null;
  }

  delete(event: Event, id: string) {
    event.stopPropagation();
    this.openMenuId = null;
    if (confirm('Are you sure you want to delete this subject?')) {
      this.subjectsService.deleteSubject(id).subscribe(() => this.load());
    }
  }

  openAdd() {
    this.newSubjectName = '';
    this.showAddModal = true;
  }

  saveAdd() {
    if (!this.newSubjectName.trim()) return;
    this.adding = true;
    this.subjectsService.addSubject({ name: this.newSubjectName.trim(), tests: [], crosswords: [] }).subscribe({
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

  openSubject(subjectId: string) {
    this.router.navigate(['/subjects', subjectId]);
  }

  openTest(testId: string) {
    this.router.navigate(['/tests', testId]);
  }

  editTest(testId: string) {
    this.router.navigate(['/admin/tests', testId, 'edit']);
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }
}
