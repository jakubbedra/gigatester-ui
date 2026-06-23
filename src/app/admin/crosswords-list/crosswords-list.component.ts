import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CrosswordService } from '../../service/crossword.service';
import { CrosswordSummaryResponse } from '../../models/models.d';

@Component({
  selector: 'app-crosswords-list',
  templateUrl: './crosswords-list.component.html',
  styleUrls: ['./crosswords-list.component.css']
})
export class CrosswordsListComponent implements OnInit {
  crosswords: CrosswordSummaryResponse[] = [];
  openMenuId: string | null = null;

  showAddModal = false;
  newName = '';
  adding = false;

  constructor(
    private crosswordService: CrosswordService,
    private router: Router
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.crosswordService.getCrosswords().subscribe(res => {
      this.crosswords = res.crosswords;
    });
  }

  edit(id: string) {
    this.router.navigate(['/admin/crosswords', id, 'edit']);
  }

  toggleMenu(event: Event, id: string) {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  @HostListener('document:click')
  closeMenu() {
    this.openMenuId = null;
  }

  delete(event: Event, id: string) {
    event.stopPropagation();
    this.openMenuId = null;
    if (confirm('Are you sure you want to delete this crossword?')) {
      this.crosswordService.deleteCrossword(id).subscribe(() => this.load());
    }
  }

  openAdd() {
    this.newName = '';
    this.showAddModal = true;
  }

  saveAdd() {
    if (!this.newName.trim()) return;
    this.adding = true;
    this.crosswordService.addCrossword({ name: this.newName.trim(), terms: [] }).subscribe({
      next: (id) => {
        this.adding = false;
        this.showAddModal = false;
        this.router.navigate(['/admin/crosswords', id, 'edit']);
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
