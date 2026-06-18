import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { TestService } from '../service/test.service';
import { SubjectsService } from '../service/subject.service';
import { TestSummaryResponse } from '../models/models.d';

interface Test {
  name: string;
  id: string;
}

interface Subject {
  name: string;
  id: string;
  tests: Test[];
  expanded?: boolean;
}

interface UniversityYear {
  name: string;
  subjects: Subject[];
  expanded?: boolean;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  universityYears: UniversityYear[] = [
    { name: 'Rok I', expanded: false, subjects: [] },
  ];

  openMenuId: string | null = null;

  constructor(
    private testService: TestService,
    private subjectsService: SubjectsService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.subjectsService.getSubjects().subscribe(res => {
      const firstYear = this.universityYears[0];
      firstYear.subjects = res.subjects.map(subject => ({
        name: subject.name,
        id: subject.id,
        expanded: false,
        tests: []
      }));

      firstYear.subjects.forEach((subject, index) => {
        const subjectId = res.subjects[index].id;
        this.subjectsService.getSubject(subjectId).subscribe(detail => {
          this.testService.getTests().subscribe(testsRes => {
            subject.tests = testsRes.tests
              .filter((t: TestSummaryResponse) => detail.tests.includes(t.id))
              .map((t: TestSummaryResponse) => ({ name: t.name, id: t.id }));
          });
        });
      });
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
        subject.tests = subject.tests.filter(t => t.id !== testId);
      });
    }
  }

  navigateToSubjects(event: Event) {
    event.stopPropagation();
    this.openMenuId = null;
    this.router.navigate(['/admin/subjects']);
  }

  deleteSubject(event: Event, subjectId: string) {
    event.stopPropagation();
    this.openMenuId = null;
    if (confirm('Are you sure you want to delete this subject?')) {
      this.subjectsService.deleteSubject(subjectId).subscribe(() => {
        const firstYear = this.universityYears[0];
        firstYear.subjects = firstYear.subjects.filter(s => s.id !== subjectId);
      });
    }
  }

  navigateToTests() {
    this.router.navigate(['/admin/tests']);
  }

  navigateToAdminSubjects() {
    this.router.navigate(['/admin/subjects']);
  }
}
