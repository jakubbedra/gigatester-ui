import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TestService } from '../../service/test.service';
import { QuestionsService } from '../../service/question.service';
import { ImageService } from '../../service/image.service';
import { TagService } from '../../service/tag.service';
import { AuthService } from '../../service/auth.service';
import {
  TestResponse,
  ClosedQuestionDto,
  OpenQuestionDto,
  StatementQuestionDto,
  QuestionDtoUnion,
  GradingRule,
  TagResponse,
  SubjectAuthor,
} from '../../models/models.d';
import { AuthorCandidate } from '../../service/subject.service';

@Component({
  selector: 'app-test-edit',
  templateUrl: './test-edit.component.html',
  styleUrls: ['./test-edit.component.css']
})
export class TestEditComponent implements OnInit {
  test: TestResponse | null = null;
  questions: QuestionDtoUnion[] = [];
  testName = '';
  saving = false;
  loading = true;
  listLoading = false;

  // Pagination & search
  page = 0;
  pageSize = 20;
  totalQuestions = 0;
  searchQuery = '';
  readonly pageSizes = [10, 20, 50];
  private searchSubject = new Subject<string>();


  // Edit modal
  editingQuestion: QuestionDtoUnion | null = null;
  editDraft: any = null;
  savingQuestion = false;
  showPreview = false;
  uploadingImage = false;

  // Tag management
  allTags: TagResponse[] = [];
  tagSearch = '';
  tagDropdownOpen = false;

  get filteredTags(): TagResponse[] {
    const q = this.tagSearch.toLowerCase().trim();
    const assignedIds = new Set((this.editDraft?.tags ?? []).map((t: TagResponse) => t.id));
    return this.allTags.filter(t =>
      !assignedIds.has(t.id) && (!q || t.key.toLowerCase().includes(q))
    );
  }

  get canCreateTag(): boolean {
    const q = this.tagSearch.trim();
    return q.length > 0 && !this.allTags.some(t => t.key.toLowerCase() === q.toLowerCase());
  }

  // Authors
  testAuthors: SubjectAuthor[] = [];
  showAuthorPopup = false;
  authorCandidates: AuthorCandidate[] = [];
  authorCandidatesLoading = false;
  authorSearch = '';

  // Add question modal
  showAddModal = false;
  addDraft: any = null;
  addType: 'CLOSED' | 'OPEN' | 'STATEMENT' = 'CLOSED';
  addingQuestion = false;

  // Confirm dialog
  confirmMessage = '';
  private confirmCallback: (() => void) | null = null;
  showConfirm = false;

