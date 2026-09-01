import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragEnd, CdkDragMove, CdkDragStart, DragRef, Point } from '@angular/cdk/drag-drop';
import { CrosswordMultiplayerService, SubmitTurnLetter } from '../../service/crossword-multiplayer.service';
import { AuthService } from '../../service/auth.service';
import { CrosswordSoundService } from '../../service/crossword-sound.service';
import { MultiplayerSessionResponse, CrosswordStateClueResponse } from '../../models/models.d';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface MpClue {
  number: number;
  clue: CrosswordStateClueResponse;
  length: number;
}

export interface MpCellData {
  char: string;
  placed: boolean;
  number?: number;
  highlighted: boolean;
}

@Component({
  selector: 'app-crossword-multiplayer-play',
  templateUrl: './crossword-multiplayer-play.component.html',
  styleUrls: ['./crossword-multiplayer-play.component.css']
})
export class CrosswordMultiplayerPlayComponent implements OnInit, AfterViewInit, OnDestroy {

  sessionId!: string;
  session: MultiplayerSessionResponse | null = null;
  loading = true;
  error = '';
  canJoin = false;

  across: MpClue[] = [];
  down: MpClue[] = [];
  selectedClue: MpClue | null = null;
  highlightedCells = new Set<string>();
  cellNumberMap = new Map<string, number>();
  activeTab: 'across' | 'down' = 'across';

  handLetters: string[] = [];
  placedLetters = new Map<string, { letter: string; handIndex: number }>();
  placedCount = 0;
  isDragging = false;
  hoveredCell: string | null = null;
  cellSize = 38;
  mobileCellSize = 32;
  isSubmitting = false;

  flashCorrect = new Set<string>();
  flashWrong = new Set<string>();
  flashDelay = new Map<string, number>();
  wordToasts: { word: string; points: number }[] = [];

  showWinner = false;

