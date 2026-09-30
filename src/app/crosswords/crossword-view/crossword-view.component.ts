import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BotDifficulty, CrosswordResponse, CrosswordStateResponse, MultiplayerSessionSummaryResponse, TagResponse } from '../../models/models.d';
import { CrosswordService } from '../../service/crossword.service';
import { CrosswordStateService } from '../../service/crossword-state.service';
import { CrosswordMultiplayerService } from '../../service/crossword-multiplayer.service';
import { CrosswordTestRunService, TestRunResult, TestRunProgress } from '../../service/crossword-test-run.service';
import { AuthService } from '../../service/auth.service';
import { PermissionService } from '../../service/permission.service';
import { Permission } from '../../models/models.d';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-crossword-view',
  templateUrl: './crossword-view.component.html',
  styleUrls: ['./crossword-view.component.css']
})
export class CrosswordViewComponent implements OnInit, OnDestroy {

  crosswordId!: string;
  crossword!: CrosswordResponse;
  form!: FormGroup;

  existingState: CrosswordStateResponse | null = null;
  showNewForm = false;

  allTags: TagResponse[] = [];
  selectedTagIds: Set<string> = new Set();
  excludeTags = false;
  matchAllTags = false;

  readonly botDifficulties = [
    { value: BotDifficulty.EASY, labelKey: 'CROSSWORD_VIEW.BOT_EASY' },
    { value: BotDifficulty.NORMAL, labelKey: 'CROSSWORD_VIEW.BOT_NORMAL' },
    { value: BotDifficulty.HARD, labelKey: 'CROSSWORD_VIEW.BOT_HARD' },
    { value: BotDifficulty.IMPOSSIBLE, labelKey: 'CROSSWORD_VIEW.BOT_IMPOSSIBLE' },
  ];
  botDifficulty: BotDifficulty = BotDifficulty.NORMAL;

  mode: 'singleplayer' | 'multiplayer' | 'testrun' = 'singleplayer';
  singleplayerMode: 'LETTERS' | 'WORDS' = 'LETTERS';
  multiplayerMode: 'LETTERS' | 'WORDS' = 'LETTERS';
  latestRun: TestRunResult | null = null;
  latestRunLoading = false;
  inProgressRun: TestRunProgress | null = null;
  wrongWordCount = 0;
  mySessions: MultiplayerSessionSummaryResponse[] = [];
  mySessionsLoading = false;
  creatingMultiplayer = false;
  multiplayerError = '';
  newSessionId: string | null = null;

  generating = false;
  generatingProgress = 0;
  generatingError = '';

  private currentJobId: string | null = null;
  private progressTimer: any;
  private timeoutTimer: any;
  private pollSub: Subscription | null = null;

