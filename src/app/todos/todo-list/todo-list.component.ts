import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Todo, TodoLinkType, TodoService, TodoStatus } from '../../service/todo.service';
import { TestService } from '../../service/test.service';
import { CrosswordService } from '../../service/crossword.service';
import { GraphService } from '../../service/graph.service';
import { CodingService } from '../../service/coding.service';
import { ArticleService } from '../../service/article.service';

interface LinkOption { id: string; name: string; }

@Component({
  selector: 'app-todo-list',
  templateUrl: './todo-list.component.html',
  styleUrls: ['./todo-list.component.css']
})
export class TodoListComponent implements OnInit {

  readonly columns: { status: TodoStatus; icon: string }[] = [
    { status: 'TODO', icon: '📋' },
    { status: 'IN_PROGRESS', icon: '🚧' },
    { status: 'DONE', icon: '✅' }
  ];

  todos: Todo[] = [];
  loading = true;

  // Drag and drop
  draggingId: string | null = null;
  dragOver: TodoStatus | null = null;

  // Add form
  showForm = false;
  newText = '';
  newDue = '';
  newLinkType: TodoLinkType | '' = '';
  newLinkId = '';
  adding = false;
  readonly maxLength = 500;

  readonly linkTypes: TodoLinkType[] = ['TEST', 'CROSSWORD', 'GRAPH', 'CODING_TASK', 'ARTICLE'];
  linkOptions: Partial<Record<TodoLinkType, LinkOption[]>> = {};

  constructor(
    private todoService: TodoService,
    private testService: TestService,
    private crosswordService: CrosswordService,
    private graphService: GraphService,
    private codingService: CodingService,
    private articleService: ArticleService,
    private router: Router
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.todoService.list().subscribe({
      next: t => {
        // Older servers only send the done flag; derive the column from it.
        this.todos = t.map(x => ({ ...x, status: x.status ?? (x.done ? 'DONE' : 'TODO') }));
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  inColumn(status: TodoStatus): Todo[] {
    return this.todos.filter(t => t.status === status);
  }

  get doneCount(): number {
    return this.inColumn('DONE').length;
  }

  // ── Moving cards ──────────────────────────────────────────────────────────

  move(t: Todo, status: TodoStatus) {
    if (t.status === status) return;
    const previous = t.status;
    t.status = status;
    t.done = status === 'DONE';
    this.todoService.update(t.id, this.asRequest(t, status)).subscribe({
      error: () => { t.status = previous; t.done = previous === 'DONE'; }
    });
  }

  step(t: Todo, direction: -1 | 1) {
    const order = this.columns.map(c => c.status);
    const next = order[order.indexOf(t.status) + direction];
    if (next) this.move(t, next);
  }

  canStep(t: Todo, direction: -1 | 1): boolean {
    const idx = this.columns.findIndex(c => c.status === t.status);
    return idx + direction >= 0 && idx + direction < this.columns.length;
  }

  onDragStart(event: DragEvent, t: Todo) {
    this.draggingId = t.id;
    event.dataTransfer?.setData('text/plain', t.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onDragEnd() {
    this.draggingId = null;
    this.dragOver = null;
  }

  onDragOver(event: DragEvent, status: TodoStatus) {
    event.preventDefault();
    this.dragOver = status;
  }

  onDrop(event: DragEvent, status: TodoStatus) {
    event.preventDefault();
    const t = this.todos.find(x => x.id === this.draggingId);
    this.onDragEnd();
    if (t) this.move(t, status);
  }

  private asRequest(t: Todo, status: TodoStatus) {
    return { text: t.text, status, dueDate: t.dueDate, linkType: t.linkType, linkId: t.linkId };
  }

  // ── Add / remove ──────────────────────────────────────────────────────────

  get options(): LinkOption[] {
    return this.newLinkType ? (this.linkOptions[this.newLinkType] ?? []) : [];
  }

  onLinkTypeChange() {
    this.newLinkId = '';
    const type = this.newLinkType;
    if (!type || this.linkOptions[type]) return;
    const done = (items: LinkOption[]) => this.linkOptions[type] = items;
    switch (type) {
      case 'TEST': this.testService.getTests().subscribe(r => done(r.tests)); break;
      case 'CROSSWORD': this.crosswordService.getCrosswords().subscribe(r => done(r.crosswords)); break;
      case 'GRAPH': this.graphService.getGraphs().pipe(catchError(() => of([]))).subscribe(done); break;
      case 'CODING_TASK': this.codingService.list().pipe(catchError(() => of([]))).subscribe(done); break;
      case 'ARTICLE': this.articleService.listReadable().pipe(catchError(() => of([]))).subscribe(done); break;
    }
  }

  add() {
    const text = this.newText.trim();
    if (!text || this.adding) return;
    this.adding = true;
    const linked = !!(this.newLinkType && this.newLinkId);
    this.todoService.create({
      text,
      status: 'TODO',
      dueDate: this.newDue || null,
      linkType: linked ? this.newLinkType as TodoLinkType : null,
      linkId: linked ? this.newLinkId : null
    }).subscribe({
      next: () => {
        this.adding = false;
        this.newText = '';
        this.newDue = '';
        this.newLinkType = '';
        this.newLinkId = '';
        this.showForm = false;
        this.load();
      },
      error: () => { this.adding = false; }
    });
  }

  remove(t: Todo) {
    this.todos = this.todos.filter(x => x.id !== t.id);
    this.todoService.delete(t.id).subscribe({ error: () => this.load() });
  }

  clearDone() {
    this.todoService.clearDone().subscribe(() => this.load());
  }

  // ── Links and due dates ───────────────────────────────────────────────────

  openLink(t: Todo) {
    if (!t.linkType || !t.linkId || !t.linkName) return;
    switch (t.linkType) {
      case 'TEST': this.router.navigate(['/tests', t.linkId]); break;
      case 'CROSSWORD': this.router.navigate(['/crosswords', t.linkId]); break;
      case 'GRAPH': this.router.navigate(['/graphs/play'], { queryParams: { graphId: t.linkId } }); break;
      case 'CODING_TASK': this.router.navigate(['/coding', t.linkId]); break;
      case 'ARTICLE': this.router.navigate(['/articles', t.linkId]); break;
    }
  }

  linkIcon(type: TodoLinkType): string {
    return { TEST: '📝', CROSSWORD: '🔤', GRAPH: '🕸️', CODING_TASK: '💻', ARTICLE: '📖' }[type];
  }

  /** 'overdue' | 'today' | 'soon' | '' — drives the due-date badge color. */
  dueState(t: Todo): string {
    if (!t.dueDate || t.status === 'DONE') return '';
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (t.dueDate < key) return 'overdue';
    if (t.dueDate === key) return 'today';
    return 'soon';
  }
}
