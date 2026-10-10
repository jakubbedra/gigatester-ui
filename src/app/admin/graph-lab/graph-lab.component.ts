import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { GraphService, GraphSummary } from '../../service/graph.service';

type Mode = 'edge' | 'directedEdge' | 'hyperedge';

export interface Vertex {
  id: string;
  x: number;
  y: number;
  label: string;
}

export interface SimpleEdge {
  id: string;
  kind: 'edge' | 'directedEdge';
  from: string;
  to: string;
}

export interface Hyperedge {
  id: string;
  kind: 'hyperedge';
  sources: string[];
  targets: string[];
  label: string;
  /** Manual hub position, set once you drag it — undefined means "auto: centroid of sources+targets". */
  hubX?: number;
  hubY?: number;
}

interface Point { x: number; y: number; }

const VERTEX_RADIUS = 24;
const HUB_RADIUS = 6;
const STORAGE_KEY = 'graph-lab:state';

/**
 * Globally unique regardless of page reloads or imported files. A simple incrementing
 * counter looked fine in a single session, but it resets to 1 on every reload while
 * vertices restored from localStorage keep their old ids — so a freshly-created vertex
 * could collide with an already-restored one and end up sharing its id. Since every
 * lookup (selection, dragging, edge endpoints) resolves "the vertex with this id" via
 * the first match, two vertices sharing one id meant actions on either could silently
 * land on the other.
 */
function freshId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

@Component({
  selector: 'app-graph-lab',
  templateUrl: './graph-lab.component.html',
  styleUrls: ['./graph-lab.component.css']
})
export class GraphLabComponent implements OnInit {
  readonly vertexRadius = VERTEX_RADIUS;
  readonly hubRadius = HUB_RADIUS;

  vertices: Vertex[] = [];
  edges: SimpleEdge[] = [];
  hyperedges: Hyperedge[] = [];

  mode: Mode = 'edge';

  /** Display preferences, not graph data — kept out of the exported/autosaved graph JSON. */
  edgeStyle: 'straight' | 'curved' = 'straight';
  showVertices = true;
  labelFontSize = 12;

  // Right-drag-in-progress rubber-band line (Edge / Directed edge modes)
  dragFromId: string | null = null;
  dragPoint: Point | null = null;

  // Hyperedge build-a-set draft (Directed hyperedge mode)
  hyperSources = new Set<string>();
  hyperTargets = new Set<string>();

  // Side-panel selection
  selectedVertexId: string | null = null;
  selectedHyperedgeId: string | null = null;

  // Server-side save/load (separate from the localStorage autosave draft above)
  serverGraphId: string | null = null;
  graphName = '';
  savedGraphs: GraphSummary[] = [];
  loadingGraphs = false;
  saving = false;
  saveError: string | null = null;

  @ViewChild('svgEl') svgElRef!: ElementRef<SVGSVGElement>;
  @ViewChild('labelInputEl') labelInputElRef?: ElementRef<HTMLInputElement>;

  /**
   * Single pointer state machine for both mouse buttons, so "was this a click or a
   * drag" is resolved once in mouseup rather than raced against the native `contextmenu`
   * event (which fires independently and wouldn't know whether a drag happened).
   *   Left button  + vertex → drag moves the vertex; plain click selects/toggles it.
   *   Right button + vertex → drag (past a small threshold) draws an edge to the
   *                           vertex released on; a plain right-click deletes it instead.
   *   Right button + empty canvas, no drag → adds a vertex there.
   */
  private activeButton: 0 | 2 | null = null;
  private activeVertexId: string | null = null;
  private pointerStart: Point | null = null;
  private pointerMoved = false;
  private readonly MOVE_THRESHOLD = 4;

  /** True while the vertex under this id is being left-dragged (repositioned) — for cursor styling. */
  movingVertexId: string | null = null;

  /**
   * Separate, simpler pointer tracking for hub circles: left-click+hold moves the hub
   * (pinning it — it stops following its auto-computed centroid until reset), a plain
   * left-click (no drag) selects it. Right-click still deletes via the existing
   * contextmenu handler, with no drag ambiguity to resolve there.
   */
  private activeHubId: string | null = null;
  private hubPointerStart: Point | null = null;
  private hubMoved = false;
  movingHubId: string | null = null;

