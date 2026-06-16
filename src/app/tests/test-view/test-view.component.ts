import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {TestDisplayTypeDto, TestModeDto, TestResponse, TestStateRequest} from "../../models/models.d";
import {TestService} from "../../service/test.service";
import {FormBuilder, FormGroup} from "@angular/forms";
import {TestStateService} from "../../service/test-state.service";

@Component({
  selector: 'app-test-view',
  templateUrl: './test-view.component.html',
  styleUrls: ['./test-view.component.css']
})
export class TestViewComponent implements OnInit {

  form!: FormGroup;
  testId!: string;
  test!: TestResponse;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private testService: TestService,
    private testStateService: TestStateService
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {

      this.testId = params.get('id')!;

      this.testService.getTest(this.testId).subscribe(test => {
        this.test = test;

        // Create default request based on test
        const defaults = this.buildDefaultState(test);

        // Create the form with defaults
        this.form = this.fb.group({
          closedQuestionsCount: [defaults.closedQuestionsCount],
          openQuestionsCount: [defaults.openQuestionsCount],
          termDefinitionQuestionsCount: [defaults.termDefinitionQuestionsCount],
          passingPercentage: [defaults.passingPercentage],
          mode: [defaults.mode],
          displayType: [defaults.displayType]
        });
      });

    });
  }

  buildDefaultState(test: TestResponse): TestStateRequest {
    return {
      closedQuestionsCount: test.closedQuestionsCount,
      openQuestionsCount: test.openQuestionsCount,
      termDefinitionQuestionsCount: test.termDefinitionQuestionsCount,
      statementQuestionsCount: 0,
      ...(test.passingPercentage !== undefined && test.passingPercentage !== null
        ? { passingPercentage: test.passingPercentage }
        : {}),
      mode: TestModeDto.EXAM,
      displayType: TestDisplayTypeDto.ONE_BY_ONE,
      timeLimitEnabled: false
    };
  }

  submit() {
    if (this.form.invalid) return;
    // console.log(this.form.value);

    const state = this.form.value;
    this.testStateService.createTestState(this.testId, state).subscribe({
      next: (response) => {
        // Navigate to question card
        this.router.navigate(['/tests/' + response + '/executions']);
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

}
