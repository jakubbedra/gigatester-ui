import {Component, OnInit} from '@angular/core';
import {TestService} from "../service/test.service";
import {TestSummaryResponse} from "../models/models";

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
export class SidebarComponent implements OnInit{
  universityYears: UniversityYear[] = [
    {
      name: 'Matura',
      expanded: false,
      subjects: [
        {
          name: 'Biologia',
          expanded: false,
          tests: [
            { name: 'Test 1', id: '?' },
            { name: 'Test 2', id: '?' }
          ]
        }
      ]
    },
  ];

  constructor(private testService: TestService) { }

  ngOnInit() {
    this.testService.getTests().subscribe(res => {
      const tests = res.tests; // ✅ unwrap array

      this.universityYears.forEach(year => {
        year.subjects.forEach(subject => {
          if (subject.name === 'Biologia') {
            subject.tests = tests.map((t: TestSummaryResponse) => ({
              name: t.name,
              id: t.id
            }));
          }
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
