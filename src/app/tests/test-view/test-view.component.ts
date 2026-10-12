import {Component, OnDestroy, OnInit} from '@angular/core';
import {ExamAttempt, ExamService} from '../../service/exam.service';
import {ActivatedRoute, Router} from "@angular/router";
import {TagResponse, TestDisplayTypeDto, TestModeDto, TestResponse, TestStateRequest, TestStateResponse} from "../../models/models.d";
import {TestService} from "../../service/test.service";
import {AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn} from "@angular/forms";
import {TestStateService} from "../../service/test-state.service";
import {TagService} from "../../service/tag.service";
import {AuthService} from "../../service/auth.service";
import {MetricsService, ProgressResponse, RankingEntryDto, TagAccuracyDto} from "../../service/metrics.service";
import {PermissionService} from "../../service/permission.service";
import {Permission} from "../../models/models.d";

@Component({
  selector: 'app-test-view',
  templateUrl: './test-view.component.html',
  styleUrls: ['./test-view.component.css']
})
export class TestViewComponent implements OnInit, OnDestroy {

  // ── Scheduled exam ───────────────────────────────────────────────────────
  examState: TestStateResponse | null = null;
  examAttempts: ExamAttempt[] = [];
  examError: string | null = null;
  examStarting = false;
  nowMs = Date.now();
  private clock?: ReturnType<typeof setInterval>;

  get isScheduled(): boolean {
    return this.test?.type === 'SCHEDULED_EXAM';
  }

  get examStartMs(): number { return this.test?.startAt ? new Date(this.test.startAt).getTime() : 0; }
  get examEndMs(): number { return this.test?.windowEnd ? new Date(this.test.windowEnd).getTime() : 0; }

  get examPhase(): 'before' | 'open' | 'closed' {
    if (this.nowMs < this.examStartMs) return 'before';
    if (this.nowMs >= this.examEndMs) return 'closed';
    return 'open';
  }

  get examTimeLimitMinutes(): number {
    return Math.round((this.test?.timeLimit ?? 0) / 60000);
  }

  /** Start can be pressed inside the window, and only if there is no attempt yet. */
  get canStartExam(): boolean {
    return this.examPhase === 'open' && !this.examState;
  }

  startExam(): void {
    if (this.examStarting || !this.canStartExam) return;
    this.examStarting = true;
    this.examError = null;
    this.testStateService.createTestState(this.testId, this.buildDefaultState(this.test)).subscribe({
      next: (stateId: any) => {
        this.examStarting = false;
        this.router.navigate(['/tests', stateId, 'executions']);
      },
      error: err => {
        this.examStarting = false;
        this.examError = err?.error?.message || 'Could not start the exam.';
        this.loadExamState();
      }
    });
  }

  continueExam(): void {
    if (this.examState) this.router.navigate(['/tests', this.examState.id, 'executions']);
  }

  reviewExam(): void {
    if (this.examState) this.router.navigate(['/tests', this.testId, 'attempts', this.examState.id]);
  }

  openAttempt(attempt: ExamAttempt): void {
    this.router.navigate(['/tests', this.testId, 'attempts', attempt.stateId]);
  }

  private loadExamState(): void {
    this.testStateService.getTestStateFromTestId(this.testId).subscribe({
      next: state => this.examState = state,
      error: () => this.examState = null
    });
  }

  private loadExamAttempts(): void {
    this.examService.getAttempts(this.testId).subscribe({
      next: list => this.examAttempts = list,
      error: () => this.examAttempts = []
    });
  }

  ngOnDestroy(): void {
    if (this.clock) clearInterval(this.clock);
  }


  form!: FormGroup;
  testId!: string;
  test!: TestResponse;

  existingState: TestStateResponse | null = null;
  showNewForm = false;

  activeTab: 'start' | 'stats' = 'start';
  statsProgress: ProgressResponse | null = null;
  statsRanking: RankingEntryDto[] = [];
  statsSortBy = 'accuracy';
  statsLoaded = false;

