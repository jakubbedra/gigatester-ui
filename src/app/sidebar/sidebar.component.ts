import { Component, OnInit } from '@angular/core';
import { TestService } from "../service/test.service";
import { TestSummaryResponse } from "../models/models";
import {SubjectsService} from "../service/subject.service";

interface Test {
  name: string;
  id: string;
}

interface Subject {
  name: string;
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
    {
      name: 'Rok I',
      expanded: false,
      subjects: []
    },
  ];

  constructor(
    private testService: TestService,
    private subjectsService: SubjectsService
  ) {}

  ngOnInit() {
    this.subjectsService.getSubjects().subscribe(res => {
      const firstYear = this.universityYears[0];

      firstYear.subjects = res.subjects.map(subject => ({
        name: subject.name,
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
}
