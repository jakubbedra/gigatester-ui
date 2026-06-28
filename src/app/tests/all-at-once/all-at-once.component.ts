import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import {
  ClosedQuestionDto,
  ClosedQuestionStateRequest,
  GradingRule,
  NavigateActionDto,
  OpenQuestionDto,
  OpenQuestionStateRequest,
  QuestionStateSummaryResponse,
  StatementQuestionDto,
  StatementQuestionStateRequest,
  TestModeDto,
  TestStateResponse,
} from '../../models/models.d';
import { TestStateService } from '../../service/test-state.service';
import { QuestionStateService } from '../../service/question-state.service';
import { QuestionsService } from '../../service/question.service';

export interface QuestionEntry {
  stateSummary: QuestionStateSummaryResponse;
  question: ClosedQuestionDto | OpenQuestionDto | StatementQuestionDto;
  state: any;
  childAnswer: ClosedQuestionStateRequest | OpenQuestionStateRequest | StatementQuestionStateRequest | null;
}

type LearningPhase = 'answering' | 'reviewing' | 'result';

@Component({
  selector: 'app-all-at-once',
  templateUrl: './all-at-once.component.html',
  styleUrls: ['./all-at-once.component.css']
})
export class AllAtOnceComponent implements OnInit, OnDestroy {

  testState?: TestStateResponse;
  entries: QuestionEntry[] = [];
  loading = true;
  submitting = false;

  remainingMs = 0;
  private countdownInterval: any;

  // LEARNING mode state machine
  learningPhase: LearningPhase = 'answering';
  allCorrect = false;
  private nextRoundEntries: QuestionEntry[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private testStateService: TestStateService,
    private questionStateService: QuestionStateService,
    private questionService: QuestionsService
  ) {}

  ngOnInit() {
    const stateId = this.route.snapshot.paramMap.get('id')!;
    this.testStateService.getTestState(stateId).subscribe(ts => {
      this.testState = ts;
      if (!ts.questions.length) { this.loading = false; return; }
      this.loadEntries(ts).subscribe(entries => {
        this.entries = entries;
        this.loading = false;
        this.startCountdown();
      });
    });
  }

  onChildAnswer(i: number, answer: any) {
    this.entries[i].childAnswer = answer;
  }

  // ── LEARNING phase 1: save all answers, reload states, enter reviewing ──
  submitAnswers() {
    if (!this.testState || this.submitting) return;
    this.submitting = true;
    const saves$ = this.entries
      .filter(e => e.childAnswer)
      .map(e => this.questionStateService.updateQuestionState(
        this.testState!.id, e.stateSummary.id, { ...e.childAnswer!, answered: true }
      ));
    (saves$.length ? forkJoin(saves$) : of(null) as Observable<any>).pipe(
      switchMap(() => forkJoin(this.entries.map(e =>
        this.questionStateService.getQuestionState(this.testState!.id, e.stateSummary.id)
      )))
    ).subscribe((states: any[]) => {
      states.forEach((s, i) => this.entries[i].state = { ...s });
      this.submitting = false;
      this.learningPhase = 'reviewing';
    });
  }

  // ── LEARNING phase 2: save MANUAL scores, call FINISH, enter result ──
  finishLearningReview() {
    if (!this.testState || this.submitting) return;
    this.submitting = true;
    const saves$ = this.entries
      .filter(e => e.childAnswer && this.isManualOpen(e))
      .map(e => this.questionStateService.updateQuestionState(
        this.testState!.id, e.stateSummary.id, { ...e.childAnswer! }
      ));
    (saves$.length ? forkJoin(saves$) : of(null) as Observable<any>).pipe(
      switchMap(() => this.testStateService.updateTestState(this.testState!.id, { action: NavigateActionDto.FINISH })),
      switchMap(() => this.testStateService.getTestState(this.testState!.id))
    ).subscribe((s: TestStateResponse) => {
      this.testState = s;
      if ((s.executionState as string) === 'FINISHED') {
        this.allCorrect = true;
        this.submitting = false;
        this.learningPhase = 'result';
      } else {
        // Preload next round entries while still showing result screen
        this.loadEntries(s).subscribe(entries => {
          this.nextRoundEntries = entries;
          this.allCorrect = false;
          this.submitting = false;
          this.learningPhase = 'result';
        });
      }
    });
  }

  // ── LEARNING phase 3a: start next round ──
  startNextRound() {
    this.entries = this.nextRoundEntries;
    this.nextRoundEntries = [];
    this.learningPhase = 'answering';
  }

  // ── LEARNING phase 3b: finish test ──
  finishTest() {
    if (!this.testState) return;
    this.router.navigate(['/tests', this.testState.id, 'summary']);
  }

