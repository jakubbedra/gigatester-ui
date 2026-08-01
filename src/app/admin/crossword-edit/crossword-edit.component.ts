import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CrosswordService } from '../../service/crossword.service';
import { TagService } from '../../service/tag.service';
import { AuthService } from '../../service/auth.service';
import { PermissionService } from '../../service/permission.service';
import { ClueType, CrosswordTermResponse, TagResponse, SubjectAuthor, Permission } from '../../models/models.d';
import { AuthorCandidate } from '../../service/subject.service';

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

  allTags: TagResponse[] = [];
  editingIndex: number | null = null;
  editDraft: { term: string; clue: string; clueType: ClueType; tags: TagResponse[] } | null = null;
  tagSearch = '';

  confirmDeleteIndex: number | null = null;
  selectedIndices: Set<number> = new Set();
  confirmBulkDelete = false;

  crosswordAuthors: SubjectAuthor[] = [];
  showAuthorPopup = false;
  authorCandidates: AuthorCandidate[] = [];
  authorCandidatesLoading = false;
  authorSearch = '';

  pageSize = 20;
  currentPage = 0;
  readonly pageSizes = [10, 20, 50];
  readonly clueTypes: ClueType[] = ['TEXT', 'URL'];

  filterText = '';
  filterIn: 'both' | 'term' | 'clue' = 'both';
  filterTagIds = new Set<string>();

  get tagsInCrossword(): TagResponse[] {
    const seen = new Map<string, TagResponse>();
    for (const t of this.terms) {
      for (const tag of (t.tags ?? [])) {
        if (!seen.has(tag.id)) seen.set(tag.id, tag);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.key.localeCompare(b.key));
  }

  get filteredTermsWithIndex(): { term: TermRow; realIdx: number }[] {
    const q = this.filterText.trim().toLowerCase();
    return this.terms
      .map((term, realIdx) => ({ term, realIdx }))
      .filter(({ term }) => {
        if (q) {
          const inTerm = term.term.toLowerCase().includes(q);
          const inClue = term.clue.toLowerCase().includes(q);
          if (this.filterIn === 'term' && !inTerm) return false;
          if (this.filterIn === 'clue' && !inClue) return false;
          if (this.filterIn === 'both' && !inTerm && !inClue) return false;
        }
        if (this.filterTagIds.size > 0) {
          const termTagIds = new Set((term.tags ?? []).map(t => t.id));
          for (const id of this.filterTagIds) {
            if (!termTagIds.has(id)) return false;
          }
        }
        return true;
      });
  }

  get pagedFilteredTerms(): { term: TermRow; realIdx: number }[] {
    const offset = this.currentPage * this.pageSize;
    return this.filteredTermsWithIndex.slice(offset, offset + this.pageSize);
  }

  get totalPages(): number { return Math.max(1, Math.ceil(this.filteredTermsWithIndex.length / this.pageSize)); }

  trackByRealIdx(index: number, row: { term: TermRow; realIdx: number }): number {
    return row.realIdx;
  }

  toggleFilterTag(tagId: string) {
    if (this.filterTagIds.has(tagId)) this.filterTagIds.delete(tagId);
    else this.filterTagIds.add(tagId);
    this.filterTagIds = new Set(this.filterTagIds);
    this.currentPage = 0;
  }

  onFilterTextChange() {
    this.currentPage = 0;
  }

  clearFilters() {
    this.filterText = '';
    this.filterIn = 'both';
    this.filterTagIds = new Set();
    this.currentPage = 0;
  }

  get isFiltered(): boolean {
    return !!this.filterText.trim() || this.filterTagIds.size > 0;
  }

  setPage(page: number) {
    if (this.editingIndex !== null) this.cancelEdit();
    this.confirmDeleteIndex = null;
    this.currentPage = Math.max(0, Math.min(page, this.totalPages - 1));
  }

  setPageSize(size: number) {
    this.pageSize = size;
    this.currentPage = 0;
    if (this.editingIndex !== null) this.cancelEdit();
    this.confirmDeleteIndex = null;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private crosswordService: CrosswordService,
    private tagService: TagService,
    private authService: AuthService,
    private permissionService: PermissionService
  ) {}

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.tagService.getTags().subscribe(tags => this.allTags = tags);
    this.crosswordService.getCrossword(this.id).subscribe(cw => {
      this.crosswordName = cw.name;
      this.terms = cw.terms.map(t => ({ ...t, tags: t.tags ?? [] }));
      this.crosswordAuthors = cw.authors ?? [];
      this.loading = false;
    });
  }

  private persist() {
    this.saving = true;
    this.crosswordService.updateCrossword(this.id, {
      name: this.crosswordName.trim(),
      terms: this.terms.map(t => ({
        term: t.term,
        clue: t.clue,
        clueType: t.clueType,
        tagIds: (t.tags ?? []).map(tag => tag.id)
      }))
    }).subscribe({
      next: () => { this.saving = false; },
      error: () => { this.saving = false; }
    });
  }

  save() {
    if (!this.crosswordName.trim()) return;
    if (this.editingIndex !== null && this.editDraft) {
      this.applyDraft();
    }
    this.persist();
  }

  openEdit(index: number) {
    this.confirmDeleteIndex = null;
    this.editingIndex = index;
    const t = this.terms[index];
    this.editDraft = { term: t.term, clue: t.clue, clueType: t.clueType, tags: [...(t.tags ?? [])] };
    this.tagSearch = '';
  }

  private applyDraft() {
    if (this.editingIndex === null || !this.editDraft) return;
    const t = this.terms[this.editingIndex];
    t.term = this.editDraft.term;
    t.clue = this.editDraft.clue;
    t.clueType = this.editDraft.clueType;
    t.tags = [...this.editDraft.tags];
    this.cancelEdit();
  }

  confirmEdit() {
    this.applyDraft();
    this.persist();
  }

  cancelEdit() {
    this.editingIndex = null;
    this.editDraft = null;
    this.tagSearch = '';
  }

  get tagSuggestions(): TagResponse[] {
    if (!this.editDraft) return [];
    const q = this.tagSearch.toLowerCase().trim();
    const selectedIds = new Set(this.editDraft.tags.map(t => t.id));
    return this.allTags.filter(t =>
      !selectedIds.has(t.id) && (!q || t.key.toLowerCase().includes(q))
    );
  }

  addTag(tag: TagResponse) {
    if (!this.editDraft) return;
    if (!this.editDraft.tags.find(t => t.id === tag.id)) {
      this.editDraft.tags.push(tag);
    }
    this.tagSearch = '';
  }

  onTagKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const q = this.tagSearch.trim();
    if (!q || !this.editDraft) return;
    const suggestions = this.tagSuggestions;
    if (suggestions.length > 0 && suggestions[0].key.toLowerCase() === q.toLowerCase()) {
      this.addTag(suggestions[0]);
      return;
    }
    if (suggestions.length > 0 && suggestions[0].key.toLowerCase().startsWith(q.toLowerCase())) {
      this.addTag(suggestions[0]);
      return;
    }
    this.tagService.createTag({ key: q }).subscribe(id => {
      const newTag: TagResponse = { id, key: q };
      this.allTags.push(newTag);
      this.addTag(newTag);
    });
  }

  removeTag(tagId: string) {
    if (!this.editDraft) return;
    this.editDraft.tags = this.editDraft.tags.filter(t => t.id !== tagId);
  }

  get canModify(): boolean {
    return this.permissionService.hasPermission(Permission.CROSSWORDS_WRITE);
  }

  avatarFallback(username: string): string {
    return username?.charAt(0).toUpperCase() ?? '?';
  }

  openAuthorPopup(): void {
    this.showAuthorPopup = true;
    this.authorSearch = '';
    this.authorCandidatesLoading = true;
    this.crosswordService.getAuthorCandidates(this.id).subscribe({
      next: (list) => { this.authorCandidates = list; this.authorCandidatesLoading = false; },
      error: () => { this.authorCandidatesLoading = false; }
    });
  }

  closeAuthorPopup(): void { this.showAuthorPopup = false; }

  get filteredAuthorCandidates(): AuthorCandidate[] {
    const q = this.authorSearch.trim().toLowerCase();
    if (!q) return this.authorCandidates;
    return this.authorCandidates.filter(c => c.username.toLowerCase().includes(q));
  }

  selectAuthor(candidate: AuthorCandidate): void {
    this.crosswordService.addAuthor(this.id, candidate.id).subscribe({
      next: (cw) => {
        this.crosswordAuthors = cw.authors ?? [];
        this.authorCandidates = this.authorCandidates.filter(c => c.id !== candidate.id);
      }
    });
  }

  removeAuthor(userId: string): void {
    this.crosswordService.removeAuthor(this.id, userId).subscribe({
      next: (cw) => { this.crosswordAuthors = cw.authors ?? []; }
    });
  }

  addTerm() {
    this.terms.unshift({ id: '', term: '', clue: '', clueType: 'TEXT', tags: [], isNew: true });
    this.currentPage = 0;
    this.openEdit(0);
  }

  // ── Delete with confirmation ──

  requestDelete(index: number) {
    if (this.editingIndex === index) this.cancelEdit();
    this.confirmDeleteIndex = index;
  }

  confirmDelete() {
    if (this.confirmDeleteIndex === null) return;
    const index = this.confirmDeleteIndex;
    this.confirmDeleteIndex = null;
    this.selectedIndices.delete(index);
    this.terms.splice(index, 1);
    // Re-map selected indices above the removed one
    const updated = new Set<number>();
    this.selectedIndices.forEach(i => updated.add(i > index ? i - 1 : i));
    this.selectedIndices = updated;
    if (this.editingIndex !== null && this.editingIndex > index) this.editingIndex--;
    this.persist();
  }

  cancelDelete() {
    this.confirmDeleteIndex = null;
  }

  // ── Bulk delete ──

  toggleSelect(index: number) {
    if (this.selectedIndices.has(index)) {
      this.selectedIndices.delete(index);
    } else {
      this.selectedIndices.add(index);
    }
    this.selectedIndices = new Set(this.selectedIndices);
    this.confirmBulkDelete = false;
  }

  toggleSelectAll() {
    if (this.selectedIndices.size === this.terms.length) {
      this.selectedIndices = new Set();
    } else {
      this.selectedIndices = new Set(this.terms.map((_, i) => i));
    }
    this.confirmBulkDelete = false;
  }

  requestBulkDelete() {
    this.confirmBulkDelete = true;
  }

  confirmBulkDeleteAction() {
    const toRemove = Array.from(this.selectedIndices).sort((a, b) => b - a);
    for (const i of toRemove) {
      if (this.editingIndex === i) this.cancelEdit();
      this.terms.splice(i, 1);
    }
    this.selectedIndices = new Set();
    this.confirmBulkDelete = false;
    this.persist();
  }

  cancelBulkDelete() {
    this.confirmBulkDelete = false;
  }

  back() {
    this.router.navigate(['/admin/crosswords']);
  }
}
