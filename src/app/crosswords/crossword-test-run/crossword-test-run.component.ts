import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CrosswordTestRunService, TestRunTerm } from '../../service/crossword-test-run.service';

type Phase = 'loading' | 'error' | 'question' | 'feedback' | 'results';

@Component({
  selector: 'app-crossword-test-run',
  templateUrl: './crossword-test-run.component.html',
  styleUrls: ['./crossword-test-run.component.css']
})
export class CrosswordTestRunComponent implements OnInit, OnDestroy {

  @ViewChild('answerInput') answerInputEl!: ElementRef<HTMLInputElement>;

  crosswordId!: string;
  phase: Phase = 'loading';
  errorMsg = '';

  terms: TestRunTerm[] = [];
  currentIndex = 0;
  answer = '';
  lastCorrect = false;
  wrongTermIds: string[] = [];
  submitting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private testRunService: CrosswordTestRunService
  ) {}

  private globalKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    if (this.phase === 'question' && this.answer.trim()) this.submit();
    else if (this.phase === 'feedback') this.next();
  };

  ngOnInit() {
    document.addEventListener('keydown', this.globalKeydown);
    this.crosswordId = this.route.snapshot.paramMap.get('id')!;
    const mode = (this.route.snapshot.queryParamMap.get('mode') ?? 'ALL') as 'ALL' | 'WRONG_ONLY';

    this.testRunService.startTestRun(this.crosswordId, mode).subscribe({
      next: (resp) => {
        this.terms = resp.terms;
        this.phase = 'question';
        setTimeout(() => this.focusInput(), 0);
      },
      error: () => {
        this.errorMsg = 'Failed to start test run.';
        this.phase = 'error';
      }
    });
  }

  get current(): TestRunTerm { return this.terms[this.currentIndex]; }
  get progress(): number { return this.terms.length ? Math.round((this.currentIndex / this.terms.length) * 100) : 0; }
  get correctCount(): number { return this.terms.length - this.wrongTermIds.length; }

  submit() {
    if (!this.answer.trim() || this.submitting) return;
    const correct = this.answer.trim().toLowerCase() === this.current.term.toLowerCase();
    if (!correct) this.wrongTermIds.push(this.current.id);
    this.lastCorrect = correct;
    this.phase = 'feedback';
  }

  next() {
    this.answer = '';
    this.currentIndex++;
    if (this.currentIndex >= this.terms.length) {
      this.finishRun();
    } else {
      this.phase = 'question';
      setTimeout(() => this.focusInput(), 0);
    }
  }

  private finishRun() {
    this.submitting = true;
    this.testRunService.completeTestRun(this.crosswordId, this.wrongTermIds, this.terms.length).subscribe({
      next: () => {
        this.submitting = false;
        this.phase = 'results';
      },
      error: () => {
        this.submitting = false;
        this.phase = 'results';
      }
    });
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.globalKeydown);
  }

  onKeydown(e: KeyboardEvent) {
    e.stopPropagation();
  }

  retryAll() {
    this.router.navigate(['/crosswords', this.crosswordId, 'test-run'], { queryParams: { mode: 'ALL' } });
  }

  retryWrong() {
    this.router.navigate(['/crosswords', this.crosswordId, 'test-run'], { queryParams: { mode: 'WRONG_ONLY' } });
  }

  generateCrossword() {
    this.router.navigate(['/crosswords', this.crosswordId], {
      queryParams: { termIds: this.wrongTermIds.join(',') }
    });
  }

  backToView() {
    this.router.navigate(['/crosswords', this.crosswordId]);
  }

  private focusInput() {
    this.answerInputEl?.nativeElement?.focus();
  }
}
