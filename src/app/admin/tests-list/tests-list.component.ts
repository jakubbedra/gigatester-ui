import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { TestService } from '../../service/test.service';
import { TestSummaryResponse } from '../../models/models.d';

@Component({
  selector: 'app-tests-list',
  templateUrl: './tests-list.component.html',
  styleUrls: ['./tests-list.component.css']
})
export class TestsListComponent implements OnInit {
  tests: TestSummaryResponse[] = [];
  openMenuId: string | null = null;

  showAddModal = false;
  newName = '';
  newClosed = 0;
  newOpen = 0;
  newPassing = 50;
  creating = false;

  constructor(private testService: TestService, private router: Router) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.testService.getTests().subscribe(res => {
      this.tests = res.tests;
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
}
