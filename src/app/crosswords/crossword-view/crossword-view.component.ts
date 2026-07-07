import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CrosswordResponse, CrosswordStateResponse, MultiplayerSessionSummaryResponse, TagResponse } from '../../models/models.d';
import { CrosswordService } from '../../service/crossword.service';
import { CrosswordStateService } from '../../service/crossword-state.service';
import { CrosswordMultiplayerService } from '../../service/crossword-multiplayer.service';
import { CrosswordTestRunService, TestRunResult } from '../../service/crossword-test-run.service';
import { AuthService } from '../../service/auth.service';
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

  mode: 'singleplayer' | 'multiplayer' | 'testrun' = 'singleplayer';
  latestRun: TestRunResult | null = null;
  latestRunLoading = false;
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

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private crosswordService: CrosswordService,
    private crosswordStateService: CrosswordStateService,
    private multiplayerService: CrosswordMultiplayerService,
    private testRunService: CrosswordTestRunService,
    private authService: AuthService
  ) {}

  get canModify(): boolean {
    const role = this.authService.getUser()?.role;
    return role === 'MODERATOR' || role === 'ADMIN';
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
    if (m === 'multiplayer') this.loadMySessions();
    if (m === 'testrun') this.loadLatestRun();
  }

  loadLatestRun() {
    this.latestRunLoading = true;
    this.testRunService.getLatestRun(this.crosswordId).subscribe({
      next: (run) => { this.latestRun = run; this.wrongWordCount = run.wrongTermCount; this.latestRunLoading = false; },
      error: () => { this.latestRun = null; this.latestRunLoading = false; }
    });
  }

  startTestRun(mode: 'ALL' | 'WRONG_ONLY') {
    this.router.navigate(['/crosswords', this.crosswordId, 'test-run'], { queryParams: { mode } });
  }

  generateFromWrongAnswers() {
    if (!this.latestRun?.wrongTermIds?.length) return;
    this.generating = true;
    this.generatingError = '';
    this.generatingProgress = 0;
    this.startFakeProgress();
    this.crosswordStateService.startGeneration({
      crosswordId: this.crosswordId,
      numberOfWords: this.wrongWordCount,
      termIdFilter: this.latestRun.wrongTermIds
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
      tagFilterMode: this.excludeTags ? 'EXCLUDE' : 'INCLUDE'
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
    this.route.paramMap.subscribe(params => {
      this.crosswordId = params.get('id')!;

      this.crosswordService.getCrossword(this.crosswordId).subscribe(crossword => {
        this.crossword = crossword;
        const tagMap = new Map<string, TagResponse>();
        crossword.terms.forEach(t =>
          (t.tags ?? []).forEach(tag => tagMap.set(tag.id, tag))
        );
        this.allTags = Array.from(tagMap.values()).sort((a, b) => a.key.localeCompare(b.key));
        this.form = this.fb.group({
          numberOfWords: [
            crossword.terms.length,
            [Validators.required, Validators.min(1), Validators.max(crossword.terms.length)]
          ]
        });
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

  get termCount(): number {
    if (!this.crossword) return 0;
    if (this.selectedTagIds.size === 0) return this.crossword.terms.length;
    return this.crossword.terms.filter(t => {
      const hasTag = (t.tags ?? []).some(tag => this.selectedTagIds.has(tag.id));
      return this.excludeTags ? !hasTag : hasTag;
    }).length;
  }

  toggleTag(tagId: string) {
    if (this.selectedTagIds.has(tagId)) {
      this.selectedTagIds.delete(tagId);
    } else {
      this.selectedTagIds.add(tagId);
    }
    this.updateWordCount();
  }

  onExcludeToggle() {
    this.updateWordCount();
  }

  private updateWordCount() {
    const max = this.termCount;
    this.form.get('numberOfWords')?.setValidators([Validators.required, Validators.min(1), Validators.max(max)]);
    this.form.get('numberOfWords')?.setValue(max);
    this.form.get('numberOfWords')?.updateValueAndValidity();
  }

  continueGame(): void {
    if (!this.existingState) return;
    this.router.navigate(['/crosswords/states', this.existingState.id],
      { queryParams: { cid: this.crosswordId } });
  }

  submit() {
    if (this.form.invalid || this.generating) return;

    this.generating = true;
    this.generatingError = '';
    this.generatingProgress = 0;
    this.startFakeProgress();

    this.crosswordStateService.startGeneration({
      crosswordId: this.crosswordId,
      numberOfWords: Number(this.form.value.numberOfWords),
      tagFilter: this.selectedTagIds.size > 0 ? Array.from(this.selectedTagIds) : undefined,
      tagFilterMode: this.excludeTags ? 'EXCLUDE' : 'INCLUDE'
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
