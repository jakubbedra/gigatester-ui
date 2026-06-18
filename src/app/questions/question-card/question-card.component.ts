import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {
  ClosedQuestionDto,
  ClosedQuestionStateRequest,
  ClosedQuestionStateResponse,
  OpenQuestionDto,
  OpenQuestionStateRequest,
  OpenQuestionStateResponse, StatementQuestionDto, StatementQuestionStateRequest, StatementQuestionStateResponse,
  TestExecutionStateDto,
  TestModeDto,
  TestStateResponse
} from "../../models/models.d";
import {QuestionsService} from "../../service/question.service";
import {TestStateService} from "../../service/test-state.service";
import {ActivatedRoute, Router} from "@angular/router";
import {QuestionStateService} from "../../service/question-state.service";

@Component({
  selector: 'app-question-card',
  templateUrl: './question-card.component.html',
  styleUrls: ['./question-card.component.css']
})
export class QuestionCardComponent implements OnInit {

  testState?: TestStateResponse;

  question?: ClosedQuestionDto | OpenQuestionDto | StatementQuestionDto;

  progress: number = 0; // percentage completed (0-100)

  hasImage = false;

  questionState: ClosedQuestionStateResponse | OpenQuestionStateResponse | StatementQuestionStateResponse | null = null;
  childAnswer: ClosedQuestionStateRequest | OpenQuestionStateRequest | StatementQuestionStateRequest | null = null;

  @ViewChild('questionTextContainer') questionTextContainer!: ElementRef;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private testStateService: TestStateService,
    private questionStateService: QuestionStateService,
    private questionService: QuestionsService
  ) { }

  ngOnInit() {
    const testStateId = this.route.snapshot.paramMap.get('id')!;
    this.testStateService.getTestState(testStateId).subscribe(state => {
      this.testState = state;
      this.loadQuestion();
    });
  }

  private loadQuestion() {
    if (!this.testState) return;

    this.question = undefined;
    this.questionState = null;
    this.childAnswer = null;
    this.hasImage = false;

    const currentQuestion = this.testState.questions[this.testState.currentQuestionIndex];

    if (!currentQuestion) return;

    this.questionService.getQuestion(currentQuestion.questionId).subscribe(q => {
      this.question = { ...q };

      // Wait for Angular to render DOM
      setTimeout(() => {
        if (this.questionTextContainer) {
          const imgs = this.questionTextContainer.nativeElement.querySelectorAll('img');
          this.hasImage = imgs.length > 0;
        }
      }, 0);
      this.questionStateService.getQuestionState(
        this.testState?.id!,
        this.testState?.questions[this.testState.currentQuestionIndex].id!
      ).subscribe(questionState => {
          this.questionState = { ...(questionState as any) };
          // alert(questionState);
        }
      );
    });
  }

  closedQuestion(): ClosedQuestionDto {
    return <ClosedQuestionDto>this.question;
  }

  openQuestion(): OpenQuestionDto {
    return <OpenQuestionDto>this.question;
  }

  statementQuestion(): StatementQuestionDto {
    return <StatementQuestionDto>this.question;
  }

  onChildAnswer(state: ClosedQuestionStateRequest | OpenQuestionStateRequest | StatementQuestionStateRequest | null) {
    this.childAnswer = state;
  }

  submitAnswer() {
    if (!this.childAnswer) return;

    this.questionStateService.updateQuestionState(
      this.testState?.id!,
      this.testState?.questions[this.testState.currentQuestionIndex].id!,
      this.childAnswer
    ).subscribe(response => {
      this.questionStateService.getQuestionState(
        this.testState?.id!,
        this.testState?.questions[this.testState.currentQuestionIndex].id!
      ).subscribe(questionStateResponse => {
          this.questionState = questionStateResponse;
        }
      );
      // alert(response);
    });
  }

  get isClosed() {
    return this.question?.type === 'CLOSED';
  }

  get isOpen() {
    return this.question?.type === 'OPEN';
  }

  get isStatement() {
    return this.question?.type === 'STATEMENT';
  }

  get isQuestionText(): boolean {
    return this.question?.content.type === 'TEXT';
  }

  get isQuestionHtml(): boolean {
    return this.question?.content.type === 'HTML';
  }

  get getContentProportions(): number {
    return this.question?.contentProportions ? this.question.contentProportions : 1;
  }

  get getAnswerProportions(): number {
    return this.question?.answerProportions ? this.question.answerProportions : 2;
  }

  openQuestionState(): OpenQuestionStateResponse {
    return <OpenQuestionStateResponse>this.questionState;
  }

  closedQuestionState(): ClosedQuestionStateResponse {
    return <ClosedQuestionStateResponse>this.questionState;
  }

  statementQuestionState(): StatementQuestionStateResponse {
    return <StatementQuestionStateResponse>this.questionState;
  }

  questionSubmitted(): boolean {
    return this.questionState == null ? false : this.questionState.answered;
  }

  nextQuestion() {
    if (this.testState == null) {
      return;
    }
    this.testStateService.updateTestState(this.testState!.id).subscribe(resp => {
      // todo: might remove this question index entirely from entity, and allow to move freely between questions
      this.testStateService.getTestState(this.testState!.id).subscribe(testStateResponse => {
        this.testState = testStateResponse;
        this.testState.currentQuestionIndex = testStateResponse.currentQuestionIndex;
        this.loadQuestion();
      });
    });
  }

  allQuestionsAnswered() {
    // if (this.testState!.mode == TestModeDto.LEARNING) {
    //   return false;//todo: change
    // }
    return this.testState!.currentQuestionIndex == this.testState!.questions.length - 1 && this.questionState?.answered;
  }

  finishTest() {
    this.testStateService.updateTestState(this.testState!.id).subscribe(() => {
      if (this.testState!.mode !== TestModeDto.LEARNING) {
        this.router.navigate(['/tests', this.testState!.id, 'summary']);
        return;
      }
      this.testStateService.getTestState(this.testState!.id).subscribe(testStateResponse => {
        this.testState = testStateResponse;
        if (this.testState!.executionState != TestExecutionStateDto.FINISHED) {
          this.testState.currentQuestionIndex = testStateResponse.currentQuestionIndex;
          this.loadQuestion();
        } else {
          this.router.navigate(['/tests', this.testState!.id, 'summary']);
        }
      });
    });
  }

  questionScore(): string {
    if (this.questionState == null || !this.questionState.answered) {
      return "";
    }
    return this.questionState.score + "";
  }

  questionMaxScore(): number {
    return <number>this.question?.points;
  }

  getCurrentQuestionIndex(): number {
    return this.testState!.currentQuestionIndex + 1;
  }

  totalQuestions() {
    return this.testState!.currentQuestionsCount;
  }

}
