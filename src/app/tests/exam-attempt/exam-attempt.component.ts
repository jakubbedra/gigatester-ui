import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ExamGrading, ExamGradingItem, ExamService } from '../../service/exam.service';
import { QuestionsService } from '../../service/question.service';
import { QuestionStateService } from '../../service/question-state.service';

interface ReviewItem extends ExamGradingItem {
  question: any;
  answer: any;
  newScore: number;
  touched: boolean;
}

/** One attempt of a scheduled exam: staff grade/override scores here, the student reviews it read-only. */
@Component({
  selector: 'app-exam-attempt',
  templateUrl: './exam-attempt.component.html',
  styleUrls: ['./exam-attempt.component.css']
})
export class ExamAttemptComponent implements OnInit {

  testId!: string;
  stateId!: string;
  grading: ExamGrading | null = null;
  items: ReviewItem[] = [];
  loading = true;
  error: string | null = null;
  saving = false;
  saved = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private examService: ExamService,
    private questionsService: QuestionsService,
    private questionStateService: QuestionStateService
  ) {}

  ngOnInit() {
    this.testId = this.route.snapshot.paramMap.get('testId')!;
    this.stateId = this.route.snapshot.paramMap.get('stateId')!;
    this.load();
  }

  load() {
    this.loading = true;
    this.error = null;
    this.examService.getGrading(this.stateId).subscribe({
      next: grading => {
        this.grading = grading;
        if (grading.items.length === 0) {
          this.items = [];
          this.loading = false;
          return;
        }
        forkJoin(grading.items.map(item => forkJoin({
          question: this.questionsService.getQuestion(item.questionId),
          answer: this.questionStateService.getQuestionState(this.stateId, item.questionStateId)
        }))).subscribe({
          next: details => {
            this.items = grading.items.map((item, i) => ({
              ...item,
              question: details[i].question,
              answer: details[i].answer,
              newScore: item.score,
              touched: false
            }));
            this.loading = false;
          },
          error: () => { this.error = 'load'; this.loading = false; }
        });
      },
      error: () => { this.error = 'load'; this.loading = false; }
    });
  }

  isSelected(item: ReviewItem, answerId: string): boolean {
    return (item.answer?.selectedAnswers ?? []).includes(answerId);
  }

  givenStatement(item: ReviewItem, index: number): boolean | null {
    const given = item.answer?.answers;
    return given && index < given.length ? given[index] : null;
  }

  markTouched(item: ReviewItem) {
    item.touched = true;
    this.saved = false;
  }

  setFull(item: ReviewItem) {
    item.newScore = item.maxScore;
    this.markTouched(item);
  }

  setZero(item: ReviewItem) {
    item.newScore = 0;
    this.markTouched(item);
  }

  get hasChanges(): boolean {
    return this.items.some(i => i.touched);
  }

  get previewTotal(): number {
    return this.items.reduce((sum, i) => sum + (Number(i.newScore) || 0), 0);
  }

  get pendingCount(): number {
    return this.items.filter(i => i.manual && !i.graded && !i.touched).length;
  }

  invalid(item: ReviewItem): boolean {
    const v = Number(item.newScore);
    return Number.isNaN(v) || v < 0 || v > item.maxScore;
  }

  get anyInvalid(): boolean {
    return this.items.some(i => i.touched && this.invalid(i));
  }

  save() {
    if (!this.hasChanges || this.anyInvalid || this.saving) return;
    this.saving = true;
    this.error = null;
    const grades = this.items.filter(i => i.touched)
      .map(i => ({ questionStateId: i.questionStateId, score: Number(i.newScore) }));
    this.examService.saveGrades(this.stateId, grades).subscribe({
      next: () => {
        this.saving = false;
        this.saved = true;
        this.load();
      },
      error: () => { this.saving = false; this.error = 'save'; }
    });
  }

  back() {
    this.router.navigate(['/tests', this.testId]);
  }

}
