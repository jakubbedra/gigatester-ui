import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TestDisplayTypeDto, TestExecutionStateDto, TestModeDto, TestStateResponse, NavigateActionDto } from '../../models/models.d';
import { TestStateService } from '../../service/test-state.service';

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
    private testStateService: TestStateService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.testStateService.getTestState(id).subscribe(s => {
      this.testState = s;
      this.loading = false;
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
