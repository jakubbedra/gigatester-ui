import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TestDisplayTypeDto, TestExecutionStateDto, TestModeDto, TestStateResponse, NavigateActionDto } from '../../models/models.d';
import { TestStateService } from '../../service/test-state.service';
import { StreakService } from '../../service/streak.service';
import { ToastService } from '../../service/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { SidebarRefreshService } from '../../service/sidebar-refresh.service';

@Component({
  selector: 'app-test-summary',
  templateUrl: './test-summary.component.html',
  styleUrls: ['./test-summary.component.css']
})
export class TestSummaryComponent implements OnInit {

  testState?: TestStateResponse;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private testStateService: TestStateService,
    private streakService: StreakService,
    private toastService: ToastService,
    private translate: TranslateService,
    private sidebarRefreshService: SidebarRefreshService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.testStateService.getTestState(id).subscribe(s => {
      this.testState = s;
      this.loading = false;
    });
    this.streakService.getStreak().subscribe(s => {
      this.sidebarRefreshService.notify();
      if (this.streakService.wasJustBumpedToday(s)) {
        const label = this.translate.instant('SIDEBAR.STREAK');
        this.toastService.show({ icon: '🔥', message: `${s.currentStreak} ${label}` });
      }
    });
  }

  get isExam(): boolean {
    return this.testState?.mode === TestModeDto.EXAM;
  }

  get percentage(): number {
    if (!this.testState?.maxScore) return 0;
    return Math.round((this.testState.totalScore / this.testState.maxScore) * 100);
  }

  get isPassing(): boolean | null {
    if (!this.isExam || !this.testState) return null;
    const p = this.testState.passingPercentage;
    if (p === undefined || p === null) return null;
    return this.percentage >= p;
  }

  get isScheduledPassing(): boolean | null {
    if (!this.testState || !this.testState.reviewAvailable) return null;
    const p = this.testState.passingPercentage;
    if (p === undefined || p === null || p === 0) return null;
    return this.percentage >= p;
  }

  reviewExam() {
    if (!this.testState) return;
    this.router.navigate(['/tests', this.testState.testId, 'attempts', this.testState.id]);
  }

  backToExam() {
    if (!this.testState) return;
    this.router.navigate(['/tests', this.testState.testId]);
  }

  retake() {
    if (!this.testState) return;
    const isAllAtOnce = this.testState.displayType === TestDisplayTypeDto.ALL_AT_ONCE;
    this.testStateService.updateTestState(this.testState.id, { action: NavigateActionDto.NEXT }).subscribe(() => {
      const segments = isAllAtOnce
        ? ['/tests', this.testState!.id, 'executions', 'all']
        : ['/tests', this.testState!.id, 'executions'];
      this.router.navigate(segments);
    });
  }

  backToTest() {
    if (!this.testState) return;
    // Navigate to the test config page using the test id from state
    // We need to get back to the test, but we only have testStateId here.
    // Use the executions route as the test name is in the state.
    this.router.navigate(['/tests', this.testState.id, 'executions']);
  }

}