  // ── EXAM: save all + FINISH ──
  submitExam() {
    if (!this.testState || this.submitting) return;
    this.submitting = true;
    const saves$ = this.entries
      .filter(e => e.childAnswer)
      .map(e => this.questionStateService.updateQuestionState(
        this.testState!.id, e.stateSummary.id, { ...e.childAnswer!, answered: true }
      ));
    (saves$.length ? forkJoin(saves$) : of(null) as Observable<any>).pipe(
      switchMap(() => this.testStateService.updateTestState(this.testState!.id, { action: NavigateActionDto.FINISH })),
      switchMap(() => this.testStateService.getTestState(this.testState!.id))
    ).subscribe((s: TestStateResponse) => {
      this.testState = s;
      this.submitting = false;
      if ((s.executionState as string) === 'FINISHED') {
        this.router.navigate(['/tests', s.id, 'summary']);
      } else {
        this.reloadStates();
      }
    });
  }

  // ── EXAM review: save MANUAL open scores + FINISH ──
  finishExamReview() {
    if (!this.testState || this.submitting) return;
    this.submitting = true;
    const saves$ = this.entries
      .filter(e => e.childAnswer && this.isManualOpen(e))
      .map(e => this.questionStateService.updateQuestionState(
        this.testState!.id, e.stateSummary.id, { ...e.childAnswer! }
      ));
    (saves$.length ? forkJoin(saves$) : of(null) as Observable<any>).pipe(
      switchMap(() => this.testStateService.updateTestState(this.testState!.id, { action: NavigateActionDto.FINISH })),
      switchMap(() => this.testStateService.getTestState(this.testState!.id))
    ).subscribe((s: TestStateResponse) => {
      this.testState = s;
      this.submitting = false;
      if ((s.executionState as string) === 'FINISHED') {
        this.router.navigate(['/tests', s.id, 'summary']);
      }
    });
  }

  private loadEntries(ts: TestStateResponse): Observable<QuestionEntry[]> {
    if (!ts.questions.length) return of([]);
    return forkJoin({
      questions: forkJoin(ts.questions.map(q => this.questionService.getQuestion(q.questionId))),
      states: forkJoin(ts.questions.map(q => this.questionStateService.getQuestionState(ts.id, q.id)))
    }).pipe(
      switchMap(({ questions, states }) => of(
        ts.questions.map((summary, i) => ({
          stateSummary: summary,
          question: questions[i] as any,
          state: states[i],
          childAnswer: null
        }))
      ))
    );
  }

  private reloadStates() {
    if (!this.testState) return;
    forkJoin(this.entries.map(e =>
      this.questionStateService.getQuestionState(this.testState!.id, e.stateSummary.id)
    )).subscribe(states => {
      states.forEach((s, i) => this.entries[i].state = { ...s });
    });
  }

  private isManualOpen(entry: QuestionEntry): boolean {
    if (entry.stateSummary.questionType !== 'OPEN') return false;
    return (entry.question as OpenQuestionDto).gradingRules?.includes(GradingRule.MANUAL) ?? false;
  }

  ngOnDestroy() {
    clearInterval(this.countdownInterval);
  }

  private startCountdown() {
    if (!this.testState?.timeLimitEnabled || !this.testState.timeLimitMs) return;
    const deadline = this.testState.startTime + this.testState.timeLimitMs;
    this.remainingMs = Math.max(0, deadline - Date.now());
    this.countdownInterval = setInterval(() => {
      this.remainingMs = Math.max(0, deadline - Date.now());
      if (this.remainingMs === 0) {
        clearInterval(this.countdownInterval);
        this.submitExam();
      }
    }, 1000);
  }

  get countdownDisplay(): string {
    const total = Math.ceil(this.remainingMs / 1000);
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  get countdownUrgent(): boolean {
    return this.remainingMs > 0 && this.remainingMs < 60000;
  }

  isLearningMode()  { return this.testState?.mode === TestModeDto.LEARNING; }
  isExamMode()      { return this.testState?.mode === TestModeDto.EXAM; }
  isInReview()      { return (this.testState?.executionState as string) === 'IN_REVIEW'; }

  closedQuestion(e: QuestionEntry)    { return e.question as ClosedQuestionDto; }
  openQuestion(e: QuestionEntry)      { return e.question as OpenQuestionDto; }
  statementQuestion(e: QuestionEntry) { return e.question as StatementQuestionDto; }
  getTestMode()                       { return this.testState!.mode; }

  gradingEnabled(e: QuestionEntry): boolean {
    if (this.isLearningMode()) return this.learningPhase === 'reviewing';
    return this.isInReview();
  }

  forceLocked(e: QuestionEntry): boolean {
    if (this.isLearningMode() && this.learningPhase === 'reviewing') {
      return !this.isManualOpen(e); // only MANUAL open questions are editable in review
    }
    return this.isInReview();
  }

  answeredCount(): number {
    return this.entries.filter(e => e.state?.answered).length;
  }
}
