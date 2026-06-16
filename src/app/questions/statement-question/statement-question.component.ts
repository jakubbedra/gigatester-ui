import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {
  QuestionType,
  StatementQuestionDto,
  StatementQuestionStateRequest,
  StatementQuestionStateResponse
} from "../../models/models.d";

@Component({
  selector: 'app-statement-question',
  templateUrl: './statement-question.component.html',
  styleUrls: ['./statement-question.component.css']
})
export class StatementQuestionComponent implements OnInit, OnChanges {

  @Input() question!: StatementQuestionDto;
  @Input() state!: StatementQuestionStateResponse;

  @Output() answerChange = new EventEmitter<StatementQuestionStateRequest>();

  // local working copy (so UI is snappy)
  answers: (boolean | null)[] = [];
  locked = false;

  ngOnInit() {
    this.resetFromInputs();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['question'] || changes['state']) {
      this.resetFromInputs();
    }
  }

  private resetFromInputs() {
    if (!this.question?.statements) return;

    // default
    this.answers = Array(this.question.statements.length).fill(null);
    this.locked = !!this.state?.answered;

    // preload from saved state
    if (this.state?.answers?.length) {
      this.answers = this.state.answers.map(v => (v === true ? true : v === false ? false : null));
      // pad if backend shorter
      while (this.answers.length < this.question.statements.length) this.answers.push(null);
    }

    this.emitState();
  }

  select(i: number, value: boolean) {
    if (this.locked) return;
    this.answers[i] = value;
    this.emitState();
  }

  isSelected(i: number, value: boolean): boolean {
    return this.answers[i] === value;
  }

  isComplete(): boolean {
    return this.answers.every(v => v !== null);
  }

  // optional correctness helpers (only if your statements include correct flags)
  isCorrect(i: number): boolean {
    if (!this.locked) return false;
    const correct = (this.question.statements[i] as any).correct;
    if (correct === undefined) return false;
    return this.answers[i] === correct;
  }

  isWrong(i: number): boolean {
    if (!this.locked) return false;
    const correct = (this.question.statements[i] as any).correct;
    if (correct === undefined) return false;
    return this.answers[i] !== null && this.answers[i] !== correct;
  }

  private emitState() {
    const payload: StatementQuestionStateRequest = {
      questionId: this.question.id,
      questionType: QuestionType.STATEMENT,
      answered: this.locked,
      answers: this.answers.map(v => v === true) // null -> false, but we keep nulls in UI only
    };

    this.answerChange.emit(payload);
  }

  // if you want parent “Submit Answer” to lock it after backend confirms,
  // you can also allow local locking:
  lockLocally() {
    this.locked = true;
    this.emitState();
  }

  trackByOrder(_: number, s: any) {
    return s.order ?? s.text;
  }

}
