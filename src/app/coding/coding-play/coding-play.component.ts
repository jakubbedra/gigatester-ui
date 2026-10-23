import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CodingPlay, CodingPlayProblem, CodingProblemResult, CodingResultRow, CodingService,
  CodingSubmissionDetail, CodingSubmissionResult
} from '../../service/coding.service';
import { PythonRunnerService, PythonRunResult } from '../../service/python-runner.service';
import { PermissionService } from '../../service/permission.service';
import { SoundService } from '../../service/sound.service';
import { StreakService } from '../../service/streak.service';
import { Permission } from '../../models/models.d';

interface LocalTestResult {
  /** null = couldn't tell locally (hidden test) */
  passed: boolean | null;
  actual: string;
  error: string;
  timedOut: boolean;
}

/** Everything the student is working on for one problem; kept while they switch tabs. */
interface ProblemState {
  code: string;
  customInput: string;
  output: PythonRunResult | null;
  testResults: LocalTestResult[];
  submission: CodingSubmissionResult | null;
  submitError: string | null;
}

/** Trailing spaces / blank lines and line-ending style don't count as a difference (same rule as the server). */
function normalize(s: string | null | undefined): string {
  return (s ?? '').replace(/\r\n?/g, '\n').split('\n').map(l => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
}

@Component({
  selector: 'app-coding-play',
  templateUrl: './coding-play.component.html',
  styleUrls: ['./coding-play.component.css']
})
export class CodingPlayComponent implements OnInit, OnDestroy {

  nowMs = Date.now();
  private clock?: ReturnType<typeof setInterval>;

  /** Time left until a scheduled test opens, as h:mm:ss (or d h mm:ss). */
  get countdown(): string {
    if (!this.task?.startAt) return '';
    const left = Math.max(0, new Date(this.task.startAt).getTime() - this.nowMs);
    const s = Math.floor(left / 1000);
    const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return (d > 0 ? d + 'd ' : '') + (d > 0 || h > 0 ? h + ':' : '') + pad(m) + ':' + pad(sec);
  }

  /** Milliseconds until a scheduled test closes (null when it has no deadline or isn't open). */
  get closeLeftMs(): number | null {
    if (!this.task || this.task.phase !== 'open' || !this.task.windowEnd) return null;
    return Math.max(0, new Date(this.task.windowEnd).getTime() - this.nowMs);
  }

  get closeCountdown(): string {
    const left = this.closeLeftMs;
    if (left === null) return '';
    const s = Math.floor(left / 1000);
    const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return (d > 0 ? d + 'd ' : '') + (d > 0 || h > 0 ? h + ':' : '') + pad(m) + ':' + pad(sec);
  }

  /** calm → warn (under 10 minutes) → urgent (under 1 minute) */
  get closeUrgency(): 'calm' | 'warn' | 'urgent' {
    const left = this.closeLeftMs;
    if (left === null || left > 10 * 60000) return 'calm';
    return left > 60000 ? 'warn' : 'urgent';
  }

  ngOnDestroy() {
    if (this.clock) clearInterval(this.clock);
  }


  taskId!: string;
  task: CodingPlay | null = null;
  loading = true;
  loadError = false;

  /** Summary modal after every problem has been submitted. */
  summaryOpen = false;

  active = 0;
  states: ProblemState[] = [];
  running = false;
  testsRunning = false;
  submitting = false;
  engineLoading = true;

  // staff
  results: CodingResultRow[] = [];
  expandedUserId: string | null = null;
  viewing: CodingSubmissionDetail | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private codingService: CodingService,
    private runner: PythonRunnerService,
    private permissionService: PermissionService,
    public sound: SoundService,
    private streakService: StreakService
  ) {}

  get isStaff(): boolean {
    return this.permissionService.hasPermission(Permission.CODING_WRITE);
  }

  get problem(): CodingPlayProblem | null {
    return this.task?.problems[this.active] ?? null;
  }

  get state(): ProblemState | null {
    return this.states[this.active] ?? null;
  }

  /** Finished: the student submitted every problem, so nothing on the page can change any more. */
  get locked(): boolean {
    return !!this.task?.completed && !this.isStaff;
  }

  /** Nothing can be typed or run: the student finished the test, or the test is closed (for everyone, staff included). */
  get readOnly(): boolean {
    return this.locked || this.task?.phase === 'closed';
  }

  get canSubmit(): boolean {
    return !!this.task && !this.readOnly && this.task.phase === 'open';
  }

  get percentage(): number {
    return this.task && this.task.maxScore > 0 ? Math.round(this.totalScore / this.task.maxScore * 100) : 0;
  }

  closeSummary() {
    this.summaryOpen = false;
  }

  openSummary() {
    this.summaryOpen = true;
  }

  get busy(): boolean {
    return this.running || this.testsRunning || this.submitting;
  }

  /** Sum of the best score on each problem. */
  get totalScore(): number {
    if (!this.task) return 0;
    return Math.round(this.task.problems.reduce((sum, p) => sum + (p.bestScore ?? 0), 0) * 100) / 100;
  }

  /** Tests of the current problem whose outcome we know right now. */
  get liveStats(): { passed: number; total: number; known: number } {
    const s = this.state;
    if (!s) return { passed: 0, total: 0, known: 0 };
    if (s.submission) return { passed: s.submission.passed, total: s.submission.total, known: s.submission.total };
    const known = s.testResults.filter(r => r.passed !== null);
    return { passed: known.filter(r => r.passed).length, total: s.testResults.length, known: known.length };
  }

  get allPerfect(): boolean {
    return !!this.task && this.task.problems.length > 0 && this.task.problems.every(p => p.bestScore !== null && p.bestScore >= p.points);
  }

  problemScoreLabel(p: CodingPlayProblem): string {
    return `${p.bestScore ?? 0}/${p.points}`;
  }

  ngOnInit() {
    this.taskId = this.route.snapshot.paramMap.get('id')!;
    this.clock = setInterval(() => {
      this.nowMs = Date.now();
      // The deadline passed while the page was open: lock it right away instead of waiting for a rejected submit.
      if (this.task?.phase === 'open' && this.task.windowEnd && this.nowMs >= new Date(this.task.windowEnd).getTime()) {
        this.task.phase = 'closed';
      }
      // The moment a scheduled test opens, load it without making the student refresh.
      if (this.task?.phase === 'notStarted' && this.task.startAt && this.nowMs >= new Date(this.task.startAt).getTime()) {
        this.reloadAfterOpen();
      }
    }, 1000);
    this.codingService.play(this.taskId).subscribe({
      next: task => {
        this.task = task;
        this.states = task.problems.map(p => ({
          code: p.starterCode ?? '',
          customInput: '',
          output: null,
          testResults: p.tests.map(() => ({ passed: null, actual: '', error: '', timedOut: false })),
          submission: null,
          submitError: null
        }));
        this.loading = false;
        this.summaryOpen = task.completed && !this.isStaff;
        if (task.phase !== 'notStarted') {
          this.runner.warmUp().then(() => this.engineLoading = false).catch(() => this.engineLoading = false);
        } else {
          this.engineLoading = false;
        }
        if (this.isStaff) this.loadResults();
      },
      error: () => { this.loadError = true; this.loading = false; }
    });
  }

  private reloading = false;

  private reloadAfterOpen() {
    if (this.reloading) return;
    this.reloading = true;
    this.codingService.play(this.taskId).subscribe({
      next: () => window.location.reload(),
      error: () => { this.reloading = false; }
    });
  }

  private loadResults() {
    this.codingService.results(this.taskId).subscribe({ next: r => this.results = r, error: () => this.results = [] });
  }

  select(i: number) {
    this.active = i;
  }

  setCode(code: string) {
    if (this.state) this.state.code = code;
  }

  /** Python's complaint when input() has nothing to read. */
  needsInput(stderr: string): boolean {
    return stderr.includes('EOFError');
  }

  /** The final line of a traceback, e.g. "NameError: name 'x' is not defined". */
  lastErrorLine(stderr: string): string {
    const lines = stderr.trim().split('\n').map(l => l.trim()).filter(Boolean);
    return lines[lines.length - 1] ?? '';
  }

  async run() {
    const p = this.problem, s = this.state;
    if (!p || !s || this.busy || this.readOnly) return;
    this.sound.click();
    this.running = true;
    s.output = null;
    s.output = await this.runner.run(s.code, s.customInput, p.timeLimitMs);
    this.running = false;
  }

  private async executeAllTests(p: CodingPlayProblem, s: ProblemState): Promise<string[]> {
    const outputs: string[] = [];
    s.testResults = p.tests.map(() => ({ passed: null, actual: '', error: '', timedOut: false }));
    for (let i = 0; i < p.tests.length; i++) {
      const t = p.tests[i];
      const r = await this.runner.run(s.code, t.input, p.timeLimitMs);
      outputs.push(r.stdout);
      const passedLocally = t.expectedOutput === null
        ? null
        : (!r.timedOut && !r.stderr && normalize(r.stdout) === normalize(t.expectedOutput));
      if (passedLocally === true) this.sound.pass();
      else if (passedLocally === false) this.sound.fail();
      s.testResults[i] = { passed: passedLocally, actual: r.stdout, error: r.stderr, timedOut: r.timedOut };
    }
    return outputs;
  }

  async runTests() {
    const p = this.problem, s = this.state;
    if (!p || !s || this.busy || this.readOnly) return;
    this.testsRunning = true;
    s.submission = null;
    await this.executeAllTests(p, s);
    this.testsRunning = false;
  }

  async submit() {
    const p = this.problem, s = this.state;
    if (!p || !s || !this.canSubmit || this.busy) return;
    this.submitting = true;
    s.submitError = null;
    s.submission = null;
    const outputs = await this.executeAllTests(p, s);
    this.codingService.submit(this.taskId, p.id, s.code, outputs).subscribe({
      next: res => {
        s.submission = res;
        this.submitting = false;
        setTimeout(() => this.streakService.announceActivity(), 900);
        if (res.passed === res.total) this.sound.success();
        else if (res.passed > 0) this.sound.partial();
        else this.sound.fail();
        if (p.bestScore === null || res.score > p.bestScore) {
          p.bestScore = res.score;
          p.bestPassed = res.passed;
        }
        p.attempts++;
        if (res.completed && this.task) {
          this.task.completed = true;
          if (!this.isStaff) setTimeout(() => this.summaryOpen = true, 900);
        }
        if (this.isStaff) this.loadResults();
      },
      error: err => {
        this.submitting = false;
        s.submitError = err?.status === 409 ? (this.task?.completed ? 'finished' : 'closed') : 'failed';
      }
    });
  }

  resultFor(i: number): boolean | null {
    const s = this.state;
    if (!s) return null;
    return s.submission ? s.submission.results[i] : s.testResults[i]?.passed ?? null;
  }

  toggleUser(row: CodingResultRow) {
    this.expandedUserId = this.expandedUserId === row.userId ? null : row.userId;
  }

  openSubmission(pr: CodingProblemResult) {
    if (!pr.bestSubmissionId) return;
    this.codingService.submission(pr.bestSubmissionId).subscribe(d => this.viewing = d);
  }

  closeSubmission() {
    this.viewing = null;
  }

  edit() {
    this.router.navigate(['/admin/coding-tasks', this.taskId, 'edit']);
  }

}
