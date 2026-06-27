import { Component, OnInit } from '@angular/core';
import { AiQuestion, AiService } from '../../service/ai.service';
import { TestService } from '../../service/test.service';
import { TestSummaryResponse } from '../../models/models.d';

type Step = 'input' | 'review' | 'done';

@Component({
  selector: 'app-ai-generator',
  templateUrl: './ai-generator.component.html',
  styleUrls: ['./ai-generator.component.css']
})
export class AiGeneratorComponent implements OnInit {
  step: Step = 'input';

  // Step 1 — inputs
  selectedFile: File | null = null;
  closedCount = 3;
  multipleChoiceCount = 2;
  openCount = 2;
  generating = false;
  generateError: string | null = null;

  // Step 2 — review
  questions: AiQuestion[] = [];

  // Step 3 — save
  tests: TestSummaryResponse[] = [];
  selectedTestId: string = '';
  saving = false;
  saveError: string | null = null;

  constructor(private aiService: AiService, private testService: TestService) {}

  ngOnInit() {
    this.testService.getTests().subscribe({
      next: res => this.tests = res.tests ?? [],
      error: () => {}
    });
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  generate() {
    if (!this.selectedFile) return;
    this.generating = true;
    this.generateError = null;
    this.aiService.generateQuestions(
      this.selectedFile,
      this.closedCount,
      this.multipleChoiceCount,
      this.openCount
    ).subscribe({
      next: qs => {
        this.questions = qs.map(q => ({ ...q, answers: q.answers.map(a => ({ ...a })) }));
        this.step = 'review';
        this.generating = false;
      },
      error: err => {
        this.generateError = err.error?.message ?? 'Generation failed. Check your API key and try again.';
        this.generating = false;
      }
    });
  }

  deleteQuestion(index: number) {
    this.questions.splice(index, 1);
  }

  addAnswer(q: AiQuestion) {
    q.answers.push({ text: '', correct: false });
  }

  removeAnswer(q: AiQuestion, i: number) {
    q.answers.splice(i, 1);
  }

  setSingleCorrect(q: AiQuestion, idx: number) {
    q.answers.forEach((a, i) => a.correct = i === idx);
  }

  save() {
    if (!this.selectedTestId || this.questions.length === 0) return;
    this.saving = true;
    this.saveError = null;
    this.aiService.saveQuestions({ testId: this.selectedTestId, questions: this.questions }).subscribe({
      next: () => {
        this.step = 'done';
        this.saving = false;
      },
      error: err => {
        this.saveError = err.error?.message ?? 'Save failed. Please try again.';
        this.saving = false;
      }
    });
  }

  reset() {
    this.step = 'input';
    this.questions = [];
    this.selectedFile = null;
    this.selectedTestId = '';
    this.generateError = null;
    this.saveError = null;
  }

  questionLabel(q: AiQuestion): string {
    if (q.type === 'OPEN_QUESTION') return 'Open';
    return q.multipleChoice ? 'Multiple choice' : 'Single answer';
  }
}
