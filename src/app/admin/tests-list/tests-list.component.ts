import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TestService } from '../../service/test.service';
import { CrosswordService } from '../../service/crossword.service';
import { SubjectsService } from '../../service/subject.service';
import { AuthService } from '../../service/auth.service';
import { TestSummaryResponse, CrosswordSummaryResponse } from '../../models/models.d';

@Component({
  selector: 'app-tests-list',
  templateUrl: './tests-list.component.html',
  styleUrls: ['./tests-list.component.css']
})
export class TestsListComponent implements OnInit {
  tests: TestSummaryResponse[] = [];
  crosswords: CrosswordSummaryResponse[] = [];
  openMenuId: string | null = null;

  subjectName: string | null = null;
  subjectId: string | null = null;

  showAddModal = false;
  newName = '';
  newClosed = 0;
  newOpen = 0;
  newPassing = 50;
  creating = false;

  constructor(
    private testService: TestService,
    private crosswordService: CrosswordService,
    private subjectsService: SubjectsService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  get canModify(): boolean {
    const role = this.authService.getUser()?.role;
    return role === 'MODERATOR' || role === 'ADMIN';
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      this.subjectId = params.get('subjectId');
      this.load();
    });
  }

  load() {
    if (this.subjectId) {
      this.subjectsService.getSubject(this.subjectId).pipe(
        switchMap(subject => {
          this.subjectName = subject.name;
          const tests$ = subject.tests.length
            ? forkJoin(subject.tests.map(id => this.testService.getTest(id)))
            : of([]);
          const crosswords$ = (subject.crosswords ?? []).length
            ? forkJoin((subject.crosswords ?? []).map(id => this.crosswordService.getCrossword(id)))
            : of([]);
          return forkJoin([tests$, crosswords$]);
        })
      ).subscribe(([tests, crosswords]: any) => {
        this.tests = tests.map((t: any) => ({ id: t.id, name: t.name }));
        this.crosswords = crosswords.map((c: any) => ({ id: c.id, name: c.name, termCount: c.terms?.length ?? 0 }));
      });
    } else {
      this.subjectName = null;
      this.testService.getTests().subscribe(res => {
        this.tests = res.tests;
        this.crosswords = [];
      });
    }
  }

  toggleMenu(event: Event, id: string) {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  @HostListener('document:click')
  closeMenu() {
    this.openMenuId = null;
  }

  edit(event: Event, id: string) {
    event.stopPropagation();
    this.openMenuId = null;
    this.router.navigate(['/admin/tests', id, 'edit']);
  }

  delete(event: Event, id: string) {
    event.stopPropagation();
    this.openMenuId = null;
    if (confirm('Are you sure you want to delete this test?')) {
      this.testService.deleteTest(id).subscribe(() => this.load());
    }
  }

  openAdd() {
    this.newName = '';
    this.newClosed = 0;
    this.newOpen = 0;
    this.newPassing = 50;
    this.showAddModal = true;
  }

  saveAdd() {
    if (!this.newName.trim()) return;
    this.creating = true;
    this.testService.addTest({
      name: this.newName.trim(),
      questions: [],
      closedQuestionsCount: this.newClosed,
      openQuestionsCount: this.newOpen,
      passingPercentage: this.newPassing,
    }).subscribe({
      next: (created) => {
        this.creating = false;
        this.showAddModal = false;
        this.router.navigate(['/admin/tests', created.id, 'edit']);
      },
      error: () => { this.creating = false; }
    });
  }

  cancelAdd() {
    this.showAddModal = false;
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }

  openTest(id: string) {
    this.router.navigate(['/tests', id]);
  }

  openCrossword(id: string) {
    this.router.navigate(['/crosswords', id]);
  }

  editCrossword(event: Event, id: string) {
    event.stopPropagation();
    this.openMenuId = null;
    this.router.navigate(['/admin/crosswords', id, 'edit']);
  }

  deleteCrossword(event: Event, id: string) {
    event.stopPropagation();
    this.openMenuId = null;
    if (confirm('Are you sure you want to delete this crossword?')) {
      this.crosswordService.deleteCrossword(id).subscribe(() => this.load());
    }
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
