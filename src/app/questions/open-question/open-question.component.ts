import {Component, EventEmitter, HostBinding, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
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
  @Input() stretchHeight: boolean = true;

  @HostBinding('class.stretch-height') get stretchClass() { return this.stretchHeight; }

  @Output() answerChange = new EventEmitter<OpenQuestionStateRequest>();

  text = '';
  multiTexts: string[] = [];
  scoredPoints: number = 1.0;
  locked = false;

  get isMultiple(): boolean {
    return !!this.question?.multipleAnswers;
  }

  get isOrdered(): boolean {
    return !!this.question?.orderedAnswers;
  }

  get inputCount(): number {
    if (!this.question) return 1;
    return 1 + (this.question.answerVariations?.length ?? 0);
  }

  private initMultiTexts(raw: string) {
    const parts = raw ? raw.split('\n') : [];
    this.multiTexts = Array.from({ length: this.inputCount }, (_, i) => parts[i] ?? '');
  }

  private joinMultiTexts(): string {
    return this.multiTexts.join('\n');
  }

  ngOnInit() {
    if (this.state) {
      this.text = this.state.givenAnswer ?? '';
      this.scoredPoints = this.state.score ?? 0.0;
    }
    if (this.isMultiple) this.initMultiTexts(this.text);
    this.locked = this.forceLocked || !!this.state?.answered;
    this.emitState();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['question'] || changes['gradingEnabled'] || changes['forceLocked']) {
      this.text = this.state?.givenAnswer ?? '';
      this.scoredPoints = this.state?.score ?? 0.0;
      if (this.isMultiple) this.initMultiTexts(this.text);
      this.locked = this.forceLocked || (this.state?.answered ?? false);
      this.emitState();
      return;
    }

    if (changes['state'] && this.state) {
      this.text = this.state.givenAnswer ?? '';
      this.scoredPoints = this.state.score ?? 0.0;
      if (this.isMultiple) this.initMultiTexts(this.text);
      this.locked = this.forceLocked || this.state.answered;
      this.emitState();
    }
  }

  trackByIndex(i: number): number { return i; }

  onMultiTextChange() {
    this.text = this.joinMultiTexts();
    this.emitState();
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
