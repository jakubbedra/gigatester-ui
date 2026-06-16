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

  @Output() answerChange = new EventEmitter<OpenQuestionStateRequest>();

  text = '';
  scoredPoints: number = 1.0;
  locked = false;

  ngOnInit() {
    // preload state if exists
    if (this.state) {
      this.text = this.state.givenAnswer ?? '';
      this.scoredPoints = this.state.score ?? null;
      this.locked = !!this.state.answered;
      alert("dupa");
    }
    // emit initial state so parent has something
    this.emitState();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Reset when a NEW question comes in
    console.log("dupa1");
    if (changes['question']) {
      this.locked = this.state != null && this.state.answered;
      this.scoredPoints = this.state == null || this.state.score == null ? 0.0 : this.state.score;
      console.log("dupa2");
      return;
    }

    // If only state changed (e.g. backend refreshed), re-apply state
    if (changes['state']) {
      console.log("dupa3");
      this.text = this.state!.givenAnswer;
      if (this.state!.score != null) {
        this.scoredPoints = this.state!.score;
        console.log("dupa4");
      }
      this.locked = this.state!.answered;
    }
  }

  emitState() {
    if (this.question.gradingRules.includes(GradingRule.MANUAL)) {
      console.log('DUUUUUUUUUUPAAAAAAA:');
      console.log({
        questionId: this.question.id,
        questionType: QuestionType.OPEN,
        givenAnswer: this.text,
        answered: this.locked,
        scoredPoints: this.scoredPoints
      });
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
