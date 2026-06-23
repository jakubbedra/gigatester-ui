import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TestService } from '../service/test.service';
import { SubjectsService } from '../service/subject.service';
import { SubjectGroupService } from '../service/subject-group.service';
import { CrosswordService } from '../service/crossword.service';
import { CrosswordSummaryResponse, TestSummaryResponse } from '../models/models.d';

interface Item {
  name: string;
  id: string;
}

interface Subject {
  name: string;
  id: string;
  tests: Item[];
  crosswords: Item[];
  expanded?: boolean;
}

interface UniversityYear {
  name: string;
  id: string;
  subjects: Subject[];
  expanded?: boolean;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  universityYears: UniversityYear[] = [];

  openMenuId: string | null = null;

  constructor(
    private testService: TestService,
    private subjectsService: SubjectsService,
    private subjectGroupService: SubjectGroupService,
    private crosswordService: CrosswordService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.subjectGroupService.getSubjectGroups().pipe(
      switchMap(groupsRes => {
        if (groupsRes.subjectGroups.length === 0) return of({ groups: [], allTests: [] as TestSummaryResponse[], allCrosswords: [] as CrosswordSummaryResponse[] });
        return forkJoin([
          forkJoin(groupsRes.subjectGroups.map(g => this.subjectGroupService.getSubjectGroup(g.id))),
          this.testService.getTests(),
          this.crosswordService.getCrosswords()
        ]).pipe(
          switchMap(([groupDetails, testsRes, crosswordsRes]) => {
            const subjectIds = [...new Set(groupDetails.flatMap(g => g.subjects))];
            if (subjectIds.length === 0) {
              return of({ groups: groupDetails, allTests: testsRes.tests as TestSummaryResponse[], allCrosswords: crosswordsRes.crosswords as CrosswordSummaryResponse[], subjectDetails: [] as any[] });
            }
            return forkJoin(subjectIds.map(id => this.subjectsService.getSubject(id))).pipe(
              switchMap(subjectDetails => of({ groups: groupDetails, allTests: testsRes.tests as TestSummaryResponse[], allCrosswords: crosswordsRes.crosswords as CrosswordSummaryResponse[], subjectDetails }))
            );
          })
        );
      })
    ).subscribe((result: any) => {
      const { groups, allTests, allCrosswords, subjectDetails = [] } = result;
      const subjectMap = new Map(subjectDetails.map((s: any) => [s.id, s]));

      this.universityYears = groups.map((g: any) => ({
        id: g.id,
        name: g.name,
        expanded: false,
        subjects: g.subjects.map((subjectId: string) => {
          const subject = subjectMap.get(subjectId) as any;
          if (!subject) return null;
          return {
            id: subject.id,
            name: subject.name,
            expanded: false,
            tests: allTests
              .filter((t: TestSummaryResponse) => subject.tests.includes(t.id))
              .map((t: TestSummaryResponse) => ({ name: t.name, id: t.id })),
            crosswords: allCrosswords
              .filter((c: CrosswordSummaryResponse) => (subject.crosswords ?? []).includes(c.id))
              .map((c: CrosswordSummaryResponse) => ({ name: c.name, id: c.id }))
          };
        }).filter(Boolean)
      }));
    });
  }

  toggleYear(year: UniversityYear) {
    year.expanded = !year.expanded;
  }

  toggleSubject(subject: Subject) {
    subject.expanded = !subject.expanded;
  }

  toggleMenu(event: Event, id: string) {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  @HostListener('document:click')
  closeMenu() {
    this.openMenuId = null;
  }

  editTest(event: Event, testId: string) {
    event.stopPropagation();
    this.openMenuId = null;
    this.router.navigate(['/admin/tests', testId, 'edit']);
  }

  deleteTest(event: Event, testId: string, subject: Subject) {
    event.stopPropagation();
    this.openMenuId = null;
    if (confirm('Are you sure you want to delete this test?')) {
      this.testService.deleteTest(testId).subscribe(() => {
        subject.tests = subject.tests.filter((t: Item) => t.id !== testId);
      });
    }
  }

  navigateToSubjects(event: Event) {
    event.stopPropagation();
    this.openMenuId = null;
    this.router.navigate(['/admin/subjects']);
  }

  navigateToSubjectGroups(event: Event) {
    event.stopPropagation();
    this.openMenuId = null;
    this.router.navigate(['/admin/subject-groups']);
  }

  deleteSubject(event: Event, subjectId: string) {
    event.stopPropagation();
    this.openMenuId = null;
    if (confirm('Are you sure you want to delete this subject?')) {
      this.subjectsService.deleteSubject(subjectId).subscribe(() => {
        this.universityYears.forEach(year => {
          year.subjects = year.subjects.filter(s => s.id !== subjectId);
        });
      });
    }
  }

  navigateToCrosswords() {
    this.router.navigate(['/admin/crosswords']);
  }

  navigateToTests() {
    this.router.navigate(['/admin/tests']);
  }

  navigateToAdminSubjects() {
    this.router.navigate(['/admin/subjects']);
  }
}
