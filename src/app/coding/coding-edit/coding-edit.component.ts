import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { CodingService, CodingTaskRequest } from '../../service/coding.service';

interface EditableTest {
  input: string;
  expectedOutput: string;
  hidden: boolean;
}

interface EditableProblem {
  id?: string;
  title: string;
  description: string;
  starterCode: string;
  points: number;
  timeLimitSeconds: number;
  tests: EditableTest[];
  open: boolean;
}

@Component({
  selector: 'app-coding-edit',
  templateUrl: './coding-edit.component.html',
  styleUrls: ['./coding-edit.component.css']
})
export class CodingEditComponent implements OnInit {

  taskId!: string;
  loading = true;
  saving = false;
  saved = false;
  error: string | null = null;

  name = '';
  description = '';
  scheduled = false;
  startAtLocal = '';
  windowEndLocal = '';
  problems: EditableProblem[] = [];

  quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean']
    ]
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private codingService: CodingService,
    private translate: TranslateService
  ) {}

  private toLocalInput(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  ngOnInit() {
    this.taskId = this.route.snapshot.paramMap.get('id')!;
    this.codingService.get(this.taskId).subscribe({
      next: t => {
        this.name = t.name;
        this.description = t.description ?? '';
        this.scheduled = !!t.startAt && !!t.windowEnd;
        this.startAtLocal = this.toLocalInput(t.startAt);
        this.windowEndLocal = this.toLocalInput(t.windowEnd);
        this.problems = t.problems.map((p, i) => ({
          id: p.id,
          title: p.title,
          description: p.description ?? '',
          starterCode: p.starterCode ?? '',
          points: p.points,
          timeLimitSeconds: Math.max(1, Math.round((p.timeLimitMs ?? 5000) / 1000)),
          tests: p.tests.map(x => ({ input: x.input ?? '', expectedOutput: x.expectedOutput ?? '', hidden: x.hidden })),
          open: i === 0
        }));
        this.loading = false;
      },
      error: () => { this.error = 'load'; this.loading = false; }
    });
  }

  /**
   * The rich-text box does not pick up an HTML value that was set before it was created (the same
   * quirk the subject page works around), so an empty editor is filled in by hand. 'silent' keeps this
   * from counting as a user edit.
   */
  fillEditor(quill: any, html: string | null | undefined) {
    if (html && quill.getText().trim() === '') {
      quill.clipboard.dangerouslyPasteHTML(0, html, 'silent');
    }
  }

  touched() {
    this.saved = false;
  }

  // ── problems ──
  addProblem() {
    this.problems.forEach(p => p.open = false);
    this.problems.push({
      title: `${this.translate.instant('CODING.PROBLEM')} ${this.problems.length + 1}`,
      description: '', starterCode: '', points: 10, timeLimitSeconds: 5, tests: [], open: true
    });
    this.touched();
  }

  removeProblem(i: number) {
    if (!confirm(this.translate.instant('CODING.CONFIRM_REMOVE_PROBLEM'))) return;
    this.problems.splice(i, 1);
    this.touched();
  }

  moveProblem(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= this.problems.length) return;
    [this.problems[i], this.problems[j]] = [this.problems[j], this.problems[i]];
    this.touched();
  }

  toggle(p: EditableProblem) {
    p.open = !p.open;
  }

  get totalPoints(): number {
    return this.problems.reduce((s, p) => s + (Number(p.points) || 0), 0);
  }

  // ── tests of one problem ──
  addTest(p: EditableProblem) {
    p.tests.push({ input: '', expectedOutput: '', hidden: false });
    this.touched();
  }

  removeTest(p: EditableProblem, i: number) {
    p.tests.splice(i, 1);
    this.touched();
  }

  get canSave(): boolean {
    if (!this.name.trim() || this.saving) return false;
    if (this.problems.some(p => !(Number(p.points) > 0))) return false;
    if (this.scheduled) {
      if (!this.startAtLocal || !this.windowEndLocal) return false;
      if (new Date(this.windowEndLocal) <= new Date(this.startAtLocal)) return false;
    }
    return true;
  }

  save() {
    if (!this.canSave) return;
    this.saving = true;
    this.error = null;
    const request: CodingTaskRequest = {
      name: this.name.trim(),
      description: this.description,
      startAt: this.scheduled ? new Date(this.startAtLocal).toISOString() : null,
      windowEnd: this.scheduled ? new Date(this.windowEndLocal).toISOString() : null,
      problems: this.problems.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        starterCode: p.starterCode,
        points: Number(p.points),
        timeLimitMs: Math.max(1, Number(p.timeLimitSeconds)) * 1000,
        tests: p.tests.map(t => ({ input: t.input, expectedOutput: t.expectedOutput, hidden: t.hidden }))
      }))
    };
    this.codingService.update(this.taskId, request).subscribe({
      next: () => {
        this.saving = false;
        this.saved = true;
        // reload so newly created problems get their ids (and keep their submissions on later edits)
        this.codingService.get(this.taskId).subscribe(t => {
          t.problems.forEach((p, i) => { if (this.problems[i]) this.problems[i].id = p.id; });
        });
      },
      error: err => { this.saving = false; this.error = err?.error?.message || 'save'; }
    });
  }

  back() {
    this.router.navigate(['/coding', this.taskId]);
  }

}
