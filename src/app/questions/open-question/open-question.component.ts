import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {
  GradingRule,
  OpenQuestionDto,
  OpenQuestionStateRequest,
  OpenQuestionStateResponse,
  QuestionContentType,
  QuestionType
} from "../../models/models.d";

@Component({
  selector: 'app-open-question',
  templateUrl: './open-question.component.html',
  styleUrls: ['./open-question.component.css']
})
export class OpenQuestionComponent implements OnInit, OnChanges {

  @Input() question!: OpenQuestionDto;
  @Input() state!: OpenQuestionStateResponse | null;
  @Input() gradingEnabled: boolean = true;
  @Input() forceLocked: boolean = false;

  @Output() answerChange = new EventEmitter<OpenQuestionStateRequest>();

  text = '';
  scoredPoints: number = 1.0;
  locked = false;

  ngOnInit() {
    if (this.state) {
      this.text = this.state.givenAnswer ?? '';
      this.scoredPoints = this.state.score ?? 0.0;
    }
    this.locked = this.forceLocked || !!this.state?.answered;
    this.emitState();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['question'] || changes['gradingEnabled'] || changes['forceLocked']) {
      this.text = this.state?.givenAnswer ?? '';
      this.scoredPoints = this.state?.score ?? 0.0;
      this.locked = this.forceLocked || (this.state?.answered ?? false);
      this.emitState();
      return;
    }

    if (changes['state'] && this.state) {
      this.text = this.state.givenAnswer ?? '';
      this.scoredPoints = this.state.score ?? 0.0;
      this.locked = this.forceLocked || this.state.answered;
      this.emitState();
    }
  }

  emitState() {
    if (this.question.gradingRules.includes(GradingRule.MANUAL)) {
      this.answerChange.emit({
        questionId: this.question.id,
        questionType: QuestionType.OPEN,
        givenAnswer: this.text,
        answered: this.locked,
        scoredPoints: this.scoredPoints
      });
      return;
    }
    const req: OpenQuestionStateRequest = {
      scoredPoints: null,
      questionId: this.question.id,
      questionType: QuestionType.OPEN,
      answered: this.locked,
      givenAnswer: this.text
    };

    this.answerChange.emit(req);
  }

  get maxPoints(): number {
    return this.question.points ?? 0;
  }

  get isAnswerHtml(): boolean {
    return this.question.answer?.type === QuestionContentType.HTML;
  }

  get suggestedAnswer(): string {
    return this.question.answer?.text ?? '—';
  }

  toggleLock() {
    this.locked = true;
    this.emitState();
  }

  isManualGrading(): boolean {
    return this.question.gradingRules.includes(GradingRule.MANUAL);
  }

}
