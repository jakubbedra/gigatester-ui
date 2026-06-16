import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {CdkDragDrop, moveItemInArray, transferArrayItem} from "@angular/cdk/drag-drop";
import {
  QuestionType,
  TermDefinitionQuestionDto,
  TermDefinitionQuestionStateRequest,
  TermDefinitionQuestionStateResponse
} from "../../models/models.d";

interface TermBox {
  id: string;
  label: string;
  items: string[];
}

@Component({
  selector: 'app-term-definition-question',
  templateUrl: './term-definition-question.component.html',
  styleUrls: ['./term-definition-question.component.css']
})
export class TermDefinitionQuestionComponent implements OnInit, OnChanges {

  @Input() question!: TermDefinitionQuestionDto;
  @Input() state!: TermDefinitionQuestionStateResponse | null;

  @Output() scored = new EventEmitter<{ score: number; max: number }>();
  @Output() answerChange = new EventEmitter<TermDefinitionQuestionStateRequest>();

  definitions: string[] = [];

  terms: TermBox[] = [];

  connectedListIds: string[] = [];

  ngOnInit() {
    this.initializeLists();
    this.applySavedState();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['question'] && changes['question'].currentValue) {
      this.initializeLists();
      this.applySavedState(); // or applyState(this.state) if answered state exists
    }

    if (changes['state'] && changes['state'].currentValue) {
      this.applyState(changes['state'].currentValue);
    }
  }

  private applyState(state: TermDefinitionQuestionStateResponse) {
    // // todo: we try to apply state with empty list
    //
    // this.terms = state.termDefinitions.map(td => ({
    //   id: String(td.order),
    //   label: td.term,
    //   items: [...td.definitions]
    // }));
    // state.termDefinitions.forEach(td => td.definitions.forEach(definition => {
    //   this.definitions = this.definitions.filter(d => d !== definition);
    // }));
    // reset first
    this.terms.forEach(t => (t.items = []));

    // refill term boxes from state
    for (const td of state.termDefinitions ?? []) {
      const termBox = this.terms.find(t => t.id === String(td.order));
      if (termBox) termBox.items = [...td.definitions];
    }

    // recompute remaining definitions (remove all assigned)
    const assigned = new Set(
      (state.termDefinitions ?? []).flatMap(td => td.definitions)
    );

    this.definitions = this.shuffle(this.question.termDefinitions
      .flatMap(d => d.definitions)
      .filter(d => !assigned.has(d)));
  }
// todo: randomize lists
  private initializeLists() {
    this.definitions = this.shuffle(
      this.question.termDefinitions.flatMap(d => d.definitions)
    );

    this.terms = this.question.termDefinitions.map(d => ({
      id: String(d.order),
      label: d.term,
      items: []
    }));

    this.connectedListIds = ['definitions', ...this.terms.map(t => t.id)];
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];              // don’t mutate original
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private applySavedState() {
    if (!this.state || !this.state.termDefinitions) return;

    // Clone definitions so we can remove used ones
    const remaining = [...this.definitions];

    for (const assign of this.state.termDefinitions) {
      const termBox = this.terms.find(t => t.id === String(assign.order));
      if (!termBox) continue;

      termBox.items = assign.definitions;
    }

    this.definitions = remaining;
  }

  drop(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }

    this.emitAnswer();
    this.emitScore();
  }

  /** Build answer object */
  private emitAnswer() {
    const termDefinitions = this.terms.map(t => {
      const source = this.question.termDefinitions.find(d => d.order === Number(t.id));

      return {
        order: Number(t.id),
        term: source?.term ?? "",
        definitions: [...t.items] // assigned definitions
      };
    });

    const request: TermDefinitionQuestionStateRequest = {
      questionId: this.question.id,
      questionType: QuestionType.TERM_DEFINITION,
      termDefinitions,
      answered: true
    };

    this.answerChange.emit(request);
  }

  /** Optional scoring — call only if parent needs it */
  private emitScore() {
    let score = 0;
    let max = 0;

    for (const t of this.terms) {
      const correct = this.question.termDefinitions.find(d => d.order === Number(t.id))?.definitions ?? [];
      max += correct.length;

      for (const assigned of t.items) {
        if (correct.includes(assigned)) score++;
      }
    }

    this.scored.emit({ score, max });
  }

  isCorrectDefinition(termId: string, definition: string): boolean {
    if (!this.state?.answered) {
      return false;
    }
    const correct = this.question.termDefinitions.find(d => d.order === Number(termId))?.definitions ?? [];
    return correct.includes(definition);
  }

  isIncorrectDefinition(termId: string, definition: string): boolean {
    if (!this.state?.answered) {
      return false;
    }
    return !this.isCorrectDefinition(termId, definition);
  }

}