  private readonly GENERATION_TIMEOUT_MS = 60_000;
  maxWordLimit = 30;
  maxWordLimitWords = 30;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private crosswordService: CrosswordService,
    private crosswordStateService: CrosswordStateService,
    private multiplayerService: CrosswordMultiplayerService,
    private testRunService: CrosswordTestRunService,
    private authService: AuthService,
    private permissionService: PermissionService
  ) {}

  get canModify(): boolean {
    return this.permissionService.hasPermission(Permission.CROSSWORDS_WRITE);
  }

  editCrossword(): void {
    this.router.navigate(['/admin/crosswords', this.crosswordId, 'edit']);
  }

  loadMySessions() {
    this.mySessionsLoading = true;
    this.multiplayerService.getMySessions().subscribe({
      next: (sessions) => {
        this.mySessions = sessions.filter(s =>
          s.crosswordId === this.crosswordId &&
          (s.status === 'WAITING_FOR_PLAYER' || s.status === 'IN_PROGRESS')
        );
        this.mySessionsLoading = false;
      },
      error: () => { this.mySessionsLoading = false; }
    });
  }

  setMode(m: 'singleplayer' | 'multiplayer' | 'testrun') {
    this.mode = m;
    this.newSessionId = null;
    this.multiplayerError = '';
    // Word Duel and Letters have different word-count caps — re-clamp for whichever tab's mode now applies.
    this.updateWordCount();
    if (m === 'multiplayer') this.loadMySessions();
    if (m === 'testrun') this.loadLatestRun();
  }

  loadLatestRun() {
    this.latestRunLoading = true;
    this.testRunService.getLatestRun(this.crosswordId).subscribe({
      next: (run) => { this.latestRun = run; this.wrongWordCount = this.filteredWrongTermCount; this.latestRunLoading = false; },
      error: () => { this.latestRun = null; this.latestRunLoading = false; }
    });
    this.testRunService.getInProgressRun(this.crosswordId).subscribe(run => this.inProgressRun = run);
  }

  /** Starting a run is always a "reset": it's the full (or tag-filtered) pool, never reduced by past runs. */
  startTestRun(mode: 'ALL' | 'WRONG_ONLY') {
    this.router.navigate(['/crosswords', this.crosswordId, 'test-run'], {
      queryParams: {
        mode,
        tagIds: this.selectedTagIds.size > 0 ? Array.from(this.selectedTagIds).join(',') : undefined,
        matchAllTags: this.matchAllTags,
        excludeTags: this.excludeTags
      }
    });
  }

  continueTestRun() {
    if (!this.inProgressRun) return;
    this.router.navigate(['/crosswords', this.crosswordId, 'test-run'], {
      queryParams: { mode: this.inProgressRun.mode, resume: 'true' }
    });
  }

  generateFromWrongAnswers() {
    if (!this.latestRun?.cumulativeWrongTermIds?.length) return;
    this.generating = true;
    this.generatingError = '';
    this.generatingProgress = 0;
    this.startFakeProgress();
    this.crosswordStateService.startGeneration({
      crosswordId: this.crosswordId,
      numberOfWords: this.wrongWordCount,
      termIdFilter: this.latestRun.cumulativeWrongTermIds,
      tagFilter: this.selectedTagIds.size > 0 ? Array.from(this.selectedTagIds) : undefined,
      tagFilterMode: this.excludeTags ? 'EXCLUDE' : 'INCLUDE',
      matchAllTags: this.matchAllTags,
      botDifficulty: this.botDifficulty,
      multiplayerMode: this.singleplayerMode
    }).subscribe({
      next: ({ jobId }) => {
        this.currentJobId = jobId;
        this.startTimeout();
        this.pollSub = this.crosswordStateService.pollJob(jobId).subscribe({
          next: (result) => {
            if (result.status === 'CANCELLED') { this.stopGenerating(); return; }
            if (result.status === 'DONE') {
              this.generatingProgress = 100;
              this.stopPolling();
              setTimeout(() => this.router.navigate(['/crosswords/states', result.stateId], { queryParams: { cid: this.crosswordId } }), 300);
            } else {
              this.generatingError = result.error || 'Could not generate. Try again.';
              this.stopGenerating();
            }
          },
          error: () => { this.generatingError = 'Lost connection. Try again.'; this.stopGenerating(); }
        });
      },
      error: () => { this.generatingError = 'Failed to start generation.'; this.stopGenerating(); }
    });
  }

  createMultiplayerRoom() {
    if (this.form.invalid || this.creatingMultiplayer) return;
    this.creatingMultiplayer = true;
    this.multiplayerError = '';
    this.multiplayerService.createSession({
      crosswordId: this.crosswordId,
      numberOfWords: Number(this.form.value.numberOfWords),
      tagFilter: this.selectedTagIds.size > 0 ? Array.from(this.selectedTagIds) : undefined,
      tagFilterMode: this.excludeTags ? 'EXCLUDE' : 'INCLUDE',
      matchAllTags: this.matchAllTags,
      multiplayerMode: this.multiplayerMode
    }).subscribe({
      next: (session) => {
        this.creatingMultiplayer = false;
        this.newSessionId = session.id;
        this.loadMySessions();
      },
      error: () => {
        this.creatingMultiplayer = false;
        this.multiplayerError = 'Failed to create room. Please try again.';
      }
    });
  }

  joinSessionLink(sessionId: string): string {
    return `${window.location.origin}/crosswords/sessions/${sessionId}`;
  }

  goToSession(sessionId: string) {
    this.router.navigate(['/crosswords/sessions', sessionId]);
  }

  ngOnInit() {
    this.crosswordService.getConfig().subscribe({
      next: (config) => {
        this.maxWordLimit = config.maxWordLimit;
        this.maxWordLimitWords = config.maxWordLimitWords;
        this.updateWordCount();
      },
      error: () => {}
    });

    this.route.paramMap.subscribe(params => {
      this.crosswordId = params.get('id')!;

      this.crosswordService.getCrossword(this.crosswordId).subscribe(crossword => {
        this.crossword = crossword;
        const tagMap = new Map<string, TagResponse>();
        crossword.terms.forEach(t =>
          (t.tags ?? []).forEach(tag => tagMap.set(tag.id, tag))
        );
        this.allTags = Array.from(tagMap.values()).sort((a, b) => a.key.localeCompare(b.key));
        const initialCount = Math.min(crossword.terms.length, this.maxWordLimit);
        this.form = this.fb.group({
          numberOfWords: [
            initialCount,
            [Validators.required, Validators.min(1), Validators.max(initialCount)]
          ]
        });

        this.restoreSettings();
        this.form.get('numberOfWords')?.valueChanges.subscribe(() => this.saveSettings());
      });

      this.loadLatestRun();

      this.crosswordStateService.getUserCrosswordState(this.crosswordId).subscribe({
        next: (state) => {
          if (state.currentGrid?.includes('_')) {
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
    });
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  /** Word Duel has its own configured cap, separate from Letters mode — pick whichever applies to the active tab. */
  get activeWordLimit(): number {
    const relevantMode = this.mode === 'multiplayer' ? this.multiplayerMode : this.singleplayerMode;
    return relevantMode === 'WORDS' ? this.maxWordLimitWords : this.maxWordLimit;
  }

  get termCount(): number {
    if (!this.crossword) return 0;
    const available = this.selectedTagIds.size === 0
      ? this.crossword.terms.length
      : this.crossword.terms.filter(t => this.matchesTagFilter(t)).length;
    return Math.min(available, this.activeWordLimit);
  }

  /** Cumulative wrong-answer pool (crossword-generation target), tag-filtered and capped by the active mode's word limit. */
  get filteredWrongTermCount(): number {
    if (!this.latestRun?.cumulativeWrongTermIds?.length) return 0;
    const available = (() => {
      if (!this.crossword) return this.latestRun!.cumulativeWrongTermIds.length;
      const wrongIds = new Set(this.latestRun!.cumulativeWrongTermIds);
      return this.crossword.terms.filter(t => wrongIds.has(t.id) && this.matchesTagFilter(t)).length;
    })();
    return Math.min(available, this.activeWordLimit);
  }

  /** Test-run pool size, tag-filtered — unlike termCount, not capped by maxWordLimit (that cap is a crossword-generation constraint, not a test-run one). */
  get testRunWordCount(): number {
    if (!this.crossword) return 0;
    return this.crossword.terms.filter(t => this.matchesTagFilter(t)).length;
  }

  /** Cumulative wrong-answer pool, narrowed to the tag filter if one is active — uncapped. */
  get testRunWrongCount(): number {
    if (!this.latestRun?.cumulativeWrongTermIds?.length) return 0;
    if (!this.crossword) return this.latestRun.cumulativeWrongTermIds.length;
    const wrongIds = new Set(this.latestRun.cumulativeWrongTermIds);
    return this.crossword.terms.filter(t => wrongIds.has(t.id) && this.matchesTagFilter(t)).length;
  }

  private matchesTagFilter(t: { tags?: TagResponse[] | null }): boolean {
    if (this.selectedTagIds.size === 0) return true;
    const termTagIds = new Set((t.tags ?? []).map(tag => tag.id));
    const matches = this.matchAllTags
      ? Array.from(this.selectedTagIds).every(id => termTagIds.has(id))
      : Array.from(this.selectedTagIds).some(id => termTagIds.has(id));
    return this.excludeTags ? !matches : matches;
  }

  toggleTag(tagId: string) {
    if (this.selectedTagIds.has(tagId)) {
      this.selectedTagIds.delete(tagId);
    } else {
      this.selectedTagIds.add(tagId);
    }
    this.updateWordCount();
    this.saveSettings();
  }

  onExcludeToggle() {
    this.updateWordCount();
    this.saveSettings();
  }

  onMatchModeToggle() {
    this.updateWordCount();
    this.saveSettings();
  }

  setBotDifficulty(d: BotDifficulty) {
    this.botDifficulty = d;
    this.saveSettings();
  }

  setSingleplayerMode(m: 'LETTERS' | 'WORDS') {
    this.singleplayerMode = m;
    this.updateWordCount();
    this.saveSettings();
  }

  setMultiplayerMode(m: 'LETTERS' | 'WORDS') {
    this.multiplayerMode = m;
    this.updateWordCount();
    this.saveSettings();
  }

  // ── Remembered settings (per crossword, in the browser) ────────────────────

  private settingsKey(): string {
    return `crossword-settings:${this.crosswordId}`;
  }

  private saveSettings() {
    try {
      localStorage.setItem(this.settingsKey(), JSON.stringify({
        tagIds: Array.from(this.selectedTagIds),
        excludeTags: this.excludeTags,
        matchAllTags: this.matchAllTags,
        numberOfWords: this.form?.value?.numberOfWords,
        botDifficulty: this.botDifficulty,
        mode: this.singleplayerMode
      }));
    } catch { /* private browsing / storage disabled — just skip remembering */ }
  }

  private restoreSettings() {
    let saved: any = null;
    try {
      const raw = localStorage.getItem(this.settingsKey());
      saved = raw ? JSON.parse(raw) : null;
    } catch { /* corrupt or inaccessible — ignore, fall back to defaults */ }
    if (!saved) return;

    if (Array.isArray(saved.tagIds)) {
      const validIds = new Set(this.allTags.map(t => t.id));
      this.selectedTagIds = new Set(saved.tagIds.filter((id: string) => validIds.has(id)));
    }
    if (typeof saved.excludeTags === 'boolean') this.excludeTags = saved.excludeTags;
    if (typeof saved.matchAllTags === 'boolean') this.matchAllTags = saved.matchAllTags;
    if (['EASY', 'NORMAL', 'HARD', 'IMPOSSIBLE'].includes(saved.botDifficulty)) this.botDifficulty = saved.botDifficulty;
    if (saved.mode === 'LETTERS' || saved.mode === 'WORDS') {
      this.singleplayerMode = saved.mode;
      this.multiplayerMode = saved.mode;
    }

    this.updateWordCount();
    if (typeof saved.numberOfWords === 'number') {
      const max = this.termCount;
      const value = Math.min(Math.max(1, saved.numberOfWords), max);
      this.form.get('numberOfWords')?.setValue(value);
    }
  }

  private updateWordCount() {
    const max = this.termCount;
    this.form?.get('numberOfWords')?.setValidators([Validators.required, Validators.min(1), Validators.max(max)]);
    this.form?.get('numberOfWords')?.setValue(max);
    this.form?.get('numberOfWords')?.updateValueAndValidity();

    const wrongMax = this.filteredWrongTermCount;
    if (this.latestRun?.cumulativeWrongTermIds?.length) {
      this.wrongWordCount = Math.min(this.wrongWordCount || wrongMax, wrongMax);
    }
  }

  continueGame(): void {
    if (!this.existingState) return;
    this.router.navigate(['/crosswords/states', this.existingState.id],
      { queryParams: { cid: this.crosswordId } });
  }

  submit() {
    if (this.form.invalid || this.generating) return;

    this.saveSettings();
    this.generating = true;
    this.generatingError = '';
    this.generatingProgress = 0;
    this.startFakeProgress();

    this.crosswordStateService.startGeneration({
      crosswordId: this.crosswordId,
      numberOfWords: Number(this.form.value.numberOfWords),
      tagFilter: this.selectedTagIds.size > 0 ? Array.from(this.selectedTagIds) : undefined,
      tagFilterMode: this.excludeTags ? 'EXCLUDE' : 'INCLUDE',
      matchAllTags: this.matchAllTags,
      botDifficulty: this.botDifficulty,
      multiplayerMode: this.singleplayerMode
    }).subscribe({
      next: ({ jobId }) => {
        this.currentJobId = jobId;
        this.startTimeout();
        this.pollSub = this.crosswordStateService.pollJob(jobId).subscribe({
          next: (result) => {
            if (result.status === 'CANCELLED') {
              this.stopGenerating();
              return;
            }
            if (result.status === 'DONE') {
              this.generatingProgress = 100;
              this.stopPolling();
              setTimeout(() => {
                this.router.navigate(['/crosswords/states', result.stateId],
                  { queryParams: { cid: this.crosswordId } });
              }, 300);
            } else {
              this.generatingError = result.error || 'Could not generate the crossword. Try again.';
              this.stopGenerating();
            }
          },
          error: () => {
            this.generatingError = 'Lost connection while waiting. Please try again.';
            this.stopGenerating();
          }
        });
      },
      error: () => {
        this.generatingError = 'Failed to start generation. Please try again.';
        this.stopGenerating();
      }
    });
  }

  cancelGeneration(): void {
    if (!this.currentJobId) return;
    this.crosswordStateService.cancelJob(this.currentJobId).subscribe();
    this.stopGenerating();
  }

  private startTimeout() {
    clearTimeout(this.timeoutTimer);
    this.timeoutTimer = setTimeout(() => {
      this.generatingError = 'Generation timed out. Please try again.';
      this.cancelGeneration();
    }, this.GENERATION_TIMEOUT_MS);
  }

  private startFakeProgress() {
    clearInterval(this.progressTimer);
    this.progressTimer = setInterval(() => {
      // Logarithmic fill: approaches 85% asymptotically
      if (this.generatingProgress < 85) {
        this.generatingProgress += (85 - this.generatingProgress) * 0.04;
      }
    }, 200);
  }

  private stopPolling() {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
    clearInterval(this.progressTimer);
    clearTimeout(this.timeoutTimer);
  }

  private stopGenerating() {
    this.generating = false;
    this.currentJobId = null;
    this.stopPolling();
  }
}
