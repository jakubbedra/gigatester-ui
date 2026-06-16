import {Component, EventEmitter, Input, Output} from '@angular/core';
import {TestModeDto} from "../../models/models";
import {ActivatedRoute, Router} from "@angular/router";
import {TestStateService} from "../../service/test-state.service";

@Component({
  selector: 'app-test-summary',
  templateUrl: './test-summary.component.html',
  styleUrls: ['./test-summary.component.css']
})
export class TestSummaryComponent {
  @Input() testName: string = 'Test Summary';

  @Input() mode!: TestModeDto; // EXAM | LEARNING

  // EXAM-only inputs
  @Input() score: number = 0;
  @Input() maxScore: number = 0;
  @Input() passingPercentage?: number;

  @Output() startNew = new EventEmitter<void>();     // go to config/new test
  @Output() startExam = new EventEmitter<void>();    // learning -> real exam

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private testStateService: TestStateService
  ) { }

  get isExam(): boolean {
    return this.mode === TestModeDto.EXAM;
  }

  get percentage(): number {
    if (!this.maxScore) return 0;
    return Math.round((this.score / this.maxScore) * 100);
  }

  get isPassing(): boolean | null {
    if (!this.isExam) return null;
    if (this.passingPercentage === undefined || this.passingPercentage === null) return null;
    return this.percentage >= this.passingPercentage;
  }

  onRetry() {
    const testStateId = this.route.snapshot.paramMap.get('id')!;
    this.testStateService.updateTestState(testStateId).subscribe(() => {
      this.router.navigate(['/tests', testStateId, 'executions']);
    });
  }

}