  @ViewChild('gridScroll') gridScrollEl!: ElementRef<HTMLElement>;
  private resizeObserver!: ResizeObserver;
  private pollSub: Subscription | null = null;
  private readonly POLL_INTERVAL_MS = 2000;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private multiplayerService: CrosswordMultiplayerService,
    private authService: AuthService,
    public sound: CrosswordSoundService
  ) {}

  get myUserId(): string { return this.authService.getUser()?.id ?? ''; }

  get isMyTurn(): boolean {
    return !!this.session?.myTurn && this.session.status === 'IN_PROGRESS';
  }

  get isFinished(): boolean { return this.session?.status === 'FINISHED'; }
  get isWaiting(): boolean { return this.session?.status === 'WAITING_FOR_PLAYER'; }
  get isComplete(): boolean { return !!this.session && !this.session.currentGrid.includes('_'); }

  get inviteLink(): string {
    return `${window.location.origin}/crosswords/sessions/${this.sessionId}`;
  }

  get myPoints(): number {
    if (!this.session) return 0;
    return this.session.player1.id === this.myUserId
      ? this.session.player1Points : this.session.player2Points;
  }

  get opponentPoints(): number {
    if (!this.session) return 0;
    return this.session.player1.id === this.myUserId
      ? this.session.player2Points : this.session.player1Points;
  }

  get opponentName(): string {
    if (!this.session) return '?';
    const opp = this.session.player1.id === this.myUserId
      ? this.session.player2 : this.session.player1;
    return opp?.username ?? '?';
  }

  get winner(): 'me' | 'opponent' | 'tie' | null {
    if (!this.isFinished || !this.session) return null;
    if (this.myPoints > this.opponentPoints) return 'me';
    if (this.opponentPoints > this.myPoints) return 'opponent';
    return 'tie';
  }

  ngOnInit() {
    this.sessionId = this.route.snapshot.paramMap.get('id')!;
    this.loadSession();
  }

  ngAfterViewInit() {
    if (this.gridScrollEl) {
      this.resizeObserver = new ResizeObserver(() => this.updateCellSize());
      this.resizeObserver.observe(this.gridScrollEl.nativeElement);
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.stopPolling();
  }

  private loadSession() {
    this.multiplayerService.getSession(this.sessionId).subscribe({
      next: (session) => {
        this.applySession(session);
        this.loading = false;
        this.startPolling();
      },
      error: (err) => {
        if (err.status === 403) {
          this.canJoin = true;
          this.loading = false;
        } else {
          this.error = 'Session not found or access denied.';
          this.loading = false;
        }
      }
    });
  }

  private applySession(session: MultiplayerSessionResponse) {
    const wasMyTurn = this.session?.myTurn;
    this.session = session;
    if (!wasMyTurn && session.myTurn) {
      // opponent finished their turn — reset placed letters
      this.placedLetters.clear();
      this.placedCount = 0;
    }
    // Don't overwrite handLetters mid-placement — polling would restore removed tiles
    if (this.placedLetters.size === 0) {
      this.handLetters = session.myHand ? session.myHand.split('') : [];
      while (this.handLetters.length < 5) this.handLetters.push('');
    }
    this.buildClues();
    setTimeout(() => this.updateCellSize(), 0);
    if (session.status === 'FINISHED' && !this.showWinner) {
      setTimeout(() => {
        this.showWinner = true;
        if (this.winner === 'me') this.sound.playWin();
        else if (this.winner === 'opponent') this.sound.playLose();
        else this.sound.playWordComplete();
      }, 1000);
    }
  }

  private startPolling() {
    this.stopPolling();
    if (this.isFinished) return;
    this.pollSub = interval(this.POLL_INTERVAL_MS).pipe(
      switchMap(() => this.multiplayerService.getSession(this.sessionId))
    ).subscribe({
      next: (session) => {
        const prevGrid = this.session?.currentGrid;
        this.applySession(session);
        if (session.status === 'FINISHED') this.stopPolling();
        // If opponent placed letters while we were waiting, flash them
        if (prevGrid && session.status === 'IN_PROGRESS' && session.myTurn && prevGrid !== session.currentGrid) {
          this.flashOpponentPlacements(prevGrid, session.currentGrid, session);
        }
      }
    });
  }

  private stopPolling() {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }

  private flashOpponentPlacements(prevGrid: string, newGrid: string, session: MultiplayerSessionResponse) {
    const bot = new Set<string>();
    const delays = new Map<string, number>();
    let idx = 0;
    for (let i = 0; i < newGrid.length; i++) {
      if (prevGrid[i] === '_' && newGrid[i] !== '_' && newGrid[i] !== '#') {
        const r = Math.floor(i / session.width);
        const c = i % session.width;
        const key = `${r},${c}`;
        bot.add(key);
        delays.set(key, idx++ * 300);
      }
    }
    if (bot.size === 0) return;
    this.flashDelay = delays;
    this.flashWrong = bot; // reuse "wrong" color (purple) for opponent placements
    const duration = 3000 + bot.size * 300;
    setTimeout(() => { this.flashWrong = new Set(); this.flashDelay = new Map(); }, duration);
  }

  joinSession() {
    this.multiplayerService.joinSession(this.sessionId).subscribe({
      next: (session) => {
        this.canJoin = false;
        this.applySession(session);
        this.startPolling();
      },
      error: () => { this.error = 'Failed to join. You may not have access to this crossword.'; }
    });
  }

  copyInviteLink() {
    navigator.clipboard.writeText(this.inviteLink).catch(() => {});
  }

  // ── Grid ──────────────────────────────────────────────────────────────────

  rows(): MpCellData[][] {
    if (!this.session) return [];
    const result: MpCellData[][] = [];
    for (let r = 0; r < this.session.height; r++) {
      const row: MpCellData[] = [];
      for (let c = 0; c < this.session.width; c++) {
        const gridChar = this.session.currentGrid[r * this.session.width + c];
        const key = `${r},${c}`;
        const placement = this.placedLetters.get(key);
        row.push({
          char: placement?.letter ?? gridChar,
          placed: !!placement,
          number: this.cellNumberMap.get(key),
          highlighted: this.highlightedCells.has(key)
        });
      }
      result.push(row);
    }
    return result;
  }

  recallPlaced(row: number, col: number) {
    const key = `${row},${col}`;
    const placement = this.placedLetters.get(key);
    if (!placement) return;
    this.handLetters = this.handLetters.map((l, i) => i === placement.handIndex ? placement.letter : l);
    this.placedLetters.delete(key);
    this.placedCount--;
  }

  isEmptyForDrop(row: number, col: number): boolean {
    const key = `${row},${col}`;
    return this.session!.currentGrid[row * this.session!.width + col] === '_'
      && !this.placedLetters.has(key);
  }

  isHoveredCell(r: number, c: number): boolean { return this.hoveredCell === `${r},${c}`; }

  /** Only true while the in-progress drag was started by touch — lets a mouse drag stay 1:1 with the cursor. */
  isTouchDrag = false;
  /**
   * On touch, the tile is rendered this many px above the finger while dragging so it
   * doesn't sit under the fingertip, blocking the view of the cell it's about to land on.
   */
  private readonly touchDragLiftPx = 56;

  onDragStarted(event: CdkDragStart) {
    this.isDragging = true;
    this.hoveredCell = null;
    this.isTouchDrag = typeof TouchEvent !== 'undefined' && event.event instanceof TouchEvent;
  }

  /** Renders the dragged tile lifted above the finger on touch, so it doesn't hide the target cell underneath it. */
  dragConstrainPosition = (point: Point, _dragRef: DragRef, _dimensions: ClientRect, _pickupPositionInElement: Point): Point => {
    return this.isTouchDrag ? { x: point.x, y: point.y - this.touchDragLiftPx } : point;
  };

  private liftedY(y: number): number {
    return this.isTouchDrag ? y - this.touchDragLiftPx : y;
  }

  onDragMoved(event: CdkDragMove) {
    const target = document.elementFromPoint(event.pointerPosition.x, this.liftedY(event.pointerPosition.y)) as HTMLElement | null;
    const cellEl = target?.closest<HTMLElement>('[data-cell-row]');
    if (cellEl) {
      const row = parseInt(cellEl.dataset['cellRow']!);
      const col = parseInt(cellEl.dataset['cellCol']!);
      if (this.isEmptyForDrop(row, col)) { this.hoveredCell = `${row},${col}`; return; }
    }
    this.hoveredCell = null;
  }

  onDrop(event: CdkDragEnd, letter: string, handIndex: number) {
    this.isDragging = false;
    this.hoveredCell = null;
    if (!this.isMyTurn) { event.source._dragRef.reset(); return; }
    const el = event.source.element.nativeElement as HTMLElement;
    el.style.visibility = 'hidden';
    const target = document.elementFromPoint(event.dropPoint.x, this.liftedY(event.dropPoint.y)) as HTMLElement | null;
    el.style.visibility = '';
    const cellEl = target?.closest<HTMLElement>('[data-cell-row]');
    if (cellEl) {
      const row = parseInt(cellEl.dataset['cellRow']!);
      const col = parseInt(cellEl.dataset['cellCol']!);
      const key = `${row},${col}`;
      if (this.session!.currentGrid[row * this.session!.width + col] === '_' && !this.placedLetters.has(key)) {
        this.placedLetters.set(key, { letter, handIndex });
        this.placedCount++;
        this.handLetters = this.handLetters.map((l, i) => i === handIndex ? '' : l);
        event.source._dragRef.reset();
        return;
      }
    }
    event.source._dragRef.reset();
  }

  submitTurn() {
    if (this.isSubmitting || this.placedLetters.size === 0) return;
    const letters: SubmitTurnLetter[] = [];
    const snapshot = new Map(this.placedLetters);
    this.placedLetters.forEach((value, key) => {
      const [r, c] = key.split(',').map(Number);
      letters.push({ row: r, column: c, c: value.letter });
    });
    this.isSubmitting = true;
    this.stopPolling();
    this.multiplayerService.submitTurn(this.sessionId, letters).subscribe({
      next: (session) => {
        this.isSubmitting = false;
        this.applyFlash(snapshot, session);
        this.placedLetters.clear();
        this.placedCount = 0;
        this.hoveredCell = null;
        this.applySession(session);
        if (session.status !== 'FINISHED') this.startPolling();
      },
      error: () => { this.isSubmitting = false; this.startPolling(); }
    });
  }

  private applyFlash(snapshot: Map<string, { letter: string; handIndex: number }>, session: MultiplayerSessionResponse) {
    const correct = new Set<string>();
    const wrong = new Set<string>();
    const delays = new Map<string, number>();
    let idx = 0;
    snapshot.forEach((value, key) => {
      const [r, c] = key.split(',').map(Number);
      const gridChar = session.currentGrid[r * session.width + c];
      if (gridChar !== '_') {
        correct.add(key);
      } else {
        wrong.add(key);
      }
      delays.set(key, idx++ * 500);
    });
    this.flashDelay = delays;
    this.flashCorrect = correct;
    this.flashWrong = wrong;

    // Word completion toasts: detect newly completed words
    const completedWords = this.detectCompletedWords(snapshot, session);
    if (completedWords.length > 0) {
      const humanDuration = 2500 + Math.max(0, idx - 1) * 500;
      setTimeout(() => {
        this.wordToasts = completedWords;
        this.sound.playWordComplete();
        setTimeout(() => { this.wordToasts = []; }, 2500);
      }, humanDuration);
    }

    this.sound.playResultSequence(
      Array.from(snapshot.entries()).map(([key, v]) => {
        const [row, column] = key.split(',').map(Number);
        return { row, column, letter: v.letter, correct: correct.has(key) };
      }),
      0.5
    );

    setTimeout(() => {
      this.flashCorrect = new Set();
      this.flashWrong = new Set();
      this.flashDelay = new Map();
    }, 3000 + idx * 500);
  }

  private detectCompletedWords(snapshot: Map<string, any>, session: MultiplayerSessionResponse): { word: string; points: number }[] {
    if (!this.session) return [];
    const results: { word: string; points: number }[] = [];
    for (const clue of session.clues) {
      const word = ''; // We don't have term text in clues — use clue length instead
      // Check if this word was just completed: all cells filled now, but at least one was in our snapshot
      let allFilled = true;
      let anyPlaced = false;
      let r = clue.row, c = clue.column;
      const dr = clue.direction === 'DOWN' ? 1 : 0;
      const dc = clue.direction === 'ACROSS' ? 1 : 0;
      const len = this.getClueLength(clue, session);
      for (let i = 0; i < len; i++) {
        const key = `${r + dr * i},${c + dc * i}`;
        if (session.currentGrid[(r + dr * i) * session.width + (c + dc * i)] === '_') { allFilled = false; break; }
        if (snapshot.has(key)) anyPlaced = true;
      }
      // Only count as "our" completion if we placed at least one letter in it
      if (allFilled && anyPlaced) {
        let wordStr = '';
        for (let i = 0; i < len; i++) {
          wordStr += session.currentGrid[(r + dr * i) * session.width + (c + dc * i)];
        }
        results.push({ word: wordStr, points: len });
      }
    }
    return results;
  }

  private getClueLength(clue: CrosswordStateClueResponse, session: MultiplayerSessionResponse): number {
    let len = 0, r = clue.row, c = clue.column;
    const dr = clue.direction === 'DOWN' ? 1 : 0;
    const dc = clue.direction === 'ACROSS' ? 1 : 0;
    while (r < session.height && c < session.width) {
      if (session.currentGrid[r * session.width + c] === '#') break;
      len++; r += dr; c += dc;
    }
    return len;
  }

  // ── Clues ─────────────────────────────────────────────────────────────────

  private buildClues() {
    if (!this.session) return;
    this.cellNumberMap.clear();
    const sorted = [...this.session.clues].sort((a, b) =>
      a.row !== b.row ? a.row - b.row : a.column - b.column
    );
    let counter = 1;
    for (const clue of sorted) {
      const key = `${clue.row},${clue.column}`;
      if (!this.cellNumberMap.has(key)) this.cellNumberMap.set(key, counter++);
    }
    const across: MpClue[] = [];
    const down: MpClue[] = [];
    for (const clue of sorted) {
      const number = this.cellNumberMap.get(`${clue.row},${clue.column}`)!;
      const length = this.wordLength(clue);
      const entry = { number, clue, length };
      if (clue.direction === 'ACROSS') across.push(entry); else down.push(entry);
    }
    this.across = across.sort((a, b) => a.number - b.number);
    this.down = down.sort((a, b) => a.number - b.number);
  }

  private wordLength(clue: CrosswordStateClueResponse): number {
    if (!this.session) return 0;
    let len = 0, r = clue.row, c = clue.column;
    while (r < this.session.height && c < this.session.width) {
      if (this.session.currentGrid[r * this.session.width + c] === '#') break;
      len++;
      if (clue.direction === 'ACROSS') c++; else r++;
    }
    return len;
  }

  selectClue(entry: MpClue) {
    this.selectedClue = entry;
    this.highlightedCells.clear();
    let r = entry.clue.row, c = entry.clue.column;
    for (let i = 0; i < entry.length; i++) {
      this.highlightedCells.add(`${r},${c}`);
      if (entry.clue.direction === 'ACROSS') c++; else r++;
    }
  }

  isActive(entry: MpClue): boolean {
    return this.selectedClue?.number === entry.number &&
           this.selectedClue?.clue.direction === entry.clue.direction;
  }

  zoomIn()  { this.mobileCellSize = Math.min(this.mobileCellSize + 4, 56); this.applyMobileSize(); }
  zoomOut() { this.mobileCellSize = Math.max(this.mobileCellSize - 4, 16); this.applyMobileSize(); }
  private applyMobileSize() { if (window.innerWidth <= 768) this.cellSize = this.mobileCellSize; }

  private updateCellSize() {
    if (!this.session || !this.gridScrollEl) return;
    if (window.innerWidth <= 768) { this.cellSize = this.mobileCellSize; return; }
    const el = this.gridScrollEl.nativeElement;
    const maxByWidth  = Math.floor(el.clientWidth  / this.session.width);
    const maxByHeight = Math.floor(el.clientHeight / this.session.height);
    this.cellSize = Math.max(20, Math.min(maxByWidth, maxByHeight));
  }

  newCrossword() {
    this.router.navigate(['/crosswords', this.session?.crosswordId]);
  }

  abandon() {
    if (!confirm('Abandon this session?')) return;
    this.multiplayerService.abandonSession(this.sessionId).subscribe({
      next: () => this.router.navigate(['/crosswords', this.session?.crosswordId])
    });
  }
}
