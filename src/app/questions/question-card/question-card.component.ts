import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {
  ClosedQuestionDto,
  ClosedQuestionStateRequest,
  ClosedQuestionStateResponse,
  OpenQuestionDto,
  OpenQuestionStateRequest,
  OpenQuestionStateResponse, StatementQuestionDto, StatementQuestionStateRequest, StatementQuestionStateResponse,
  TermDefinitionQuestionDto,
  TermDefinitionQuestionStateRequest,
  TermDefinitionQuestionStateResponse,
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
  //
  // question: ClosedQuestionDto | OpenQuestionDto | TermDefinitionQuestionDto = {
  //   explanation: undefined,
  //   termDefinitions: [
  //     {
  //       order: 0,
  //       term: "wapń (Ca)",
  //       definitions: ["Jest składnikiem szkieletów kręgowców i bezkręgowców. Jest niezbędny w funkcjonowaniu komórek nerwowych, wpływa na skurcze mięśni. Bierze udziałw procesie krzepnięcia krwi."]
  //     },
  //     {
  //       order: 1,
  //       term: "magnez (Mg)",
  //       definitions: ["Jest składnikiem kości. Jest aktywatorem licznych enzymów. Niezbędny do uzyskiwania energii z ATP. Jest składnikiem chlorofilu."]
  //     },
  //     {
  //       order: 2,
  //       term: "potas (K)",
  //       definitions: ["Bierze udział w przewodzeniu impulsów nerwowych. U zwierząt jest ważnym składnikiem płynów ustrojowych; zwiększa stopień uwodnienia płynu wewnątrzkomórkowego. Wpływa na skurcze mięśni. U roślin aktywator wielu enzymów."]
  //     },
  //     {
  //       order: 3,
  //       term: "sód (Na)",
  //       definitions: ["Bierze udział w przewodzeniu impulsów nerwowych. U zwierząt jest ważnym składnikiem płynów ustrojowych; zwiększa stopień uwodnienia płynu zewnątrzkomórkowego."]
  //     },
  //     {
  //       order: 4,
  //       term: "żelazo (Fe)",
  //       definitions: ["Jest składnikiem białek złożónych, transportujących (hemoglobina) lub magazynujących (mioglobina) tlen."]
  //     },
  //     {
  //       order: 5,
  //       term: "jod (I)",
  //       definitions: ["Jest składnikiem hormonów tarczycy regulujących m.in. pracę serca, przemianę materii i pobudliwości układu nerwowego."]
  //     }
  //   ],
  //   points: 10,
  //   content: {
  //     type: QuestionContentType.TEXT,
  //     text: 'Dopasuj funkcje biologiczne do podanych pierwiastków:'
  //   },
  //   id: "1234",
  //   type: "TERM_DEFINITION",
  //   contentProportions: 1,
  //   answerProportions: 10
  // };

  // question: ClosedQuestionDto | OpenQuestionDto | TermDefinitionQuestionDto = {
  //   explanation: undefined,
  //   answer: {
  //     type: QuestionContentType.TEXT,
  //     text: "sample answer"
  //   },
  //   gradingRules: [
  //     GradingRule.MANUAL
  //   ],
  //   points: 10,
  //   content: {
  //     type: QuestionContentType.HTML,
  //     text: `
  //       <img src="assets/img/matura/botanika/miekisz-asymilacyjny.png">
  //       <p>
  //         Podaj nazwę tkanki roślinnej widocznej powyżej.
  //       </p>
  //     `
  //   },
  //   id: "1234",
  //   type: "OPEN",
  //   contentProportions: 14,
  //   answerProportions: 1
  // };

  // question: ClosedQuestionDto | OpenQuestionDto | TermDefinitionQuestionDto = {
  //   explanation: undefined,
  //   answers: [
  //     {
  //       id: "a-1",
  //       text: "Answer 1",
  //       correct: false,
  //       points: 0
  //     },
  //     {
  //       id: "a-2",
  //       text: "Answer 2",
  //       correct: false,
  //       points: 0
  //     },
  //     {
  //       id: "a-3",
  //       text: "Answer 3",
  //       correct: false,
  //       points: 0
  //     },
  //     {
  //       id: "a-4",
  //       text: "Answer 4",
  //       correct: true,
  //       points: 1
  //     }
  //   ],
  //   multipleChoice: false,
  //   points: 10,
  //   content: {
  //     type: QuestionContentType.TEXT,
  //     text: 'sample question?'
  //   },
  //   id: "123456",
  //   type: "CLOSED",
  //   contentProportions: 10,
  //   answerProportions: 10
  // };

  testState?: TestStateResponse;

  question?: ClosedQuestionDto | OpenQuestionDto | TermDefinitionQuestionDto | StatementQuestionDto;

  progress: number = 0; // percentage completed (0-100)

  hasImage = false;

  questionState: ClosedQuestionStateResponse | OpenQuestionStateResponse | TermDefinitionQuestionStateResponse | StatementQuestionStateResponse | null = null;
  childAnswer: ClosedQuestionStateRequest | OpenQuestionStateRequest | TermDefinitionQuestionStateRequest | StatementQuestionStateRequest | null = null;

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

  termDefinitionQuestion(): TermDefinitionQuestionDto {
    return <TermDefinitionQuestionDto>this.question;
  }

  statementQuestion(): StatementQuestionDto {
    return <StatementQuestionDto>this.question;
  }

  onChildAnswer(state: ClosedQuestionStateRequest | OpenQuestionStateRequest | TermDefinitionQuestionStateRequest | StatementQuestionStateRequest | null) {
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

  get isTermDefinition() {
    return this.question?.type === 'TERM_DEFINITION';
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

  termDefinitionQuestionState(): TermDefinitionQuestionStateResponse {
    return <TermDefinitionQuestionStateResponse>this.questionState;
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
