import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import {
  GraphEdgeView,
  GraphHyperedgeView,
  GraphSessionResponse,
  GraphSessionService,
  GraphVertexView
} from '../../service/graph-session.service';

interface Point { x: number; y: number; }

const VERTEX_RADIUS = 24;
const HUB_RADIUS = 6;

@Component({
  selector: 'app-graph-game-play',
  templateUrl: './graph-game-play.component.html',
  styleUrls: ['./graph-game-play.component.css']
})
export class GraphGamePlayComponent implements OnInit {
  readonly vertexRadius = VERTEX_RADIUS;
  readonly hubRadius = HUB_RADIUS;

  sessionId!: string;
  session: GraphSessionResponse | null = null;
  loading = true;
  loadError: string | null = null;

  selectedBlankId: string | null = null;
  guessText = '';
  checking = false;
  feedback: { vertexId: string; correct: boolean } | null = null;

  constructor(private route: ActivatedRoute, private graphSessionService: GraphSessionService, private translate: TranslateService) {}

  ngOnInit() {
    this.sessionId = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  private load() {
    this.loading = true;
    this.graphSessionService.getSession(this.sessionId).subscribe({
      next: session => { this.session = session; this.loading = false; },
      error: () => { this.loadError = this.translate.instant('GRAPH_GAME.ERR_LOAD'); this.loading = false; }
    });
  }

  vertexById(id: string): GraphVertexView | undefined {
    return this.session?.vertices.find(v => v.id === id);
  }

  // ── Drag & drop mode ────────────────────────────────────────────────────

  draggedIndex: number | null = null;
  dragOverId: string | null = null;
  /** Tap-to-place fallback for touch devices where HTML5 drag & drop doesn't work. */
  chosenIndex: number | null = null;

  get isDrag(): boolean {
    return this.session?.mode === 'DRAG_DROP';
  }

  onBankDragStart(event: DragEvent, index: number) {
    this.draggedIndex = index;
    this.chosenIndex = null;
    event.dataTransfer?.setData('text/plain', String(index));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onBankDragEnd() {
    this.draggedIndex = null;
    this.dragOverId = null;
  }

  onVertexDragOver(event: DragEvent, v: GraphVertexView) {
    if (!this.isDrag || v.revealed) return;
    event.preventDefault();
    this.dragOverId = v.id;
  }

  onVertexDragLeave(v: GraphVertexView) {
    if (this.dragOverId === v.id) this.dragOverId = null;
  }

  onVertexDrop(event: DragEvent, v: GraphVertexView) {
    if (!this.isDrag || v.revealed) return;
    event.preventDefault();
    const index = this.draggedIndex;
    this.draggedIndex = null;
    this.dragOverId = null;
    if (index !== null) this.placeLabel(v, index);
  }

  chooseBankItem(index: number) {
    this.chosenIndex = this.chosenIndex === index ? null : index;
    this.feedback = null;
  }

  private placeLabel(v: GraphVertexView, bankIndex: number) {
    const label = this.session?.bank[bankIndex];
    if (label === undefined || this.checking || !this.session) return;
    this.checking = true;
    this.graphSessionService.submitAnswer(this.sessionId, v.id, label).subscribe({
      next: res => {
        this.checking = false;
        this.feedback = { vertexId: v.id, correct: res.correct };
        if (res.correct && this.session) {
          v.label = res.label;
          v.revealed = true;
          this.session.bank.splice(bankIndex, 1);
          this.session.solvedCount++;
          this.session.completed = res.completed;
          this.chosenIndex = null;
        }
      },
      error: () => { this.checking = false; }
    });
  }

  selectBlank(v: GraphVertexView) {
    if (v.revealed) return;
    if (this.isDrag) {
      if (this.chosenIndex !== null) this.placeLabel(v, this.chosenIndex);
      return;
    }
    this.selectedBlankId = v.id;
    this.guessText = '';
    this.feedback = null;
  }

  cancelGuess() {
    this.selectedBlankId = null;
    this.guessText = '';
  }

  submitGuess() {
    if (!this.selectedBlankId || !this.guessText.trim() || this.checking || !this.session) return;
    const vertexId = this.selectedBlankId;
    this.checking = true;
    this.graphSessionService.submitAnswer(this.sessionId, vertexId, this.guessText.trim()).subscribe({
      next: res => {
        this.checking = false;
        this.feedback = { vertexId, correct: res.correct };
        if (res.correct && this.session) {
          const v = this.vertexById(vertexId);
          if (v) { v.label = res.label; v.revealed = true; }
          this.session.solvedCount++;
          this.session.completed = res.completed;
          this.selectedBlankId = null;
          this.guessText = '';
        }
      },
      error: () => { this.checking = false; }
    });
  }

  /** Where a hyperedge's hub sits: its stored position, or the centroid of its current sources+targets. */
  hubPosition(h: GraphHyperedgeView): Point {
    if (h.hubX != null && h.hubY != null) return { x: h.hubX, y: h.hubY };
    const ids = [...h.sources, ...h.targets];
    const pts = ids.map(id => this.vertexById(id)).filter((v): v is GraphVertexView => !!v);
    if (pts.length === 0) return { x: 0, y: 0 };
    return {
      x: pts.reduce((s, v) => s + v.x, 0) / pts.length,
      y: pts.reduce((s, v) => s + v.y, 0) / pts.length
    };
  }

  /** Same path logic as Graph Lab: straight, or bowed away from the graph's centroid. */
  pathData(p1: Point, p2: Point): string {
    if (this.session?.edgeStyle !== 'curved') return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy) || 1;
    let nx = -dy / dist, ny = dx / dist;
    const center = this.graphCentroid();
    if (nx * (mx - center.x) + ny * (my - center.y) < 0) { nx = -nx; ny = -ny; }
    const bend = Math.min(dist * 0.22, 70);
    return `M ${p1.x} ${p1.y} Q ${mx + nx * bend} ${my + ny * bend} ${p2.x} ${p2.y}`;
  }

  private graphCentroid(): Point {
    const vs = this.session?.vertices ?? [];
    if (vs.length === 0) return { x: 700, y: 400 };
    return { x: vs.reduce((s, v) => s + v.x, 0) / vs.length, y: vs.reduce((s, v) => s + v.y, 0) / vs.length };
  }

  trimmedLine(a: Point, b: Point, startR: number, endR: number): { x1: number; y1: number; x2: number; y2: number } {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist, uy = dy / dist;
    const maxTrim = Math.max(0, dist / 2 - 1);
    const s = Math.min(startR, maxTrim);
    const e = Math.min(endR, maxTrim);
    return { x1: a.x + ux * s, y1: a.y + uy * s, x2: b.x - ux * e, y2: b.y - uy * e };
  }

}