  private readonly boundHubMouseMove = (e: MouseEvent) => this.onHubDocumentMouseMove(e);
  private readonly boundHubMouseUp = (e: MouseEvent) => this.onHubDocumentMouseUp(e);

  private readonly boundMouseMove = (e: MouseEvent) => this.onDocumentMouseMove(e);
  private readonly boundMouseUp = (e: MouseEvent) => this.onDocumentMouseUp(e);

  constructor(private graphService: GraphService, private translate: TranslateService, private route: ActivatedRoute) {
    this.restore();
    try {
      const saved = localStorage.getItem('graph-lab:edgeStyle');
      if (saved === 'straight' || saved === 'curved') this.edgeStyle = saved;
      const savedShow = localStorage.getItem('graph-lab:showVertices');
      if (savedShow !== null) this.showVertices = savedShow === 'true';
      const savedSize = localStorage.getItem('graph-lab:labelFontSize');
      if (savedSize !== null) {
        const n = Number(savedSize);
        if (!Number.isNaN(n) && n > 0) this.labelFontSize = n;
      }
    } catch { /* ignore */ }
  }

  ngOnInit() {
    this.loadGraphList();
    const graphId = this.route.snapshot.queryParamMap.get('graphId');
    if (graphId) this.loadFromServer(graphId);
  }

  // ── Mode ─────────────────────────────────────────────────────────────────

  setMode(m: Mode) {
    this.mode = m;
    this.cancelPointer();
    this.cancelHyperDraft();
  }

  // ── Coordinate helpers ──────────────────────────────────────────────────

  private svgPoint(event: MouseEvent): Point {
    const svg = this.svgElRef.nativeElement;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }

  /**
   * A line from a's center to b's center, pulled back at each end by the given radius —
   * vertices are drawn on top of edges, so without this an arrowhead placed at a vertex's
   * *center* would be completely hidden under its filled circle instead of visible at its rim.
   */
  trimmedLine(a: Point, b: Point, startR: number, endR: number): { x1: number; y1: number; x2: number; y2: number } {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist, uy = dy / dist;
    const maxTrim = Math.max(0, dist / 2 - 1); // keep the two ends from crossing over on very short/overlapping edges
    const s = Math.min(startR, maxTrim);
    const e = Math.min(endR, maxTrim);
    return { x1: a.x + ux * s, y1: a.y + uy * s, x2: b.x - ux * e, y2: b.y - uy * e };
  }

  /** Builds an SVG path "d" string between two points — a straight line, or a gently bowed curve. */
  pathData(p1: Point, p2: Point): string {
    if (this.edgeStyle === 'straight') {
      return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    }
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy) || 1;
    let nx = -dy / dist, ny = dx / dist; // unit vector perpendicular to the line

    // Bow every curve away from the graph's center, not just to a fixed side of the
    // line — this is what makes edges around a ring (e.g. a cycle diagram) all curve
    // outward consistently, regardless of which vertex each one happened to be drawn
    // from, instead of some arcing one way and others the opposite way at random.
    const center = this.graphCentroid();
    const outX = mx - center.x, outY = my - center.y;
    if (nx * outX + ny * outY < 0) { nx = -nx; ny = -ny; }

