import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {
  ClosedQuestionAnswerDto,
  ClosedQuestionDto,
  ClosedQuestionStateRequest,
  ClosedQuestionStateResponse,
  QuestionType, TestModeDto
} from "../../models/models.d";

@Component({
  selector: 'app-closed-question',
  templateUrl: './closed-question.component.html',
  styleUrls: ['./closed-question.component.css']
})
export class ClosedQuestionComponent implements OnInit, OnChanges {

  @Input() mode!: TestModeDto;
  @Input() question!: ClosedQuestionDto;
  @Input() state!: ClosedQuestionStateResponse | null;

  @Output() answerChange = new EventEmitter<ClosedQuestionStateRequest>();

  selectedAnswerIds: string[] = [];

  ngOnInit() {
    this.initFromState();
    this.emitState(false); // send initial (not forcing answered)
  }

  ngOnChanges(changes: SimpleChanges) {
    // when switching to a new question or receiving new state from backend
    if (changes['question']) {
      this.selectedAnswerIds = [];
      this.initFromState();
      this.emitState(false);
    }

    if (changes['state'] && !changes['question']) {
      this.initFromState();
      this.emitState(false);
    }
  }

  private initFromState() {
    // Support either `selectedAnswerIds: string[]` OR legacy `selectedAnswerId: string`
    const anyState: any = this.state;

    if (!anyState) {
      this.selectedAnswerIds = [];
      return;
    }

    if (Array.isArray(anyState.selectedAnswers)) {
      this.selectedAnswerIds = [...anyState.selectedAnswers];
      return;
    }

    if (anyState.selectedAnswerId) {
      this.selectedAnswerIds = [String(anyState.selectedAnswerId)];
      return;
    }

    this.selectedAnswerIds = [];
  }

  onSelect(answerId: string) {
    if (!this.question || this.state?.answered) return;

    if (this.question.multipleChoice) {
      // toggle in array
      if (this.selectedAnswerIds.includes(answerId)) {
        this.selectedAnswerIds = this.selectedAnswerIds.filter(id => id !== answerId);
      } else {
        this.selectedAnswerIds = [...this.selectedAnswerIds, answerId];
      }
    } else {
      // single choice
      this.selectedAnswerIds = [answerId];
    }

    this.emitState(true);
  }

  private emitState(answered: boolean) {
    const req: ClosedQuestionStateRequest = {
      questionId: this.question.id,
      questionType: QuestionType.CLOSED,
      answered,
      selectedAnswers: [...this.selectedAnswerIds] // for multi + single
    };

    this.answerChange.emit(req);
  }

  trackByAnswerId(_: number, a: { id: string }) {
    return a.id;
  }

  isCorrect(answer: ClosedQuestionAnswerDto) {
    return answer.correct;
  }

  isIncorrectSelected(answer: ClosedQuestionAnswerDto) {
    return !answer.correct && this.state?.selectedAnswers.includes(answer.id);
  }

}
