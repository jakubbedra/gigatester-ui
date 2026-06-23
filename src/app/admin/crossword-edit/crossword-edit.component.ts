import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CrosswordService } from '../../service/crossword.service';
import { ClueType, CrosswordTermResponse } from '../../models/models.d';

interface TermRow extends CrosswordTermResponse {
  isNew?: boolean;
}

@Component({
  selector: 'app-crossword-edit',
  templateUrl: './crossword-edit.component.html',
  styleUrls: ['./crossword-edit.component.css']
})
export class CrosswordEditComponent implements OnInit {
  id = '';
  crosswordName = '';
  terms: TermRow[] = [];
  loading = true;
  saving = false;

  editingIndex: number | null = null;
  editDraft: { term: string; clue: string; clueType: ClueType } | null = null;

  readonly clueTypes: ClueType[] = ['TEXT', 'URL'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private crosswordService: CrosswordService
  ) {}

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.crosswordService.getCrossword(this.id).subscribe(cw => {
      this.crosswordName = cw.name;
      this.terms = cw.terms.map(t => ({ ...t }));
      this.loading = false;
    });
  }

  save() {
    if (!this.crosswordName.trim()) return;
    this.saving = true;
    this.crosswordService.updateCrossword(this.id, {
      name: this.crosswordName.trim(),
      terms: this.terms.map(t => ({ term: t.term, clue: t.clue, clueType: t.clueType }))
    }).subscribe({
      next: () => { this.saving = false; },
      error: () => { this.saving = false; }
    });
  }

  openEdit(index: number) {
    this.editingIndex = index;
    const t = this.terms[index];
    this.editDraft = { term: t.term, clue: t.clue, clueType: t.clueType };
  }

  confirmEdit() {
    if (this.editingIndex === null || !this.editDraft) return;
    const t = this.terms[this.editingIndex];
    t.term = this.editDraft.term;
    t.clue = this.editDraft.clue;
    t.clueType = this.editDraft.clueType;
    this.cancelEdit();
  }

  cancelEdit() {
    this.editingIndex = null;
    this.editDraft = null;
  }

  addTerm() {
    this.terms.push({ id: '', term: '', clue: '', clueType: 'TEXT', isNew: true });
    this.openEdit(this.terms.length - 1);
  }

  removeTerm(index: number) {
    if (this.editingIndex === index) this.cancelEdit();
    this.terms.splice(index, 1);
    if (this.editingIndex !== null && this.editingIndex > index) {
      this.editingIndex--;
    }
  }

  back() {
    this.router.navigate(['/admin/crosswords']);
  }
}