  allTags: TagResponse[] = [];
  selectedTags: TagResponse[] = [];
  excludeTags = false;
  matchAllTags = false;
  availableClosed = 0;
  availableOpen = 0;
  availableStatement = 0;
  distributionMode: 'RANDOM' | 'MAX_PER_TAG' | 'WORST' = 'RANDOM';
  maxPerTag = 1;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private testService: TestService,
    private testStateService: TestStateService,
    private tagService: TagService,
    private authService: AuthService,
    private metricsService: MetricsService,
    private permissionService: PermissionService,
    private examService: ExamService
  ) {
    this.clock = setInterval(() => this.nowMs = Date.now(), 1000);
  }

  openStatsTab() {
    this.activeTab = 'stats';
    if (!this.statsLoaded) {
      this.statsLoaded = true;
      this.loadStats();
    }
  }

  loadStats() {
    this.metricsService.getProgress(this.testId).subscribe(p => this.statsProgress = p);
    this.metricsService.getRanking(this.testId, this.statsSortBy).subscribe(r => this.statsRanking = r);
  }

  changeSortBy(sortBy: string) {
    this.statsSortBy = sortBy;
    this.metricsService.getRanking(this.testId, sortBy).subscribe(r => this.statsRanking = r);
  }

  get statsTagStats(): TagAccuracyDto[] {
    return this.statsProgress?.tagStats ?? [];
  }

  get statsAccuracy(): number {
    if (!this.statsProgress || this.statsProgress.totalQuestionsAnswered === 0) return 0;
    return Math.round(this.statsProgress.totalQuestionsCorrect / this.statsProgress.totalQuestionsAnswered * 100);
  }

  get statsPassRate(): number {
    if (!this.statsProgress || this.statsProgress.totalTestsTaken === 0) return 0;
    return Math.round(this.statsProgress.totalTestsPassed / this.statsProgress.totalTestsTaken * 100);
  }

  get currentUsername(): string {
    return this.authService.getUser()?.username ?? '';
  }

  get canModify(): boolean {
    return this.permissionService.hasPermission(Permission.TESTS_WRITE);
  }

  editTest(): void {
    this.router.navigate(['/admin/tests', this.testId, 'edit']);
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {

      this.testId = params.get('id')!;

      this.testService.getTest(this.testId).subscribe({next: test => {
        this.test = test;
        if (test.type === 'SCHEDULED_EXAM') {
          this.loadExamState();
          if (this.canModify) this.loadExamAttempts();
        }
        this.testService.getTestTags(this.testId).subscribe(tags => this.allTags = tags);
        this.availableClosed = test.storedClosedQuestionsCount;
        this.availableOpen = test.storedOpenQuestionsCount;
        this.availableStatement = 0;

        const defaults = this.buildDefaultState(test);
        this.form = this.fb.group({
          closedQuestionsCount: [defaults.closedQuestionsCount],
          openQuestionsCount: [defaults.openQuestionsCount],
          passingPercentage: [defaults.passingPercentage],
          mode: [defaults.mode],
          displayType: [defaults.displayType],
          timeLimitEnabled: [defaults.timeLimitEnabled],
          timeLimitMinutes: [test.timeLimit > 0 ? Math.round(test.timeLimit / 60000) : 30]
        }, { validators: () => this.examValidatorFn() });

        this.testStateService.getTestStateFromTestId(this.testId).subscribe({
          next: (state) => {
            if (state.executionState !== 'FINISHED') {
              this.existingState = state;
              this.showNewForm = false;
            } else {
              this.existingState = null;
              this.showNewForm = true;
            }
          },
          error: () => {
            this.existingState = null;
            this.showNewForm = true;
          }
        });
      }, error: () => this.router.navigate(['/home'])});

    });
  }

  buildDefaultState(test: TestResponse): TestStateRequest {
    return {
      passingPercentage: 0,
      closedQuestionsCount: test.closedQuestionsCount,
      openQuestionsCount: test.openQuestionsCount,
      statementQuestionsCount: 0,
      ...(test.passingPercentage !== undefined && test.passingPercentage !== null
        ? { passingPercentage: test.passingPercentage }
        : {}),
      mode: TestModeDto.EXAM,
      displayType: TestDisplayTypeDto.ONE_BY_ONE,
      timeLimitEnabled: false
    };
  }

  continueTest(): void {
    if (!this.existingState) return;
    const path = this.existingState.displayType === 'ALL_AT_ONCE'
      ? `/tests/${this.existingState.id}/executions/all`
      : `/tests/${this.existingState.id}/executions`;
    this.router.navigate([path]);
  }

  submit() {
    if (this.form.invalid) return;
    // console.log(this.form.value);

    const { timeLimitMinutes, ...formVals } = this.form.value;
    const state = {
      ...formVals,
      tagIds: this.selectedTags.map(t => t.id),
      excludeTags: this.excludeTags,
      matchAllTags: this.matchAllTags,
      distributionMode: this.distributionMode,
      maxPerTag: this.distributionMode === 'MAX_PER_TAG' ? this.maxPerTag : 0,
      timeLimitMs: formVals.timeLimitEnabled ? timeLimitMinutes * 60000 : 0
    };
    this.testStateService.createTestState(this.testId, state).subscribe({
      next: (response) => {
        const path = state.displayType === TestDisplayTypeDto.ALL_AT_ONCE
          ? `/tests/${response}/executions/all`
          : `/tests/${response}/executions`;
        this.router.navigate([path]);
      },
      error: (err) => console.error(err)
    });
  }

  modes() {
    return [TestModeDto.EXAM, TestModeDto.LEARNING];
  }

  displayTypes() {
    return [TestDisplayTypeDto.ALL_AT_ONCE, TestDisplayTypeDto.ONE_BY_ONE];
  }

  isExamMode(): boolean {
    return this.form.get('mode')?.value === 'EXAM';
  }

  private examValidatorFn(): ValidationErrors | null {
    if (!this.form) return null;
    if (this.form.get('mode')?.value !== TestModeDto.EXAM) return null;
    const closed = Number(this.form.get('closedQuestionsCount')?.value) || 0;
    const open = Number(this.form.get('openQuestionsCount')?.value) || 0;
    const errors: ValidationErrors = {};
    if (closed + open < 1) errors['minOneQuestion'] = true;
    if (closed > this.availableClosed) errors['tooManyClosed'] = { max: this.availableClosed };
    if (open > this.availableOpen) errors['tooManyOpen'] = { max: this.availableOpen };
    return Object.keys(errors).length ? errors : null;
  }

  examValidator(test: TestResponse): ValidatorFn {
    return (): ValidationErrors | null => this.examValidatorFn();
  }

  get availableTags(): TagResponse[] {
    const selectedIds = new Set(this.selectedTags.map(t => t.id));
    return this.allTags.filter(t => !selectedIds.has(t.id));
  }

  toggleTag(tag: TagResponse) {
    const idx = this.selectedTags.findIndex(t => t.id === tag.id);
    if (idx === -1) this.selectedTags = [...this.selectedTags, tag];
    else this.selectedTags = this.selectedTags.filter(t => t.id !== tag.id);
    if (this.distributionMode === 'MAX_PER_TAG' && this.selectedTags.length === 0) this.distributionMode = 'RANDOM';
    this.refreshCounts();
  }

  onExcludeToggle() {
    if (this.distributionMode === 'MAX_PER_TAG' && this.excludeTags) this.distributionMode = 'RANDOM';
    if (this.selectedTags.length > 0) this.refreshCounts();
  }

  onMatchModeToggle() {
    if (this.selectedTags.length > 0) this.refreshCounts();
  }

  setDistributionMode(mode: 'RANDOM' | 'MAX_PER_TAG' | 'WORST') {
    this.distributionMode = mode;
    this.refreshCounts();
  }

  onMaxPerTagChange() {
    if (this.distributionMode === 'MAX_PER_TAG' && this.selectedTags.length > 0) this.refreshCounts();
  }

  private refreshCounts() {
    const tagIds = this.selectedTags.map(t => t.id);
    const maxPerTag = this.distributionMode === 'MAX_PER_TAG' ? this.maxPerTag : 0;
    const worstOnly = this.distributionMode === 'WORST';
    this.testService.getQuestionCounts(this.testId, tagIds, this.excludeTags, this.matchAllTags, maxPerTag, worstOnly).subscribe(counts => {
      this.availableClosed = counts.closedQuestionsCount;
      this.availableOpen = counts.openQuestionsCount;
      this.availableStatement = counts.statementQuestionsCount;
      // Clamp current form values to the new limits
      const cc = this.form.get('closedQuestionsCount');
      const oc = this.form.get('openQuestionsCount');
      if (cc && cc.value > this.availableClosed) cc.setValue(this.availableClosed);
      if (oc && oc.value > this.availableOpen) oc.setValue(this.availableOpen);
      this.form.updateValueAndValidity();
    });
  }

  isTagSelected(tag: TagResponse): boolean {
    return this.selectedTags.some(t => t.id === tag.id);
  }

  get validationErrors() {
    return this.form.errors;
  }

}