  readonly gradingRuleOptions: GradingRule[] = [
    GradingRule.IGNORE_CASE,
    GradingRule.IGNORE_PUNCTUATION,
    GradingRule.TRIM_WHITESPACE,
    GradingRule.MANUAL,
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private testService: TestService,
    private questionsService: QuestionsService,
    private imageService: ImageService,
    private tagService: TagService,
    private sanitizer: DomSanitizer,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.testService.getTest(id).subscribe(test => {
      this.test = test;
      this.testName = test.name;
      this.testAuthors = test.authors ?? [];
      this.loadPage(true);
    });
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.page = 0;
      this.loadPage();
    });
  }

  loadPage(initial = false) {
    if (!this.test) return;
    if (initial) { this.loading = true; } else { this.listLoading = true; }
    this.testService.getTestQuestions(this.test.id, this.page, this.pageSize, this.searchQuery).subscribe(res => {
      this.questions = res.questions as QuestionDtoUnion[];
      this.totalQuestions = res.total;
      this.loading = false;
      this.listLoading = false;
    });
  }

  get totalPages(): number { return Math.max(1, Math.ceil(this.totalQuestions / this.pageSize)); }

  setPage(p: number) {
    this.page = Math.max(0, Math.min(p, this.totalPages - 1));
    this.loadPage();
  }

  setPageSize(s: number) {
    this.pageSize = s;
    this.page = 0;
    this.loadPage();
  }

  onSearchChange() {
    this.searchSubject.next(this.searchQuery);
  }

  save() {
    if (!this.test || !this.testName.trim()) return;
    this.saving = true;
    const name = this.testName.trim();
    this.testService.updateTest(this.test.id, { ...this.buildTestRequest(this.test.questions), name })
      .subscribe(() => { this.saving = false; });
  }

  private buildTestRequest(questions: string[]): any {
    return {
      name: this.testName,
      questions,
      closedQuestionsCount: this.test!.closedQuestionsCount,
      openQuestionsCount: this.test!.openQuestionsCount,
      passingPercentage: this.test!.passingPercentage,
      hideTagsDuringTest: this.test!.hideTagsDuringTest
    };
  }

  removeQuestion(questionId: string) {
    if (!this.test) return;
    if (!questionId) {
      alert('Question has no id — the backend is running an outdated build. Rebuild and restart the server.');
      return;
    }
    this.openConfirm('Remove this question from the test?', () => {
      this.test!.questions = this.test!.questions.filter(id => id !== questionId);
      this.testService.updateTest(this.test!.id, this.buildTestRequest(this.test!.questions))
        .subscribe(() => this.loadPage());
    });
  }

  openConfirm(message: string, onConfirm: () => void) {
    this.confirmMessage = message;
    this.confirmCallback = onConfirm;
    this.showConfirm = true;
  }

  confirmYes() {
    this.showConfirm = false;
    this.confirmCallback?.();
    this.confirmCallback = null;
  }

  confirmNo() {
    this.showConfirm = false;
    this.confirmCallback = null;
  }

  get canModify(): boolean {
    const role = this.authService.getUser()?.role;
    return role === 'MODERATOR' || role === 'ADMIN';
  }

  avatarFallback(username: string): string {
    return username?.charAt(0).toUpperCase() ?? '?';
  }

  openAuthorPopup(): void {
    if (!this.test) return;
    this.showAuthorPopup = true;
    this.authorSearch = '';
    this.authorCandidatesLoading = true;
    this.testService.getAuthorCandidates(this.test.id).subscribe({
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
    if (!this.test) return;
    this.testService.addAuthor(this.test.id, candidate.id).subscribe({
      next: (t) => {
        this.testAuthors = t.authors ?? [];
        this.authorCandidates = this.authorCandidates.filter(c => c.id !== candidate.id);
      }
    });
  }

  removeAuthor(userId: string): void {
    if (!this.test) return;
    this.testService.removeAuthor(this.test.id, userId).subscribe({
      next: (t) => { this.testAuthors = t.authors ?? []; }
    });
  }

  // ── HTML helpers ──────────────────────────────────────────────────────────

  isHtml(type: string | undefined): boolean {
    return type === 'HTML';
  }

  safe(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // ── Edit modal ────────────────────────────────────────────────────────────

  openEdit(q: QuestionDtoUnion) {
    this.editingQuestion = q;
    this.editDraft = JSON.parse(JSON.stringify(q));
    this.showPreview = false;
    this.tagSearch = '';
    this.tagDropdownOpen = false;
    this.tagService.getTags().subscribe(tags => this.allTags = tags);
  }

  closeEdit() {
    this.editingQuestion = null;
    this.editDraft = null;
    this.showPreview = false;
    this.tagDropdownOpen = false;
  }

  assignTag(tag: TagResponse) {
    if (!this.editDraft?.id) return;
    this.tagService.addTagToQuestion(this.editDraft.id, tag.id).subscribe(() => {
      this.editDraft.tags = [...(this.editDraft.tags ?? []), tag];
      const q = this.questions.find((q: any) => q.id === this.editDraft.id);
      if (q) (q as any).tags = this.editDraft.tags;
      this.tagSearch = '';
      this.tagDropdownOpen = false;
    });
  }

  removeTag(tag: TagResponse) {
    if (!this.editDraft?.id) return;
    this.tagService.removeTagFromQuestion(this.editDraft.id, tag.id).subscribe(() => {
      this.editDraft.tags = (this.editDraft.tags ?? []).filter((t: TagResponse) => t.id !== tag.id);
      const q = this.questions.find((q: any) => q.id === this.editDraft.id);
      if (q) (q as any).tags = this.editDraft.tags;
    });
  }

  createAndAssignTag() {
    const key = this.tagSearch.trim();
    if (!key) return;
    this.tagService.createTag({ key }).subscribe(newId => {
      const newTag: TagResponse = { id: newId, key };
      this.allTags = [...this.allTags, newTag];
      this.assignTag(newTag);
    });
  }

  uploadImage(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.editDraft?.id) return;
    this.uploadingImage = true;
    this.imageService.uploadImage(this.editDraft.id, file).subscribe({
      next: (url) => {
        const tag = `<img src="${url}" width="40%" height="40%">`;
        this.editDraft.content.text = (this.editDraft.content.text || '') + tag;
        this.uploadingImage = false;
        (event.target as HTMLInputElement).value = '';
      },
      error: () => { this.uploadingImage = false; }
    });
  }

  saveQuestionEdit() {
    if (!this.editDraft) return;
    this.savingQuestion = true;
    const id = this.editDraft.id;
    this.questionsService.updateQuestion(id, this.editDraft).subscribe({
      next: () => {
        this.savingQuestion = false;
        this.closeEdit();
        this.loadPage();
      },
      error: () => {
        this.savingQuestion = false;
      }
    });
  }

  // ── Add question ──────────────────────────────────────────────────────────

  openAddQuestion() {
    this.addType = 'CLOSED';
    this.addDraft = this.buildAddDraft('CLOSED');
    this.showAddModal = true;
  }

  setAddType(type: 'CLOSED' | 'OPEN' | 'STATEMENT') {
    this.addType = type;
    this.addDraft = this.buildAddDraft(type);
  }

  readonly htmlTemplate = '<img src="" width="40%" height="40%"></img>\n<p>  </p>';

  private buildAddDraft(type: 'CLOSED' | 'OPEN' | 'STATEMENT'): any {
    const base = {
      type,
      content: { type: 'TEXT', text: '' },
      explanation: null,
      contentProportions: 1,
      answerProportions: 2,
      tags: [],
      points: 1,
    };
    switch (type) {
      case 'CLOSED':
        return { ...base, multipleChoice: false, answers: [] };
      case 'OPEN':
        return { ...base, answer: { type: 'TEXT', text: '' }, answerVariations: [], gradingRules: [], multipleAnswers: false, orderedAnswers: false };
      case 'STATEMENT':
        return { ...base, statements: [] };
    }
  }

  createQuestion() {
    if (!this.test || !this.addDraft) return;
    this.addingQuestion = true;
    this.questionsService.addQuestion(this.addDraft).subscribe((created: any) => {
      const newId = created?.id ?? created;
      this.test!.questions = [newId, ...this.test!.questions];
      this.testService.updateTest(this.test!.id, this.buildTestRequest(this.test!.questions)).subscribe(() => {
        this.addingQuestion = false;
        this.showAddModal = false;
        this.page = 0;
        this.loadPage();
      });
    });
  }

  duplicateQuestion(q: QuestionDtoUnion) {
    if (!this.test) return;
    const draft = JSON.parse(JSON.stringify(q));
    delete draft.id;
    this.questionsService.addQuestion(draft).subscribe((created: any) => {
      const newId = created?.id ?? created;
      this.test!.questions = [newId, ...this.test!.questions];
      this.testService.updateTest(this.test!.id, this.buildTestRequest(this.test!.questions)).subscribe(() => {
        this.questionsService.getQuestion(newId).subscribe((newQ: any) => {
          this.questions = [newQ, ...this.questions];
          this.totalQuestions += 1;
        });
      });
    });
  }

  cancelAdd() {
    this.showAddModal = false;
    this.addDraft = null;
  }

  // ── Shared answer/statement helpers (work on any draft) ──────────────────

  addAnswer(draft = this.editDraft) {
    draft.answers = draft.answers || [];
    draft.answers.push({ id: '', text: '', correct: false, points: 0 });
  }

  removeAnswer(i: number, draft = this.editDraft) {
    draft.answers.splice(i, 1);
  }

  addVariation(draft = this.editDraft) {
    draft.answerVariations = draft.answerVariations || [];
    draft.answerVariations.push({ type: 'TEXT', text: '' });
  }

  removeVariation(i: number, draft = this.editDraft) {
    draft.answerVariations.splice(i, 1);
  }

  toggleGradingRule(rule: GradingRule, draft = this.editDraft) {
    const rules: GradingRule[] = draft.gradingRules || [];
    const idx = rules.indexOf(rule);
    if (idx === -1) rules.push(rule); else rules.splice(idx, 1);
    draft.gradingRules = rules;
  }

  hasGradingRule(rule: GradingRule, draft = this.editDraft): boolean {
    return (draft.gradingRules || []).includes(rule);
  }

  addStatement(draft = this.editDraft) {
    draft.statements = draft.statements || [];
    draft.statements.push({ text: '', answer: true });
  }

  removeStatement(i: number, draft = this.editDraft) {
    draft.statements.splice(i, 1);
  }

  // ── Lazy image loading ────────────────────────────────────────────────────

  private imagesLoaded = new Set<string>();

  hasImages(text: string | null | undefined): boolean {
    return /<img/i.test(text ?? '');
  }

  isImgLoaded(id: string): boolean {
    return this.imagesLoaded.has(id);
  }

  loadImages(id: string) {
    this.imagesLoaded.add(id);
  }

  // ── Type casts ────────────────────────────────────────────────────────────

  asClosed(q: QuestionDtoUnion): ClosedQuestionDto { return q as ClosedQuestionDto; }
  asOpen(q: QuestionDtoUnion): OpenQuestionDto { return q as OpenQuestionDto; }
  asStatement(q: QuestionDtoUnion): StatementQuestionDto { return q as StatementQuestionDto; }

  onTagBlur() {
    setTimeout(() => { this.tagDropdownOpen = false; }, 200);
  }

  stopPropagation(e: Event) { e.stopPropagation(); }

  back() { this.router.navigate(['/admin/tests']); }
}
