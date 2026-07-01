import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TestService } from '../../service/test.service';
import { CrosswordService } from '../../service/crossword.service';
import { SubjectsService } from '../../service/subject.service';
import { CommentService } from '../../service/comment.service';
import { AuthService } from '../../service/auth.service';
import { CommentResponse, TestSummaryResponse, CrosswordSummaryResponse, SubjectAuthor } from '../../models/models.d';

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
  subjectDescription: string | null = null;
  subjectDifficulty: number = 0;
  subjectTestIds: string[] = [];
  subjectCrosswordIds: string[] = [];
  comments: CommentResponse[] = [];
  subjectAuthors: SubjectAuthor[] = [];
  expandedReplies = new Set<string>();

  addAuthorInput = '';
  addAuthorLoading = false;
  addAuthorError = '';

  editingDescription = false;
  editDescriptionValue = '';
  savingDescription = false;

  quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ size: ['small', false, 'large', 'huge'] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean']
    ]
  };

  newCommentText = '';
  submittingComment = false;

  replyingTo: string | null = null;
  replyText = '';
  submittingReply = false;

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
    private commentService: CommentService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  get canModify(): boolean {
    const role = this.authService.getUser()?.role;
    return role === 'MODERATOR' || role === 'ADMIN';
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.subjectId = params.get('id') ?? this.route.snapshot.queryParamMap.get('subjectId');
      this.load();
    });
  }

  load() {
    if (this.subjectId) {
      this.subjectsService.getSubject(this.subjectId).pipe(
        switchMap(subject => {
          this.subjectName = subject.name;
          this.subjectDescription = subject.description;
          this.subjectDifficulty = subject.difficulty ?? 0;
          this.subjectTestIds = subject.tests ?? [];
          this.subjectCrosswordIds = subject.crosswords ?? [];
          this.comments = subject.comments ?? [];
          this.subjectAuthors = subject.authors ?? [];
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
      this.subjectDescription = null;
      this.subjectDifficulty = 0;
      this.subjectTestIds = [];
      this.subjectCrosswordIds = [];
      this.comments = [];
      this.subjectAuthors = [];
      this.testService.getTests().subscribe(res => {
        this.tests = res.tests;
        this.crosswords = [];
      });
    }
  }

  hoverDifficulty: number | null = null;
  editingDifficulty = false;
  readonly tenArray = Array.from({ length: 10 }, (_, i) => i + 1);

  get effectiveDifficulty(): number {
    return this.editingDifficulty && this.hoverDifficulty !== null
      ? this.hoverDifficulty
      : this.subjectDifficulty;
  }

  setDifficulty(value: number) {
    if (!this.subjectId || !this.subjectName) return;
    this.subjectDifficulty = value;
    this.hoverDifficulty = null;
    this.editingDifficulty = false;
    this.subjectsService.updateSubject(this.subjectId, {
      name: this.subjectName,
      description: this.subjectDescription ?? '',
      difficulty: value,
      tests: this.subjectTestIds,
      crosswords: this.subjectCrosswordIds
    }).subscribe({ error: () => { this.subjectDifficulty = this.subjectDifficulty; } });
  }

  difficultyLabelKey(value: number): string {
    if (value <= 2) return 'SUBJECTS.DIFFICULTY_EASY';
    if (value <= 4) return 'SUBJECTS.DIFFICULTY_MEDIUM';
    if (value <= 6) return 'SUBJECTS.DIFFICULTY_HARD';
    if (value <= 8) return 'SUBJECTS.DIFFICULTY_VERY_HARD';
    return 'SUBJECTS.DIFFICULTY_EXPERT';
  }

  submitComment() {
    if (!this.subjectId || !this.newCommentText.trim()) return;
    this.submittingComment = true;
    this.commentService.addComment(this.subjectId, this.newCommentText.trim()).subscribe({
      next: (c) => {
        this.comments = [c, ...this.comments];
        this.newCommentText = '';
        this.submittingComment = false;
      },
      error: () => { this.submittingComment = false; }
    });
  }

  startReply(commentId: string) {
    this.replyingTo = commentId;
    this.replyText = '';
  }

  cancelReply() {
    this.replyingTo = null;
    this.replyText = '';
  }

  submitReply(comment: CommentResponse) {
    if (!this.subjectId || !this.replyText.trim()) return;
    this.submittingReply = true;
    this.commentService.addReply(this.subjectId, comment.id, this.replyText.trim()).subscribe({
      next: (r) => {
        comment.responses = [...(comment.responses ?? []), r];
        this.replyingTo = null;
        this.replyText = '';
        this.submittingReply = false;
      },
      error: () => { this.submittingReply = false; }
    });
  }

  like(comment: CommentResponse) {
    if (!this.subjectId) return;
    this.commentService.like(this.subjectId, comment.id).subscribe(() => {
      if (comment.likedByMe) {
        comment.likes--;
        comment.likedByMe = false;
      } else {
        comment.likes++;
        comment.likedByMe = true;
        if (comment.dislikedByMe) { comment.dislikes--; comment.dislikedByMe = false; }
      }
    });
  }

  dislike(comment: CommentResponse) {
    if (!this.subjectId) return;
    this.commentService.dislike(this.subjectId, comment.id).subscribe(() => {
      if (comment.dislikedByMe) {
        comment.dislikes--;
        comment.dislikedByMe = false;
      } else {
        comment.dislikes++;
        comment.dislikedByMe = true;
        if (comment.likedByMe) { comment.likes--; comment.likedByMe = false; }
      }
    });
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  avatarFallback(username: string): string {
    return username?.charAt(0).toUpperCase() ?? '?';
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

  canDeleteComment(comment: CommentResponse): boolean {
    if (this.canModify) return true;
    const user = this.authService.getUser();
    return !!user && user.username === comment.authorUsername;
  }

  deleteComment(comment: CommentResponse) {
    if (!this.subjectId) return;
    this.commentService.deleteComment(this.subjectId, comment.id).subscribe(() => {
      this.comments = this.comments.filter(c => c.id !== comment.id);
    });
  }

  startEditDescription() {
    this.editDescriptionValue = this.subjectDescription ?? '';
    this.editingDescription = true;
  }

  onEditorCreated(quill: any) {
    if (this.editDescriptionValue) {
      quill.clipboard.dangerouslyPasteHTML(0, this.editDescriptionValue);
    }
  }

  cancelEditDescription() {
    this.editingDescription = false;
  }

  saveDescription() {
    if (!this.subjectId || !this.subjectName) return;
    this.savingDescription = true;
    this.subjectsService.updateSubject(this.subjectId, {
      name: this.subjectName,
      description: this.editDescriptionValue,
      difficulty: this.subjectDifficulty,
      tests: this.subjectTestIds,
      crosswords: this.subjectCrosswordIds
    }).subscribe({
      next: () => {
        this.subjectDescription = this.editDescriptionValue;
        this.editingDescription = false;
        this.savingDescription = false;
      },
      error: () => { this.savingDescription = false; }
    });
  }

  toggleReplies(commentId: string): void {
    if (this.expandedReplies.has(commentId)) {
      this.expandedReplies.delete(commentId);
    } else {
      this.expandedReplies.add(commentId);
    }
  }

  repliesExpanded(commentId: string): boolean {
    return this.expandedReplies.has(commentId);
  }

  openUserProfile(userId: string): void {
    this.router.navigate(['/users', userId]);
  }

  addAuthor(): void {
    if (!this.subjectId || !this.addAuthorInput.trim()) return;
    this.addAuthorLoading = true;
    this.addAuthorError = '';
    this.subjectsService.addAuthor(this.subjectId, this.addAuthorInput.trim()).subscribe({
      next: (subject) => {
        this.subjectAuthors = subject.authors ?? [];
        this.addAuthorInput = '';
        this.addAuthorLoading = false;
      },
      error: () => { this.addAuthorError = 'User not found or invalid ID.'; this.addAuthorLoading = false; }
    });
  }

  removeAuthor(userId: string): void {
    if (!this.subjectId) return;
    this.subjectsService.removeAuthor(this.subjectId, userId).subscribe({
      next: (subject) => { this.subjectAuthors = subject.authors ?? []; }
    });
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