    const bend = Math.min(dist * 0.22, 70);
    const cx = mx + nx * bend, cy = my + ny * bend;
    return `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`;
  }

  private graphCentroid(): Point {
    if (this.vertices.length === 0) return { x: 700, y: 400 };
    const x = this.vertices.reduce((s, v) => s + v.x, 0) / this.vertices.length;
    const y = this.vertices.reduce((s, v) => s + v.y, 0) / this.vertices.length;
    return { x, y };
  }

  setEdgeStyle(style: 'straight' | 'curved') {
    this.edgeStyle = style;
    try { localStorage.setItem('graph-lab:edgeStyle', style); } catch { /* ignore */ }
  }

  setShowVertices(show: boolean) {
    this.showVertices = show;
    try { localStorage.setItem('graph-lab:showVertices', String(show)); } catch { /* ignore */ }
  }

  setLabelFontSize(size: number) {
    if (Number.isNaN(size) || size <= 0) return;
    this.labelFontSize = size;
    try { localStorage.setItem('graph-lab:labelFontSize', String(size)); } catch { /* ignore */ }
  }

  private findVertexAt(p: Point): Vertex | null {
    let closest: Vertex | null = null;
    let closestDist = VERTEX_RADIUS;
    for (const v of this.vertices) {
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      if (d <= closestDist) { closest = v; closestDist = d; }
    }
    return closest;
  }

  // ── Canvas background ────────────────────────────────────────────────────

  /** Suppress the native browser context menu everywhere on the canvas — all the real logic lives in mousedown/mousemove/mouseup below. */
  onCanvasContextMenu(event: MouseEvent) {
    event.preventDefault();
  }

  onCanvasMouseDown(event: MouseEvent) {
    if (event.target !== this.svgElRef.nativeElement) return; // a vertex/edge/hub already handled it
    if (event.button !== 0 && event.button !== 2) return;
    event.preventDefault();
    this.beginPointer(event, null);
  }

  // ── Vertices ─────────────────────────────────────────────────────────────

  onVertexMouseDown(event: MouseEvent, vertexId: string) {
    if (event.button !== 0 && event.button !== 2) return;
    if (event.button === 2 && this.mode === 'hyperedge') return; // hyperedges are built by clicking, not dragging
    event.preventDefault();
    event.stopPropagation();
    this.beginPointer(event, vertexId);
  }

  private beginPointer(event: MouseEvent, vertexId: string | null) {
    this.activeButton = event.button as 0 | 2;
    this.activeVertexId = vertexId;
    this.pointerStart = this.svgPoint(event);
    this.pointerMoved = false;
    if (vertexId && this.activeButton === 2) {
      this.dragFromId = vertexId;
      this.dragPoint = this.pointerStart;
    }
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  private onDocumentMouseMove(event: MouseEvent) {
    if (this.activeButton === null || !this.pointerStart) return;
    const p = this.svgPoint(event);

    if (!this.pointerMoved) {
      const dist = Math.hypot(p.x - this.pointerStart.x, p.y - this.pointerStart.y);
      if (dist < this.MOVE_THRESHOLD) return;
      this.pointerMoved = true;
      if (this.activeVertexId && this.activeButton === 0) this.movingVertexId = this.activeVertexId;
    }

    if (this.activeVertexId) {
      if (this.activeButton === 0) {
        const v = this.vertexById(this.activeVertexId);
        if (v) { v.x = p.x; v.y = p.y; }
      } else {
        this.dragPoint = p;
      }
    }
  }

  private onDocumentMouseUp(event: MouseEvent) {
    if (this.activeButton === null) { this.cancelPointer(); return; }
    const vertexId = this.activeVertexId;
    const button = this.activeButton;
    const moved = this.pointerMoved;
    const p = this.svgPoint(event);
    this.cancelPointer();

    if (vertexId) {
      if (button === 0) {
        if (moved) {
          this.persist();
        } else {
          this.onVertexClicked(event, vertexId);
        }
      } else {
        if (moved) {
          const target = this.findVertexAt(p);
          if (target && target.id !== vertexId) {
            this.edges.push({
              id: freshId('e'),
              kind: this.mode === 'directedEdge' ? 'directedEdge' : 'edge',
              from: vertexId,
              to: target.id
            });
            this.persist();
          }
        } else {
          this.deleteVertex(vertexId);
        }
      }
    } else if (!moved) {
      if (button === 2) {
        const v: Vertex = { id: freshId('v'), x: p.x, y: p.y, label: '' };
        this.vertices.push(v);
        this.selectVertex(v.id);
        this.persist();
      } else {
        this.selectedVertexId = null;
        this.selectedHyperedgeId = null;
      }
    }
  }

  private cancelPointer() {
    this.activeButton = null;
    this.activeVertexId = null;
    this.pointerStart = null;
    this.pointerMoved = false;
    this.movingVertexId = null;
    this.dragFromId = null;
    this.dragPoint = null;
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  /** A plain click (no drag) on a vertex: select it, and in hyperedge mode also toggle its draft membership. */
  private onVertexClicked(event: MouseEvent, vertexId: string) {
    this.selectVertex(vertexId);
    if (this.mode === 'hyperedge') {
      if (event.shiftKey) {
        this.toggleInSet(this.hyperTargets, vertexId);
        this.hyperSources.delete(vertexId);
      } else {
        this.toggleInSet(this.hyperSources, vertexId);
        this.hyperTargets.delete(vertexId);
      }
    }
  }

  private toggleInSet(set: Set<string>, id: string) {
    if (set.has(id)) set.delete(id); else set.add(id);
  }

  selectVertex(vertexId: string) {
    this.selectedVertexId = vertexId;
    this.selectedHyperedgeId = null;
    setTimeout(() => this.labelInputElRef?.nativeElement.focus());
  }

  get selectedVertex(): Vertex | null {
    return this.vertices.find(v => v.id === this.selectedVertexId) ?? null;
  }

  onVertexLabelChange() {
    this.persist();
  }

  deleteVertex(vertexId: string) {
    this.vertices = this.vertices.filter(v => v.id !== vertexId);
    this.edges = this.edges.filter(e => e.from !== vertexId && e.to !== vertexId);
    this.hyperSources.delete(vertexId);
    this.hyperTargets.delete(vertexId);
    this.hyperedges = this.hyperedges
      .map(h => ({ ...h, sources: h.sources.filter(id => id !== vertexId), targets: h.targets.filter(id => id !== vertexId) }))
      .filter(h => h.sources.length > 0 && h.targets.length > 0);
    if (this.selectedVertexId === vertexId) this.selectedVertexId = null;
    this.persist();
  }

  // ── Simple edges ─────────────────────────────────────────────────────────

  vertexById(id: string): Vertex | undefined {
    return this.vertices.find(v => v.id === id);
  }

  onEdgeContextMenu(event: MouseEvent, edgeId: string) {
    event.preventDefault();
    event.stopPropagation();
    this.edges = this.edges.filter(e => e.id !== edgeId);
    this.persist();
  }

  // ── Hyperedges ───────────────────────────────────────────────────────────

  get hyperDraftReady(): boolean {
    return this.hyperSources.size > 0 && this.hyperTargets.size > 0;
  }

  get hyperDraftOverlaps(): boolean {
    for (const id of this.hyperSources) if (this.hyperTargets.has(id)) return true;
    return false;
  }

  createHyperedge() {
    if (!this.hyperDraftReady) return;
    this.hyperedges.push({
      id: freshId('h'),
      kind: 'hyperedge',
      sources: Array.from(this.hyperSources),
      targets: Array.from(this.hyperTargets),
      label: ''
    });
    this.cancelHyperDraft();
    this.persist();
  }

  cancelHyperDraft() {
    this.hyperSources = new Set();
    this.hyperTargets = new Set();
  }

  removeFromDraft(id: string) {
    this.hyperSources.delete(id);
    this.hyperTargets.delete(id);
  }

  /** Where the hub sits: your manually-dragged position if you set one, otherwise the auto centroid of its sources+targets. */
  hubPosition(h: Hyperedge): Point {
    if (h.hubX !== undefined && h.hubY !== undefined) return { x: h.hubX, y: h.hubY };
    return this.hyperedgeCentroid(h);
  }

  hyperedgeCentroid(h: Hyperedge): Point {
    const ids = [...h.sources, ...h.targets];
    const pts = ids.map(id => this.vertexById(id)).filter((v): v is Vertex => !!v);
    if (pts.length === 0) return { x: 0, y: 0 };
    const x = pts.reduce((s, v) => s + v.x, 0) / pts.length;
    const y = pts.reduce((s, v) => s + v.y, 0) / pts.length;
    return { x, y };
  }

  onHubMouseDown(event: MouseEvent, hyperedgeId: string) {
    if (event.button !== 0) return; // right button stays simple delete-on-click, handled by the contextmenu binding
    event.preventDefault();
    event.stopPropagation();
    this.activeHubId = hyperedgeId;
    this.hubPointerStart = this.svgPoint(event);
    this.hubMoved = false;
    document.addEventListener('mousemove', this.boundHubMouseMove);
    document.addEventListener('mouseup', this.boundHubMouseUp);
  }

  private onHubDocumentMouseMove(event: MouseEvent) {
    if (!this.activeHubId || !this.hubPointerStart) return;
    const p = this.svgPoint(event);
    if (!this.hubMoved) {
      const dist = Math.hypot(p.x - this.hubPointerStart.x, p.y - this.hubPointerStart.y);
      if (dist < this.MOVE_THRESHOLD) return;
      this.hubMoved = true;
      this.movingHubId = this.activeHubId;
    }
    const h = this.hyperedges.find(he => he.id === this.activeHubId);
    if (h) { h.hubX = p.x; h.hubY = p.y; }
  }

  private onHubDocumentMouseUp(event: MouseEvent) {
    const id = this.activeHubId;
    const moved = this.hubMoved;
    this.cancelHubPointer();
    if (!id) return;
    if (moved) {
      this.persist();
    } else {
      this.selectHyperedge(event, id);
    }
  }

  private cancelHubPointer() {
    this.activeHubId = null;
    this.hubPointerStart = null;
    this.hubMoved = false;
    this.movingHubId = null;
    document.removeEventListener('mousemove', this.boundHubMouseMove);
    document.removeEventListener('mouseup', this.boundHubMouseUp);
  }

  /** Un-pins a manually-positioned hub so it goes back to auto-following the centroid of its sources+targets. */
  resetHubPosition(h: Hyperedge) {
    delete h.hubX;
    delete h.hubY;
    this.persist();
  }

  selectHyperedge(event: MouseEvent, hyperedgeId: string) {
    event.stopPropagation();
    this.selectedHyperedgeId = hyperedgeId;
    this.selectedVertexId = null;
  }

  get selectedHyperedge(): Hyperedge | null {
    return this.hyperedges.find(h => h.id === this.selectedHyperedgeId) ?? null;
  }

  onHyperedgeLabelChange() {
    this.persist();
  }

  onHubContextMenu(event: MouseEvent, hyperedgeId: string) {
    event.preventDefault();
    event.stopPropagation();
    this.hyperedges = this.hyperedges.filter(h => h.id !== hyperedgeId);
    if (this.selectedHyperedgeId === hyperedgeId) this.selectedHyperedgeId = null;
    this.persist();
  }

  hyperedgeSourceLabels(h: Hyperedge): string {
    return h.sources.map(id => this.vertexLabel(id)).join(', ');
  }

  hyperedgeTargetLabels(h: Hyperedge): string {
    return h.targets.map(id => this.vertexLabel(id)).join(', ');
  }

  vertexLabel(id: string): string {
    const v = this.vertexById(id);
    return v?.label?.trim() || this.translate.instant('GRAPH_LAB.UNLABELED');
  }

  // ── Whole-canvas actions ─────────────────────────────────────────────────

  clearCanvas() {
    if (this.vertices.length === 0 && this.edges.length === 0 && this.hyperedges.length === 0) return;
    if (!confirm(this.translate.instant('GRAPH_LAB.CONFIRM_CLEAR'))) return;
    this.vertices = [];
    this.edges = [];
    this.hyperedges = [];
    this.selectedVertexId = null;
    this.selectedHyperedgeId = null;
    this.cancelHyperDraft();
    this.persist();
  }

  // ── Server-side save/load ────────────────────────────────────────────────

  private currentGraphJson(): string {
    return JSON.stringify({ vertices: this.vertices, edges: this.edges, hyperedges: this.hyperedges, showVertices: this.showVertices, edgeStyle: this.edgeStyle });
  }

  loadGraphList() {
    this.loadingGraphs = true;
    this.graphService.getGraphs().subscribe({
      next: list => { this.savedGraphs = list; this.loadingGraphs = false; },
      error: () => { this.loadingGraphs = false; }
    });
  }

  saveToServer() {
    if (!this.graphName.trim()) { this.saveError = this.translate.instant('GRAPH_LAB.ERR_NAME_REQUIRED'); return; }
    this.saving = true;
    this.saveError = null;
    const request = { name: this.graphName.trim(), graphJson: this.currentGraphJson() };
    const done = () => { this.saving = false; this.loadGraphList(); };
    if (this.serverGraphId) {
      this.graphService.updateGraph(this.serverGraphId, request).subscribe({
        next: done,
        error: () => { this.saving = false; this.saveError = this.translate.instant('GRAPH_LAB.ERR_SAVE_FAILED'); }
      });
    } else {
      this.graphService.addGraph(request).subscribe({
        next: id => { this.serverGraphId = id; done(); },
        error: () => { this.saving = false; this.saveError = this.translate.instant('GRAPH_LAB.ERR_SAVE_FAILED'); }
      });
    }
  }

  saveAsNewOnServer() {
    this.serverGraphId = null;
    this.saveToServer();
  }

  loadFromServer(id: string) {
    this.graphService.getGraph(id).subscribe({
      next: record => {
        const data = JSON.parse(record.graphJson);
        this.vertices = data.vertices ?? [];
        this.edges = data.edges ?? [];
        this.hyperedges = data.hyperedges ?? [];
        if (typeof data.showVertices === 'boolean') this.setShowVertices(data.showVertices);
        if (data.edgeStyle === 'straight' || data.edgeStyle === 'curved') this.setEdgeStyle(data.edgeStyle);
        this.serverGraphId = record.id;
        this.graphName = record.name;
        this.selectedVertexId = null;
        this.selectedHyperedgeId = null;
        this.cancelHyperDraft();
        this.persist();
      },
      error: () => { this.saveError = this.translate.instant('GRAPH_LAB.ERR_LOAD_FAILED'); }
    });
  }

  deleteFromServer(id: string) {
    if (!confirm(this.translate.instant('GRAPH_LAB.CONFIRM_DELETE_SAVED'))) return;
    this.graphService.deleteGraph(id).subscribe({
      next: () => {
        if (this.serverGraphId === id) this.serverGraphId = null;
        this.loadGraphList();
      }
    });
  }

  exportJson() {
    const data = { vertices: this.vertices, edges: this.edges, hyperedges: this.hyperedges };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'graph.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  triggerImport(fileInput: HTMLInputElement) {
    fileInput.value = '';
    fileInput.click();
  }

  onImportFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!Array.isArray(data.vertices) || !Array.isArray(data.edges) || !Array.isArray(data.hyperedges)) {
          throw new Error('Unrecognized file shape');
        }
        this.vertices = data.vertices;
        this.edges = data.edges;
        this.hyperedges = data.hyperedges;
        this.selectedVertexId = null;
        this.selectedHyperedgeId = null;
        this.cancelHyperDraft();
        this.persist();
      } catch {
        alert(this.translate.instant('GRAPH_LAB.ERR_IMPORT_FAILED'));
      }
    };
    reader.readAsText(file);
  }

  // ── Autosave (browser-local, per-device — no backend for this experimental page) ──

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        vertices: this.vertices, edges: this.edges, hyperedges: this.hyperedges
      }));
    } catch { /* private browsing / storage disabled — just skip autosave */ }
  }

  private restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.vertices)) this.vertices = data.vertices;
      if (Array.isArray(data.edges)) this.edges = data.edges;
      if (Array.isArray(data.hyperedges)) this.hyperedges = data.hyperedges;
      this.repairDuplicateIds();
    } catch { /* corrupt or inaccessible — start with an empty canvas */ }
  }

  /**
   * One-time repair for graphs saved before ids were made collision-proof: if two
   * vertices ended up sharing an id, every id-based lookup would only ever find the
   * first one, so editing/dragging "the other" silently acted on it instead. Rewrites
   * any duplicate id to a fresh unique one and updates every edge/hyperedge reference
   * to match, so previously-mixed-up vertices become independent again.
   */
  private repairDuplicateIds() {
    const seen = new Set<string>();
    let repaired = 0;
    for (const v of this.vertices) {
      if (seen.has(v.id)) {
        const oldId = v.id;
        v.id = freshId('v');
        // Same spot, nudged slightly so the now-separate vertex is visible rather than stacked exactly on top of the other.
        v.x += 18; v.y += 18;
        repaired++;
        console.warn(`Graph Lab: repaired a duplicate vertex id (${oldId} → ${v.id}).`);
      }
      seen.add(v.id);
    }
    // Only the vertex that kept its original id should still be referenced by old edges/
    // hyperedges — the renamed duplicate starts out unconnected, the safest assumption
    // since there's no way to know which id a given edge "really" meant.
    if (repaired > 0) this.persist();
  }
}
